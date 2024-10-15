const { DatabaseClientPipeline } = require('./DatabaseClientPart.js');
const Mysql2 = require('mysql2');

class DatabaseMysqlClientPipeline extends DatabaseClientPipeline {
    constructor(conf) {
        super();
        this.conf = conf;
        this.pool_promise_ = Mysql2.createPool(conf).promise();

        this.fnGetHandle = async () => {
            return await this.pool_promise_.getConnection();
        };
        this.fnExecute = async (strSQL, params) => {
            let conn = null;
            try {
                conn = await this.fnGetHandle();
                const [rows] = await conn.query(strSQL, params);
                return rows;
            }
            catch (e) {
                this.fnWriteLog(`DatabaseMysqlClientPipeline Execute ${Mysql2.format(strSQL, params)} Exception: ${e}`);
                throw e;
            }
            finally {
                if (conn) {
                    conn.release();
                }
            }
        };
        this.fnTransactionExecute = async (proc) => {
            let conn = null;
            try {
                conn = await this.fnGetHandle();
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
        };
        this.fnEscape = (strSQL) => {
            return Mysql2.escape(strSQL);
        };
    }
}

module.exports = {
    DatabaseMysqlClientPipeline
};