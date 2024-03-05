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

    class MouseListener {
        constructor() {
            this.button_states_map = new Map();
            this.last_client_x = 0;
            this.last_client_y = 0;
            this.last_screen_x = 0;
            this.last_screen_y = 0;
        }

        button_state(button) {
            return this.button_states_map.get(button) || new MouseButtonState(button);
        }
    }
    js_util.DOM.MouseListener = new MouseListener();

    window.addEventListener('mousemove', function (e) {
        js_util.DOM.MouseListener.last_client_x = e.clientX;
        js_util.DOM.MouseListener.last_client_y = e.clientY;
        js_util.DOM.MouseListener.last_screen_x = e.screenX;
        js_util.DOM.MouseListener.last_screen_y = e.screenY;
    });

    window.addEventListener('mousedown', function (e) {
        let state = js_util.DOM.MouseListener.button_states_map.get(e.button);
        if (!state) {
            state = new MouseButtonState(e.button);
            js_util.DOM.MouseListener.button_states_map.set(e.button, state);
        }
        state.down();
    }, true);

    window.addEventListener('mouseup', function (e) {
        let state = js_util.DOM.MouseListener.button_states_map.get(e.button);
        if (!state) {
            state = new MouseButtonState(e.button);
            js_util.DOM.MouseListener.button_states_map.set(e.button, state);
        }
        state.up();
    }, true);
}