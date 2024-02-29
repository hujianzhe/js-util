if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.type_of = function (v) {
    // Object.prototype.toString.call(123); // "[object Number]"
    // Object.prototype.toString.call(123n); // "[object BigInt]"
    // Object.prototype.toString.call("hello"); // "[object String]"
    // Object.prototype.toString.call(true); // "[object Boolean]"
    // Object.prototype.toString.call(undefined); // "[object Undefined]"
    // Object.prototype.toString.call(null); // "[object Null]"
    // Object.prototype.toString.call({}); // "[object Object]"
    // Object.prototype.toString.call([]); // "[object Array]"
    // Object.prototype.toString.call(function(){}); // "[object Function]"
    // Object.prototype.toString.call(new Date()); // "[object Date]"
    // Object.prototype.toString.call(new RegExp()); // "[object RegExp]"
	const type_str = Object.prototype.toString.call(v).slice(8, -1);
    if ("Object" != type_str) {
        return type_str;
    }
    if (v.constructor.name) {
        return v.constructor.name;
    }
    return type_str;
};

js_util.Common.inherit = function (child_class, parent_class) {
    let f = function() {};
    f.prototype = parent_class.prototype;
    child_class.prototype = new f();
	child_class.prototype.constructor = child_class;
};