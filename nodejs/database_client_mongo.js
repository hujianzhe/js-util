const { DatabaseClientPart } = require('./database_client_part.js');
const MongoClient = require('mongodb').MongoClient;

class DatabaseMongodbClientPart extends DatabaseClientPart {
    constructor(start_num, end_num, url, database) {
        super(start_num, end_num, null);
        this.url = url;
        this.database = database;
        this.transOpts = {
            w: "majority",
            j: false,
            wtimeout: 5000
        };
        this._client = null;
        this._db = null;
        this._connectPromise = null;
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
            let client = new MongoClient(self.url);
            try {
                client.connect((err) => {
                    if (err) {
                        resolve(null);
                        return;
                    }
                    if (self.database) {
                        self._db = client.db(self.database);
                        if (!self._db) {
                            client.close();
                            resolve(null);
                            return;
                        }
                    }
                    self._client = client;
                    resolve(client);
                });
            }
            catch (e) {
                resolve(null);
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
}

module.exports = {
    DatabaseMongodbClientPart
};