if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.type_of = function (v) {
	return Object.prototype.toString.call(v).slice(8, -1);
};