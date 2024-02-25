var js_util = js_util || {};
js_util.Common = js_util.Common || {};

js_util.Common.string_to_utf8 = function(str) {
	let utf8 = "";
	for (let i = 0; i < str.length; i++) {
		let code = str.charCodeAt(i);
		if (code < 0x0080) {
			utf8 += str.charAt(i);
		}
		else if (code < 0x0800) {
			utf8 += String.fromCharCode(0xC0 | ((code >> 6) & 0x1F));
			utf8 += String.fromCharCode(0x80 | (code & 0x3F));
		}
		else if (code < 0x10000) {
			utf8 += String.fromCharCode(0xE0 | ((code >> 12) & 0x0F));
			utf8 += String.fromCharCode(0x80 | ((code >>  6) & 0x3F));
			utf8 += String.fromCharCode(0x80 | (code & 0x3F));
		}
		else if (code < 0x110000) {
			utf8 += String.fromCharCode(0xF0 | ((code >> 18) & 0x07));
			utf8 += String.fromCharCode(0x80 | ((code >> 12) & 0x3F));
			utf8 += String.fromCharCode(0x80 | ((code >> 6) & 0x3F));
			utf8 += String.fromCharCode(0x80 | (code & 0x3F));
		}
		else {
			throw "string isn't utf-16";
		}
	}
	return utf8;
};

js_util.Common.utf8_to_string = function(utf8) {
	let str = "";
	for(let i = 0; i < utf8.length; i++) {
		if(utf8.charCodeAt(i) >> 7 === 0x00) {
			str += utf8.charAt(i);
		}
		else if (utf8.charCodeAt(i) >> 5 === 0x06) {
			let tmp = ((utf8.charCodeAt(i + 0) & 0x1f) << 6) |
					((utf8.charCodeAt(i + 1) & 0x3f) << 0);
			str += String.fromCharCode(tmp);
			i++;
		}
		else if(utf8.charCodeAt(i) >> 4 === 0x0e) {
			let tmp = ((utf8.charCodeAt(i + 0) & 0x0f) << 12) |
					((utf8.charCodeAt(i + 1) & 0x3f) <<  6) |
					((utf8.charCodeAt(i + 2) & 0x3f) <<  0);
			str += String.fromCharCode(tmp);
			i += 2;
		}
		else if(utf8.charCodeAt(i) >> 3 === 0x1f) {
			let tmp = ((utf8.charCodeAt(i + 0) & 0x07) << 18) |
					((utf8.charCodeAt(i + 1) & 0x3f) << 12) |
					((utf8.charCodeAt(i + 2) & 0x3f) <<  6) |
					((utf8.charCodeAt(i + 3) & 0x3f) <<  0);
			str += String.fromCharCode(tmp);
			i += 3;
		}
		else {
			throw "this utf-8 can't convert to utf-16";
		}
	}
	return str;
};

js_util.Common.utf8_fill_bytes = function(utf8, dv, off) {
	for (let i = 0; i < utf8.length; ++i) {
		dv.setUint8(off + i, utf8.charCodeAt(i));
	}
};

js_util.Common.bytes_to_utf8 = function(dv) {
	let utf8 = "";
	const byteLength = dv.byteLength;
	for (let i = 0; i < byteLength; ++i) {
		utf8 += String.fromCharCode(dv.getUint8(i));
	}
	return js_util.Common.utf8_to_string(utf8);
};

js_util.Common.string_trim = function(string) {
	return string.replace(/(^\s*)|(\s*$)/g, "");
};