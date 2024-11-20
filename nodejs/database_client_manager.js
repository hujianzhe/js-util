class DatabaseClientPart {
    constructor(start_num, end_num) {
        this.partName = null;
        this.startNum = start_num;
        this.endNum = end_num;
        this.fnWriteLog = null;
    }
}

class DatabaseClientPartManager {
    constructor() {
        this.clientParts = new Map(); // key: partName, value: [DatabaseClientPart]
        this.fnConvertValueToPartIdx = DatabaseClientPartManager.defaultConvertValueToPartIdx;
    }

    static defaultConvertValueToPartIdx(value, partName, partMaxNumber) {
        void partName;
        if (typeof value === 'string') {
            let hash = 5381;
            for (let i = 0; i < string.length; i++) {
                hash = ((hash << 5) + hash) + string.charCodeAt(i);
                hash &= 0xFFFFFFFF;
            }
            return hash % partMaxNumber;
        }
        else if (typeof value === 'bigint') {
            return value / BigInt(partMaxNumber);
        }
        else if (typeof value === 'number') {
            return Number.parseInt(value) / partMaxNumber;
        }
        else {
            throw new Error(`DatabaseClientPartManager.defaultConvertValueToPartIdx can't convert ${value}`);
        }
    }

    selectPartByIdx(partName, partIdx) {
        if (typeof partIdx != "bigint" && !Number.isInteger(partIdx)) {
            throw new Error(`DatabaseClientPartManager.selectPart partIdx must bigint or integer`);
        }
        const clientPartArr = this.clientParts.get(partName);
        if (!clientPartArr) {
            return null;
        }
        for (const part of clientPartArr) {
            if (partIdx >= part.startNum && partIdx < part.endNum) {
                return part;
            }
        }
        return null;
    }

    selectPartByValue(partName, value) {
        const clientPartArr = this.clientParts.get(partName);
        if (!clientPartArr || clientPartArr.length <= 0) {
            return null;
        }
        const maxNumber = clientPartArr[clientPartArr.length - 1].endNum;
        const partIdx = this.fnConvertValueToPartIdx(value, partName, maxNumber);
        for (const part of clientPartArr) {
            if (partIdx >= part.startNum && partIdx < part.endNum) {
                return part;
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
            return true;
        }
        for (const part of clientPartArr) {
            if (part.startNum < clientPart.startNum && part.endNum <= clientPart.startNum) {
                continue;
            }
            if (part.startNum >= clientPart.endNum && part.endNum > clientPart.endNum) {
                continue;
            }
            return false;
        }
        clientPart.partName = partName;
        clientPartArr.push(clientPart);
        clientPartArr.sort((a, b) => {
            return a.endNum - b.endNum;
        });
        return true;
    }
}

module.exports = {
    DatabaseClientPart,
    DatabaseClientPartManager
};