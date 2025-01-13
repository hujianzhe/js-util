if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.is_little_endian = function () {
	let buffer = new ArrayBuffer(2);
	new DataView(buffer).setUint16(0, 0x0001, true);
	return new Int16Array(buffer)[0] === 1;
};

js_util.Common.to_dataview = function(v) {
    if (v instanceof DataView) {
        return v;
    }
    return new DataView(v.buffer || v, v.byteOffset || 0, v.byteLength);
};

js_util.Common.to_uint8_array = function (buff_or_dv) {
    let dv = js_util.Common.to_dataview(buff_or_dv);
    const byteLength = dv.byteLength;
    let bytes = [];
	for (let i = 0; i < byteLength; ++i) {
		bytes.push(dv.getUint8(i));
	}
	return bytes;
};

js_util.Common.malloc = function (byte_length, attr = {}) {
    let ab;
    if (attr.maxByteLength > 0) {
        let ab_attr = {
            maxByteLength: attr.maxByteLength
        };
        ab = new ArrayBuffer(byte_length, ab_attr);
    }
    else {
        ab = new ArrayBuffer(byte_length);
    }
    return new DataView(ab);
};

js_util.Common.memset = function (buff_or_dv, byte_value, byte_length) {
    let dv = js_util.Common.to_dataview(buff_or_dv);
    const max_length = dv.byteLength < byte_length ? dv.byteLength : byte_length;
    for (let i = 0; i < max_length; ++i) {
        dv.setUint8(i, byte_value);
    }
    return dv;
};

js_util.Common.memcpy = function (dst, src) {
    if (dst === src) {
        return dst;
    }
    const dst_dv = js_util.Common.to_dataview(dst);
    const src_dv = js_util.Common.to_dataview(src);
    const max_length = dst_dv.byteLength < src_dv.byteLength ? dst_dv.byteLength : src_dv.byteLength;
    for (let i = 0; i < max_length; ++i) {
        dst_dv.setUint8(i, src_dv.getUint8(i));
    }
    return dst_dv;
};

js_util.Common.memdup = function (buff_or_dv) {
    let dup_buff = new ArrayBuffer(buff_or_dv.byteLength);
    return js_util.Common.memcpy(dup_buff, buff_or_dv);
};

js_util.Common.realloc = function (buff_or_dv, byte_length) {
    let buff_dv = js_util.Common.to_dataview(buff_or_dv);
    let buff = buff_dv.buffer;
    if (byte_length < buff.byteLength) {
        if (buff.resizable) {
            buff.resize(byte_length);
        }
        else {
            buff = buff.slice(0, byte_length);
        }
        return new DataView(buff, buff.byteOffset, buff.byteLength);
    }
    if (byte_length > buff.byteLength) {
        if (buff.resizable && byte_length <= buff.maxByteLength) {
            buff.resize(byte_length);
            return new DataView(buff, buff.byteOffset, buff.byteLength);
        }
        else {
            return js_util.Common.memcpy(new ArrayBuffer(byte_length), buff);
        }
    }
    return buff_dv;
};

js_util.Common.memcmp = function (buff_or_dv1, buff_or_dv2) {
    if (buff_or_dv1 === buff_or_dv2) {
        return 0;
    }
    const dv1 = js_util.Common.to_dataview(buff_or_dv1);
    const dv2 = js_util.Common.to_dataview(buff_or_dv2);
    const max_length = dv1.byteLength < dv2.byteLength ? dv1.byteLength : dv2.byteLength;
    for (let i = 0; i < max_length; ++i) {
        let r = dv1.getUint8(i) - dv2.getUint8(i);
        if (r == 0) {
            continue;
        }
        return r;
    }
    if (dv1.byteLength == dv2.byteLength) {
        return 0;
    }
    return dv1.byteLength - dv2.byteLength;
};

js_util.Common.mem_merge = function (buffs_or_dvs) {
    let total_byte_length = 0;
    let arr_dv = [];
    for (const item of buffs_or_dvs) {
        let dv = js_util.Common.to_dataview(item);
        total_byte_length += dv.byteLength;
        arr_dv.push(dv);
    }
    let total_dv = js_util.Common.malloc(total_byte_length);
    let offset = 0;
    for (const dv of arr_dv) {
        const dv_byteLength = dv.byteLength;
        for (let i = 0; i < dv_byteLength; ++i, ++offset) {
            total_dv.setUint8(offset, dv.getUint8(i));
        }
    }
    return total_dv;
};