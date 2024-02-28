if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

js_util.DOM.ajax_open = function(method, url, user = "", pwd = "") {
	let xhttp = new XMLHttpRequest();
	xhttp.open(method, url, true, user, pwd);
	return xhttp;
};

js_util.DOM.ajax_send = function(xhttp, data, timeout_msec = -1) {
	return new Promise((resolve) => {
		let timer_id = null;
		if (timeout_msec >= 0) {
			timer_id = setTimeout(() => {
				clearTimeout(timer_id);
				timer_id = null;
				xhttp.abort();
				resolve(null);
			}, timeout_msec);
		}
		xhttp.onreadystatechange = function() {
			if (this.readyState != 4) {
				return;
			}
			if (timer_id) {
				clearTimeout(timer_id);
				timer_id = null;
			}
			resolve(this);
		};
		xhttp.send(data);
	});
};

js_util.DOM.script_load_async = function (url, opts = {
	timeout_msec : -1,
	execute: true
}) {
	let script = document.createElement('script');
	script.type = 'text/javascript';
	return new Promise((resolve, reject) => {
		let timer_id = null;
		if (opts.timeout_msec >= 0) {
			timer_id = setTimeout(() => {
				clearTimeout(timer_id);
				timer_id = null;
				resolve(null);
			}, opts.timeout_msec);
		}
		if (script.readyState) {
			// IE
			script.onreadystatechange = function() {
				if (script.readyState === "loaded" || script.readyState === "complete") {
					script.onload = script.onreadystatechange = null; // Handle memory leak in IE
					if (timer_id) {
						clearTimeout(timer_id);
						timer_id = null;
					}
					resolve(script);
				}
			};
		}
		else {
			script.onload = function () {
				if (timer_id) {
					clearTimeout(timer_id);
					timer_id = null;
				}
				resolve(script);
			};
		}
		script.src = url;
		if (opts.execute) {
			document.head.appendChild(script);
		}
	});
};