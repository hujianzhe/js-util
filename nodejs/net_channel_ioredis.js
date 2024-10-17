const { NetConst, NetChannelBase, NetPipelineBase } = require('./net_channel_base.js');
const Redis = require("ioredis");

class NetIoRedisClientChannel extends NetChannelBase {
    constructor(io) {
        super(NetChannelBase.CLIENT_SIDE, new NetPipelineBase(), io, NetConst.SOCK_STREAM);
        this._enableSubscribeEvent = false;
        if (io) {
            this._connectStatus = NetChannelBase.CONNECT_STATUS_DONE;
            let self = this;
            this._io.on('error', (err) => {
                self.close(err);
            });
            this._io.on('close', () => {
                self.close();
            });
        }
        this._pipeline.fnHeartbeat = (channel) => {
            channel._heartbeatTimes = 0;
            channel._io.ping();
        };
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
                resolve(true);
            });
            self._io.on('error', (err) => {
                self.close(err);
            });
            self._io.on('close', () => {
                self.close();
            });
        });
        return this._connectPromise;
    }

    setHeartbeat(interval, maxTimes) {
        super.setClientSideHeartbeat((channel) => {
            channel._heartbeatTimes = 0;
            channel._io.ping();
        }, interval, maxTimes);
    }

    enableSubscribe(fnOnSubscribe) {
        if (this._enableSubscribeEvent) {
            return;
        }
        this._enableSubscribeEvent = true;
        this._io.on('messageBuffer', (bufferSubscribeKey, data) => {
            fnOnSubscribe(bufferSubscribeKey.toString(), data);
        });
    }
}

module.exports = {
    NetIoRedisClientChannel
};