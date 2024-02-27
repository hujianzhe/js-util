if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

if (!js_util.Common.PromiseTimeoutResult) {
    class PromiseTimeoutResult {
        constructor() {}
    };
    js_util.Common.PromiseTimeoutResult = new PromiseTimeoutResult();
}

js_util.Common.promise_sleep = async function(ms) {
    const INT32_MAX = 2147483647;
    while (ms > INT32_MAX) {
        await new Promise((resolve) => {
            let tid = setTimeout(() => {
                clearTimeout(tid);
                resolve();
            }, INT32_MAX);
        });
        ms -= INT32_MAX;
    }
    if (ms > 0) {
        await new Promise((resolve) => {
            let tid = setTimeout(() => {
                clearTimeout(tid);
                resolve();
            }, ms);
        });
    }
};

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

js_util.Common.promise_timeout = function(promise_arg, timeout_msec) {
    return new Promise(async (resolve, reject) => {
        let timer_id = null;
        if (timeout_msec >= 0) {
            timer_id = setTimeout(() => {
                clearTimeout(timer_id);
                timer_id = null;
                resolve(js_util.Common.PromiseTimeoutResult);
            }, timeout_msec);
        }
        try {
            let ret;
            if (typeof promise_arg === "function") {
                ret = await new Promise(promise_arg);
            }
            else {
                ret = await promise_arg;
            }
            if (timer_id) {
                clearTimeout(timer_id);
            }
            resolve(ret);
        } catch (error) {
            if (timer_id) {
                clearTimeout(timer_id);
            }
            reject(error);
        }
    });
};