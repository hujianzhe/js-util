const net = require('net');

class NetProtocolCoderBase {
	constructor() {
	}

	decode(buff) {
		void buff;
		throw new Error("NetProtocolCoderBase::decode must implement");
	}
}

class NetChannelPipelineBase {
	constructor() {
		this._reqMap = new Map();

		this.fnCmdDispatch = null;
		this.fnIoDestroy = null;
		this.fnIoWrite = null;
		this.fnIoFin = null;
	}

	_genReqId() {
		throw new Error("NetChannelPipelineBase::_genReqId must implement");
	}

	async handleRecvObj(channel, recvObj) {
		void channel; void recvObj;
		throw new Error("NetChannelPipelineBase::handleRecvObj must implement");
	}

	newReqObj(timeout_msec) {
		const req = this._genReqId();
		if (this._reqMap.has(req)) { // TOO BUSY...
			return null;
		}
		let self = this;
		let reqObj = {};
		reqObj.req = req;
		reqObj.tmMsec = Date.now();
		reqObj.timeoutId = null;
		reqObj.promise = new Promise((resolve) => {
			reqObj.resolve = resolve;
			if (timeout_msec > 0) {
				reqObj.timeoutId = setTimeout(() => {
					self._reqMap.delete(req);
					clearTimeout(reqObj.timeoutId);
					resolve(null);
				}, timeout_msec);
			}
		});
		this._reqMap.set(req, reqObj);
		return reqObj;
	}

	resumeReqObj(reqId, recvObj, tmMsec) {
		let reqObj = this._reqMap.get(reqId);
		if (reqObj) {
			this._reqMap.delete(reqId);
			recvObj.costMsec = tmMsec - reqObj.tmMsec;

			if (reqObj.timeoutId) {
				clearTimeout(reqObj.timeoutId);
				reqObj.timeoutId = null;
			}
			reqObj.promise = null;
			reqObj.resolve(recvObj);
		}
	}
}

class NetChannelBase {
	static CLIENT_SIDE = 1;
	static SERVER_SIDE = 2;
	static PUBLISH_SIDE = 3;
	static SUBSCRIBE_SIDE = 4;

	static CONNECT_STATUS_NEW = 0;
	static CONNECT_STATUS_DOING = 1;
	static CONNECT_STATUS_DONE = 2;

	static SOCK_STREAM = 1;
	static SOCK_DGRAM = 2;

	constructor(pipeline, protocolCoder, io, side, socktype) {
		this._io = io;
		this._socktype = socktype;
		this._rbf = Buffer.alloc(0);
		this._heartbeatTimeout = null;
		this._heartbeatTimes = 0;
		this._lastRecvMsec = 0;
		this._protoclCoder = protocolCoder;
		this._pipeline = pipeline;
		this._side = side;
		this._connectStatus = NetChannelBase.CONNECT_STATUS_NEW;
		this._connectResolve = null;
		this._waitSendBufferWhenConnecting = Buffer.alloc(0);

		this.publishKey = null;
		this.sessionObj = null;
	}

	get side() {
		return this._side;
	}

	_onClose(err) {
		if (this._io) {
			this._pipeline.fnIoDestroy(this._io);
			this._io = null;
		}
		if (this._heartbeatTimeout) {
			clearTimeout(this._heartbeatTimeout);
			this._heartbeatTimeout = null;
		}
		if (this._connectResolve) {
			this._connectResolve(null);
			this._connectResolve = null;
		}
		this._waitSendBufferWhenConnecting = null;

		let sessionObj = this.sessionObj;
		if (sessionObj) {
			this.sessionObj = null;
			sessionObj.tmChannel = null;
			sessionObj.onDisconnect(err, this);
		}
	}

	onReadBuffer(data) {
		this._heartbeatTimes = 0;
		this._lastRecvMsec = Date.now();
		this._rbf = Buffer.concat([this._rbf, data]);
		while (true) {
			if (NetChannelBase.SOCK_STREAM == this._socktype) {
				if (this._rbf.length <= 0) {
					this._pipeline.fnIoFin(this._io);
					break;
				}
			}
			let recvObj = this._protoclCoder.decode(this._rbf);
			if (!recvObj) {
				break;
			}
			this._rbf = this._rbf.subarray(recvObj.totalLen);
			try {
				this._pipeline.handleRecvObj(this, recvObj);
			}
			catch (e) { void e; }
		}
	}

	fin() {
		if (this._io) {
			this._pipeline.fnIoFin(this._io);
		}
	}

	_writeConnectingCacheData() {
		let buff = this._waitSendBufferWhenConnecting;
		if (!buff) {
			return;
		}
		this._waitSendBufferWhenConnecting = null;
		this._pipeline.fnIoWrite(this._io, buff);
	}

	write(buff) {
		if (this._io) {
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
			this._pipeline.fnIoWrite(this._io, buff);
		}
	}

	useStdNetEvent() {
		let self = this;
		this._io.setNoDelay();
		this._io.on('data', (data) => {
			self.onReadBuffer(data);
		});
		this._io.on('error', (err) => {
			self._onClose(err);
		});
		this._io.on('close', () => {
			self._onClose();
		});
		this._pipeline.fnIoDestroy = (io) => {
			io.destroy();
		};
		this._pipeline.fnIoWrite = (io, data) => {
			io.write(data);
		};
		this._pipeline.fnIoFin = (io) => {
			io.end();
		};
	}

	tcpConnect(host, port, timeout_msec) {
		if (this.side != NetChannelBase.CLIENT_SIDE) {
			return null;
		}
		if (NetChannelBase.CONNECT_STATUS_NEW != this._connectStatus) {
			return this;
		}
		this._socktype = NetChannelBase.SOCK_STREAM;
		this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
		let self = this;
		return new Promise((resolve) => {
			self._connectResolve = resolve;
			let conn_timeout_id = null;
			if (timeout_msec > 0) {
				conn_timeout_id = setTimeout(() => {
					clearTimeout(conn_timeout_id);
					self._connectResolve = null;
					self._io.destroy();
					self._io = null;
					self._onClose(new Error("NetChannelBase connect timeout"));
					resolve(null);
				}, timeout_msec);
			}
			self._io = net.createConnection({ host: host, port: port }, () => {
				self._connectResolve = null;
				self._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
				if (conn_timeout_id) {
					clearTimeout(conn_timeout_id);
				}
				self.useStdNetEvent();
				self._writeConnectingCacheData();
				resolve(self);
			});
		});
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
				++self._heartbeatTimes;
				fnHeartbeat(self);
				self._heartbeatTimeout = setTimeout(fn, interval);
				return;
			}
			self._heartbeatTimeout = null;
			self._onClose(new Error("NetChannelBase client hearbeat timeout"));
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
			self._onClose(new Error("NetChannelBase server hearbeat timeout"));
		}
		self._heartbeatTimeout = setTimeout(fn, interval);
	}
}

class NetBridgeClientChannel extends NetChannelBase {
	constructor(pipeline, protocolCoder, io) {
		super(pipeline, protocolCoder, io, NetChannelBase.CLIENT_SIDE, 0);
		this.publishChannel = new Map();
		this.subscribeChannel = new Map();
	}

	setClientSideHeartbeat(fnHeartbeat, interval, maxTimes) {
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
				++self._heartbeatTimes;
				fnHeartbeat(self);
				self._heartbeatTimeout = setTimeout(fn, interval);
				return;
			}
			self._heartbeatTimeout = null;
			const err = new Error("TaomeeBridgeChannel hearbeat timeout");
			for (const channel of self.publishChannel) {
				try {
					channel._onClose(err);
				} catch (e) { void e; }
			}
			for (const channel of self.subscribeChannel) {
				try {
					channel._onClose(err);
				} catch (e) { void e; }
			}
			self._onClose(err);
		};
		self._heartbeatTimeout = setTimeout(fn, interval);
	}
}

class NetSessionBase {
	constructor(id) {
		this.id = id;
		this.tmChannel = null;
	}

	replaceChannel(new_tmChannel) {
		let old_tmChannel = this.tmChannel;
		if (old_tmChannel === new_tmChannel) {
			return;
		}
		if (old_tmChannel) {
			old_tmChannel.sessionObj = null;
		}
		if (new_tmChannel) {
			new_tmChannel.sessionObj = this;
		}
		this.tmChannel = new_tmChannel;
	}

	async onDisconnect(err, old_ch) { void err; void old_ch; }
}

module.exports = {
	NetProtocolCoderBase,
	NetChannelPipelineBase,
	NetChannelBase,
	NetBridgeClientChannel,
	NetSessionBase
};
