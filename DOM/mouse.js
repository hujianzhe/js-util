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
            this.key_states_map = new Map();
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
            this.data.region = e.region;
            this.data.relatedTarget = e.relatedTarget;
            this.data.shiftKey = e.shiftKey;
            this.data.altKey = e.altKey;
            this.data.ctrlKey = e.ctrlKey;
            this.data.metaKey = e.metaKey;
        }

        key_state(button) {
            return this.key_states_map.get(button) || new MouseButtonState(button);
        }

        mouseenter(e) {
            this.update(e);
        }

        mousemove(e) {
            this.update(e);
        }

        mousedown(button) {
            let state = this.key_states_map.get(button);
            if (!state) {
                state = new MouseButtonState(button);
                this.key_states_map.set(button, state);
            }
            state.down();
        }

        mouseup(button) {
            let state = this.key_states_map.get(button);
            if (!state) {
                state = new MouseButtonState(button);
                this.key_states_map.set(button, state);
            }
            state.up();
        }
    };
    js_util.DOM.MouseGlobalListener = new js_util.DOM.MouseListener();

    document.addEventListener('mouseenter', function (e) {
        js_util.DOM.MouseGlobalListener.mouseenter(e);
    });

    window.addEventListener('mousemove', function (e) {
        js_util.DOM.MouseGlobalListener.mousemove(e);
    });

    window.addEventListener('mousedown', function (e) {
        js_util.DOM.MouseGlobalListener.mousedown(e.button);
    }, true);

    window.addEventListener('mouseup', function (e) {
        js_util.DOM.MouseGlobalListener.mouseup(e.button);
    }, true);
}