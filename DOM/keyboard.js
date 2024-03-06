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

    js_util.DOM.KeyboardListener = class KeyboardListener {
        constructor() {
            this.key_states_map = new Map();
        }

        key_state(code) {
            return this.key_states_map.get(code) || new KeyboardKeyState(code);
        }

        keydown(code) {
            if ('Unidentified' === code || '' === code) {
                return;
            }
            let state = this.key_states_map.get(code);
            if (!state) {
                state = new KeyboardKeyState(code);
                this.key_states_map.set(code, state);
            }
            state.down();
        }

        keyup(code) {
            if ('Unidentified' === code || '' === code) {
                return;
            }
            let state = this.key_states_map.get(code);
            if (!state) {
                state = new KeyboardKeyState(code);
                this.key_states_map.set(code, state);
            }
            state.up();
        }

        blur() {
            for (let state of this.key_states_map.values()) {
                if (!state.pressed) {
                    continue;
                }
                state.up();
            }
        }
    };
    js_util.DOM.KeyboardGlobalListener = new js_util.DOM.KeyboardListener();

    window.addEventListener('keydown', function (e) {
        js_util.DOM.KeyboardGlobalListener.keydown(e.code);
	}, true);

    window.addEventListener('keyup', function (e) {
        js_util.DOM.KeyboardGlobalListener.keyup(e.code);
    }, true);

    window.addEventListener('blur', function () {
        js_util.DOM.KeyboardGlobalListener.blur();
	});
};