const std_fs = require('fs');

class DateFormat {
    static dateYMD(date) {
        let strMonth = `${date.getMonth() + 1}`;
        if (date.getMonth() + 1 < 10) {
            strMonth = '0' + strMonth;
        }
        let strDay = `${date.getDate()}`;
        if (date.getDate() < 10) {
            strDay = '0' + strDay;
        }
        return `${date.getFullYear()}${strMonth}${strDay}`;
    }
}

const LogFileOption = {
    RotateDefaultDay: {
        rotateTimelenSec: 86400,
        fnNewFullPath: (base_path, key, date) => {
            if (key) {
                return `${base_path}${key}_${DateFormat.dateYMD(date)}.log`;
            }
            else {
                return `${base_path}_${DateFormat.dateYMD(date)}.log`;
            }
        }
    },

    RotateDefaultHour: {
        rotateTimelenSec: 3600,
        fnNewFullPath: (base_path, key, date) => {
            if (key) {
                return `${base_path}${key}_${DateFormat.dateYMD(date)}_${date.getHours()}.log`;
            }
            else {
                return `${base_path}_${DateFormat.dateYMD(date)}_${date.getHours()}.log`;
            }
        }
    },

    RotateDefaultMinute: {
        rotateTimelenSec: 60,
        fnNewFullPath: (base_path, key, date) => {
            if (key) {
                return `${base_path}${key}_${DateFormat.dateYMD(date)}_${date.getHours()}_${date.getMinutes()}.log`;
            }
            else {
                return `${base_path}_${DateFormat.dateYMD(date)}_${date.getHours()}_${date.getMinutes()}.log`;
            }
        }
    },

    OutputDefaultPrefix: {
        fnOutputPrefix: (logItemInfo) => {
            const date = logItemInfo.date;
            let prefix = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} \
${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}|${logItemInfo.priorityStr}`;
            if (logItemInfo.sourceFile) {
                prefix += `|${logItemInfo.sourceFile}`;
            }
            if (logItemInfo.sourceLine) {
                prefix += `:${logItemInfo.sourceLine}`;
            }
            return prefix + '|';
        }
    }
}

class LogFile {
    constructor(key, base_path) {
        this.fd = null;
        this.key = key;
        this.basePath = base_path;
        this.rotateTimestampSec = 0;
        this.outputOpt = null;
        this.rotateOpt = null;
        this._destroyed = false;
        this._rotatePromise = null;
        this._rotateResolve = null;
    }

// private:

    _destroy() {
        this._rotatePromise = null;
        if (this._rotateResolve) {
            this._rotateResolve();
            this._rotateResolve = null;
        }
        if (this.fd) {
            std_fs.close(this.fd);
            this.fd = null;
        }
        this._destroyed = true;
    }

    _set_rotate_opt(opt) {
        if (opt.rotateTimelenSec > 0) {
            const tz_off_sec = new Date().getTimezoneOffset() * 60;
            const localtime_sec = Math.floor(Date.now() / 1000) - tz_off_sec;
            const t = localtime_sec / opt.rotateTimelenSec * opt.rotateTimelenSec + tz_off_sec;
            this.rotateTimestampSec = t + opt.rotateTimelenSec;
        }
        this.rotateOpt = opt;
    }

    _rotate(date, cur_sec) {
        if (this._rotatePromise) {
            return this._rotatePromise;
        }
        const opt = this.rotateOpt;
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
            std_fs.write(this.fd, content, (err, fd) => { void err, fd; });
        }
    }

    async _formatWrite(priority, content, source_file, source_line) {
        if (this._destroyed) {
            return;
        }
        const now_msec = Date.now();
        const date = new Date(now_msec);
        if (this.outputOpt) {
            content = this.outputOpt.fnOutputPrefix({
                priorityStr: Log.PriorityString[priority],
                sourceFile: source_file,
                sourceLine: source_line,
                date: new Date()
            }) + content;
        }
        content += '\n';
        await this._write(content, date, Math.floor(now_msec / 1000));
    }
}

class Log {
    static Priority = {
        Trace: 0,
        Info: 1,
        Debug: 2,
        Error: 3
    };
    static PriorityString = [ "Trace", "Info", "Debug", "Error" ];

    static FnFilterPriorityLess = (a, b) => { return a < b; }
    static FnFilterPriorityLessEqual = (a, b) => { return a <= b; }
    static FnFilterPriorityGreater = (a, b) => { return a > b; }
    static FnFilterPriorityGreaterEqual = (a, b) => { return a >= b; }
    static FnFilterPriorityEqual = (a, b) => { return a == b; }
    static FnFilterPriorityNotEqual = (a, b) => { return a != b; }

    static enableSourceLine = false;
    static lineNo() {
        if (!Log.enableSourceLine) {
            return 0;
        }
        const str = new Error().stack;
        let idx = str.indexOf('lineNo');
        if (idx < 0) {
            return 0;
        }
        idx += 'lineNo'.length;
        idx = str.indexOf('\n', idx);
        if (idx < 0) {
            return 0;
        }
        idx += 1;
        idx = str.indexOf('\n', idx);
        if (idx < 0) {
            return 0;
        }
        idx -= 1;
        idx = str.lastIndexOf(':', idx);
        if (idx < 0) {
            return 0;
        }
        idx -= 1;
        idx = str.lastIndexOf(':', idx);
        if (idx < 0) {
            return 0;
        }
        let s = idx + 1;
        let e = str.indexOf(':', s);
        if (e < 0) {
            return 0;
        }
        return Number.parseInt(str.substring(s, e));
    }

    constructor() {
        this.enablePriority = [];
        this.files = new Map();

        for (let i = 0; i < Log.PriorityString.length; ++i) {
            this.enablePriority.push(true);
        }
    }

    enableFile(key, base_path, output_opt, rotate_opt) {
        let lf = this.files.get(key);
        if (lf) {
            return false;
        }
        lf = new LogFile(key, base_path);
        lf.outputOpt = output_opt;
        lf._set_rotate_opt(rotate_opt);
        this.files.set(key, lf);
        return true;
    }

    destroy() {
        for (const lf of this.files.values()) {
            lf._destroy();
        }
        this.files.clear();
    }

    checkPriorityEnabled(priority) {
        if (priority < 0 || priority >= this.enablePriority.length) {
            return false;
        }
        return this.enablePriority[priority];
    }

    setPriorityFilter(filter_priority, fn_filter_strategy) {
        for (let i = 0; i < this.enablePriority.length; ++i) {
            this.enablePriority[i] = !fn_filter_strategy(i, filter_priority);
        }
    }

    async trace(key, content, source_file, source_line) {
        await this._print(key, Log.Priority.Trace, content, source_file, source_line);
    }

    async info(key, content, source_file, source_line) {
        await this._print(key, Log.Priority.Info, content, source_file, source_line);
    }

    async debug(key, content, source_file, source_line) {
        await this._print(key, Log.Priority.Debug, content, source_file, source_line);
    }

    async error(key, content, source_file, source_line) {
        await this._print(key, Log.Priority.Error, content, source_file, source_line);
    }

// private:
    async _print(key, priority, content, source_file, source_line) {
        if (!this.checkPriorityEnabled(priority)) {
            return;
        }
        let lf = this.files.get(key);
        if (!lf) {
            return;
        }
        await lf._formatWrite(priority, content, source_file, source_line);
    }
}

module.exports = {
    LogFileOption,
    Log
};