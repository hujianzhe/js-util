if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

if (!js_util.Common.resolve_timeout) {
    js_util.Common.resolve_timeout = {};
}
if (!js_util.Common.resolve_cancel) {
    js_util.Common.resolve_cancel = {};
}
if (!js_util.Common.resolve_error) {
    js_util.Common.resolve_error = {};
}
if (!js_util.Common.exception_resolves) {
    js_util.Common.exception_resolves = [
        js_util.Common.resolve_timeout,
        js_util.Common.resolve_cancel,
        js_util.Common.resolve_error
    ];
}

js_util.Common.new_promise = function () {
    let resolve_, reject_;
    let promise_ = new Promise((resolve, reject) => {
        resolve_ = resolve;
        reject_ = reject;
    });
    return {
        promise: promise_,
        resolve: resolve_,
        reject: reject_
    };
};

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

js_util.Common.promise_timeout = function(promise_arg, timeout_msec) {
    return new Promise(async (resolve, reject) => {
        let timer_id = null;
        if (timeout_msec >= 0) {
            timer_id = setTimeout(() => {
                clearTimeout(timer_id);
                timer_id = null;
                resolve(js_util.Common.resolve_timeout);
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
        } catch (e) {
            if (timer_id) {
                clearTimeout(timer_id);
            }
            reject(e);
        }
    });
};

js_util.Common.ResolveSet = class ResolveSet {
    constructor() {
        this.default_id_seq = 0n;
        this.default_id_seq_max = 0xFFFFFFFFFFFFFFFFn;
        this.resolve_map = new Map();

        this.next_id = function () {
            if (this.default_id_seq == this.default_id_seq_max) {
                this.default_id_seq = 1n;
            }
            else {
                ++this.default_id_seq;
            }
            return this.default_id_seq;
        };
    }

    expect(resolve_id, opts = { timeout_msec : 5000 }) {
        resolve_id = BigInt(resolve_id);
        if (this.resolve_map.has(resolve_id)) {
            return null;
        }
        return js_util.Common.promise_timeout((resolve) => {
            this.resolve_map.set(resolve_id, resolve);
        }, opts.timeout_msec);
    }

    resume(resolve_id, ret_data) {
        resolve_id = BigInt(resolve_id);
        const resolve = this.resolve_map.get(resolve_id);
        if (!resolve) {
            return;
        }
        this.resolve_map.delete(resolve_id);
        resolve(ret_data);
    }
};

js_util.Common.ResolveWait = class ResolveWait {
    constructor(fn_wait_condition, max_no_wait_times) {
        this._resolve = null;
        this._no_wait_times = 0;
        this._max_no_wait_times = max_no_wait_times || 1;
        this._fn_wait_condition = fn_wait_condition;
    }

    wait() {
        if (!this._fn_wait_condition()) {
            if (this._no_wait_times >= this._max_no_wait_times) {
                this._no_wait_times = 0;
                return new Promise((resolve) => {
                    setTimeout(resolve, 0);
                });
            }
            this._no_wait_times++;
            return;
        }
        this._no_wait_times = 0;
        const self = this;
        return new Promise((resolve) => {
            self._resolve = resolve;
        });
    }

    wake() {
        if (!this._resolve) {
            return;
        }
        if (this._fn_wait_condition()) {
            return;
        }
        this._resolve();
        this._resolve = null;
    }
};