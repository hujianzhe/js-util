if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

js_util.Common.VoxelSpace = class VoxelSpace {
    constructor(min_v, max_v, split_size) {
        const cnt = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            const delta = max_v[i] - min_v[i];
            if (delta <= 0) {
                return null;
            }
            cnt[i] = Math.ceil(delta / split_size[i]);
        }
        this.epsilon = 1e-6;
        this._min_v = [...min_v];
        this._max_v = [...max_v];
        this._split_size = [...split_size];
        this._nodes = null;
        this._dimension_node_max_sz = [...cnt];
        this._dimension_stride0 = cnt[1] * cnt[2];
    }

    get nodes() {
        if (!this._nodes) {
            const cnt = this._dimension_node_max_sz[0] * this._dimension_node_max_sz[1] * this._dimension_node_max_sz[2];
            this._nodes = new Array(cnt).fill(null);
        }
        return this._nodes;
    }
    get min_v() { return this._min_v; }
    get max_v() { return this._max_v; }
    get split_size() { return this._split_size; }

    node_indices_floor(p) {
        let index_values = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            let delta = p[i] - this._min_v[i] - this.epsilon;
            if (delta <= 0) {
                index_values[i] = 0;
                continue;
            }
            index_values[i] = Math.floor(delta / this._split_size[i]);
            if (index_values[i] > this._dimension_node_max_sz[i]) {
                index_values[i] = this._dimension_node_max_sz[i];
            }
        }
        return index_values;
    }
    
    node_indices_ceil(p) {
        let index_values = [0, 0, 0];
        for (let i = 0; i < 3; i++) {
            let delta = p[i] - this._min_v[i] + this.epsilon;
            if (delta <= 0) {
                index_values[i] = 0;
                continue;
            }
            index_values[i] = Math.ceil(delta / this._split_size[i]);
            if (index_values[i] > this._dimension_node_max_sz[i]) {
                index_values[i] = this._dimension_node_max_sz[i];
            }
        }
        return index_values;
    }

    get_node_by_index(x, y, z) {
        return x * this._dimension_stride0 + y * this._dimension_node_max_sz[2] + z;
    }

    get_node_min_position(x, y, z) {
        return [
            this._min_v[0] + x * this._split_size[0],
            this._min_v[1] + y * this._split_size[1],
            this._min_v[2] + z * this._split_size[2]
        ];
    }

    range_finder(min_v, max_v) {
        return this._finder(this.node_indices_floor(min_v), this.node_indices_ceil(max_v));
    }

    all_finder() {
        return this._finder([0, 0, 0], this._dimension_node_max_sz);
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