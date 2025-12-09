if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.VoxelSpace = class VoxelSpace {
    constructor(min_v, max_v, split_size) {
        this._min_v_number = [Math.floor(min_v[0]), Math.floor(min_v[1]), Math.floor(min_v[2])];
        this._max_v_number = [Math.ceil(max_v[0]), Math.ceil(max_v[1]), Math.ceil(max_v[2])];
        this._split_size_number = [Math.ceil(split_size[0]), Math.ceil(split_size[1]), Math.ceil(split_size[2])];
        this._min_v = this._min_v_number.map(BigInt);
        this._max_v = this._max_v_number.map(BigInt);
        this._split_size = this._split_size_number.map(BigInt);
        this._dimension_node_max_sz = [0n, 0n, 0n];
        for (let i = 0; i < 3; ++i) {
            const delta = this._max_v[i] - this._min_v[i];
            if (delta <= 0n || this._split_size[i] <= 0n) {
                throw new Error('[VoxelSpace]: invalid constructor parameters');
            }
            this._dimension_node_max_sz[i] = delta / this._split_size[i];
            if (this._dimension_node_max_sz[i] * this._split_size[i] < delta) {
                this._dimension_node_max_sz[i] += 1n;
            }
        }
        this._dimension_node_max_sz_number = this._dimension_node_max_sz.map(Number);
        this._dimension_stride0 = this._dimension_node_max_sz[1] * this._dimension_node_max_sz[2];
        this._dimension_stride0_number = Number(this._dimension_stride0);
        this._dimension_stride1_number = Number(this._dimension_node_max_sz[2]);
        this._nodes_length_number = Number(this._dimension_node_max_sz[0] * this._dimension_node_max_sz[1] * this._dimension_node_max_sz[2]);
        this._nodes = null;
    }

    get nodes() {
        if (!this._nodes) {
            this._nodes = new Array(this._nodes_length_number);
        }
        return this._nodes;
    }
    get min_v() { return this._min_v_number; }
    get max_v() { return this._max_v_number; }
    get split_size() { return this._split_size_number; }
    get dimension_node_max_sz() { return this._dimension_node_max_sz_number; }

    node_index_to_xyz(node_idx) {
        if (node_idx < 0 || node_idx >= this._nodes_length_number) {
            return null;
        }
        node_idx = BigInt(node_idx);
        const x = node_idx / this._dimension_stride0;
        node_idx %= this._dimension_stride0;
        const y = node_idx / this._dimension_node_max_sz[2];
        const z = node_idx % this._dimension_node_max_sz[2];
        return [x, y, z].map(Number);
    }

    node_index_from_xyz(x, y, z) {
        return x * this._dimension_stride0_number + y * this._dimension_stride1_number + z;
    }

    get_node_by_xyz(x, y, z) {
        if (x < 0 || x >= this._dimension_node_max_sz_number[0] ||
            y < 0 || y >= this._dimension_node_max_sz_number[1] ||
            z < 0 || z >= this._dimension_node_max_sz_number[2])
        {
            return null;
        }
        return this.nodes[this.node_index_from_xyz(x, y, z)];
    }

    get_node_boundbox(x, y, z) {
        const min_v = [
            this._min_v[0] + BigInt(x) * this._split_size[0],
            this._min_v[1] + BigInt(y) * this._split_size[1],
            this._min_v[2] + BigInt(z) * this._split_size[2]
        ];
        const max_v = [
            min_v[0] + this._split_size[0],
            min_v[1] + this._split_size[1],
            min_v[2] + this._split_size[2]
        ];
        return [min_v.map(Number), max_v.map(Number)];
    }

    range_finder(min_v, max_v) {
        const [s, e] = this._node_range_indices(min_v, max_v);
        return this._finder(s.map(Number), e.map(Number));
    }

    all_finder() {
        return this._finder([0, 0, 0], this._dimension_node_max_sz_number);
    }

    _finder(_start_idx, _end_idx) {
        const _vs = this;
        if (_start_idx[0] >= _end_idx[0]) {
            return null;
        }
        if (_start_idx[1] >= _end_idx[1]) {
            return null;
        }
        if (_start_idx[2] >= _end_idx[2]) {
            return null;
        }
        const finder = {
            cur_idx: [_start_idx[0], _start_idx[1], _start_idx[2]],
            cur_node_idx: -1,
            next: function() {
                ++this.cur_idx[2];
                if (this.cur_idx[2] < _end_idx[2]) {
                    this.update();
                    return this;
                }
                this.cur_idx[2] = _start_idx[2];
                ++this.cur_idx[1];
                if (this.cur_idx[1] < _end_idx[1]) {
                    this.update();
                    return this;
                }
                this.cur_idx[1] = _start_idx[1];
                ++this.cur_idx[0];
                if (this.cur_idx[0] < _end_idx[0]) {
                    this.update();
                    return this;
                }
                return null;
            },
            update: function () {
                this.cur_node_idx = _vs.node_index_from_xyz(this.cur_idx[0], this.cur_idx[1], this.cur_idx[2]);
            }
        };
        finder.update();
        return finder;
    }

    static _calculate_index(min_v, sz, count, v) {
        let r = [0n, 0n];
        const vl = BigInt(Math.floor(v));
        if (vl < min_v) {
            return r;
        }        
        const vh = BigInt(Math.ceil(v));
        let d;
        if (vl == vh) {
            d = vl - min_v;
            r[0] = d / sz;
            r[1] = r[0] + 1n;
            if (r[0] > 0 && 0 == d % sz) {
                r[0] -= 1n;
            }
        }
        else {
            d = vl - min_v;
            r[0] = d / sz;
            d = vh - min_v;
            r[1] = d / sz;
            if (r[1] <= r[0]) {
                r[1] = r[0] + 1n;
            }
        }
        if (r[0] > count) {
            r[0] = count;
        }
        if (r[1] > count) {
            r[1] = count;
        }
        return r;
    }
    
    _node_range_indices(p1, p2) {
        let s = [0n, 0n, 0n], e = [0n, 0n, 0n];
        for (let i = 0; i < 3; ++i) {
            const r1 = VoxelSpace._calculate_index(this._min_v[i], this._split_size[i], this._dimension_node_max_sz[i], p1[i]);
            const r2 = VoxelSpace._calculate_index(this._min_v[i], this._split_size[i], this._dimension_node_max_sz[i], p2[i]);
            s[i] = (r1[0] < r2[0] ? r1[0]: r2[0]);
            e[i] = (r1[1] > r2[1] ? r1[1]: r2[1]);
        }
        return [s, e];
    }
}