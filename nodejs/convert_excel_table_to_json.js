const std_process = require('process');
const std_path = require('path');
const std_fs = require('fs');
const XLSX = require('xlsx');

// 自定义数据
const TableMetaData = {
    basicTypes: new Set([
        'int',
        'float',
        'double',
        'string',
        'json',
    ]), // 支持的基本数据类型

    typedef: new Map(), // 支持的类型重定义

    fieldLineNo: 2, // 字段名称起始行号(从1开始)
    typeLineNo: 3,  // 字段类型起始行号(从1开始)
    dataLineNo: 4,   // 数据起始行号(从1开始)

    scanExcelDir: './',  // 扫描Excel文件的目录
    scanExceptFileNames: new Set([]), // 目录中需要排除的Excel文件名
    outputJsonDir: './', // 生成的JSON文件存放目录
};

//////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// 具体实现开始 //////////////////////////////
//////////////////////////////////////////////////////////////////////////////

// 字段类型检查
function fieldTypeIsExist(fieldType) {
    let basicType = fieldType;
    let idx = fieldType.indexOf("[");
    if (idx != -1) {
        basicType = fieldType.substring(0, idx);
    }
    if (TableMetaData.basicTypes.has(basicType)) {
        return true;
    }
    if (TableMetaData.typedef.has(basicType)) {
        return true;
    }
    return false;
}

// 计算字段维度
function caculateArrayDimension(fieldType) {
    const Sign = "[]";
    let idx = fieldType.indexOf(Sign);
    if (idx == -1) {
        return 0;
    }
    let d = 1;
    while ((idx = fieldType.indexOf(Sign, idx + Sign.length)) != -1) {
        ++d;
    }
    return d;
}

// 解析单元格值
function parseCellValue(fieldType, fieldValue) {
    const dimension = caculateArrayDimension(fieldType);
    if (dimension > 0) {
        if (!fieldTypeIsExist(fieldType)) {
            throw new Error(`Unknow Type ${fieldType}`);
        }
        if (!fieldValue) {
            return [];
        }
        fieldValue = fieldValue.toString();
        if (fieldValue.length <= 0) {
            return [];
        }
        let i = fieldValue.length;
        while (i > 0) {
            if (fieldValue[i - 1] != ']') {
                break;
            }
            --i;
        }
        const d = fieldValue.length - i;
        if (d > dimension || d < dimension - 1) {
            throw new Error(`${fieldType} dimension is ${dimension}, but value dimension is ${d + 1}`);
        }
        if (d == dimension - 1) {
            return JSON.parse('[' + fieldValue + ']');
        }
        else {
            return JSON.parse(fieldValue);
        }
    }
    if (fieldType === "json") {
        return JSON.parse(fieldValue);
    }
    if (fieldType === "string") {
        return fieldValue || "";
    }
    if (!fieldTypeIsExist(fieldType)) {
        throw new Error(`Unknow Type ${fieldType}`);
    }
    return fieldValue || 0;
}

// 解析工作sheet
function parseSheet(sheet) {
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (aoa.length < TableMetaData.dataLineNo) {
        return null;
    }
    let sheetDataObjs = [];
    const fieldRow = aoa[TableMetaData.fieldLineNo - 1];
    const typeRow = aoa[TableMetaData.typeLineNo - 1];
    for (let i = TableMetaData.dataLineNo - 1; i < aoa.length; ++i) {
        const lineRow = aoa[i];
        if (lineRow.length <= 0) {
            // 忽略空行
            continue;
        }
        let obj = {};
        // 遍历列
        for (let j = 0; j < lineRow.length; ++j) {
            const fieldName = fieldRow[j];
            if (!fieldName || !typeRow[j]) {
                // 忽略注释列
                continue;
            }
            try {
                const cellValue = parseCellValue(typeRow[j], lineRow[j]);
                obj[fieldName] = cellValue;
            } catch (e) {
                throw new Error(`${fieldName}, line ${i + 1} err, ${e.message}`);
            }
        }
        sheetDataObjs.push(obj);
    }
    return sheetDataObjs;
}

// 解析Excel
function parseExcelTable(path) {
    console.log(`start parseExcelTable: ${path}`);
    let tableJson = {};
    const workBook = XLSX.readFile(path);
    for (const sheetName of workBook.SheetNames) {
        try {
            const sheetJson = parseSheet(workBook.Sheets[sheetName]);
            if (!sheetJson) {
                continue;
            }
            tableJson[sheetName] = sheetJson;
        } catch (e) {
            throw new Error(`${path}.${sheetName}.${e.message}`);
        }
    }
    console.log('finished');
    return tableJson;
}

// JSON数据写文件
async function promiseSaveJsonToFile(path, tableJson) {
    return new Promise((resolve) => {
        std_fs.writeFile(path, JSON.stringify(tableJson, null, '\t'), (err) => {
            if (err) {
                console.error(`save ${path} error, ${err}`);
            }
            resolve();
        });
    });
}

//////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// 具体实现结束 //////////////////////////////
//////////////////////////////////////////////////////////////////////////////

// 程序开始
(async () => {
    if (TableMetaData.scanExcelDir) {
        let promiseArr = [];
        const fileItems = std_fs.readdirSync(TableMetaData.scanExcelDir);
        for (const fileName of fileItems) {
            const filePath = std_path.join(TableMetaData.scanExcelDir, fileName);
            const fileStat = std_fs.statSync(filePath);
            if (fileStat.isDirectory()) {
                continue;
            }
            const extName = std_path.parse(filePath).ext;
            if (extName != '.xlsx') {
                continue;
            }
            if (TableMetaData.scanExceptFileNames.has(fileName)) {
                continue;
            }
            const tableJson = parseExcelTable(filePath);
            const savePath = TableMetaData.outputJsonDir + std_path.parse(filePath).name + '.json';
            promiseArr.push(promiseSaveJsonToFile(savePath, tableJson));
        }
        await Promise.all(promiseArr);
    }
    else {
        const filePath = std_process.argv[2];
        if (!filePath) {
            console.error("Please input Excel path");
            return;
        }
        const tableJson = parseExcelTable(filePath);
        const savePath = TableMetaData.outputJsonDir + std_path.parse(filePath).name + '.json';
        await promiseSaveJsonToFile(savePath, tableJson);
    }
    console.log("All Excel Files Convert To Json Success !!!");
})();