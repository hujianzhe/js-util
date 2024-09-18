const { NetChannelBase, NetBridgeClientHub } = require('./NetChannelBase.js');
const Redis = require("ioredis");

class NetIoRedisClientHub extends NetBridgeClientHub {
    constructor(pipeline) {
        super(pipeline, null, null);
    }

    setHeartbeat(interval, maxTimes) {
        super.setClientSideHeartbeat((channel)=>{
            channel._heartbeatTimes = 0;
            channel._io.ping();
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

class NetIoRedisPublishClientHub extends NetIoRedisClientHub {
    constructor(pipeline) {
        super(pipeline);
    }

    addPublish(dstPublishKey, srcPublishKey, channel) {
        if (NetChannelBase.PUBLISH_SIDE != channel._side) {
            return;
        }
        channel.publishKey = srcPublishKey;
        channel._pipeline.fnIoWrite = (io, data) => {
            io.publishBuffer(dstPublishKey, data);
        }
        this.addChannel(dstPublishKey, channel);
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
                self._onConnectSuccess();
                resolve(self);
            });
        });
    }
}

class NetIoRedisSubscribeClientHub extends NetIoRedisClientHub {
    constructor(pipeline) {
        super(pipeline);
    }

    useEvent() {
        super.useEvent();
        let self = this;
        this._io.on('messageBuffer', (bufferSubscribeKey, data) => {
            const subscribeKey = bufferSubscribeKey.toString();
            const channel = self.subscribeChannel.get(subscribeKey);
            if (!channel) {
                return;
            }
            channel.onReadBuffer(data);
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
                self._onConnectSuccess();
                resolve(self);
            });
        });
    }

    async addSubscribe(subscribeKey, channel) {
        if (NetChannelBase.SUBSCRIBE_SIDE != channel._side) {
            return new Error("NetIoRedisSubscribeClientHub::addSubscribe channel._side != SUBSCRIBE_SIDE");
        }
        channel._pipeline.fnIoWrite = (io, data) => { void io; void data; }
        let self = this;
        const err = await new Promise((resolve) => {
            self._io.subscribe(subscribeKey, (err) => {
                resolve(err);
            });
        });
        if (!err) {
            this.addChannel(subscribeKey, channel);
        }
        return err;
    }
}

module.exports = {
    NetIoRedisPublishClientHub,
    NetIoRedisSubscribeClientHub
};