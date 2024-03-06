if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

if (!js_util.DOM.TouchListener) {
    class TouchState extends js_util.DOM.KeyButtonState {
        constructor(identifier) {
            super();
            this.identifier = identifier;
            this.data = null;
        }

        update(e) {
            if (!this.data) {
                this.data = {};
            }
            this.data.clientX = e.clientX;
            this.data.clientY = e.clientY;
            this.data.screenX = e.screenX;
            this.data.screenY = e.screenY;
            this.data.pageX = e.pageX;
            this.data.pageY = e.pageY;
            this.data.target = e.target;
        }
    }

    js_util.DOM.TouchListener = class TouchListener {
        constructor() {
            this.key_states_map = new Map();
        }

        key_state(identifier) {
            return this.key_states_map.get(identifier) || new TouchState(identifier);
        }

        touchmove(e) {
            for (const touch of e.changedTouches) {
                let state = this.key_states_map.get(touch.identifier);
                if (!state) {
                    state = new TouchState(touch.identifier);
                    this.key_states_map.set(touch.identifier, state);
                }
                state.update(touch);
            }
        }

        touchstart(e) {
            for (const touch of e.changedTouches) {
                let state = this.key_states_map.get(touch.identifier);
                if (!state) {
                    state = new TouchState(touch.identifier);
                    this.key_states_map.set(touch.identifier, state);
                }
                state.update(touch);
                state.down();
            }
        }

        touchend(e) {
            for (const touch of e.changedTouches) {
                let state = this.key_states_map.get(touch.identifier);
                if (!state) {
                    state = new TouchState(touch.identifier);
                    this.key_states_map.set(touch.identifier, state);
                }
                state.update(touch);
                state.up();
            }
        }
    };
    js_util.DOM.TouchGlobalListener = new js_util.DOM.TouchListener();

    window.addEventListener('touchmove', function (e) {
        js_util.DOM.TouchGlobalListener.touchmove(e);
    });

    window.addEventListener('touchstart', function (e) {
        js_util.DOM.TouchGlobalListener.touchstart(e);
    }, true);

    window.addEventListener('touchend', function (e) {
        js_util.DOM.TouchGlobalListener.touchend(e);
    }, true);
}