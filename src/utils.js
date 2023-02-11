export const waitForElement = (selector, fun) => {
	selector = selector.split(',');
	let done = true;
	for (const s of selector) {
		if (!document.querySelector(s)) {
			done = false;
		}
	}
	if (done) {
		for (const s of selector) {
			fun.call(this, document.querySelector(s));
		}
		return;
	}
	let interval = setInterval(() => {
		let done = true;
		for (const s of selector) {
			if (!document.querySelector(s)) {
				done = false;
			}
		}
		if (done) {
			clearInterval(interval);
			for (const s of selector) {
				fun.call(this, document.querySelector(s));
			}
		}
	}, 100);
}
export const waitForElementAsync = async (selector) => {
	if (document.querySelector(selector)) {
		return document.querySelector(selector);
	}
	return await betterncm.utils.waitForElement(selector);
}
export const getSetting = (option, defaultValue = '') => {
	if (option.endsWith('-fm')) {
		option = option.replace(/-fm$/, '');
	}
	option = "refined-now-playing-" + option;
	let value = localStorage.getItem(option);
	if (!value) {
		value = defaultValue;
	}
	if (value === 'true') {
		value = true;
	} else if (value === 'false') {
		value = false;
	}
	return value;
}
export const setSetting = (option, value) => {
	option = "refined-now-playing-" + option;
	localStorage.setItem(option, value);
}
export const chunk = (input, size) => {
	return input.reduce((arr, item, idx) => {
		return idx % size === 0
			? [...arr, [item]]
			: [...arr.slice(0, -1), [...arr.slice(-1)[0], item]];
	}, []);
};
export const copyTextToClipboard = (text) => {
	const textarea = document.createElement('textarea');
	textarea.style.position = 'fixed';
	textarea.style.top = '0';
	textarea.style.left = '0';
	textarea.style.opacity = '0';
	textarea.style.pointerEvents = 'none';
	textarea.value = text;
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand('copy', true);
	document.body.removeChild(textarea);
}