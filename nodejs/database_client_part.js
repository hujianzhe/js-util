class DatabaseClientPipeline {
    constructor() {
        this.fnGetHandle = async () => {
            throw new Error("DatabaseClientPipeline must implement interface fnGetHandle");
        };
        this.fnExecute = async (strSQL, params) => {
            void strSQL, params;
            throw new Error("DatabaseClientPipeline must implement interface fnExecute");
        };
        this.fnTransactionExecute = async (proc) => {
            void proc;
            throw new Error("DatabaseClientPipeline must implement interface fnTransactionExecute");
        };
        this.fnEscape = (strSQL) => { return strSQL; };
        this.fnWriteLog = (strContent) => { void strContent; };
    }

    static findInvalidExecuteParam(param, rootErr = '') {
        if (Array.isArray(param)) {
            for (let i = 0; i < param.length; ++i) {
                const strErr = DatabaseClientPipeline.findInvalidExecuteParam(param[i], rootErr + `[${i}]`);
                if (strErr) {
                    return strErr;
                }
            }
            return "";
        }
        if (Object.prototype.toString.call(param) == "[object Object]") {
            const kvMap = Object.entries(param);
            for (const [k, v] of kvMap) {
                const strErr = DatabaseClientPipeline.findInvalidExecuteParam(v, rootErr + `.${k}`);
                if (strErr) {
                    return strErr;
                }
            }
            return "";
        }
        if (null === param) {
            return `${rootErr} is null`;
        }
        if (Object.is(param, NaN)) {
            return `${rootErr} is NaN`;
        }
        if (undefined === param) {
            return `${rootErr} is undefined`;
        }
        return "";
    }

    static findInvalidExecuteParams(params, rootErr = '') {
        for (let i = 0; i < params.length; ++i) {
            const strErr = DatabaseClientPipeline.findInvalidExecuteParam(params[i], rootErr + `[${i}]`);
            if (strErr) {
                return strErr;
            }
        }
        return "";
    }
}

class DatabaseClientPart {
    constructor(start_num, end_num, pipeline) {
        this.partName = null;
        this.startNum = start_num;
        this.endNum = end_num;
        this.pipeline = pipeline;
    }
}

class DatabaseClientPartManager {
    constructor() {
        this.clientParts = new Map(); // key: partName, value: [DatabaseClientPart]
        this.fnConvertValueToPartIdx = (value, partName, partMaxNumber) => {
            void value, partName, partMaxNumber;
            throw new Error("DatabaseClientPartManager must implement interface fnConvertValueToPartIdx");
        };
    }

    selectPipelineByIdx(partName, partIdx) {
        if (typeof partIdx != "bigint" && !Number.isInteger(partIdx)) {
            throw new Error(`DatabaseClientPartManager.selectPart partIdx must bigint or integer`);
        }
        const clientPartArr = this.clientParts.get(partName);
        if (!clientPartArr) {
            return null;
        }
        for (const part of clientPartArr) {
            if (partIdx >= part.startNum && partIdx < part.endNum) {
                return part.pipeline;
            }
        }
        return null;
    }

    selectPipeline(partName, value) {
        const clientPartArr = this.clientParts.get(partName);
        if (!clientPartArr || clientPartArr.length <= 0) {
            return null;
        }
        const maxNumber = clientPartArr[clientPartArr.length - 1].endNum;
        const partIdx = this.fnConvertValueToPartIdx(value, partName, maxNumber);
        for (const part of clientPartArr) {
            if (partIdx >= part.startNum && partIdx < part.endNum) {
                return part.pipeline;
            }
        }
        return null;
    }

    partMaxNumber(partName) {
        const clientPartArr = this.clientParts.get(partName);
        if (!clientPartArr) {
            return 0;
        }
        return clientPartArr[clientPartArr.length - 1].endNum;
    }

    addPart(partName, clientPart) {
        let clientPartArr = this.clientParts.get(partName);
        if (!clientPartArr) {
            clientPart.partName = partName;
            this.clientParts.set(partName, [clientPart]);
            return;
        }
        for (const part of clientPartArr) {
            if (part.startNum < clientPart.startNum && part.endNum <= clientPart.startNum) {
                continue;
            }
            if (part.startNum >= clientPart.endNum && part.endNum > clientPart.endNum) {
                continue;
            }
            throw new Error("DatabaseClientPartManager addPart invalid part range");
        }
        clientPart.partName = partName;
        clientPartArr.push(clientPart);
        clientPartArr.sort((a, b) => {
            return a.endNum - b.endNum;
        });
    }
}

module.exports = {
    DatabaseClientPipeline,
    DatabaseClientPart,
    DatabaseClientPartManager
};