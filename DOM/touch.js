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
			this.previous_ = null;
        }

        update(e) {
            if (!this.data) {
                this.data = {};
            }
			this.data.movementX = 0;
			this.data.movementY = 0;
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
            for (const touch of e.touches) {
                let state = this.key_states_map.get(touch.identifier);
                if (!state) {
                    state = new TouchState(touch.identifier);
                    this.key_states_map.set(touch.identifier, state);
                }
                state.update(touch);

				if (state.previous_) {
					state.data.movementX = touch.screenX - state.previous_.screenX;
					state.data.movementY = touch.screenY - state.previous_.screenY;
				}
				else {
					state.previous_ = {};
				}
				state.previous_.screenX = touch.screenX;
				state.previous_.screenY = touch.screenY;
            }
        }

        touchstart(e) {
            for (const touch of e.touches) {
                let state = this.key_states_map.get(touch.identifier);
                if (!state) {
                    state = new TouchState(touch.identifier);
                    this.key_states_map.set(touch.identifier, state);
                }
                state.update(touch);
                state.down();

				if (!state.previous_) {
					state.previous_ = {};
				}
				state.previous_.screenX = touch.screenX;
				state.previous_.screenY = touch.screenY;
            }
        }

        touchend(e) {
            for (const touch of e.touches) {
                let state = this.key_states_map.get(touch.identifier);
                if (!state) {
                    state = new TouchState(touch.identifier);
                    this.key_states_map.set(touch.identifier, state);
                }
                state.update(touch);
                state.up();
            }
        }

		touchcancel(e) {
			this.touchend(e);
		}
    };
    js_util.DOM.TouchGlobalListener = new js_util.DOM.TouchListener();

    window.addEventListener('touchmove', function (e) {
        js_util.DOM.TouchGlobalListener.touchmove(e);
    }, true);

    window.addEventListener('touchstart', function (e) {
        js_util.DOM.TouchGlobalListener.touchstart(e);
    }, true);

    window.addEventListener('touchend', function (e) {
        js_util.DOM.TouchGlobalListener.touchend(e);
    }, true);

	window.addEventListener('touchcancel', function (e) {
		js_util.DOM.TouchGlobalListener.touchcancel(e);
	}, true);
}
