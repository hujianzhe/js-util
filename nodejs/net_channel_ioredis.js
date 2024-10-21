const { NetConst, NetChannelBase, NetPipelineBase } = require('./net_channel_base.js');
const Redis = require("ioredis");

class NetIoRedisClientChannel extends NetChannelBase {
    static _pipeline = null;

    constructor() {
        super(NetChannelBase.CLIENT_SIDE, NetIoRedisClientChannel._pipeline, null, NetConst.SOCK_STREAM);
        this.managedClose = true;
        this.fnOnSubscribe = null;
    }

    close(err) {
        if (this._io) {
            this._io.quit();
        }
        super.close(err);
    }

    connect(args) {
        if (NetChannelBase.CONNECT_STATUS_DONE == this._connectStatus) {
            return true;
        }
        if (NetChannelBase.CONNECT_STATUS_NEW != this._connectStatus) {
            return this._connectPromise;
        }
        let self = this;
        this._connectPromise = new Promise((resolve) => {
            self._prepareConnect(resolve, false);
            self._io = new Redis(args);
            self._io.on('ready', () => {
                self._afterConnect();
                self.startHeartbeat();
                resolve(true);
            });
            self._io.on('error', (err) => {
                if (self.managedClose) {
                    self.close(err);
                }
            });
            self._io.on('close', () => {
                self.close();
            });
            const fnOnSubscribe = self.fnOnSubscribe;
            if (fnOnSubscribe) {
                self._io.on('messageBuffer', (bufferSubscribeKey, data) => {
                    fnOnSubscribe(self, bufferSubscribeKey.toString(), data);
                });
            }
        });
        return this._connectPromise;
    }
}

if (!NetIoRedisClientChannel._pipeline) {
    NetIoRedisClientChannel._pipeline = new NetPipelineBase();
    NetIoRedisClientChannel._pipeline.fnHeartbeat = (channel) => {
        channel._heartbeatTimes = 0;
        channel._io.ping();
    };
}

module.exports = {
    NetIoRedisClientChannel
};