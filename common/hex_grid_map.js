if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.Common = js_util.Common || {};

/**
 * This HexGridMap is pointy top orientation
 *  /\
 * |  |
 *  \/
 */

js_util.Common.HexGrid = class HexGrid {
	constructor(idx, x, y) {
		this.idx = idx;
		this.x = x;
		this.y = y;
	}
};

js_util.Common.HexGridMap = class HexGridMap {
	constructor(x_sz, y_sz) {
		this.x_sz = x_sz;
		this.y_sz = y_sz;
		this.avaliable_indices = new Set();
		this.grids = [];
	}

	checkPositionValid(x, y) {
		return 0 <= x && x < this.x_sz && 0 <= y && y < this.y_sz;
	}

	calculateIndex(x, y) {
		return x * this.y_sz + y;
	}

	indexToX(idx) {
		return Math.floor(idx / this.y_sz);
	}
	indexToY(idx) {
		return idx % this.y_sz;
	}

	getTotalAvaliableGridCnt() {
		return this.avaliable_indices.size;
	}

	fillAllGrids() {
		for (let x = 0; x < this.x_sz; ++x) {
			for (let y = 0; y < this.y_sz; ++y) {
				const idx = this.calculateIndex(x, y);
				this.grids[idx] = new js_util.Common.HexGrid(idx, x, y);
				this.avaliable_indices.add(idx);
			}
		}
	}

	newAvaliableGridArray() {
		let i = 0;
		let arr = new Array(this.avaliable_indices.size);
		for (const idx of this.avaliable_indices) {
			if (this.grids[idx]) {
				arr[i++] = this.grids[idx];
			}
		}
		arr.length = i;
		return arr;
	}

	addGrid(g) {
		this.avaliable_indices.add(g.idx);
		this.grids[g.idx] = g;
	}

	delGrid(x, y) {
		if (x < 0 || x >= this.x_sz) {
			return null;
		}
		if (y < 0 || y >= this.y_sz) {
			return null;
		}
		const idx = this.calculateIndex(x, y);
		const g = this.grids[idx];
		this.grids[idx] = null;
		this.avaliable_indices.delete(idx);
		return g;
	}

	getGridByIndex(idx) {
		if (idx < 0 || idx >= this.grids.length) {
			return null;
		}
		return this.grids[idx];
	}

	getGrid(x, y) {
		if (x < 0 || x >= this.x_sz) {
			return null;
		}
		if (y < 0 || y >= this.y_sz) {
			return null;
		}
		return this.grids[x * this.y_sz + y];
	}

	getDistanceGrids(x, y, distance) {
		let grids = [], v;
		if (distance < 0) {
			return grids;
		}
		if (distance == 0) {
			v = this.getGrid(x, y);
			if (v) {
				grids.push(v);
			}
			return grids;
		}
		let x_off = Math.floor(y * 0.5);
		x -= x_off;

		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y - i) * 0.5);
			v = this.getGrid(x_off + x - distance + i, y - i);
			if (v) {
				grids.push(v);
			}
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y - distance) * 0.5);
			v = this.getGrid(x_off + x + i, y - distance);
			if (v) {
				grids.push(v);
			}
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y - distance + i) * 0.5);
			v = this.getGrid(x_off + x + distance, y - distance + i);
			if (v) {
				grids.push(v);
			}
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y + i) * 0.5);
			v = this.getGrid(x_off + x + distance - i, y + i);
			if (v) {
				grids.push(v);
			}
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y + distance) * 0.5);
			v = this.getGrid(x_off + x - i, y + distance);
			if (v) {
				grids.push(v);
			}
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y + distance - i) * 0.5);
			v = this.getGrid(x_off + x - distance, y + distance - i);
			if (v) {
				grids.push(v);
			}
		}
		return grids;
	}

	getDistancePositions(x, y, distance) {
		let poses = [];
		if (distance < 0) {
			return poses;
		}
		if (distance == 0) {
			poses.push({ x: x, y: y });
			return poses;
		}
		let x_off = Math.floor(y * 0.5);
		x -= x_off;

		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y - i) * 0.5);
			poses.push({
				x: x_off + x - distance + i,
				y: y - i
			});
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y - distance) * 0.5);
			poses.push({
				x: x_off + x + i,
				y: y - distance
			});
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y - distance + i) * 0.5);
			poses.push({
				x: x_off + x + distance,
				y: y - distance + i
			});
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y + i) * 0.5);
			poses.push({
				x: x_off + x + distance - i,
				y: y + i
			});
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y + distance) * 0.5);
			poses.push({
				x: x_off + x - i,
				y: y + distance
			});
		}
		for (let i = 0; i < distance; ++i) {
			x_off = Math.floor((y + distance - i) * 0.5);
			poses.push({
				x: x_off + x - distance,
				y: y + distance - i
			});
		}
		return poses;
	}

	getDistanceVerticeGrids(x, y, distance) {
		let grids = [], v;
		let x_off = Math.floor(y * 0.5);
		x -= x_off;

		v = this.getGrid(Math.floor(y * 0.5) + x - distance, y);
		if (v) {
			grids.push(v);
		}
		v = this.getGrid(Math.floor(y * 0.5) + x + distance, y);
		if (v) {
			grids.push(v);
		}
		v = this.getGrid(Math.floor((y - distance) * 0.5) + x + distance, y - distance);
		if (v) {
			grids.push(v);
		}
		v = this.getGrid(Math.floor((y + distance) * 0.5) + x, y + distance);
		if (v) {
			grids.push(v);
		}
		v = this.getGrid(Math.floor((y - distance) * 0.5) + x, y - distance);
		if (v) {
			grids.push(v);
		}
		v = this.getGrid(Math.floor((y + distance) * 0.5) + x - distance, y + distance);
		if (v) {
			grids.push(v);
		}
		return grids;
	}

	getDistanceVerticePositions(x, y, distance) {
		let poses = [];
		if (distance < 0) {
			return poses;
		}
		if (distance == 1) {
			poses.push({ x: x, y: y });
			return poses;
		}
		let x_off = Math.floor(y * 0.5);
		x -= x_off;

		poses.push({
			x: Math.floor(y * 0.5) + x - distance,
			y: y
		});
		poses.push({
			x: Math.floor(y * 0.5) + x + distance,
			y: y
		});
		poses.push({
			x: Math.floor((y - distance) * 0.5) + x + distance,
			y: y - distance
		});
		poses.push({
			x: Math.floor((y + distance) * 0.5) + x,
			y: y + distance
		});
		poses.push({
			x: Math.floor((y - distance) * 0.5) + x,
			y: y - distance
		});
		poses.push({
			x: Math.floor((y + distance) * 0.5) + x - distance,
			y: y + distance
		});
		return poses;
	}

	getRangeGrids(x, y, min_distance, max_distance) {
		let grids = [];
		for (let i = min_distance; i <= max_distance; ++i) {
			grids.push(...this.getDistanceGrids(x, y, i));
		}
		return grids;
	}

	getRangePositions(x, y, min_distance, max_distance) {
		let poses = [];
		for (let i = min_distance; i <= max_distance; ++i) {
			poses.push(...this.getDistancePositions(x, y, i));
		}
		return poses;
	}

	getRangeVerticeGrids(x, y, min_distance, max_distance) {
		let grids = [];
		for (let i = min_distance; i <= max_distance; ++i) {
			grids.push(...this.getDistanceVerticeGrids(x, y, i));
		}
		return grids;
	}

	getRangeVerticePositions(x, y, min_distance, max_distance) {
		let poses = [];
		for (let i = min_distance; i <= max_distance; ++i) {
			poses.push(...this.getDistanceVerticePositions(x, y, i));
		}
		return poses;
	}

	calculateDistance(x1, y1, x2, y2) {
		x1 -= Math.floor(y1 * 0.5);
		x2 -= Math.floor(y2 * 0.5);
		if (y1 < y2) {
			let yd = y2 - y1;
			let lx = x1 - yd;
			if (x2 < lx) {
				return yd + lx - x2;
			}
			if (x2 > x1) {
				return yd + x2 - x1;
			}
			return yd;
		}
		else {
			let yd = y1 - y2;
			let lx = x2 - yd;
			if (x1 < lx) {
				return yd + lx - x1;
			}
			if (x1 > x2) {
				return yd + x1 - x2;
			}
			return yd;
		}
	}
};