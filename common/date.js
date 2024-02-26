var js_util = js_util || {};
js_util.Common = js_util.Common || {};

js_util.Common.time_zone_offset_second = function () {
    return new Date().getTimezoneOffset() * 60;
};

js_util.Common.gmt_second = function () {
    return Math.floor(Date.now() / 1000);
};

js_util.Common.local_second = function () {
    return js_util.Common.gmt_second() - js_util.Common.time_zone_offset_second();
};