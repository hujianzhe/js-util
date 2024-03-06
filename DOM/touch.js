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
            this.data.radiusX = e.radiusX;
            this.data.radiusY = e.radiusY;
            this.data.rotationAngle = e.rotationAngle;
            this.data.target = e.target;
        }
    }

    js_util.DOM.TouchListener = class TouchListener {
        constructor() {
            this.touch_states_map = new Map();
        }

        touch_state(identifier) {
            return this.touch_states_map.get(identifier) || new TouchState(identifier);
        }
    };
    js_util.DOM.TouchGlobalListener = new js_util.DOM.TouchListener();
}