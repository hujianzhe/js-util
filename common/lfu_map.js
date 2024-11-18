if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.LFUMap = class {
    static Node = class extends js_util.Common.ListNode {
        constructor(key, value) {
            super(value);
            this.key = key;
            this._frequency = 0;
        }
    };

    constructor(capacity) {
        if (!capacity || capacity <= 0) {
            throw new Error(`js_util.Common.LFUMap constructor invalid capacity ${capacity}`);
        }
        this._capacity = capacity;
        this._nodeMap = new Map();
        this._frequencyList = new js_util.Common.List();
    }

    get capacity() { return this._capacity; }

    get size() { return this._nodeMap.size; }

    get(k) {
        let lfu_node = this._nodeMap.get(k);
        if (!lfu_node) {
            return null;
        }
        const frequency = lfu_node._frequency + 1;
        if (frequency > 0) {
            lfu_node._frequency = frequency;
            this._updateFrequencyList(lfu_node);
        }
        return lfu_node.value;
    }

    set(k, v) {
        let exist_lfu_node = this._nodeMap.get(k);
        if (exist_lfu_node) {
            if (exist_lfu_node.value === v) {
                return;
            }
            exist_lfu_node.value = v;
            return;
        }
        if (this._nodeMap.size >= this._capacity) {
            this._removeNode(this._frequencyList.pop_back());
        }
        let lfu_node = new js_util.Common.LFUMap.Node(k, v);
        this._nodeMap.set(k, lfu_node);
        this._frequencyList.push_back(lfu_node);
        this._updateFrequencyList(lfu_node);
    }

    delete(k) {
        let lfu_node = this._nodeMap.get(k);
        if (!lfu_node) {
            return;
        }
        this._removeNode(lfu_node);
    }

    clear() {
        this._nodeMap.clear();
        this._frequencyList.clear();
    }

    getPairs(arr) {
        for (const [k, lfu_node] of this._nodeMap) {
            arr.push([k, lfu_node.value]);
        }
    }

    foreach(fn) {
        let i = 0;
        let arr = new Array(this._nodeMap.size * 2);
        for (const [k, lfu_node] of this._nodeMap) {
            arr[i++] = k;
            arr[i++] = lfu_node.value;
        }
        for (i = 0; i < arr.length; ) {
            const k = arr[i++];
            const v = arr[i++];
            fn(k, v);
        }
    }

// private:

    _removeNode(lfu_node) {
        this._nodeMap.delete(lfu_node.key);
        this._frequencyList.erase(lfu_node);
    }

    _updateFrequencyList(lfu_node) {
        let dst_node;
        for (let p = lfu_node.prev; p; p = p.prev) {
            if (p._frequency == lfu_node._frequency) {
                return;
            }
            if (p._frequency > lfu_node._frequency) {
                dst_node = p;
                break;
            }
        }
        if (!dst_node) {
            return;
        }
        if (dst_node == lfu_node.prev) {
            return;
        }
        this._frequencyList.erase(lfu_node);
        this._frequencyList.insert_back(dst_node, lfu_node);
    }
};