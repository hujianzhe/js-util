if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

if (!js_util.DOM.KeyboardListener) {
    class KeyboardKeyState extends js_util.DOM.KeyButtonState {
        constructor(code) {
            super();
            this.code = code;
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
        state.down();
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
        state.up();
    }, true);

    window.addEventListener('blur', function () {
		for (let state of js_util.DOM.KeyboardListener.key_states_map.values()) {
            if (!state.pressed) {
                continue;
            }
            state.up();
        }
	});
};