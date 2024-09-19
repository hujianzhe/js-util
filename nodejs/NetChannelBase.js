const net = require('net');

class NetProtocolCoderBase {
	constructor() {
		this._autoIncrReqId = 0;
	}

	_genReqId() {
		if (this._autoIncrReqId == Number.MAX_SAFE_INTEGER) {
			this._autoIncrReqId = 1;
		}
		else {
			++this._autoIncrReqId;
		}
		return this._autoIncrReqId;
	}

	decode(buff, rinfo) {
		void buff, rinfo;
		throw new Error("NetProtocolCoderBase::decode must implement");
	}
}

class NetChannelPipelineBase {
	constructor() {
		this._reqMap = new Map();
		this.fnIoWrite = null;
		this.fnIoFin = null;
		this.fnIoDestroy = null;
	}

	async handleDecodeObj(channel, decodeObj) {
		void channel; void decodeObj;
		throw new Error("NetChannelPipelineBase::handleDecodeObj must implement");
	}

	newReqObj(reqId, timeout_msec) {
		if (this._reqMap.has(reqId)) { // TOO BUSY...
			return null;
		}
		let self = this;
		let reqObj = {};
		reqObj.tmMsec = Date.now();
		reqObj.timeoutId = null;
		new Promise((resolve) => {
			reqObj.resolve = resolve;
			if (timeout_msec > 0) {
				reqObj.timeoutId = setTimeout(() => {
					self._reqMap.delete(reqId);
					clearTimeout(reqObj.timeoutId);
					resolve(null);
				}, timeout_msec);
			}
		});
		this._reqMap.set(reqId, reqObj);
		return reqObj;
	}

	resumeReqObj(reqId, decodeObj, tmMsec) {
		let reqObj = this._reqMap.get(reqId);
		if (!reqObj) {
			return;
		}
		this._reqMap.delete(reqId);
		decodeObj.costMsec = tmMsec - reqObj.tmMsec;
		if (reqObj.timeoutId) {
			clearTimeout(reqObj.timeoutId);
			reqObj.timeoutId = null;
		}
		reqObj.resolve(decodeObj);
	}

	cancelAllReqObjs() {
		for (let reqObj of this._reqMap) {
			if (reqObj.timeoutId) {
				clearTimeout(reqObj.timeoutId);
				reqObj.timeoutId = null;
			}
			reqObj.resolve(null);
		}
		this._reqMap.clear();
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
		this._ready_fin = false;
		this._waitSendBufferWhenConnecting = null;
		this.sessionObj = null;
	}

	get side() {
		return this._side;
	}

	_onClose(err) {
		if (this._pipeline) {
			this._pipeline.cancelAllReqObjs();
		}
		if (this._io) {
			if (this._pipeline) {
				this._pipeline.fnIoDestroy(this._io);
			}
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
		this._ready_fin = false;
		this._waitSendBufferWhenConnecting = null;

		let sessionObj = this.sessionObj;
		if (sessionObj) {
			this.sessionObj = null;
			sessionObj.channel = null;
			sessionObj.onDisconnect(err, this);
		}
	}

	onReadBuffer(data, rinfo) {
		this._heartbeatTimes = 0;
		this._lastRecvMsec = Date.now();
		this._rbf = Buffer.concat([this._rbf, data]);
		do {
			let decodeObj;
			try {
				decodeObj = this._protoclCoder.decode(this._rbf, rinfo);
				if (!decodeObj) {
					break;
				}
				if (decodeObj.totalLength === undefined || decodeObj.totalLength === null) {
					this._onClose(new Error("NetChannelBase::onReadBuffer miss totalLength field"));
					return;
				}
				if (decodeObj.totalLength < 0) {
					this._onClose(new Error("NetChannelBase::onReadBuffer decode exception"));
					return;
				}
			} catch (e) {
				this._onClose(new Error("NetChannelBase::onReadBuffer decode exception"));
				return;
			}
			this._rbf = this._rbf.subarray(decodeObj.totalLength);
			try {
				this._pipeline.handleDecodeObj(this, decodeObj);
			}
			catch (e) { void e; }
		} while (this._rbf.length > 0);
	}

	fin() {
		if (this._io) {
			this._pipeline.fnIoFin(this._io);
		}
	}

	close() {
		this._onClose();
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
		if (NetChannelBase.SOCK_STREAM == this._socktype) {
			this._io.setNoDelay();
			this._io.on('data', (data) => {
				self.onReadBuffer(data, null);
			});
		}
		else if (NetChannelBase.SOCK_DGRAM == this._socktype) {
			this._io.on('message', (data, rinfo) => {
				self.onReadBuffer(data, rinfo);
			});
		}
		this._io.on('error', (err) => {
			self._onClose(err);
		});
		this._io.on('close', () => {
			self._onClose();
		});
		this._pipeline.fnIoWrite = (io, data) => {
			io.write(data);
		};
		this._pipeline.fnIoFin = (io) => {
			io.end();
		};
		this._pipeline.fnIoDestroy = (io) => {
			io.destroy();
		};
	}

	tcpConnect(host, port, timeout_msec) {
		if (this.side != NetChannelBase.CLIENT_SIDE) {
			return null;
		}
		if (this._socktype != NetChannelBase.SOCK_STREAM) {
			return null;
		}
		if (NetChannelBase.CONNECT_STATUS_NEW != this._connectStatus) {
			return this;
		}
		let self = this;
		this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
		this._pipeline.fnIoFin = (io) => {
			if (self._waitSendBufferWhenConnecting && self._waitSendBufferWhenConnecting.length > 0) {
				self._ready_fin = true;
				return;
			}
			io.end();
		};
		this._pipeline.fnIoDestroy = (io) => {
			io.destroy();
		};
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
				if (self._ready_fin) {
					self._io.end();
					resolve(null);
				}
				else {
					resolve(self);
				}
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

class NetBridgeClientHub extends NetChannelBase {
	constructor(pipeline, protocolCoder, io) {
		super(pipeline, protocolCoder, io, NetChannelBase.CLIENT_SIDE, 0);
		this.publishChannel = new Map();
		this.subscribeChannel = new Map();
	}

	getChannel(side, key) {
		if (NetChannelBase.PUBLISH_SIDE == side) {
			return this.publishChannel.get(key);
		}
		else if (NetChannelBase.SUBSCRIBE_SIDE == side) {
			return this.subscribeChannel.get(key);
		}
		return null;
	}

	addChannel(key, channel) {
		if (NetChannelBase.PUBLISH_SIDE == channel._side) {
			channel._connectStatus = this._connectStatus;
			this.publishChannel.set(key, channel);
		}
		else if (NetChannelBase.SUBSCRIBE_SIDE == channel._side) {
			this.subscribeChannel.set(key, channel);
		}
		else {
			return;
		}
		channel._io = this._io;
		channel._pipeline.fnIoDestroy = (io) => { void io; };
        channel._pipeline.fnIoFin = (io) => { void io; }
	}

	_onConnectSuccess() {
		this._connectResolve = null;
		this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
		for (let pub_ch of this.publishChannel.values()) {
			pub_ch._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
			pub_ch._writeConnectingCacheData();
		}
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
		this.channel = null;
	}

	replaceChannel(new_channel) {
		let old_channel = this.channel;
		if (old_channel === new_channel) {
			return;
		}
		if (old_channel) {
			old_channel.sessionObj = null;
		}
		if (new_channel) {
			new_channel.sessionObj = this;
		}
		this.channel = new_channel;
	}

	async onDisconnect(err, old_ch) { void err; void old_ch; }
}

module.exports = {
	NetProtocolCoderBase,
	NetChannelPipelineBase,
	NetChannelBase,
	NetBridgeClientHub,
	NetSessionBase
};
