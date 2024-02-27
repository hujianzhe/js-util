if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.random_range_integer = function (min, max) {
	// return [min, max)
	min = parseInt(min);
	max = parseInt(max);
	if (min >= max) {
		return max;
	}
	const delta = max - min;
	return parseInt(Math.random() * delta + min);
};

js_util.Common.random_range_number = function (min, max) {
	if (min >= max) {
		return max;
	}
	const delta = max - min;
	return Math.random() * delta + min;
};