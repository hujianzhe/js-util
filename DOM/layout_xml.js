var js_util = js_util || {};
js_util.DOM = js_util.DOM || {};

js_util.DOM.LayoutXML = class LayoutXML {
	constructor() {
		this.id_map = new Map();
		this.class_map = new Map();
		this.style_map = new Map();
		this.user_data_map = new Map();
	}

	clear() {
		this.id_map.clear();
		this.class_map.clear();
		this.style_map.clear();
	}

	parse_from_xml_node(xml_root) {
		for (let xml_node = xml_root; xml_node; xml_node = xml_node.nextSibling) {
			if (!xml_node.tagName) {
				continue;
			}
			if (xml_node.tagName === "style") {
				const attrs = xml_node.attributes;
				/* <style id="xxx" value="yyy"></style> */
				this.style_map.set(attrs.id.value, attrs.value.value);
				continue;
			}
			if (xml_node.id) {
				this.id_map.set(xml_node.id, xml_node);
			}
			if (xml_node.className) {
				this.class_map.set(xml_node.className, xml_node);
			}
			this.parse_from_xml_node(xml_node.firstChild);
		}
	}

	dom_from_xml_node(xml_root) {
		if (!xml_root) {
			return null;
		}
		/* create DOM */
		let dom = null;
		let xml_ref_attrs = null;
		if (xml_root.tagName === "dom_ref") {
			xml_ref_attrs = xml_root.attributes;
			if (xml_ref_attrs.ref_id) {
				xml_root = this.id_map.get(xml_ref_attrs.ref_id.value);
			}
			else if (xml_ref_attrs.ref_class) {
				xml_root = this.class_map.get(xml_ref_attrs.ref_class.value);
			}
		}
		if (xml_root.tagName != "style") {
			dom = document.createElement(xml_root.tagName);
		}
		if (!dom) {
			return null;
		}
		let xml_node_attrs = xml_root.attributes;
		/* assign DOM id */
		if (xml_ref_attrs && xml_ref_attrs.id) {
			dom.id = xml_ref_attrs.id.value;
		}
		else if (xml_node_attrs.id) {
			dom.id = xml_node_attrs.id.value;
		}
		/* assign DOM className */
		if (xml_ref_attrs && xml_ref_attrs.class) {
			dom.className = xml_ref_attrs.class.value;
		}
		else if (xml_node_attrs.class) {
			dom.className = xml_node_attrs.class.value;
		}
		/* assign DOM style */
		if (xml_node_attrs.style_ids) {
			const style_ids = xml_node_attrs.style_ids.value.split(",");
			for (const style_id of style_ids) {
				const style_value = this.style_map.get(style_id);
				if (!style_value) {
					continue;
				}
				LayoutXML.dom_append_cssText(dom, style_value);
			}
		}
		if (xml_node_attrs.style) {
			LayoutXML.dom_append_cssText(dom, xml_node_attrs.style.value);
		}
		if (xml_ref_attrs) {
			if (xml_ref_attrs.style_ids) {
				const style_ids = xml_ref_attrs.style_ids.value.split(",");
				for (const style_id of style_ids) {
					const style_value = this.style_map.get(style_id);
					if (!style_value) {
						continue;
					}
					LayoutXML.dom_append_cssText(dom, style_value);
				}
			}
			if (xml_ref_attrs.style) {
				LayoutXML.dom_append_cssText(dom, xml_ref_attrs.style.value);
			}
		}
		/* create DOM childs */
		for (let xml_child = xml_root.firstChild; xml_child; xml_child = xml_child.nextSibling) {
			if (xml_child.nodeName === '#text') {
				let text = xml_child.nodeValue.trim();
				if (text) {
					dom.textContent += xml_child.nodeValue;
				}
				continue;
			}
			let child_dom = this.dom_from_xml_node(xml_child);
			if (child_dom) {
				dom.appendChild(child_dom);
			}
		}
		/* return DOM */
		return dom;
	}

	static dom_append_cssText(dom, cssText) {
		if (!cssText) {
			return;
		}
		if (cssText[0] == ';' && cssText[cssText.length - 1] == ';') {
			if (dom.style.cssText.length > 0) {
				cssText = cssText.substr(0, cssText.length - 1);
			}
			else {
				cssText = cssText.substr(1, cssText.length - 1);
			}
		}
		else if (cssText[0] == ';') {
			if (dom.style.cssText.length <= 0) {
				cssText = cssText.substr(1, cssText.length);
			}
		}
		else if (cssText[cssText.length - 1] == ';') {
			cssText = cssText.substr(0, cssText.length - 1);
			if (dom.style.cssText.length > 0) {
				dom.style.cssText += ';';
			}
		}
		else if (dom.style.cssText.length > 0) {
			dom.style.cssText += ';';
		}
		dom.style.cssText += cssText;
	}

	static dom_remove(dom) {
		if (dom.parentNode) {
			dom.parentNode.removeChild(dom);
		}
	}
};