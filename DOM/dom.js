var js_util = js_util || {};
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

js_util.DOM.check_full_screen_enabled = function () {
	return	document.fullscreenEnabled ||
			document.mozFullScreenEnabled ||
			document.webkitFullscreenEnabled ||
			document.msFullscreenEnabled;
};

js_util.DOM.current_full_screen_element = function () {
	return	document.fullscreenElement ||
			document.mozFullscreenElement ||
			document.mozFullScreenElement ||
			document.webkitFullscreenElement ||
			document.msFullscreenElement;
};

// DOM compatible

js_util.DOM.create_element = function (tag_name) {
	let dom = document.createElement(tag_name);
	if (!dom) {
		return null;
	}
	return js_util.DOM.element_compatible(dom);
};

js_util.DOM.remove_element = function (dom) {
	if (dom.parentNode) {
		dom.parentNode.removeChild(dom);
	}
};

js_util.DOM.element_compatible = function (dom) {
	if (!dom.addEventListener) {
		if (dom.attachEvent) {
			dom.addEventListener = function(evtype, fn) {
				dom.attachEvent("on" + evtype, fn);
			};
		}
	}
	if (!dom.removeEventListener) {
		if (dom.detachEvent) {
			dom.removeEventListener = function(evtype, fn) {
				dom.detachEvent("on" + evtype, fn);
			};
		}
	}
	if (!dom.requestFullscreen) {
		if (dom.mozRequestFullScreen) {
			dom.requestFullscreen = dom.mozRequestFullScreen;
		}
		else if (dom.webkitRequestFullScreen) {
			dom.requestFullscreen = dom.webkitRequestFullScreen;
		}
		else if (dom.msRequestFullscreen) {
			dom.requestFullscreen = dom.msRequestFullscreen;
		}
	}
	if (!dom.requestPointerLock) {
		if (dom.mozRequestPointerLock) {
			dom.requestPointerLock = dom.mozRequestPointerLock;
		}
		else if (dom.webkitRequestPointerLock) {
			dom.requestPointerLock = dom.webkitRequestPointerLock;
		}
		else if (dom.msRequestPointerLock) {
			dom.requestPointerLock = dom.msRequestPointerLock;
		}
	}
	return dom;
};