if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

js_util.DOM.KeyButtonState = class KeyButtonState {
    constructor() {
        this.pressed = false;
        this.press_timestamp = 0;
        this.press_start_timestamp = 0;
        this.release_timestamp = 0;
        this.press_total_times = 0;
    }

    down() {
        const now = Date.now();
        if (!this.pressed) {
            this.pressed = true;
            ++this.press_total_times;
            this.press_start_timestamp = now;
        }
        this.press_timestamp = now;
    }

    up() {
        const now = Date.now();
        this.pressed = false;
        this.release_timestamp = now;
        this.press_timestamp = now;
        if (this.press_start_timestamp <= 0) {
            this.press_start_timestamp = now;
            this.press_total_times = 1;
        }
    }
};