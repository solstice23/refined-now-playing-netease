const that = this;
const loadFile = async (path) => {
	let fullPath = that.pluginPath + '/' + path;
	fullPath = fullPath.replace(/\\/g, '/');
    return await betterncm.fs.readFileText(fullPath);
}

const injectCSS = (css) => {
	const style = document.createElement('style');
	style.innerHTML = css;
	document.head.appendChild(style);
}
const injectHTML = (type, html, parent, fun = (dom) => {}) => {
	const dom = document.createElement(type);
	dom.innerHTML = html;
	fun.call(this, dom);

	parent.appendChild(dom);
}
var loadedJs = {};
const loadJsOnce = async (path) => {
	if (loadedJs[path]) {
		return;
	}
	loadedJs[path] = true;
	const js = await loadFile(path);
	const script = document.createElement('script');
	script.innerHTML = js;
	document.body.appendChild(script);
}
const waitForElement = (selector, fun) => {
	selector = selector.split(',');
	let done = true;
	let interval = setInterval(() => {
		for (s of selector) {
			if (!document.querySelector(s)) {
				done = false;
			}
		}
		if (done) {
			clearInterval(interval);
			for (s of selector) {
				fun.call(this, document.querySelector(s));
			}
		}
	}, 100);
}

const rgb2Hsl = ([r, g, b]) => {
	r /= 255, g /= 255, b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	let h, s, l = (max + min) / 2;

	if (max == min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	return [h, s, l];
}
const hsl2Rgb = ([h, s, l]) => {
	let r, g, b;

	if (s == 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		}
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return [r * 255, g * 255, b * 255];
}
const normalizeColor = ([r, g, b]) => {
	const mix = (a, b, p) => Math.round(a * (1 - p) + b * p);

	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	if (luminance < 60) {
		[r, g, b] = [r, g, b].map((c) => mix(c, 255, 0.3 * (1 - luminance / 60)));
	} else if (luminance > 180) {
		[r, g, b] = [r, g, b].map((c) => mix(c, 0, 0.5 * ((luminance - 180) / 76)));
	}

	let [h, s, l] = rgb2Hsl([r, g, b]);

	s = Math.max(0.3, Math.min(0.8, s));
	l = Math.max(0.5, Math.min(0.8, l));

	[r, g, b] = hsl2Rgb([h, s, l]);

	return [r, g, b];
}

const calcWhiteShadeColor = ([r, g, b], p = 0.50) => {
	const mix = (a, b, p) => Math.round(a * (1 - p) + b * p);
	return [r, g, b].map((c) => mix(c, 255, p));
}

const updateAccentColor = ([r, g, b]) => {
	[r, g, b] = normalizeColor([r, g, b]);
	const [r1, g1, b1] = calcWhiteShadeColor([r, g, b], 0.2);
	document.body.style.setProperty('--accent-color', `rgb(${r1}, ${g1}, ${b1})`);
	document.body.style.setProperty('--accent-color-rgb', `${r1}, ${g1}, ${b1}`);
	const [r2, g2, b2] = calcWhiteShadeColor([r, g, b]);
	document.body.style.setProperty('--accent-color-white-shade', `rgb(${calcWhiteShadeColor([r2, g2, b2])})`);
	const [r3, g3, b3] = calcWhiteShadeColor([r, g, b], 0.3);
	document.body.style.setProperty('--accent-color-lyric-shade', `rgb(${calcWhiteShadeColor([r3, g3, b3])})`);
	document.body.style.setProperty('--accent-color-lyric-shade-rgb', `${r3}, ${g3}, ${b3}`);
}


const getCurrentCDImage = () => {
	const cdImage = document.querySelector('.n-single .cdimg img');
	return cdImage.src;
}
var lastCDImage = '';
const updateCDImage = () => {
	if (!document.querySelector('.g-single')) {
		return;
	}
	const cdImage = getCurrentCDImage();
	if (cdImage == lastCDImage) {
		return;
	}
	const cdBgBlur = document.querySelector('#cd-bg-blur');
	if (cdBgBlur.style.backgroundImage !== `url(${cdImage})`) {
		cdBgBlur.style.backgroundImage = `url(${cdImage})`;
	}

    try {
		const colorThief = new ColorThief();
		const img = document.querySelector('.n-single .cdimg img');
		if (img.complete) {
			updateAccentColor(colorThief.getColor(img));
		} else {
			image.addEventListener('load', function() {
				updateAccentColor(colorThief.getColor(img));
			});
		}
	} catch {}
	finally {
		lastCDImage = cdImage;
	}
}

var lastTitle = "";
const titleSizeController = document.createElement('style');
titleSizeController.innerHTML = '';
document.head.appendChild(titleSizeController);
const recalculateTitleSize = (forceRefresh = false) => {
	const title = document.querySelector('.g-single .g-singlec-ct .n-single .mn .head .inf .title');
	if (!title) {
		return;
	}
	if (title.innerText === lastTitle && !forceRefresh) {
		return;
	}
	lastTitle = title.innerText;
	const text = title.innerText;
	const testDiv = document.createElement('div');
	testDiv.style.position = 'absolute';
	testDiv.style.top = '-9999px';
	testDiv.style.left = '-9999px';
	testDiv.style.width = 'auto';
	testDiv.style.height = 'auto';
	testDiv.style.whiteSpace = 'nowrap';
	testDiv.innerText = text;
	document.body.appendChild(testDiv);
	
	const maxThreshold = Math.max(Math.min(document.body.clientHeight * 0.05, 60), 45);
	const minThreshold = 24;
	const targetWidth = (document.body.clientWidth / 2 - 50) * 0.95;

	let l = 1, r = 61;
	while (l < r) {
		const mid = Math.floor((l + r) / 2);
		testDiv.style.fontSize = `${mid}px`;
		const width = testDiv.clientWidth;
		if (width > targetWidth) {
			r = mid;
		} else {
			l = mid + 1;
		}
	}
	let fontSize = l - 1;
	fontSize = Math.max(Math.min(fontSize, maxThreshold), minThreshold);
	document.body.removeChild(testDiv);
	titleSizeController.innerHTML = `
		.g-single .g-singlec-ct .n-single .mn .head .inf .title h1 {
			font-size: ${fontSize}px !important;
		}
	`;
}
window.addEventListener('resize', () => {
	recalculateTitleSize(true);
});

waitForElement("#main-player, .m-pinfo", (dom) => {
	dom.addEventListener('mouseenter', () => {
		document.body.classList.add('bottombar-hover');
	});
	dom.addEventListener('mouseleave', () => {
		document.body.classList.remove('bottombar-hover');
	});
});

const getSetting = (option, defaultValue = '') => {
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
const setSetting = (option, value) => {
	option = "refined-now-playing-" + option;
	localStorage.setItem(option, value);
}
const addOrRemoveGlobalClassByOption = (className, optionValue) => {
	if (optionValue) {
		document.body.classList.add(className);
	} else {
		document.body.classList.remove(className);
	}
}

const addSettingsMenu = async () => {
	const sliderEnhance = (slider) => {
		slider.addEventListener("input", e => {
			const value = e.target.value;
			const min = e.target.min;
			const max = e.target.max;
			const percent = (value - min) / (max - min);
			const bg = `linear-gradient(90deg, rgb(var(--accent-color-rgb)) ${percent * 100}%, #dfe1e422 ${percent * 100}%)`;
			e.target.style.background = bg;

			console.log(value, e.target.getAttribute("default"), value == e.target.getAttribute("default")); 
			if (value != e.target.getAttribute("default")) {
				e.target.parentElement.classList.add("changed");
			} else {
				e.target.parentElement.classList.remove("changed");
			}				
		});
		slider.parentElement.querySelector(".rnp-slider-reset").addEventListener("click", e => {
			const slider = e.target.parentElement.parentElement.querySelector(".rnp-slider");
			slider.value = slider.getAttribute("default");
			slider.dispatchEvent(new Event("input"));
			slider.dispatchEvent(new Event("change"));
		});
		slider.dispatchEvent(new Event("input"));
	}
	const bindCheckboxToClass = (checkbox, className, defaultValue = false) => {
		checkbox.checked = getSetting(checkbox.id, defaultValue);
		checkbox.addEventListener("change", e => {
			setSetting(checkbox.id, e.target.checked);
			addOrRemoveGlobalClassByOption(className, e.target.checked);
		});
		addOrRemoveGlobalClassByOption(className, checkbox.checked);
	}
	const bindSliderToCSSVariable = (slider, variable, defalutValue = 0, event = 'input', mapping = (x) => { return x }) => {
		slider.value = getSetting(slider.id, defalutValue);
		slider.dispatchEvent(new Event("input"));
		slider.addEventListener(event, e => {
			const value = e.target.value;
			document.body.style.setProperty(variable, mapping(value));
		});
		slider.addEventListener("change", e => {
			setSetting(slider.id, e.target.value);
		});
		document.body.style.setProperty(variable, mapping(slider.value));
		sliderEnhance(slider);
	}

	const initSettings = () => {
		const rectangleCover = document.querySelector('#rectangle-cover');
		const lyricBlur = document.querySelector('#lyric-blur');
		const useNotosans = document.querySelector('#use-notosans');
		const hideComments = document.querySelector('#hide-comments');
		const partialBg = document.querySelector('#partial-bg');

		bindCheckboxToClass(rectangleCover, 'rectangle-cover', true);
		bindCheckboxToClass(lyricBlur, 'lyric-blur', true);
		bindCheckboxToClass(useNotosans, 'use-notosans', false);
		bindCheckboxToClass(hideComments, 'hide-comments', false);
		bindCheckboxToClass(partialBg, 'partial-bg', false);
		

		const bgBlur = document.querySelector('#bg-blur');
		const bgDim = document.querySelector('#bg-dim');
		const bgOpacity = document.querySelector('#bg-opacity');

		bindSliderToCSSVariable(bgBlur, '--bg-blur', 36, 'change', (x) => { return x + 'px' });
		bindSliderToCSSVariable(bgDim, '--bg-dim', 55, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgOpacity, '--bg-opacity', 0, 'input', (x) => { return 1 - x / 100 });
	}
	const settingsMenu = document.createElement('div');
	settingsMenu.id = 'settings-menu';
	settingsMenu.innerHTML = await loadFile('settings-menu.html');
	document.querySelector('.g-single').appendChild(settingsMenu);
	initSettings();
};

		

plugin.onLoad(async () => {
	loadJsOnce("libs/color-thief.umd.js");
	injectCSS(await loadFile("styles.css"));


	const bodyObserver = new MutationObserver((mutations) => {
		if (document.querySelector('.g-single:not(.patched)')) {
			injectHTML('div', '', document.querySelector('.g-single'), (dom) => {
				dom.id = 'cd-bg-blur';				
			});
			addSettingsMenu();
			updateCDImage();
			document.querySelector('.g-single').classList.add('patched');
		}
		updateCDImage();
		
	}).observe(document.body, { childList: true });
	
	new MutationObserver((mutations) => {
		updateCDImage();
		recalculateTitleSize();
	}).observe(document.body, { childList: true , subtree: true, attributes: true, attributeFilter: ['src']});
});