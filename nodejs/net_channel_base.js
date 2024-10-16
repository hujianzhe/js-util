const net = require('net');

class NetChannelPipelineBase {
	constructor() {
		this.fnReadBuffer = function (buff, rinfo) {
			void buff, rinfo;
			return null;
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

	static SOCK_STREAM = 1;
	static SOCK_DGRAM = 2;

	static string2socktype(s) {
		switch (s) {
			case 'SOCK_STREAM':
				return NetChannelBase.SOCK_STREAM;
			case 'SOCK_DGRAM':
				return NetChannelBase.SOCK_DGRAM;
		}
		return 0;
	}
	
	static socktype2string(socktype) {
		switch (socktype) {
			case NetChannelBase.SOCK_STREAM:
				return 'SOCK_STREAM';
			case NetChannelBase.SOCK_DGRAM:
				return 'SOCK_DGRAM';
		}
		return '';
	}

	constructor(pipeline, io, side, socktype) {
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
	constructor(pipeline, io, side, socktype) {
		super(pipeline, io, side, socktype);
		this._rbf = Buffer.alloc(0);
		this._ready_fin = false;
		this._waitSendBufferWhenConnecting = null;
		this._initedEvent = false;
		if (this._io) {
			this.initEvent();
			if (this.side == NetChannel.SERVER_SIDE) {
				this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
			}
		}
	}

	initEvent() {
		if (this._initedEvent) {
			return;
		}
		this._initedEvent = true;
		let self = this;
		if (NetChannelBase.SOCK_STREAM == this._socktype) {
			this._io.setNoDelay();
			this._io.on('data', (data) => {
				self.readBuffer(data, null);
			});
		}
		else if (NetChannelBase.SOCK_DGRAM == this._socktype) {
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
			this._io.destroy();
		}
		super.close(err);
	}

	readBuffer(data, rinfo) {
		this._heartbeatTimes = 0;
		this._lastRecvMsec = Date.now();
		this._rbf = Buffer.concat([this._rbf, data]);
		do {
			let decodeObj;
			try {
				decodeObj = this._pipeline.fnReadBuffer(this._rbf, rinfo);
				if (!decodeObj) {
					break;
				}
				if (decodeObj.totalLength === undefined || decodeObj.totalLength === null) {
					this.close(new Error("NetChannelBase::readBuffer miss totalLength field"));
					return;
				}
				if (decodeObj.totalLength < 0) {
					this.close(new Error("NetChannelBase::readBuffer decode exception"));
					return;
				}
			} catch (e) {
				this.close(new Error("NetChannelBase::readBuffer decode exception"));
				return;
			}
			this._rbf = this._rbf.subarray(decodeObj.totalLength);
		} while (this._rbf.length > 0);
	}

	send(buff) {
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
		this._io.write(buff);
	}

	fin() {
		if (this._waitSendBufferWhenConnecting) {
			this._ready_fin = true;
			return;
		}
		if (this._io) {
			this._io.end();
		}
	}

	tcpConnect(host, port) {
		if (this.side != NetChannelBase.CLIENT_SIDE) {
			return false;
		}
		if (this._socktype != NetChannelBase.SOCK_STREAM) {
			return false;
		}
		if (NetChannelBase.CONNECT_STATUS_DONE == this._connectStatus) {
			return true;
		}
		if (NetChannelBase.CONNECT_STATUS_NEW != this._connectStatus) {
			return false;
		}
		let self = this;
		return new Promise((resolve) => {
			self._prepareConnect(resolve, false);
			self._io = net.createConnection({ host: host, port: port }, () => {
				self._afterConnect();
				if (this._waitSendBufferWhenConnecting) {
					this._io.write(this._waitSendBufferWhenConnecting);
					this._waitSendBufferWhenConnecting = null;
				}
				if (self._ready_fin) {
					self._io.end();
					resolve(false);
				}
				else {
					resolve(true);
				}
			});
			self.initEvent();
		});
	}
}

module.exports = {
	NetChannelPipelineBase,
	NetChannelBase,
	NetChannel
};
