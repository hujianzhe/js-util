var js_util = js_util || {};
js_util.DOM = js_util.DOM || {};

js_util.DOM.WebSocketClient = class WebSocketClient {
	constructor(opts = {
		binaryType: undefined,	// "arraybuffer" or "blob"
		connect_timeout_msec: -1,
		heartbeat_max_times: 0,
		heartbeat_interval_sec: 0,
	}) {
		this.socket = null;
		this.opts = opts;
		this.connect_timerid = null;
		this.heartbeat_do_times = 0;
		this.heartbeat_timerid = null;
		this.recv_timestamp_msec = 0;
		this.connecting_send_cache = null;
		this.session = null;
		this.onmessage = function(e) {};
		this.onheartbeat = function() {};
	}

	close() {
		if (!this.socket) {
			return;
		}
		this.socket.close();
		this.socket = null;
		if (this.heartbeat_timerid) {
			clearTimeout(this.heartbeat_timerid);
			this.heartbeat_timerid = null;
		}
		if (this.connect_timerid) {
			clearTimeout(this.connect_timerid);
			this.connect_timerid = null;
		}
		if (this.session) {
			this.session.socket = null;
			this.session.onclose();
			this.session = null;
		}
	}

	send(data) {
		let ws = this.socket;
		if (!ws) {
			return;
		}
		if (WebSocket.OPEN === ws.readyState) {
			ws.send(data);
			return;
		}
		if (WebSocket.CONNECTING === ws.readyState) {
			if (this.connecting_send_cache) {
				this.connecting_send_cache.push(data);
			}
			else {
				this.connecting_send_cache = [data];
			}
			return;
		}
	}

	connect(url, protocols) {
		if (this.socket) {
			throw Error("WebSocketClient connect again");
		}
		let ws = new WebSocket(url, protocols);
		if (this.opts.binaryType) {
			ws.binaryType = this.opts.binaryType;
		}
		this.socket = ws;
		let self = this;
		ws.onmessage = (e) => {
			self.recv_timestamp_msec = new Date().getTime();
			self._private_start_heartbeat();
			self.onmessage(e);
		};
		ws.onclose = (e) => {
			self.close();
		};
		ws.onerror = (e) => {
			self.close();
		};
		return new Promise((resolve) => {
			if (self.opts.connect_timeout_msec >= 0) {
				self.connect_timerid = setTimeout(() => {
					clearTimeout(self.connect_timerid);
					self.connect_timerid = null;
					resolve(null);
					self.close();
				}, self.opts.connect_timeout_msec);
			}
			ws.onopen = (e) => {
				if (self.connect_timerid) {
					clearTimeout(self.connect_timerid);
					self.connect_timerid = null;
				}
				self.recv_timestamp_msec = new Date().getTime();
				self._private_start_heartbeat();
				if (self.connecting_send_cache) {
					for (const data of self.connecting_send_cache) {
						ws.send(data);
					}
					self.connecting_send_cache = null;
				}
				resolve(self);
			};
		});
	}

	_private_start_heartbeat() {
		const interval_sec = this.opts.heartbeat_interval_sec;
		if (interval_sec <= 0) {
			return;
		}
		const max_times = this.opts.heartbeat_max_times;
		if (max_times <= 0) {
			return;
		}
		let self = this;
		this.heartbeat_do_times = 0;
		if (this.heartbeat_timerid) {
			clearTimeout(this.heartbeat_timerid);
		}
		this.heartbeat_timerid = setTimeout(function proc() {
			clearTimeout(self.heartbeat_timerid);
			if (self.heartbeat_do_times >= self.heartbeat_max_times) {
				self.heartbeat_timerid = null;
				self.close();
				return;
			}
			self.onheartbeat();
			self.heartbeat_do_times++;
			self.heartbeat_timerid = setTimeout(proc, interval_sec * 1000);
		}, interval_sec * 1000);
	}
};

js_util.DOM.WebSocketClientSession = class NetSession {
	constructor(sid) {
		this.sid = sid;
		this.socket = null;
		this.onclose = function() {};
	}

	replace_socket(ws_client) {
		let old_socket = this.socket;
		if (old_socket == ws_client) {
			return null;
		}
		if (old_socket) {
			old_socket.session = null;
		}
		if (ws_client) {
			ws_client.session = this;
		}
		this.socket = ws_client;
		return old_socket;
	}
};