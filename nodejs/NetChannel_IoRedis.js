const { NetChannelBase, NetBridgeChannel } = require('./NetChannelBase.js');
const Redis = require("ioredis");

class NetBridgeChannel_IoRedisBase extends NetBridgeChannel {
    constructor(pipeline) {
        super(pipeline, null, null);
    }

    setHeartbeat(interval, maxTimes) {
        super.setClientSideHeartbeat((tmChannel)=>{
            tmChannel._heartbeatTimes = 0;
            tmChannel._io.ping();
        }, interval, maxTimes);
    }

    useEvent() {
        let self = this;
        this._io.on('error', (err) => {
            self._onClose(err);
        });
        this._io.on('close', () => {
            self._onClose();
        });
        this._pipeline.fnIoDestroy = (io) => {
			io.quit();
		};
		this._pipeline.fnIoFin = (io) => {
			io.quit();
		};
    }
}

class NetPublisher_IoRedis extends NetBridgeChannel_IoRedisBase {
    constructor(pipeline) {
        super(pipeline);
    }

    getChannel(publishKey) {
        return this.publishChannel.get(publishKey);
    }

    setPublish(dstPublishKey, srcPublishKey, tmChannel) {
        tmChannel._io = this._io;
        tmChannel.publishKey = srcPublishKey;
        tmChannel._connectStatus = this._connectStatus;
        tmChannel._pipeline.fnIoDestroy = (io) => { void io; };
        tmChannel._pipeline.fnIoFin = (io) => { void io; }
        tmChannel._pipeline.fnIoWrite = (io, data) => {
            io.publishBuffer(dstPublishKey, data);
        }
        this.publishChannel.set(dstPublishKey, tmChannel);
    }

    connect(args) {
        if (this._connectStatus != NetChannelBase.CONNECT_STATUS_NEW) {
            return this;
        }
        this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
        let self = this;
        return new Promise((resolve) => {
            self._connectResolve = resolve;
            self._io = new Redis(args);
            self.useEvent();
            self._io.on('ready', () => {
                self._connectResolve = null;
                this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
                for (let ch of this.publishChannel.values()) {
                    ch._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
                    ch._writeConnectingCacheData();
                }
                resolve(self);
            });
        });
    }
}

class NetSubscriber_IoRedis extends NetBridgeChannel_IoRedisBase {
    constructor(pipeline) {
        super(pipeline);
    }

    useEvent() {
        super.useEvent();
        let self = this;
        this._io.on('messageBuffer', (bufferSubscribeKey, data) => {
            const subscribeKey = bufferSubscribeKey.toString();
            const tmChannel = self.subscribeChannel.get(subscribeKey);
            if (!tmChannel) {
                return;
            }
            tmChannel.onReadBuffer(data);
        });
    }

    connect(args) {
        if (this._connectStatus != NetChannelBase.CONNECT_STATUS_NEW) {
            return this;
        }
        this._connectStatus = NetChannelBase.CONNECT_STATUS_DOING;
        let self = this;
        return new Promise((resolve) => {
            self._connectResolve = resolve;
            self._io = new Redis(args);
            self.useEvent();
            self._io.on('ready', () => {
                self._connectResolve = null;
                this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
                resolve(self);
            });
        });
    }

    getChannel(subscribeKey) {
        return this.subscribeChannel.get(subscribeKey);
    }

    setSubscribe(subscribeKey, tmChannel) {
        tmChannel._io = this._io;
        tmChannel._pipeline.fnIoDestroy = (io) => { void io; };
        tmChannel._pipeline.fnIoFin = (io) => { void io; }
        tmChannel._pipeline.fnIoWrite = (io, data) => { void io; void data; }
        this.subscribeChannel.set(subscribeKey, tmChannel);
        let self = this;
        return new Promise((resolve) => {
            self._io.subscribe(subscribeKey, (err) => {
                resolve(err);
            });
        });
    }
}

module.exports = {
    NetPublisher_IoRedis,
    NetSubscriber_IoRedis
};