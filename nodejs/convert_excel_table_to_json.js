const std_process = require('process');
const std_path = require('path');
const std_fs = require('fs');
//const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

// 自定义数据
const TableMetaData = {
    basicTypes: new Set([
        'int',
        'float',
        'double',
        'string',
    ]), // 支持的基本数据类型

    typedef: new Map([
        ['json', 'string']
    ]), // 支持的类型重定义

    fieldLineNo: 2, // 字段名称起始行号(从1开始)
    typeLineNo: 3,  // 字段类型起始行号(从1开始)
    dataLineNo: 4,   // 数据起始行号(从1开始)

    scanExcelDir: './',  // 扫描Excel文件的目录
    scanExceptFileNames: new Set([
    ]), // 目录中需要排除的Excel文件名
    outputJsonDir: './', // 生成的JSON文件存放目录
};

//////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// 具体实现开始 //////////////////////////////
//////////////////////////////////////////////////////////////////////////////

// 获取字段基本类型
function getFieldBasicType(fieldType) {
    let basicType = fieldType;
    let idx = fieldType.indexOf("[");
    if (idx != -1) {
        basicType = fieldType.substring(0, idx);
    }
    if (TableMetaData.basicTypes.has(basicType)) {
        return basicType;
    }
    return TableMetaData.typedef.get(basicType) || "";
}

// 判断字符串是不是合法整数格式
function checkStringIsInteger(s) {
	if (s.length <= 0) {
		return false;
	}
	if (s.length == 1) {
		return s.charCodeAt(0) >= '0'.charCodeAt(0) && s.charCodeAt(0) <= '9'.charCodeAt(0);
	}
    let i;
	if (s[0] == '+' || s[0] == '-') {
		i = 1;
	}
    else {
        i = 0;
    }
    for (; i < s.length; ++i) {
        if (s.charCodeAt(i) < '0'.charCodeAt(0)) {
            return false;
        }
        if (s.charCodeAt(i) > '9'.charCodeAt(0)) {
            return false;
        }
    }
    return true;
}

// 判断字符串是不是合法浮点数格式
function checkStringIsFloatNumber(strValue) {
    if (strValue.indexOf('.') != -1) {
        const parts = strValue.split('.');
        if (parts.length != 1 && parts.length != 2) {
            return false;
        }
        for (const s of parts) {
            if (!checkStringIsInteger(s)) {
                return false;
            }
        }
        return true;
    }
    if (strValue.indexOf('e') != -1) {
        const parts = strValue.split('e');
        if (parts.length != 2) {
            return false;
        }
        if (!checkStringIsInteger(parts[0]) || !checkStringIsInteger(parts[1])) {
            return false;
        }
        return true;
    }
    if (strValue.indexOf('E') != -1) {
        const parts = strValue.split('E');
        if (parts.length != 2) {
            return false;
        }
        if (!checkStringIsInteger(parts[0]) || !checkStringIsInteger(parts[1])) {
            return false;
        }
        return true;
    }
    return checkStringIsInteger(strValue);
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
function parseCellValue(fieldType, strFieldValue) {
    const basicType = getFieldBasicType(fieldType);
    if (!basicType) {
        throw new Error(`Unknow Type ${fieldType}`);
    }
    const dimension = caculateArrayDimension(fieldType);
    if (dimension > 0) {
        if (!strFieldValue) {
            return [];
        }
        let i = strFieldValue.length;
        while (i > 0) {
            if (strFieldValue[i - 1] != ']') {
                break;
            }
            --i;
        }
        const d = strFieldValue.length - i;
        if (d > dimension || d < dimension - 1) {
            throw new Error(`${fieldType} dimension is ${dimension}, but value dimension is ${d + 1}`);
        }
        if (d == dimension - 1) {
            strFieldValue = '[' + strFieldValue + ']';
        }
        return JSON.parse(strFieldValue);
    }
    switch (basicType) {
        case "float":
        case "double":
        {
            if (!strFieldValue) {
                return 0.0;
            }
            if (!checkStringIsFloatNumber(strFieldValue)) {
                throw new Error(`${strFieldValue} isn't match type "${basicType}"`);
            }
            return Number.parseFloat(strFieldValue);
        }
        case "int":
        {
            if (!strFieldValue) {
                return 0;
            }
            if (!checkStringIsInteger(strFieldValue)) {
                throw new Error(`${strFieldValue} isn't match type "${basicType}"`);
            }
            return Number.parseInt(strFieldValue);
        }
        case "string":
        {
            if (fieldType === "json") {
                if (!strFieldValue) {
                    return {};
                }
                return JSON.parse(strFieldValue);
            }
            return strFieldValue || "";
        }
    }
    throw new Error(`forget to check and parse: "${basicType}" with "${strFieldValue}"`);
}

// 解析sheet
function parseSheet(sheet) {
	let aoa = [];
	sheet.eachRow((row, rowNumber) => {
		let lineRow = [];
		row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
			lineRow.push({
				id: cell.address,
				text: cell.text
			});
		});
		aoa.push(lineRow);
	});
    if (aoa.length < TableMetaData.dataLineNo) {
        return null;
    }
    const fieldRow = aoa[TableMetaData.fieldLineNo - 1];
    const typeRow = aoa[TableMetaData.typeLineNo - 1];
	const metaColCnt = fieldRow.length;
	if (metaColCnt != typeRow.length) {
		throw new Error(`field cnt(${metaColCnt}) != type cnt(${typeRow.length})`);
	}
    let sheetDataObjs = [];
    for (let i = TableMetaData.dataLineNo - 1; i < aoa.length; ++i) {
        const lineRow = aoa[i];
        if (lineRow.length <= 0) {
            // 忽略空行
            continue;
        }
        let obj = {};
        // 遍历列
		const colCnt = Math.max(lineRow.length, metaColCnt);
        for (let j = 0; j < colCnt; ++j) {
			if (!fieldRow[j] || !typeRow[j]) {
                // 忽略无意义的列
				continue;
			}
            const fieldName = fieldRow[j].text;
			if (!fieldName) {
				continue;
			}
			const typeName = typeRow[j].text;
			if (!typeName) {
				continue;
			}
			const strValue = lineRow[j] ? lineRow[j].text : "";
            try {
                const cellValue = parseCellValue(typeName, strValue);
                obj[fieldName] = cellValue;
            } catch (e) {
				const cellId = lineRow[j] ? lineRow[j].id : "";
                throw new Error(`${fieldName}, cell=${cellId} (line=${i + 1}, col=${j+1}) err, ${e.message}`);
            }
        }
        sheetDataObjs.push(obj);
    }
    return sheetDataObjs;
}

// 解析Excel
async function promiseParseExcelTable(path) {
	let tableJson = {};
	const workBook = await new ExcelJS.Workbook().xlsx.readFile(path);
	for (const sheet of workBook.worksheets) {
        try {
            const sheetJson = parseSheet(sheet);
            if (!sheetJson) {
                continue;
            }
            tableJson[sheet.name] = sheetJson;
        } catch (e) {
            throw new Error(`${path}.${sheet.name}.${e.message}`);
        }
    }
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
            const savePath = TableMetaData.outputJsonDir + std_path.parse(filePath).name + '.json';
			promiseArr.push((async(filePath, savePath) => {
				const tableJson = await promiseParseExcelTable(filePath);
            	await promiseSaveJsonToFile(savePath, tableJson);
			})(filePath, savePath));
        }
        await Promise.all(promiseArr);
    }
    else {
        const filePath = std_process.argv[2];
        if (!filePath) {
            console.error("Please input Excel path");
            return;
        }
        const tableJson = await promiseParseExcelTable(filePath);
        const savePath = TableMetaData.outputJsonDir + std_path.parse(filePath).name + '.json';
        await promiseSaveJsonToFile(savePath, tableJson);
    }
    console.log("All Excel Files Convert To Json Success !!!");
})();
