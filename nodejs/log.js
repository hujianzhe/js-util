const std_fs = require('fs');

class LogItemInfo {
    constructor() {
        this.priority = "";
        this.sourceFile = "";
        this.sourceLine = 0;
        this.date = null;
    }
}

class LogFileOption {
    constructor() {
        this.rotateTimelenSec = 0;
        this.fnOutputPrefix = (logItemInfo) => { void logItemInfo; return ""; };
        this.fnNewFullPath = (base_path, key, date) => { void date; return `${base_path}/${key}`; };
    }
}

class LogFile {
    constructor(key, base_path, opt) {
        this.fd = null;
        this.key = key;
        this.basePath = base_path;
        this.rotateTimestampSec = 0;
        this.opt = opt;
        this._rotatePromise = null;
        this._rotateResolve = null;
    }

    _rotate(date, cur_sec) {
        if (this._rotatePromise) {
            return this._rotatePromise;
        }
        const opt = this.opt;
        let new_path = null;
        if (cur_sec >= this.rotateTimestampSec && opt.rotateTimelenSec > 0) {
            if (this.fd) {
                std_fs.close(this.fd);
                this.fd = null;
            }
            new_path = opt.fnNewFullPath(this.basePath, this.key, date);
            const t = (cur_sec - this.rotateTimestampSec) / opt.rotateTimelenSec;
            if (t <= 0) {
                this.rotateTimestampSec += opt.rotateTimelenSec;
            }
            else {
                this.rotateTimestampSec += (t + 1) * opt.rotateTimelenSec;
            }
        }
        else if (!this.fd) {
            new_path = opt.fnNewFullPath(this.basePath, this.key, date);
        }
        if (!new_path) {
            return;
        }
        let self = this;
        this._rotatePromise = new Promise((resolve) => {
            self._rotateResolve = resolve;
            std_fs.open(new_path, "a+", (err, fd) => {
                if (!self._rotateResolve) {
                    std_fs.close(fd);
                    return;
                }
                if (err) {
                    std_fs.close(fd);
                }
                else {
                    self.fd = fd;
                }
                self._rotateResolve();
                self._rotateResolve = null;
            });
        });
        return this._rotatePromise;
    }

    destroy() {
        this._rotatePromise = null;
        if (this._rotateResolve) {
            this._rotateResolve();
            this._rotateResolve = null;
        }
        if (this.fd) {
            std_fs.close(this.fd);
            this.fd = null;
        }
    }
}

class Log {
    constructor() {
        this.curFilterPriority = -1;
        this.fnPriorityFilter = null;
        this.files = new Map();
    }

    enableFile(key, opt, base_path) {
        let lf = this.files.get(key);
        if (lf) {
            return false;
        }
        lf = new LogFile(key, base_path, opt);
        this.files.set(key, lf);
        return true;
    }

    destroy() {
        for (const lf of this.files.values()) {
            lf.destroy();
        }
        this.files.clear();
    }

// private:
}

module.exports = {
    Log,
    LogFileOption
};