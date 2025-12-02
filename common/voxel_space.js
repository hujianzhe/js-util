if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.VoxelSpace = class VoxelSpace {
    constructor(min_v, max_v, split_size) {
        this.epsilon = 1e-6;
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

    node_indices_floor(p) {
        let index_values = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            const pi = BigInt(Math.floor(p[i] - this.epsilon));
            if (pi < this._min_v[i]) {
                index_values[i] = 0;
                continue;
            }
            index_values[i] = (pi - this._min_v[i]) / this._split_size[i];
            if (index_values[i] > this._dimension_node_max_sz[i]) {
                index_values[i] = this._dimension_node_max_sz[i];
            }
            index_values[i] = Number(index_values[i]);
        }
        return index_values;
    }
    
    node_indices_ceil(p) {
        let index_values = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            const pi = BigInt(Math.ceil(p[i]));
            if (pi < this._min_v[i]) {
                index_values[i] = 0;
                continue;
            }
            index_values[i] = (pi - this._min_v[i]) / this._split_size[i];
            if (index_values[i] < this._dimension_node_max_sz[i]) {
                index_values[i] += 1n;
            }
            else {
                index_values[i] = this._dimension_node_max_sz[i];
            }
            index_values[i] = Number(index_values[i]);
        }
        return index_values;
    }

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
        return this._finder(this.node_indices_floor(min_v), this.node_indices_ceil(max_v));
    }

    all_finder() {
        return this._finder([0, 0, 0], this._dimension_node_max_sz.map(Number));
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
}