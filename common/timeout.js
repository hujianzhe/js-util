if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.set_timeout_ex = function(fn, ms) {
    let ev = {
        _timerid: null
    };
    const loopFn = (await_ms) => {
        const INT32_MAX = 2147483647;
        if (await_ms > INT32_MAX) {
            ev._timerid = setTimeout(() => {
                clearTimeout(ev._timerid);
                loopFn(await_ms - INT32_MAX);
            }, INT32_MAX);
        }
        else {
            ev._timerid = setTimeout(() => {
                clearTimeout(ev._timerid);
                ev._timerid = null;
                fn();
            }, await_ms);
        }
    };
    loopFn(ms);
    return ev;
};

js_util.Common.clear_timeout_ex = function(ev) {
    if (ev._timerid) {
        clearTimeout(ev._timerid);
        ev._timerid = null;
    }
};