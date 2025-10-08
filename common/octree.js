if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.Octree = class {
    static _vec3Add(v1, v2) {
        return [v1[0] + v2[0], v1[1] + v2[1], v1[2] + v2[2]];
    }
    
    static _vec3Sub(v1, v2) {
        return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
    }
    
    static _vec3MultiplyScalar(v, n) {
        v[0] *= n;
        v[1] *= n;
        v[2] *= n;
        return v;
    }
    
    static _aabbVertices(min_v, max_v) {
        return [
            [min_v[0], min_v[1], min_v[2]],
            [max_v[0], min_v[1], min_v[2]],
            [max_v[0], max_v[1], min_v[2]],
            [min_v[0], max_v[1], min_v[2]],
            [min_v[0], min_v[1], max_v[2]],
            [max_v[0], min_v[1], max_v[2]],
            [max_v[0], max_v[1], max_v[2]],
            [min_v[0], max_v[1], max_v[2]]
        ];
    }
    
    static _aabbIntersectAABB(a_min_v, a_max_v, b_min_v, b_max_v) {
        return a_min_v[0] <= b_max_v[0] && a_max_v[0] >= b_min_v[0] &&
               a_min_v[1] <= b_max_v[1] && a_max_v[1] >= b_min_v[1] &&
               a_min_v[2] <= b_max_v[2] && a_max_v[2] >= b_min_v[2];
    }
    
    static _aabbContainPoint(min_v, max_v, p) {
        return min_v[0] <= p[0] && p[0] <= max_v[0] &&
               min_v[1] <= p[1] && p[1] <= max_v[1] &&
               min_v[2] <= p[2] && p[2] <= max_v[2];
    }
    
    static _aabbContainAABB(a_min_v, a_max_v, b_min_v, b_max_v) {
        return js_util.Common.Octree._aabbContainPoint(a_min_v, a_max_v, b_min_v) && 
               js_util.Common.Octree._aabbContainPoint(a_min_v, a_max_v, b_max_v);
    }

    static _octreeLevelNodesCnt(deep_num) {
        let cnt = 1;
        if (deep_num > 1) {
            for (let i = 0; i < deep_num - 1; i++) {
                cnt *= 8;
            }
        }
        return cnt;
    }

    static _octreeTotalNodesCnt(max_deep_num) {
        let total_cnt = 0;
        for (let i = 1; i <= max_deep_num; i++) {
            total_cnt += js_util.Common.Octree._octreeLevelNodesCnt(i);
        }
        return total_cnt;
    }

    static _insertObjToList(oct_node, oct_obj) {
        if (oct_node.obj_list_head) {
            oct_node.obj_list_head.prev = oct_obj;
        }
        oct_obj.next = oct_node.obj_list_head;
        oct_obj.prev = null;
        oct_node.obj_list_head = oct_obj;
        oct_node.obj_cnt++;
        oct_obj.oct = oct_node;
    }

    static _delObjFromList(oct_node, oct_obj) {
        if (oct_node.obj_list_head === oct_obj) {
            oct_node.obj_list_head = oct_obj.next;
        }
        if (oct_obj.prev) {
            oct_obj.prev.next = oct_obj.next;
        }
        if (oct_obj.next) {
            oct_obj.next.prev = oct_obj.prev;
        }
        oct_node.obj_cnt--;
        oct_obj.oct = null;
    }

    static _octreeNodeInit(root, pos, half) {
        root.min_v = js_util.Common.Octree._vec3Sub(pos, half);
        root.max_v = js_util.Common.Octree._vec3Add(pos, half);
        root.obj_list_head = null;
        root.obj_cnt = 0;
        root.deep_num = 0;
        root.parent = null;
        root.childs = null;
    }

    static Node = class {
        constructor() {
            this.min_v = null;
            this.max_v = null;
            this.obj_list_head = null;
            this.obj_cnt = 0;
            this.deep_num = 0;
            this.parent = null;
            this.childs = null;
            this._index = -1;
        }
    }

    constructor() {
        this._nodes = null;
        this._nodes_cnt = 0;
        this._max_deep_num = 0;
        this._split_cnt_per_node = 0;
    }

    static calculateDeepNumByCellSize(half_size, cell_size) {
        const min_half_value = Math.min(half_size[0], half_size[1], half_size[2]);
        if (min_half_value <= cell_size) {
            return 1;
        }
        return Math.floor(Math.log(min_half_value / cell_size) / Math.log(2)) + 1;
    }

    init(pos, half, max_deep_num, split_cnt_per_node) {
        if (max_deep_num <= 0 || split_cnt_per_node <= 0) {
            return null;
        }

        const nodes_cnt = js_util.Common.Octree._octreeTotalNodesCnt(max_deep_num);
        const nodes = new Array(nodes_cnt);
        for (let i = 0; i < nodes_cnt; i++) {
            nodes[i] = new js_util.Common.Octree.Node();
            nodes[i]._index = i;
        }

        this._nodes_cnt = nodes_cnt;
        this._nodes = nodes;
        js_util.Common.Octree._octreeNodeInit(this._nodes[0], pos, half);
        this._nodes[0].deep_num = 1;
        this._max_deep_num = max_deep_num;
        this._split_cnt_per_node = split_cnt_per_node;
        return this;
    }

    removeObject(obj) {
        const oct = obj.oct;
        if (!oct) {
            return;
        }
        js_util.Common.Octree._delObjFromList(oct, obj);
    }

    updateObject(obj) {
        const root = this._nodes[0];
        const obj_oct = obj.oct;
        let oct = obj_oct ? obj_oct : root;

        while (oct) {
            if (oct.childs) {
                let find = false;
                for (let i = 0; i < 8; i++) {
                    const child = oct.childs[i];
                    if (!js_util.Common.Octree._aabbContainAABB(child.min_v, child.max_v, obj.min_v, obj.max_v)) {
                        continue;
                    }
                    if (child.childs) {
                        oct = child;
                        break;
                    }
                    if (obj_oct) {
                        js_util.Common.Octree._delObjFromList(obj_oct, obj);
                    }
                    js_util.Common.Octree._insertObjToList(child, obj);
                    find = true;
                    break;
                }
                if (find) {
                    break;
                }
            }

            if (js_util.Common.Octree._aabbContainAABB(oct.min_v, oct.max_v, obj.min_v, obj.max_v)) {
                if (oct === obj_oct) {
                    return;
                }
                if (obj_oct) {
                    js_util.Common.Octree._delObjFromList(obj_oct, obj);
                }
                js_util.Common.Octree._insertObjToList(oct, obj);
                break;
            }
            oct = oct.parent;
        }

        if (!oct) {
            if (obj_oct === root) {
                return;
            }
            if (obj_oct) {
                js_util.Common.Octree._delObjFromList(obj_oct, obj);
            }
            js_util.Common.Octree._insertObjToList(root, obj);
            return;
        }

        if (obj.oct.obj_cnt > this._split_cnt_per_node && obj.oct.deep_num < this._max_deep_num) {
            this._octreeNodeSplit(obj.oct);
        }
    }

    findNodes(min_v, max_v, nodes) {
        if (!nodes) {
            nodes = [];
        } else {
            nodes.length = 0;
        }
        
        const root = this._nodes[0];
        if (!js_util.Common.Octree._aabbIntersectAABB(root.min_v, root.max_v, min_v, max_v)) {
            return nodes;
        }
        
        nodes.push(root);
        let pop_idx = 0;
        
        while (pop_idx < nodes.length) {
            const oct = nodes[pop_idx++];
            if (!oct.childs) {
                continue;
            }
            for (let i = 0; i < 8; i++) {
                const child = oct.childs[i];
                if (!js_util.Common.Octree._aabbIntersectAABB(child.min_v, child.max_v, min_v, max_v)) {
                    continue;
                }
                nodes.push(child);
            }
        }
        
        return nodes;
    }

    clear() {
        for (let i = 0; i < this._nodes_cnt; i++) {
            const node = this._nodes[i];
            let obj = node.obj_list_head;
            while (obj) {
                obj.oct = null;
                obj = obj.next;
            }
            node.obj_list_head = null;
            node.obj_cnt = 0;
            node.parent = null;
            node.childs = null;
        }
    }

    destroy() {
        for (let i = 0; i < this._nodes_cnt; i++) {
            const node = this._nodes[i];
            let obj = node.obj_list_head;
            while (obj) {
                obj.oct = null;
                obj = obj.next;
            }
        }
        this._nodes = null;
        this._nodes_cnt = 0;
    }

    _octreeNodeSplit(root) {
        if (root.childs) {
            return;
        }

        const rootIndex = root._index;
        if (rootIndex === -1) return;

        const childStartIndex = 1 + (rootIndex * 8);
        root.childs = [];
        for (let j = 0; j < 8; j++) {
            root.childs[j] = this._nodes[childStartIndex + j];
        }

        const new_half = js_util.Common.Octree._vec3Sub(root.max_v, root.min_v);
        js_util.Common.Octree._vec3MultiplyScalar(new_half, new_half, 0.5);
        const root_pos = js_util.Common.Octree._vec3Add(root.min_v, new_half);
        js_util.Common.Octree._vec3MultiplyScalar(new_half, new_half, 0.5);
        
        const new_min_v = js_util.Common.Octree._vec3Sub(root_pos, new_half);
        const new_max_v = js_util.Common.Octree._vec3Add(root_pos, new_half);
        
        const new_o = js_util.Common.Octree._aabbVertices(new_min_v, new_max_v);
        
        for (let k = 0; k < 8; k++) {
            const child = root.childs[k];
            js_util.Common.Octree._octreeNodeInit(child, new_o[k], new_half);
            child.parent = root;
            child.deep_num = root.deep_num + 1;
        }

        let obj = root.obj_list_head;
        while (obj) {
            const obj_next = obj.next;
            for (let m = 0; m < 8; m++) {
                const child = root.childs[m];
                if (!js_util.Common.Octree._aabbContainAABB(child.min_v, child.max_v, obj.min_v, obj.max_v)) {
                    continue;
                }
                js_util.Common.Octree._delObjFromList(root, obj);
                js_util.Common.Octree._insertObjToList(child, obj);
                break;
            }
            obj = obj_next;
        }
    }
};

js_util.Common.OctreeObject = class {
    constructor() {
        this.min_v = null;
        this.max_v = null;
        this.oct = null;
        this.next = null;
        this.prev = null;
        this.userData = null;
    }
};