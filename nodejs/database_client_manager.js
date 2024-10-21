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
        this.fnConvertValueToPartIdx = (value, partName, partMaxNumber) => {
            void value, partName, partMaxNumber;
            throw new Error("DatabaseClientPartManager must implement interface fnConvertValueToPartIdx");
        };
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
    DatabaseClientPart,
    DatabaseClientPartManager
};