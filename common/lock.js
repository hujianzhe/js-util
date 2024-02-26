var js_util = js_util || {};
js_util.Common = js_util.Common || {};

js_util.Common.LockImpl = class LockImpl {
    constructor(name) {
        this.owner = null;
        this.enter_times = 0;
        this.waitArr = [];
        this.name = name;
    }

    try_acquire(owner) {
        if (!this.owner) {
            this.owner = owner;
            this.enter_times = 1;
            return true;
        }
        else if (owner == this.owner) {
            this.enter_times++;
            return true;
        }
        return false;
    }

    acquire(owner) {
        if (this.try_acquire(owner)) {
            return;
        }
        let self = this;
        return new Promise((resolve) => {
            self.waitArr.push({
                resolve: resolve,
                owner: owner
            });
        });
    }

    release() {
        if (this.enter_times > 1) {
            this.enter_times--;
            return;
        }
        if (this.waitArr.length <= 0) {
            this.owner = null;
            return;
        }
        const obj = this.waitArr.shift();
        this.owner = obj.owner;
        obj.resolve();
        let i;
        for (i = 0; i < this.waitArr.length; ++i) {
            if (this.waitArr[i].owner != this.owner) {
                break;
            }
            this.enter_times++;
            this.waitArr[i].resolve();
        }
        if (i <= 0) {
            return;
        }
        if (i >= this.waitArr.length) {
            this.waitArr.length = 0;
            return;
        }
        this.waitArr.splice(0, i);
    }
};

js_util.Common.LockGuard = class LockGuard {
    constructor(mgr, owner) {
        this.owner = owner;
        this.mgr = mgr;
        this.lk = null;
    }

    try_lock(name) {
        if (this.lk) {
            throw new Error(`lock has locked, name: ${this.lk.name}`);
        }
        let lk = this.mgr._private_get_or_new_lock(name);
        if (!lk.try_acquire(this.owner)) {
            return false;
        }
        this.lk = lk;
        return true;
    }

    async lock(name) {
        if (this.lk) {
            throw new Error(`lock has locked, name: ${this.lk.name}`);
        }
        let lk = this.mgr._private_get_or_new_lock(name);
        await lk.acquire(this.owner);
        this.lk = lk;
    }

    unlock() {
        if (!this.lk) {
            return;
        }
        this.lk.release();
        if (!this.lk.owner) {
            this.mgr.lockMap.delete(this.lk.name);
        }
        this.lk = null;
    }

    static unlock_guards(guardArr) {
        if (!guardArr) {
            return;
        }
        for (let i = guardArr.length; i > 0; --i) {
            guardArr[i - 1].unlock();
        }
    }
};

js_util.Common.LockManager = class LockManager {
    constructor() {
        this.lockMap = new Map();
    }

    _private_get_or_new_lock(name) {
        let lock = this.lockMap.get(name);
        if (!lock) {
            lock = new js_util.Common.LockImpl(name);
            this.lockMap.set(name, lock);
        }
        return lock;
    }

    new_guard(owner) {
        if (!owner) {
            owner = new Object();
        }
        return new js_util.Common.LockGuard(this, owner);
    }
};