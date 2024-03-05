if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

if (!js_util.DOM.MouseListener) {
    class MouseButtonState extends js_util.DOM.KeyButtonState {
        constructor(button) {
            super();
            this.button = button;
        }
    }

    js_util.DOM.MouseListener = class MouseListener {
        constructor() {
            this.button_states_map = new Map();
            this.position = null;
        }

        update_position(e) {
            if (!this.position) {
                this.position = {};
            }
            this.position.client_x = e.clientX;
            this.position.client_y = e.clientY;
            this.position.screen_x = e.screenX;
            this.position.screen_y = e.screenY;
        }

        button_state(button) {
            return this.button_states_map.get(button) || new MouseButtonState(button);
        }
    };
    js_util.DOM.MouseGlobalListener = new js_util.DOM.MouseListener();

    document.addEventListener('mouseenter', function (e) {
        js_util.DOM.MouseGlobalListener.update_position(e);
    });

    window.addEventListener('mousemove', function (e) {
        js_util.DOM.MouseGlobalListener.update_position(e);
    });

    window.addEventListener('mousedown', function (e) {
        let state = js_util.DOM.MouseGlobalListener.button_states_map.get(e.button);
        if (!state) {
            state = new MouseButtonState(e.button);
            js_util.DOM.MouseGlobalListener.button_states_map.set(e.button, state);
        }
        state.down();
    }, true);

    window.addEventListener('mouseup', function (e) {
        let state = js_util.DOM.MouseGlobalListener.button_states_map.get(e.button);
        if (!state) {
            state = new MouseButtonState(e.button);
            js_util.DOM.MouseGlobalListener.button_states_map.set(e.button, state);
        }
        state.up();
    }, true);
}