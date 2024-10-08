const { NetChannelBase, NetBridgeClientHub, NetChannelPipelineBase } = require('./NetChannelBase.js');
const Redis = require("ioredis");

class NetIoRedisClientHubBase extends NetBridgeClientHub {
    constructor(pipeline) {
        super(pipeline, null);
    }

    setHeartbeat(interval, maxTimes) {
        super.setClientSideHeartbeat((channel)=>{
            channel._heartbeatTimes = 0;
            channel._io.ping();
        }, interval, maxTimes);
    }

    _useEvent() {
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

class NetIoRedisPublishClientHub extends NetIoRedisClientHubBase {
    constructor() {
        super(new NetChannelPipelineBase());
    }

    addPublish(publishKey, channel) {
        if (NetChannelBase.PUBLISH_SIDE != channel._side) {
            return;
        }
        channel._pipeline.fnIoWrite = (io, data) => {
            io.publishBuffer(publishKey, data);
        }
        this.addChannel(publishKey, channel);
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
            self._useEvent();
            self._io.on('ready', () => {
                self._onConnectSuccess();
                resolve(self);
            });
        });
    }
}

class NetIoRedisSubscribeClientHub extends NetIoRedisClientHubBase {
    constructor() {
        super(new NetChannelPipelineBase());
    }

    _useEvent() {
        super._useEvent();
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
            self._useEvent();
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