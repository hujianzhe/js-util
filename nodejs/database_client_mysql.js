const { DatabaseClientPart } = require('./database_client_part.js');
const Mysql2 = require('mysql2');

class DatabaseMysqlClientPart extends DatabaseClientPart {
    constructor(start_num, end_num, conf) {
        super(start_num, end_num, null);
        this.conf = conf;
        this._pool_promise = Mysql2.createPool(conf).promise();
    }

    async execute(strSQL, params) {
        let conn = null;
        try {
            conn = await this._pool_promise.getConnection();
            return await conn.query(strSQL, params);
        }
        catch (e) {
            if (this.fnWriteLog) {
                this.fnWriteLog(`DatabaseMysqlClientPipeline Execute ${Mysql2.format(strSQL, params)} Exception: ${e}`);
            }
            throw e;
        }
        finally {
            if (conn) {
                conn.release();
            }
        }
    }

    async transactionExecute(proc) {
        let conn = null;
        try {
            conn = await this._pool_promise.getConnection();
            await conn.beginTransaction();
            await proc(conn);
            await conn.commit();
        }
        catch (e) {
            if (conn) {
                conn.rollback();
            }
            throw e;
        }
        finally {
            if (conn) {
                conn.release();
            }
        }
    }
}

module.exports = {
    DatabaseMysqlClientPart
};