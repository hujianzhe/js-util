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

js_util.Common.TimeoutEventSet = class TimeoutSet {
    constructor() {
        this.timeout_set = new Set();
        this.timeout_map = new Map();
    }

    add_timeout(fn, msec, special_id) {
        let self = this;
        if (special_id !== undefined) {
            if (self.timeout_map.has(special_id)) {
                return null;
            }
        }
        let ev = js_util.Common.set_timeout_ex(function () {
            self.clear_timeout(ev);
            fn();
        }, msec);
        if (special_id !== undefined) {
            ev.special_id = special_id;
        }
        else {
            self.timeout_set.add(ev);
        }
        return ev;
    }

    remove_timeout(ev) {
        js_util.Common.clear_timeout_ex(ev);
        if (ev.special_id !== undefined) {
            self.timeout_map.delete(ev.special_id);
        }
        else {
            self.timeout_set.delete(ev);
        }
    }

    remove_timeout_by_id(special_id) {
        let ev = this.timeout_map.get(special_id);
        if (!ev) {
            return;
        }
        this.clear_timeout(ev);
    }

    remove_all() {
        for (let ev of this.timeout_set) {
            js_util.Common.clear_timeout_ex(ev);
        }
        this.timeout_set.clear();
        for (let ev of this.timeout_map.values()) {
            js_util.Common.clear_timeout_ex(ev);
        }
        this.timeout_map.clear();
    }
};