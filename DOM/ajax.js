var js_util = js_util || {};
js_util.DOM = js_util.DOM || {};

js_util.DOM.ajax_open = function(method, url, user = "", pwd = "") {
	let xhttp = new XMLHttpRequest();
	xhttp.open(method, url, true, user, pwd);
	return xhttp;
};

js_util.DOM.ajax_send = function(xhttp, data, timeout_msec = -1) {
	let promise = new Promise((resolve) => {
		xhttp.onreadystatechange = function() {
			if (this.readyState == 4) {
				resolve(this);
			}
		};
		if (timeout_msec >= 0) {
			setTimeout(() => {
				xhttp.abort();
				resolve(null);
			}, timeout_msec);
		}
	});
	xhttp.send(data);
	return promise;
};