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

js_util.DOM.element_request_fullscreen = function (dom = document.documentElement) {
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

js_util.DOM.get_device_pixel_ratio = function () {
	// To account for zoom, change to use deviceXDPI instead of systemXDPI
	if (window.screen.systemXDPI !== undefined &&
		window.screen.logicalXDPI !== undefined &&
		window.screen.systemXDPI > window.screen.logicalXDPI)
	{
		// Only allow for values > 1
		return window.screen.systemXDPI / window.screen.logicalXDPI;
	}
	else if (window.devicePixelRatio !== undefined) {
		return window.devicePixelRatio;
	}
	return 1;
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
	while (dom !== document) {
		dom = dom.parentNode;
		if (!dom) {
			return false;
		}
	}
	return true;
};

js_util.DOM.canvas_fill_all_style = function (canvas, fillStyle) {
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = fillStyle;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
};

js_util.DOM.fill_image_in_canvas = function (canvas, img_param) {
	function fn_fill(canvas, image) {
		canvas.width = image.width;
		canvas.height = image.height;
		const ctx = canvas.getContext('2d');
		ctx.drawImage(image, 0, 0, image.width, image.height);
	}
	if (typeof img_param === "string") {
		const image = new Image();
		image.crossOrigin = 'Anonymous';
		return new Promise((resolve) => {
			image.onload = function () {
				fn_fill(canvas, image);
				resolve(image);
			};
			image.onerror = function () {
				resolve();
			};
			image.src = img_param;
		});
	}
	else {
		const image = img_param;
		return new Promise((resolve) => {
			fn_fill(canvas, image);
			resolve(image);
		});
	}
};

js_util.DOM.canvas_invert_RGB = function (canvas) {
	const ctx = canvas.getContext('2d');
	let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	for (let i = 0, len = imageData.data.length; i < len; i += 4) {
		imageData.data[i] = 255 - imageData.data[i];
		imageData.data[i+1] = 255 - imageData.data[i+1];
		imageData.data[i+2] = 255 - imageData.data[i+2];
	}
	ctx.putImageData(imageData, 0, 0);
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
