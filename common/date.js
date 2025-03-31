if (typeof js_util === 'undefined') {
    js_util = {};
}
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

js_util.Common.gmt_second_diff_day = function (gmt_sec1, gmt_sec2) {
    const tz_sec = js_util.Common.time_zone_offset_second();
    const local_day1 = Math.floor((gmt_sec1 - tz_sec) / 86400);
    const local_day2 = Math.floor((gmt_sec2 - tz_sec) / 86400);
    return local_day1 - local_day2;
};