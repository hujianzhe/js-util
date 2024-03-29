if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.DOM = js_util.DOM || {};

// Pointer Lock
(function () {
	// pointerLockElement
	if (!document.pointerLockElement) {
		if (document.mozPointerLockElement) {
			document.onmozpointerlockchange = function(e) {
				if (!document.onpointerlockchange) {
					return;
				}
				document.onpointerlockchange(e);
			};
			document.onmozpointerlockerror = function(e) {
				if (!document.onpointerlockerror) {
					return;
				}
				document.onpointerlockerror(e);
			};
			document.pointerLockElement = document.mozPointerLockElement;
		}
		else if (document.webkitPointerLockElement) {
			document.onwebkitpointerlockchange = function(e) {
				if (!document.onpointerlockchange) {
					return;
				}
				document.onpointerlockchange(e);
			};
			document.onwebkitpointerlockerror = function(e) {
				if (!document.onpointerlockerror) {
					return;
				}
				document.onpointerlockerror(e);
			};
			document.pointerLockElement = document.webkitPointerLockElement;
		}
	}
	// exitPointerLock
	if (!document.exitPointerLock) {
		if (document.mozExitPointerLock) {
			document.exitPointerLock = document.mozExitPointerLock;
		}
		else if (document.webkitExitPointerLock) {
			document.exitPointerLock = document.webkitExitPointerLock;
		}
	}
})();

js_util.DOM.element_request_pointer_lock = function (dom) {
	if (dom.requestPointerLock) {
		dom.requestPointerLock();
	}
	else if (dom.mozRequestPointerLock) {
		dom.mozRequestPointerLock();
	}
	else if (dom.webkitRequestPointerLock) {
		dom.webkitRequestPointerLock();
	}
	else if (dom.msRequestPointerLock) {
		dom.msRequestPointerLock();
	}
};

// Full Screen
(function () {
	// requestFullscreen
	if (!document.documentElement.requestFullscreen) {
		if (document.documentElement.mozRequestFullScreen) {
			document.onmozfullscreenchange = function(e) {
				if (!document.onfullscreenchange) {
					return;
				}
				document.onfullscreenchange(e);
			};
			document.onmozfullscreenerror = function(e) {
				if (!document.onfullscreenerror) {
					return;
				}
				document.onfullscreenerror(e);
			};
		}
		else if (document.documentElement.webkitRequestFullScreen) {
			document.onwebkitfullscreenchange = function(e) {
				if (!document.onfullscreenchange) {
					return;
				}
				document.onfullscreenchange(e);
			};
			document.onwebkitfullscreenerror = function(e) {
				if (!document.onfullscreenerror) {
					return;
				}
				document.onfullscreenerror(e);
			};
		}
		else if (document.documentElement.msRequestFullscreen) {
			document.onMSFullscreenChange = function(e) {
				if (!document.onfullscreenchange) {
					return;
				}
				document.onfullscreenchange(e);
			};
			document.onMSFullscreenError = function(e) {
				if (!document.onfullscreenerror) {
					return;
				}
				document.onfullscreenerror(e);
			};
		}
	}
	// exitFullscreen
	if (!document.exitFullscreen) {
		if (document.mozCancelFullScreen) {
			document.exitFullscreen = document.mozCancelFullScreen;
		}
		else if (document.webkitCancelFullScreen) {
			document.exitFullscreen = document.webkitCancelFullScreen;
		}
		else if (document.msExitFullscreen) {
			document.exitFullscreen = document.msExitFullscreen;
		}
	}
})();

js_util.DOM.check_fullscreen_enabled = function () {
	return	document.fullscreenEnabled ||
			document.mozFullScreenEnabled ||
			document.webkitFullscreenEnabled ||
			document.msFullscreenEnabled;
};

js_util.DOM.current_fullscreen_element = function () {
	return	document.fullscreenElement ||
			document.mozFullscreenElement ||
			document.mozFullScreenElement ||
			document.webkitFullscreenElement ||
			document.msFullscreenElement;
};

js_util.DOM.element_request_fullscreen = function (dom) {
	if (dom.requestFullscreen) {
		dom.requestFullscreen();
	}
	else if (dom.mozRequestFullScreen) {
		dom.mozRequestFullScreen();
	}
	else if (dom.webkitRequestFullScreen) {
		dom.webkitRequestFullScreen();
	}
	else if (dom.msRequestFullscreen) {
		dom.msRequestFullscreen();
	}
};

// DOM Test Object Supprted

js_util.DOM.check_websocket_supported = function () {
	return window.WebSocket ? true : false;
};

js_util.DOM.check_canvas_supported = function () {
	try {
		const canvas_dom = document.createElement("canvas");
		if (canvas_dom && canvas_dom.getContext) {
			return true;
		}
	} catch (e) { void e; }
	return false;
};

js_util.DOM.check_webgl_supported = function () {
	try {
		const canvas_dom = document.createElement("canvas");
		if (!canvas_dom || !canvas_dom.getContext) {
			return false;
		}
		if (canvas_dom.getContext("webgl")) {
			return true;
		}
		if (canvas_dom.getContext("experimental-webgl")) {
			return true;
		}
	}
	catch(e) { void e; }
	return false;
};

// DOM Object Operator

js_util.DOM.stopPropagation = function (e) {
	e.stopPropagation();
};

js_util.DOM.stopImmediatePropagation = function (e) {
	e.stopImmediatePropagation();
};

js_util.DOM.preventDefault = function (e) {
	if (e.cancelable) {
		e.preventDefault();
	}
};

js_util.DOM.element_prevent_default_event = function (dom, evtype, options) {
	if (!options) {
		options = { passive: false };
	}
	else if (options instanceof Boolean) {}
	else {
		options.passive = false;
	}
	dom.addEventListener(evtype, js_util.DOM.preventDefault, options);
};

js_util.DOM.fn_to_worker_url = function (fn) {
	const blob = new Blob([`(${fn.toString()})()`], { type: "text/javascript" });
	return URL.createObjectURL(blob);
};

js_util.DOM.element_check_in_document = function (dom) {
	do {
		const parentNode = dom.parentNode;
		if (!parentNode) {
			return false;
		}
	} while (parentNode !== document);
	return true;
};

js_util.DOM.dom_disable_drag = function (dom) {
	dom.onmouseenter = null;
	dom.onmousedown = null;
	dom.ontouchstart = null;
	dom.onmouseup = null;
	dom.ontouchend = null;
	dom.onmousemove = null;
	dom.ontouchmove = null;
};

js_util.DOM.dom_set_style_user_select = function (dom, value) {
	const attrs = [
		"-moz-user-select",
		"-webkit-user-select",
		"-ms-user-select",
		"-o-user-select",
		"user-select"
	];
	for (const attr of attrs) {
		dom.style[attr] = value;
	}
};