if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.string_to_camel_style = function (str) {
	return str.substring(0, 1) + str.substring(1).replace(/_([a-z])(?=[a-z]|$)/g, function ($0, $1) {
		void $0;
		return $1.toUpperCase();
	});
};

js_util.Common.string_to_utf8_bytes = function(str) {
	let utf8 = [];
	for (let i = 0; i < str.length; i++) {
		let code = str.charCodeAt(i);
		if (code < 0x0080) {
			utf8.push(code);
		}
		else if (code < 0x0800) {
			utf8.push(0xC0 | ((code >> 6) & 0x1F));
			utf8.push(0x80 | (code & 0x3F));
		}
		else if (code < 0x10000) {
			utf8.push(0xE0 | ((code >> 12) & 0x0F));
			utf8.push(0x80 | ((code >>  6) & 0x3F));
			utf8.push(0x80 | (code & 0x3F));
		}
		else if (code < 0x110000) {
			utf8.push(0xF0 | ((code >> 18) & 0x07));
			utf8.push(0x80 | ((code >> 12) & 0x3F));
			utf8.push(0x80 | ((code >> 6) & 0x3F));
			utf8.push(0x80 | (code & 0x3F));
		}
		else {
			throw "string isn't utf-16";
		}
	}
	return utf8;
};

js_util.Common.utf8_bytes_to_string = function(utf8) {
	let str = "";
	for (let i = 0; i < utf8.length; i++) {
		if (utf8[i] >> 7 === 0x00) {
			str += String.fromCharCode(utf8[i]);
		}
		else if (utf8[i] >> 5 === 0x06) {
			let tmp = ((utf8[i] & 0x1f) << 6) | (utf8[i + 1] & 0x3f);
			str += String.fromCharCode(tmp);
			i++;
		}
		else if (utf8[i] >> 4 === 0x0e) {
			let tmp = ((utf8[i] & 0x0f) << 12) |
						((utf8[i + 1] & 0x3f) <<  6) |
						(utf8[i + 2] & 0x3f);
			str += String.fromCharCode(tmp);
			i += 2;
		}
		else if (utf8[i] >> 3 === 0x1f) {
			let tmp = ((utf8[i] & 0x07) << 18) |
						((utf8[i + 1] & 0x3f) << 12) |
						((utf8[i + 2] & 0x3f) <<  6) |
						(utf8[i + 3] & 0x3f);
			str += String.fromCharCode(tmp);
			i += 3;
		}
		else {
			throw "this utf-8 can't convert to utf-16";
		}
	}
	return str;
};

js_util.Common.buffer_to_string = function(dv) {
	if (!(dv instanceof DataView)) {
		dv = new DataView(dv.buffer || dv, dv.byteOffset || 0, dv.byteLength);
	}
	const byteLength = dv.byteLength;
	let bytes = [];
	for (let i = 0; i < byteLength; ++i) {
		bytes.push(dv.getUint8(i));
	}
	return js_util.Common.utf8_bytes_to_string(bytes);
};

js_util.Common.string_trim = function(str) {
	return str.replace(/(^\s*)|(\s*$)/g, "");
};
