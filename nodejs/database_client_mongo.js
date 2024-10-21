const { DatabaseClientPart } = require('./database_client_part.js');
const MongoClient = require('mongodb').MongoClient;

class DatabaseMongodbClientPart extends DatabaseClientPart {
    constructor(start_num, end_num, url, database) {
        super(start_num, end_num, null);
        this.url = url;
        this.database = database;
        this._client = null;
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
                        client.db(self.database);
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
}

module.exports = {
    DatabaseMongodbClientPart
};