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
                return null;
            }
            this._dimension_node_max_sz[i] = delta / this._split_size[i];
            if (this._dimension_node_max_sz[i] * this._split_size[i] < delta) {
                this._dimension_node_max_sz[i] += 1n;
            }
        }
        this._dimension_stride0 = Number(this._dimension_node_max_sz[1] * this._dimension_node_max_sz[2]);
        this._nodes = null;
    }

    get nodes() {
        if (!this._nodes) {
            const cnt = this._dimension_node_max_sz[0] * this._dimension_node_max_sz[1] * this._dimension_node_max_sz[2];
            this._nodes = new Array(Number(cnt)).fill(null);
        }
        return this._nodes;
    }
    get min_v() { return this._min_v_number; }
    get max_v() { return this._max_v_number; }
    get split_size() { return this._split_size_number; }

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

    get_node_by_index(x, y, z) {
        return x * this._dimension_stride0 + y * Number(this._dimension_node_max_sz[2]) + z;
    }

    get_node_min_position(x, y, z) {
        return [
            this._min_v[0] + BigInt(x) * this._split_size[0],
            this._min_v[1] + BigInt(y) * this._split_size[1],
            this._min_v[2] + BigInt(z) * this._split_size[2]
        ].map(Number);
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
            min_v: null,
            max_v: null,
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
                this.min_v = _vs.get_node_min_position(this.cur_idx[0], this.cur_idx[1], this.cur_idx[2]);
                this.max_v = [
                    this.min_v[0] + _vs.split_size[0],
                    this.min_v[1] + _vs.split_size[1],
                    this.min_v[2] + _vs.split_size[2]
                ];
                this.cur_node_idx = _vs.get_node_by_index(this.cur_idx[0], this.cur_idx[1], this.cur_idx[2]);
            }
        };
        finder.update();
        return finder;
    }
}