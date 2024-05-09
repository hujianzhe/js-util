if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

js_util.DOM.WebSocketClient = class WebSocketClient {
	static default_constructor_params = {
		binaryType: undefined,	// "arraybuffer" or "blob"
		connect_timeout_msec: -1,
		heartbeat_max_times: 0,
		heartbeat_interval_sec: 0,
	};

	constructor(opts = WebSocketClient.default_constructor_params) {
		this.socket = null;
		this.opts = opts;
		this.connect_timerid = null;
		this.connect_resolve = null;
		this.heartbeat_do_times = 0;
		this.heartbeat_timerid = null;
		this.recv_timestamp_msec = 0;
		this.connecting_send_cache = null;
		this.session = null;
		this.onmessage = function(e) { void e; };
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
		if (this.connect_resolve) {
			this.connect_resolve(null);
			this.connect_resolve = null;
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
		let self_this = this;

		function start_heartbeat(ws_obj) {
			const interval_sec = ws_obj.opts.heartbeat_interval_sec;
			if (interval_sec <= 0) {
				return;
			}
			const max_times = ws_obj.opts.heartbeat_max_times;
			if (max_times <= 0) {
				return;
			}
			ws_obj.heartbeat_do_times = 0;
			if (ws_obj.heartbeat_timerid) {
				clearTimeout(ws_obj.heartbeat_timerid);
			}
			ws_obj.heartbeat_timerid = setTimeout(function proc() {
				clearTimeout(ws_obj.heartbeat_timerid);
				if (ws_obj.heartbeat_do_times >= ws_obj.heartbeat_max_times) {
					ws_obj.heartbeat_timerid = null;
					ws_obj.close();
					return;
				}
				ws_obj.onheartbeat();
				ws_obj.heartbeat_do_times++;
				ws_obj.heartbeat_timerid = setTimeout(proc, interval_sec * 1000);
			}, interval_sec * 1000);
		}

		ws.onclose = (e) => {
			self_this.close();
		};
		ws.onerror = (e) => {
			self_this.close();
		};
		return new Promise((resolve) => {
			self_this.connect_resolve = resolve;
			if (self_this.opts.connect_timeout_msec >= 0) {
				self_this.connect_timerid = setTimeout(() => {
					clearTimeout(self_this.connect_timerid);
					self_this.connect_timerid = null;
					resolve(null);
					self_this.connect_resolve = null;
					self_this.close();
				}, self_this.opts.connect_timeout_msec);
			}
			ws.onopen = function () {
				self_this.connect_resolve = null;
				ws.onmessage = function (e) {
					self_this.recv_timestamp_msec = new Date().getTime();
					self_this.heartbeat_do_times = 0;
					self_this.onmessage(e);
				};
				if (self_this.connect_timerid) {
					clearTimeout(self_this.connect_timerid);
					self_this.connect_timerid = null;
				}
				self_this.recv_timestamp_msec = new Date().getTime();
				start_heartbeat(self_this);
				if (self_this.connecting_send_cache) {
					for (const data of self_this.connecting_send_cache) {
						ws.send(data);
					}
					self_this.connecting_send_cache = null;
				}
				resolve(self_this);
			};
		});
	}
};

js_util.DOM.WebSocketClientSession = function (sid) {
	this.sid = sid;
	this.socket = null;
	this.onclose = function() {};
};

js_util.DOM.WebSocketClientSession.prototype.replace_socket = function (ws_client) {
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
};