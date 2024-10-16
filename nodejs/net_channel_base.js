const std_net = require('net');

class NetConst {
	static SOCK_STREAM = 1;
	static SOCK_DGRAM = 2;

	static string2socktype(s) {
		switch (s) {
			case 'SOCK_STREAM':
				return NetConst.SOCK_STREAM;
			case 'SOCK_DGRAM':
				return NetConst.SOCK_DGRAM;
		}
		return 0;
	}

	static socktype2string(socktype) {
		switch (socktype) {
			case NetConst.SOCK_STREAM:
				return 'SOCK_STREAM';
			case NetConst.SOCK_DGRAM:
				return 'SOCK_DGRAM';
		}
		return '';
	}
}

class NetPipelineBase {
	constructor() {
		this.fnReadBuffer = function (channel, buff, rinfo) {
			void channel, buff, rinfo;
			return buff.length;
		};
		this.fnHandleClose = function (channel, err) {
			void channel, err;
		};
	}
}

class NetChannelBase {
	static CLIENT_SIDE = 1;
	static SERVER_SIDE = 2;

	static CONNECT_STATUS_NEW = 0;
	static CONNECT_STATUS_DOING = 1;
	static CONNECT_STATUS_DONE = 2;

	constructor(side, pipeline, io, socktype) {
		this._pipeline = pipeline;
		this._io = io;
		this._side = side;
		this._socktype = socktype;

		this._connectResolve = null;
		this._connectStatus = NetChannelBase.CONNECT_STATUS_NEW;
		this._connectTimeout = null;
		this._heartbeatTimeout = null;
		this._heartbeatTimes = 0;
		this._lastRecvMsec = 0;

		this.connectTimeoutMsec = 5000;
		this.session = null;
	}

	get side() {
		return this._side;
	}

	get socktype() {
		return this._socktype;
	}

	close(err) {
		this._io = null;
		if (this._connectTimeout) {
			clearTimeout(this._connectTimeout);
			this._connectTimeout = null;
		}
		if (this._connectResolve) {
			this._connectResolve();
			this._connectResolve = null;
		}
		if (this._heartbeatTimeout) {
			clearTimeout(this._heartbeatTimeout);
			this._heartbeatTimeout = null;
		}
		if (this._pipeline) {
			this._pipeline.fnHandleClose(this, err);
		}
	}

	_prepareConnect(resolve, resolve_ret) {
		this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
		this._connectResolve = resolve;
		if (this.connectTimeoutMsec > 0) {
			this._connectTimeout = setTimeout(() => {
				this._connectResolve = null;
				this.close(new Error("NetChannel connect timeout"));
				resolve(resolve_ret);
			}, this.connectTimeoutMsec);
		}
	}

	_afterConnect() {
		this._connectResolve = null;
		this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
		if (this._connectTimeout) {
			clearTimeout(this._connectTimeout);
			this._connectTimeout = null;
		}
	}

	setClientSideHeartbeat(fnHeartbeat, interval, maxTimes) {
		if (this.side != NetChannelBase.CLIENT_SIDE) {
			return;
		}
		if (NetChannelBase.CONNECT_STATUS_NEW == this._connectStatus) {
			return;
		}
		let self = this;
		if (self._heartbeatTimeout) {
			clearTimeout(self._heartbeatTimeout);
		}
		const fn = function () {
			clearTimeout(self._heartbeatTimeout);
			if (NetChannelBase.CONNECT_STATUS_DONE != self._connectStatus) {
				self._heartbeatTimeout = setTimeout(fn, interval);
				return;
			}
			if (self._heartbeatTimes < maxTimes) {
				fnHeartbeat(self);
				++self._heartbeatTimes;
				self._heartbeatTimeout = setTimeout(fn, interval);
				return;
			}
			self._heartbeatTimeout = null;
			self.close(new Error("NetChannelBase client hearbeat timeout"));
		};
		self._heartbeatTimeout = setTimeout(fn, interval);
	}

	setServerSideHeartbeat(interval) {
		if (this.side != NetChannelBase.SERVER_SIDE) {
			return null;
		}
		let self = this;
		if (self._heartbeatTimeout) {
			clearTimeout(self._heartbeatTimeout);
		}
		const fn = () => {
			clearTimeout(self._heartbeatTimeout);
			let elapse = Date.now() - this._lastRecvMsec;
			if (elapse < 0) {
				elapse = 0;
			}
			if (elapse <= interval) {
				self._heartbeatTimeout = setTimeout(fn, interval - elapse);
				return;
			}
			self._heartbeatTimeout = null;
			self.close(new Error("NetChannelBase server hearbeat timeout"));
		}
		self._heartbeatTimeout = setTimeout(fn, interval);
	}
}

class NetChannel extends NetChannelBase {
	constructor(side, pipeline, io, socktype) {
		super(side, pipeline, io, socktype);
		this._rbf = Buffer.alloc(0);
		this._ready_fin = false;
		this._waitSendBufferWhenConnecting = null;
		this._initedEvent = false;
		this._connectPromise = null;
		if (this._io) {
			this.initEvent();
			if (this.side == NetChannelBase.SERVER_SIDE) {
				this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
			}
			else if (this._io.connecting) {
				this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
				let self = this;
				self._connectPromise = new Promise((resolve) => {
					self._prepareConnect(resolve, false);
					self._io.on('connect', () => {
						self._afterConnect();
						resolve(self._ready_fin);
					});
				});
			}
		}
	}

	initEvent() {
		if (this._initedEvent) {
			return;
		}
		this._initedEvent = true;
		let self = this;
		if (this.socktype == NetConst.SOCK_STREAM) {
			this._io.setNoDelay();
			this._io.on('data', (data) => {
				self.readBuffer(data, null);
			});
		}
		else if (this.socktype == NetConst.SOCK_DGRAM) {
			this._io.on('message', (data, rinfo) => {
				self.readBuffer(data, rinfo);
			});
		}
		this._io.on('error', (err) => {
			self.close(err);
		});
		this._io.on('close', () => {
			self.close();
		});
	}

	close(err) {
		this._rbf = null;
		this._ready_fin = false;
		this._waitSendBufferWhenConnecting = null;
		if (this._io) {
			if (this.socktype == NetConst.SOCK_STREAM) {
				this._io.destroy();
			}
			else if (this.socktype == NetConst.SOCK_DGRAM) {
				this._io.close();
			}
		}
		super.close(err);
	}

	readBuffer(data, rinfo) {
		this._heartbeatTimes = 0;
		this._lastRecvMsec = Date.now();
		this._rbf = Buffer.concat([this._rbf, data]);
		do {
			let decode_length;
			try {
				decode_length = this._pipeline.fnReadBuffer(this, this._rbf, rinfo);
				if (decode_length === undefined || decode_length === null) {
					this.close(new Error("NetChannelBase::readBuffer miss totalLength field"));
					return;
				}
				if (0 == decode_length) {
					break;
				}
				if (decode_length < 0) {
					this.close(new Error("NetChannelBase::readBuffer decode exception"));
					return;
				}
			} catch (e) {
				this.close(new Error("NetChannelBase::readBuffer decode exception"));
				return;
			}
			this._rbf = this._rbf.subarray(decode_length);
		} while (this._rbf.length > 0);
	}

	send(buff, rinfo) {
		if (!this._io) {
			return;
		}
		if (typeof buff === 'string') {
			buff = Buffer.from(buff);
		}
		if (NetChannelBase.CONNECT_STATUS_DOING == this._connectStatus) {
			let newBuf;
			if (this._waitSendBufferWhenConnecting) {
				newBuf = Buffer.concat([this._waitSendBufferWhenConnecting, buff]);
			}
			else {
				newBuf = Buffer.concat([buff]);
			}
			this._waitSendBufferWhenConnecting = newBuf;
			return;
		}
		if (this.socktype == NetConst.SOCK_STREAM) {
			this._io.write(buff);
		}
		else if (this.socktype == NetConst.SOCK_DGRAM) {
			if (rinfo) {
				this._io.send(buff, rinfo.port, rinfo.address);
			}
			else {
				this._io.send(buff);
			}
		}
	}

	fin() {
		if (this.socktype != NetConst.SOCK_STREAM) {
			return;
		}
		if (this._waitSendBufferWhenConnecting) {
			this._ready_fin = true;
			return;
		}
		if (this._io) {
			this._io.end();
		}
	}

	_afterConnect() {
		super._afterConnect();
		this._connectPromise = null;
		if (this._waitSendBufferWhenConnecting) {
			this._io.write(this._waitSendBufferWhenConnecting);
			this._waitSendBufferWhenConnecting = null;
		}
		if (self._ready_fin) {
			self._io.end();
		}
	}

	connect(host, port) {
		if (this.socktype == NetConst.SOCK_STREAM) {
			if (this.side != NetChannelBase.CLIENT_SIDE) {
				return false;
			}
			if (NetChannelBase.CONNECT_STATUS_DONE == this._connectStatus) {
				return true;
			}
			if (NetChannelBase.CONNECT_STATUS_NEW != this._connectStatus) {
				return this._connectPromise;
			}
			let self = this;
			return new Promise((resolve) => {
				self._prepareConnect(resolve, false);
				self._io = std_net.createConnection({ host: host, port: port }, () => {
					self._afterConnect();
					resolve(self._ready_fin);
				});
				self.initEvent();
			});
		}
		else if (this.socktype == NetConst.SOCK_DGRAM) {
			try {
				this._io.disconnect();
			} catch (e) { void e; }
			let self = this;
			return new Promise((resolve) => {
				self._io.connect(port, host, (err) => {
					resolve(err ? false : true);
				});
			});
		}
		return false;
	}
}

module.exports = {
	NetConst,
	NetPipelineBase,
	NetChannelBase,
	NetChannel
};
