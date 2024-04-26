if (typeof js_util === 'undefined') {
    js_util = {};
}
js_util.CanvasIcon = js_util.CanvasIcon || {};

js_util.CanvasIcon.draw_checkbox_checked_img = function (width, height, lineWidth) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	ctx.lineWidth = lineWidth;
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(0 + lineWidth, Math.floor(height / 4 * 3));
	ctx.lineTo(Math.floor(width / 4) + lineWidth, height - lineWidth);
	ctx.lineTo(width - lineWidth, 0 + lineWidth);
	ctx.stroke();
	return canvas.toDataURL("image/png");
};