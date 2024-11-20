const { DatabaseClientPart } = require('./database_client_manager.js');
const MongoClient = require('mongodb').MongoClient;

class DatabaseMongodbClientPart extends DatabaseClientPart {
    constructor(start_num, end_num, url, conn_opt, trans_opt) {
        super(start_num, end_num, null);
        this.url = url;
        this.connOpts = conn_opt || {};
        this.connOpts.useNewUrlParser = true;
        this.connOpts.useUnifiedTopology = true;
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

    connect() {
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
            try {
                client.connect((err) => {
                    if (!self._connectResolve) {
                        return;
                    }
                    if (err) {
                        self._afterConnect(null);
                        return;
                    }
                    self._client = client;
                    self._afterConnect(client);
                });
            }
            catch (e) {
                self._afterConnect(null);
                self.err = e;
                throw e;
            }
        });
        return this._connectPromise;
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