if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.ListNode = class {
    constructor(value) {
        this.prev = null;
        this.next = null;
        this.value = value;
    }
};

js_util.Common.List = class List {
    constructor() {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    insert_back(node, v) {
        let new_node;
        if (v instanceof js_util.Common.ListNode) {
            new_node = v;
        }
        else {
            new_node = new js_util.Common.ListNode(v);
        }
        if (null === this.tail) {
            this.head = this.tail = new_node;
            new_node.prev = new_node.next = null;
        }
        else {
            if (this.tail === node) {
                this.tail = new_node;
            }
            new_node.prev = node;
            new_node.next = node.next;
            if (node.next) {
                node.next.prev = new_node;
            }
            node.next = new_node;
        }
        ++this.length;
        return this;
    }

    push_back(v) {
        return this.insert_back(this.tail, v);
    }

    insert_front(node, v) {
        let new_node;
        if (v instanceof js_util.Common.ListNode) {
            new_node = v;
        }
        else {
            new_node = new js_util.Common.ListNode(v);
        }
        if (null === this.head) {
            this.head = this.tail = new_node;
            new_node.prev = new_node.next = null;
        }
        else {
            if (this.head === node) {
                this.head = new_node;
            }
            new_node.next = node;
            new_node.prev = node.prev;
            if (node.prev) {
                node.prev.next = new_node;
            }
            node.prev = new_node;
        }
        ++this.length;
        return this;
    }

    push_front(v) {
        return this.insert_front(this.head, v);
    };

    erase(node) {
        if (!node) {
            return this;
        }
        if (!(node instanceof js_util.Common.ListNode)) {
            return;
        }
        if (node.prev) {
            node.prev.next = node.next;
        }
        if (node.next) {
            node.next.prev = node.prev;
        }
        if (node === this.head) {
            this.head = node.next;
        }
        if (node === this.tail) {
            this.tail = node.prev;
        }
        node.prev = node.next = null;
        if (this.length > 0) {
            --this.length;
        }
        return this;
    }

    pop_front() {
        let node = this.head;
        if (node) {
            this.erase(node);	
        }
        return node;
    }

    pop_back() {
        let node = this.tail;
        if (node) {
            this.erase(node);
        }
        return node;
    }

    clear(callback) {
        if (typeof callback === "function") {
            let next_node;
            for (let node = this.head; node; node = next_node) {
                next_node = node.next;
                callback(node);
                node = null;
            }
        }
        this.head = this.tail = null;
        this.length = 0;
    }

    begin_at(index) {
        if (index < 0 || index >= this.length) {
            return null;
        }
        let i = 0;
        for (let node = this.head; node && i !== index; node = node.next, ++i);
        return node;
    }

    end_at(index) {
        if (index > 0 || index <= -this.length) {
            return null;
        }
        let i = 0;
        for (let node = this.tail; node && i !== index; node = node.prev, --i);
        return node;
    }

    merge(list) {
        if (!this.head) {
            this.head = list.head;
        }
        if (this.tail) {
            this.tail.next = list.head;
        }
        if (list.head) {
            list.head.prev = this.tail;
        }
        if (list.tail) {
            this.tail = list.tail;
        }
        this.length += list.length;
        list.head = list.tail = null;
        list.length = 0;
        return this;
    }
};
