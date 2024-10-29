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
		this.fnHeartbeat = function (channel) {
			void channel;
		}
	}
}

class NetChannelBase {
	static CLIENT_SIDE = 1;
	static SERVER_SIDE = 2;
	static LISTEN_SIDE = 3;

	static CONNECT_STATUS_NEW = 0;
	static CONNECT_STATUS_DOING = 1;
	static CONNECT_STATUS_DONE = 2;

	constructor(side, pipeline, io, socktype) {
		this._pipeline = pipeline;
		this._io = io;
		this._side = side;
		this._socktype = socktype;

		this._connectPromise = null;
		this._connectResolve = null;
		this._connectStatus = NetChannelBase.CONNECT_STATUS_NEW;
		this._connectTimerId = null;
		this._heartbeatTimerId = null;
		this._heartbeatTimes = 0;
		this._lastRecvMsec = 0;
		this._alreadyExecClosed = false;

		// public
		this.error = null;
		this.heartbeatSender = (side == NetChannelBase.CLIENT_SIDE);
		this.heartbeatTimeoutMsec = 0;
		this.heartbeatMaxTimes = 0;
		this.connectTimeoutMsec = 5000;
		this.session = null;
	}

	get side() {
		return this._side;
	}

	get socktype() {
		return this._socktype;
	}

	get io() {
		return this._io;
	}

	close(err) {
		this._io = null;
		this.error = err;
		if (this._connectTimerId) {
			clearTimeout(this._connectTimerId);
			this._connectTimerId = null;
		}
		this._connectPromise = null;
		if (this._connectResolve) {
			this._connectResolve();
			this._connectResolve = null;
		}
		if (this._heartbeatTimerId) {
			clearTimeout(this._heartbeatTimerId);
			this._heartbeatTimerId = null;
		}
		if (!this._alreadyExecClosed) {
			this._alreadyExecClosed = true;
			if (this._pipeline) {
				this._pipeline.fnHandleClose(this, err);
			}
		}
	}

	_prepareConnect(resolve, resolve_ret) {
		this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
		this._connectResolve = resolve;
		if (this.connectTimeoutMsec > 0) {
			let self = this;
			this._connectTimerId = setTimeout(() => {
				if (self._connectResolve) {
					self._connectResolve(resolve_ret);
					self._connectResolve = null;
				}
				self.close(new Error("NetChannel connect timeout"));
			}, this.connectTimeoutMsec);
		}
	}

	_afterConnect(resolve_ret) {
		this._connectPromise = null;
		if (this._connectResolve) {
			this._connectResolve(resolve_ret);
			this._connectResolve = null;
		}
		this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
		if (this._connectTimerId) {
			clearTimeout(this._connectTimerId);
			this._connectTimerId = null;
		}
	}

	startHeartbeat() {
		if (this.heartbeatTimeoutMsec <= 0) {
			return;
		}
		if (NetChannelBase.CONNECT_STATUS_DONE != this._connectStatus) {
			return;
		}
		if (this._heartbeatTimerId) {
			clearTimeout(this._heartbeatTimerId);
			this._heartbeatTimerId = null;
		}
		let self = this;
		this._heartbeatTimerId = setTimeout(function fn() {
			if (!self.heartbeatSender) {
				const tmMsec = Date.now();
				const endMsec = self._lastRecvMsec + self.heartbeatTimeoutMsec;
				if (tmMsec < endMsec) {
					clearTimeout(self._heartbeatTimerId);
					self._heartbeatTimerId = setTimeout(fn, endMsec - tmMsec);
					return;
				}
			}
			if (self._heartbeatTimes >= self.heartbeatMaxTimes) {
				self.close(new Error("NetChannelBase client hearbeat timeout"));
				return;
			}
			clearTimeout(self._heartbeatTimerId);
			++self._heartbeatTimes;
			if (self.heartbeatSender) {
				self._pipeline.fnHeartbeat(self);
			}
			self._heartbeatTimerId = setTimeout(fn, self.heartbeatTimeoutMsec);
		}, this.heartbeatTimeoutMsec);
	}
}

class NetChannelTcpListener extends NetChannelBase {
	constructor(on_accept, ip, port) {
		super(NetChannelBase.LISTEN_SIDE, null, null, NetConst.SOCK_STREAM);
		this._onAccept = on_accept;
		this._ip = ip;
		this._port = port;
		this._listenPromise = null;
		this._listenResolve = null;
	}

	get ip() {
		return this._ip;
	}

	get port() {
		return this._port;
	}

	listen() {
		if (this._io) {
			if (this._listenPromise) {
				return this._listenPromise;
			}
			return true;
		}
		this._io = std_net.createServer(this._onAccept);
		let self = this;
		this._listenPromise = new Promise((resolve) => {
			self._listenResolve = resolve;
			self._io.on('error', (err) => {
				self._listenPromise = null;
				if (self._listenResolve) {
					self._listenResolve(false);
					self._listenResolve = null;
				}
				self.close(err);
			});
			self._io.on('listening', () => {
				self._listenPromise = null;
				if (self._listenResolve) {
					self._listenResolve(true);
					self._listenResolve = null;
				}
			});
			self._io.listen(self._port, self._ip);
		});
		return this._listenPromise;
	}

	close(err) {
		if (this._io) {
			this._io.close();
		}
		if (this._listenResolve) {
			this._listenResolve();
			this._listenResolve = null;
		}
		this._listenPromise = null;
		super.close(err);
	}
}

class NetChannel extends NetChannelBase {
	constructor(side, pipeline, io, socktype) {
		if (side == NetChannelBase.LISTEN_SIDE) {
			throw new Error("NetChannel constructor not support LISTEN_SIDE");
		}
		super(side, pipeline, io, socktype);
		this._rbf = Buffer.alloc(0);
		this._ready_fin = false;
		this._waitSendBufferWhenConnecting = null;
		this._initedEvent = false;
		if (!this._io && (this.socktype != NetConst.SOCK_STREAM || this.side != NetChannelBase.CLIENT_SIDE)) {
			throw new Error("NetChannel constructor must have valid param: io");
		}
		if (this._io) {
			this.initEvent();
			if (this.socktype == NetConst.SOCK_STREAM && this._io.connecting) {
				this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
				let self = this;
				self._connectPromise = new Promise((resolve) => {
					self._prepareConnect(resolve, false);
					self._io.on('connect', () => {
						self._afterConnect(!self._ready_fin);
					});
				});
			}
		}
		if (this.socktype != NetConst.SOCK_STREAM || this.side != NetChannelBase.CLIENT_SIDE) {
			this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
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
		if (this.socktype == NetConst.SOCK_STREAM) {
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

	_afterConnect(resolve_ret) {
		if (!this._io) {
			return;
		}
		super._afterConnect(resolve_ret);
		if (this._waitSendBufferWhenConnecting) {
			this._io.write(this._waitSendBufferWhenConnecting);
			this._waitSendBufferWhenConnecting = null;
		}
		if (this._ready_fin) {
			this._io.end();
		}
		else {
			this.startHeartbeat();
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
			this._connectPromise = new Promise((resolve) => {
				self._prepareConnect(resolve, false);
				self._io = std_net.createConnection({ host: host, port: port }, () => {
					self._afterConnect(!self._ready_fin);
				});
				self.initEvent();
			});
			return this._connectPromise;
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
	NetChannelTcpListener,
	NetChannel
};
