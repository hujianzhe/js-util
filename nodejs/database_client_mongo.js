const { DatabaseClientPart } = require('./database_client_manager.js');
const MongoClient = require('mongodb').MongoClient;

class DatabaseMongodbClientPart extends DatabaseClientPart {
    constructor(schema, start_num, end_num, url, conn_opt, trans_opt) {
        super(schema, start_num, end_num);
        this.url = url;
        this.connOpts = conn_opt || {};
        this.connOpts.useNewUrlParser = true;
        this.connOpts.useUnifiedTopology = true;
        if (!this.connOpts.serverSelectionTimeoutMS) {
            this.connOpts.serverSelectionTimeoutMS = 5000;
        }
        if (!this.connOpts.socketTimeoutMS) {
            this.connOpts.socketTimeoutMS = 5000;
        }
        this.transOpts = trans_opt ? trans_opt : {
            w: "majority",
            j: false,
            wtimeout: 5000
        };
        this._client = null;
        this._connectPromise = null;
        this._connectResolve = null;
    }

    close() {
        if (this._client) {
            this._client.close();
            this._client = null;
        }
        this._afterConnect();
    }

    async promiseDatabase(db_name) {
        await this._connect();
        if (!this._client) {
            return null;
        }
        return this._client.db(db_name);
    }

    async transactionExecute(proc) {
        let session = this._client.startSession();
        if (!session) {
            return null;
        }
        try {
            await session.withTransaction(proc, this.transOpts);
        }
        catch (e) {
            throw e;
        }
        finally {
            session.endSession();
        }
    }

// private:

    _connect() {
        if (this._client) {
            return this._client;
        }
        if (this._connectPromise) {
            return this._connectPromise;
        }
        let self = this;
        this._connectPromise = new Promise((resolve) => {
            let client = new MongoClient(self.url, self.connOpts);
            self._connectResolve = resolve;
            (async () => {
                try {
                    await client.connect();
                    if (!self._connectResolve) {
                        return;
                    }
                    self._client = client;
                    self._afterConnect(client);
                }
                catch (e) {
                    self._afterConnect(null);
                    self.err = e;
                }
            })();
        });
        return this._connectPromise;
    }

    _afterConnect(retval) {
        if (this._connectResolve) {
            this._connectResolve(retval);
            this._connectResolve = null;
        }
        this._connectPromise = null;
    }
}

module.exports = {
    DatabaseMongodbClientPart
};