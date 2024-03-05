if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

if (!js_util.DOM.KeyboardListener) {
    class KeyboardKeyState {
        constructor(code) {
            this.code = code;
            this.pressed = false;
            this.press_timestamp = 0;
            this.press_start_timestamp = 0;
            this.release_timestamp = 0;
            this.press_total_times = 0;
        }
    }
    class KeyboardListener {
        constructor() {
            this.key_states_map = new Map();
        }

        key_state(code) {
            return this.key_states_map.get(code) || new KeyboardKeyState(code);
        }
    }
    js_util.DOM.KeyboardListener = new KeyboardListener();

    window.addEventListener('keydown', function (e) {
		if ('Unidentified' === e.code || '' === e.code) {
            return;
        }
        let state = js_util.DOM.KeyboardListener.key_states_map.get(e.code);
        if (!state) {
            state = new KeyboardKeyState(e.code);
            js_util.DOM.KeyboardListener.key_states_map.set(e.code, state);
        }
        const now = Date.now();
        if (!state.pressed) {
            state.pressed = true;
            ++state.press_total_times;
            state.press_start_timestamp = now;
        }
        state.press_timestamp = now;
	}, true);

    window.addEventListener('keyup', function (e) {
        if ('Unidentified' === e.code || '' === e.code) {
            return;
        }
        let state = js_util.DOM.KeyboardListener.key_states_map.get(e.code);
        if (!state) {
            state = new KeyboardKeyState(e.code);
            js_util.DOM.KeyboardListener.key_states_map.set(e.code, state);
        }
        const now = Date.now();
        state.pressed = false;
        state.release_timestamp = now;
        state.press_timestamp = now;
        if (state.press_start_timestamp <= 0) {
            state.press_start_timestamp = now;
            state.press_total_times = 1;
        }
    }, true);

    window.addEventListener('blur', function () {
		for (let state of js_util.DOM.KeyboardListener.key_states_map.values()) {
            if (!state.pressed) {
                continue;
            }
            const now = Date.now();
            state.pressed = false;
            state.release_timestamp = now;
            state.press_timestamp = now;
        }
	});
};