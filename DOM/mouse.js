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
            this.data.region = e.region;
            this.data.relatedTarget = e.relatedTarget;
            this.data.shiftKey = e.shiftKey;
            this.data.altKey = e.altKey;
            this.data.ctrlKey = e.ctrlKey;
            this.data.metaKey = e.metaKey;
        }

        button_state(button) {
            return this.button_states_map.get(button) || new MouseButtonState(button);
        }
    };
    js_util.DOM.MouseGlobalListener = new js_util.DOM.MouseListener();

    document.addEventListener('mouseenter', function (e) {
        js_util.DOM.MouseGlobalListener.update(e);
    });

    window.addEventListener('mousemove', function (e) {
        js_util.DOM.MouseGlobalListener.update(e);
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