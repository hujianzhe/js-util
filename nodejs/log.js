const std_fs = require('fs');

class LogFileOption {
    static DefaultDay = {
        rotateTimelenSec: 86400,
        fnOutputPrefix: default_output_prefix,
        fnNewFullPath: (base_path, key, date) => {
            if (key) {
                return `${base_path}${key}_${date.getFullYear()}${date.getMonth()+1}${date.getDate()}.log`;
            }
            else {
                return `${base_path}_${date.getFullYear()}${date.getMonth()+1}${date.getDate()}.log`;
            }
        }
    };

    static DefaultHour = {
        rotateTimelenSec: 3600,
        fnOutputPrefix: default_output_prefix,
        fnNewFullPath: (base_path, key, date) => {
            if (key) {
                return `${base_path}${key}_${date.getFullYear()}${date.getMonth()+1}${date.getDate()}_${date.getHours()}.log`;
            }
            else {
                return `${base_path}_${date.getFullYear()}${date.getMonth()+1}${date.getDate()}_${date.getHours()}.log`;
            }
        }
    };

    static DefaultMinute = {
        rotateTimelenSec: 60,
        fnOutputPrefix: default_output_prefix,
        fnNewFullPath: (base_path, key, date) => {
            if (key) {
                return `${base_path}${key}_${date.getFullYear()}${date.getMonth()+1}${date.getDate()}_${date.getHours()}_${date.getMinutes()}.log`;
            }
            else {
                return `${base_path}_${date.getFullYear()}${date.getMonth()+1}${date.getDate()}_${date.getHours()}_${date.getMinutes()}.log`;
            }
        }
    };

    static default_output_prefix(logItemInfo) {
        const date = logItemInfo.date;
        return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} \
${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}|\
${logItemInfo.priorityStr}|${logItemInfo.sourceFile}:${logItemInfo.sourceLine}|`;
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

// private:

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

    async _write(content, date, cur_sec) {
        await this._rotate(date, cur_sec);
        if (this.fd) {
            std_fs.write(this.fd, content);
        }
    }

    _formatWrite(priority, source_file, source_line, content) {
        const now_msec = Date.now();
        const date = new Date(now_msec);
        content = this.opt.fnOutputPrefix({
            priorityStr: Log.PriorityString[priority];
            sourceFile: source_file;
            sourceLine: source_line;
            date: new Date();
        }) + content;
        _write(content, date, Math.floor(now_msec / 1000));
    }
}

class Log {
    static Priority = {
        Info: 0,
        Debug: 1,
        Error: 2
    };
    static PriorityString = [ "Info", "Debug", "Error" ];

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
        if (opt.rotateTimelenSec > 0) {
            const tz_off_sec = new Date().getTimezoneOffset() * 60;
            const localtime_sec = Math.floor(Date.now() / 1000) - tz_off_sec;
            const t = localtime_sec / opt.rotateTimelenSec * opt.rotateTimelenSec + tz_off_sec;
            lf.rotateTimestampSec = t + opt.rotateTimelenSec;
        }
        else {
            lf.rotateTimestampSec = 0;
        }
        this.files.set(key, lf);
        return true;
    }

    destroy() {
        for (const lf of this.files.values()) {
            lf.destroy();
        }
        this.files.clear();
    }

    checkPriorityFilter(priority) {
        return this.fnPriorityFilter && this.fnPriorityFilter(priority, this.curFilterPriority);
    }

    info(key, source_file, source_line, content) {
        this._print(key, Log.Priority.Info, source_file, source_line, content);
    }

    debug(key, source_file, source_line, content) {
        this._print(key, Log.Priority.Debug, source_file, source_line, content);
    }

    error(key, source_file, source_line, content) {
        this._print(key, Log.Priority.Error, source_file, source_line, content);
    }

// private:
    _print(key, priority, source_file, source_line, content) {
        if (!this.checkPriorityFilter(priority)) {
            return;
        }
        let lf = this.files.get(key);
        if (!lf) {
            return;
        }
        lf._formatWrite(priority, source_file, source_line, content);
    }
}

module.exports = {
    Log
};