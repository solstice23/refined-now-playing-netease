import ColorThief from 'colorthief';
import './styles.scss';
import settingsMenuHTML from './settings-menu.html';

let pluginPath;
const loadFile = async (path) => {
	let fullPath = pluginPath + '/' + path;
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
	if (Math.max(r, g, b) - Math.min(r, g, b) < 5) {
		return [150, 150, 150];
	}

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
	const [r2, g2, b2] = calcWhiteShadeColor([r, g, b], 0.3);
	document.body.style.setProperty('--accent-color-shade-1', `rgb(${calcWhiteShadeColor([r2, g2, b2])})`);
	document.body.style.setProperty('--accent-color-shade-1-rgb', `${r2}, ${g2}, ${b2}`);
	const [r3, g3, b3] = calcWhiteShadeColor([r, g, b], 0.45);
	document.body.style.setProperty('--accent-color-shade-2', `rgb(${calcWhiteShadeColor([r3, g3, b3])})`);
}


const calcLuminance = (color) => {
	let [r, g, b] = color.map((c) => c / 255);
	[r, g, b] = [r, g, b].map((c) => {
		if (c <= 0.03928) {
			return c / 12.92;
		}
		return Math.pow((c + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const rgb2Lab = (color) => {
	let [r, g, b] = color.map((c) => c / 255);
	[r, g, b] = [r, g, b].map((c) => {
		if (c <= 0.03928) {
			return c / 12.92;
		}
		return Math.pow((c + 0.055) / 1.055, 2.4);
	});
	[r, g, b] = [r, g, b].map((c) => c * 100);
	const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
	const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
	const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
	const xyz2Lab = (c) => {
		if (c > 0.008856) {
			return Math.pow(c, 1 / 3);
		}
		return 7.787 * c + 16 / 116;
	}
	const L = 116 * xyz2Lab(y / 100) - 16;
	const A = 500 * (xyz2Lab(x / 95.047) - xyz2Lab(y / 100));
	const B = 200 * (xyz2Lab(y / 100) - xyz2Lab(z / 108.883));
	return [L, A, B];
}

const calcColorDifference = (color1, color2) => {
	const [L1, A1, B1] = rgb2Lab(color1);
	const [L2, A2, B2] = rgb2Lab(color2);
	const deltaL = L1 - L2;
	const deltaA = A1 - A2;
	const deltaB = B1 - B2;
	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

function getGradientFromPalette(palette) {
	palette = palette.sort((a, b) => {
		return calcLuminance(a) - calcLuminance(b);
	});
	palette = palette.slice(palette.length / 2 - 4, palette.length / 2 + 4);
	palette = palette.sort((a, b) => {
		return rgb2Hsl(b)[1] - rgb2Hsl(a)[1];
	});
	palette = palette.slice(0, 6);

	let differences = new Array(6);
	for(let i = 0; i < differences.length; i++){
		differences[i] = new Array(6).fill(0);
	}
	for (let i = 0; i < palette.length; i++) {
		for (let j = i + 1; j < palette.length; j++) {
			differences[i][j] = calcColorDifference(palette[i], palette[j]);
			differences[j][i] = differences[i][j];
		}
	}

	let used = new Array(6).fill(false);
	let min = 10000000, ansSeq = [];
	const dfs = (depth, seq = [], currentMax = -1) => {
		if (depth === 6) {
			if (currentMax < min) {
				min = currentMax;
				ansSeq = seq;
			}
			return;
		}
		for (let i = 0; i < 6; i++) {
			if (used[i]) continue;
			used[i] = true;
			dfs(depth + 1, seq.concat(i), Math.max(currentMax, differences[seq[depth - 1]][i]));
			used[i] = false;
		}
	}
	for (let i = 0; i < 6; i++) {
		used[i] = true;
		dfs(1, [i]);
		used[i] = false;
	}

	let colors = [];
	for (let i of ansSeq) {
		colors.push(palette[ansSeq[i]]);
	}
	let ans = 'linear-gradient(-45deg,';
	for (let i = 0; i < colors.length; i++) {
		ans += `rgb(${colors[i][0]}, ${colors[i][1]}, ${colors[i][2]})`;
		if (i !== colors.length - 1) {
			ans += ',';
		}
	}
	ans += ')';
	return ans;
}
const updateGradientBackground = (palette) => {
	document.body.style.setProperty('--gradient-bg', getGradientFromPalette(palette));
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

	const colorThief = new ColorThief();

    try {
		const img = document.querySelector('.n-single .cdimg img');
		if (img.complete) {
			updateAccentColor(colorThief.getColor(img));
			updateGradientBackground(colorThief.getPalette(img));
		} else {
			img.addEventListener('load', function() {
				updateAccentColor(colorThief.getColor(img));
				updateGradientBackground(colorThief.getPalette(img));
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
const verticalAlignMiddleController = document.createElement('style');
verticalAlignMiddleController.innerHTML = '';
document.head.appendChild(verticalAlignMiddleController);
const recalculateVerticalAlignMiddleOffset = () => {
	if (!document.body.classList.contains('vertical-align-middle')) {
		return;
	}
	if (!document.querySelector('.g-single')) {
		return;
	}
	const page_height = document.querySelector('.g-single .g-singlec-ct').clientHeight;
	const inner_height = document.querySelector('.g-single .content').clientHeight;
	const offset = ( page_height - parseInt(getComputedStyle(document.querySelector(".g-single-track .content")).bottom) - inner_height ) - (page_height / 2 - inner_height / 2 );
	verticalAlignMiddleController.innerHTML = `
		body.vertical-align-middle .g-single-track .g-singlec-ct .n-single .sd,
		body.vertical-align-middle .g-single-track .g-singlec-ct .n-single .mn .head {
			transform: translateY(-${offset}px);
		}
	`;
}

window.addEventListener('resize', () => {
	recalculateTitleSize(true);
	recalculateVerticalAlignMiddleOffset();
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
			const bg = `linear-gradient(90deg, var(--accent-color) ${percent * 100}%, #dfe1e422 ${percent * 100}%)`;
			e.target.style.background = bg;

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
	const bindSliderToFunction = (slider, func, defalutValue = 0, event = 'input', mapping = (x) => { return x }) => {
		slider.value = getSetting(slider.id, defalutValue);
		slider.dispatchEvent(new Event("input"));
		slider.addEventListener(event, e => {
			const value = e.target.value;
			func(mapping(value));
		});
		slider.addEventListener("change", e => {
			setSetting(slider.id, e.target.value);
		});
		func(mapping(slider.value));
		sliderEnhance(slider);
	}
	const bindSelectGroupToClasses = (selectGroup, defaultValue, mapping = (x) => { return x }) => {
		const buttons = selectGroup.querySelectorAll(".rnp-select-group-btn");
		buttons.forEach(button => {
			button.addEventListener("click", e => {
				const value = e.target.getAttribute("value");
				buttons.forEach(button => {
					button.classList.remove("selected");
					document.body.classList.remove(mapping(button.getAttribute("value")));
				});
				e.target.classList.add("selected");
				document.body.classList.add(mapping(value));
				setSetting(selectGroup.id, value);
			});
		});
		const value = getSetting(selectGroup.id, defaultValue);
		buttons.forEach(button => {
			if (button.getAttribute("value") == value) {
				button.classList.add("selected");
				document.body.classList.add(mapping(value));
			} else {
				button.classList.remove("selected");
				document.body.classList.remove(mapping(button.getAttribute("value")));
			}
		});
	}


	const initSettings = () => {
		const rectangleCover = document.querySelector('#rectangle-cover');
		const lyricBlur = document.querySelector('#lyric-blur');
		const enableAccentColor = document.querySelector('#enable-accent-color');
		const useNotosans = document.querySelector('#use-notosans');
		const hideComments = document.querySelector('#hide-comments');
		const lyricBreakWord = document.querySelector('#lyric-break-word');
		const partialBg = document.querySelector('#partial-bg');
		const gradientBgDynamic = document.querySelector('#gradient-bg-dynamic');

		bindCheckboxToClass(rectangleCover, 'rectangle-cover', true);
		bindCheckboxToClass(lyricBlur, 'lyric-blur', true);
		bindCheckboxToClass(enableAccentColor, 'enable-accent-color', true);
		bindCheckboxToClass(useNotosans, 'use-notosans', false);
		bindCheckboxToClass(hideComments, 'hide-comments', false);
		bindCheckboxToClass(lyricBreakWord, 'lyric-break-word', true);
		bindCheckboxToClass(partialBg, 'partial-bg', false);
		bindCheckboxToClass(gradientBgDynamic, 'gradient-bg-dynamic', true);


		const bgBlur = document.querySelector('#bg-blur');
		const bgDim = document.querySelector('#bg-dim');
		const bgDimForGradientBg = document.querySelector('#bg-dim-for-gradient-bg');
		const bgOpacity = document.querySelector('#bg-opacity');
		const albumSize = document.querySelector('#album-size');

		bindSliderToCSSVariable(bgBlur, '--bg-blur', 36, 'change', (x) => { return x + 'px' });
		bindSliderToCSSVariable(bgDim, '--bg-dim', 55, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgDimForGradientBg, '--bg-dim-for-gradient-bg', 45, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgOpacity, '--bg-opacity', 0, 'input', (x) => { return 1 - x / 100 });
		bindSliderToFunction(albumSize, (x) => {
			window.albumSize = x;
			const currentSrc = document.querySelector('.n-single .cdimg img').src;
			const newSrc = currentSrc.replace(/thumbnail=\d+y\d+/g, `thumbnail=${window.albumSize}y${window.albumSize}`);
			if (currentSrc != newSrc) {
				document.querySelector('.n-single .cdimg img').src = newSrc;
			}
		}, 200, 'change', (x) => { return x == 200 ? 210 : x });

		const verticalAlign = document.querySelector('#vertical-align');
		const bgType = document.querySelector('#bg-type');
		bindSelectGroupToClasses(verticalAlign, 'bottom', (x) => { return 'vertical-align-' + x });
		bindSelectGroupToClasses(bgType, 'album', (x) => { return x == 'gradient' ? 'gradient-bg' : 'album-bg' });
	}
	const settingsMenu = document.createElement('div');
	settingsMenu.id = 'settings-menu';
	settingsMenu.innerHTML = settingsMenuHTML;
	document.querySelector('.g-single').appendChild(settingsMenu);
	initSettings();
};

const removeNbspFromLyrics = (dom) => {
	if (dom.childElementCount == 0) {
		if (!dom.innerHTML.includes('&nbsp;')) {
			return;
		}
		dom.innerHTML = dom.innerHTML.replace(/&nbsp;/g, ' ');
	} else {
		dom.querySelectorAll('.lyric-next-p').forEach(node => {
			removeNbspFromLyrics(node);
		});
	}
}

// intercept src setter of HTMLImageElement
const _src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
Object.defineProperty(HTMLImageElement.prototype, 'src', {
	get: function() {
		return _src.get.call(this);
	},
	set: function(src) {
		let element = this;
		if (element.classList.contains('j-flag')) {
			if (!window.albumSize) {
				window.albumSize = 210;
			}
			src = src.replace(/thumbnail=\d+y\d+/g, `thumbnail=${window.albumSize}y${window.albumSize}`);
		}
		return _src.set.call(this, src);
	}
});

plugin.onLoad(async (p) => {
	pluginPath = p.pluginPath;

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
		recalculateVerticalAlignMiddleOffset();
		mutations.forEach(mutation => {
			mutation.addedNodes.forEach(node => {
				if (node.classList && node.classList.contains('j-line')) {
					removeNbspFromLyrics(node);
				}
			});
			if (mutation?.target?.classList && mutation.target.classList.contains('lyric-next-p')) {
				removeNbspFromLyrics(mutation.target);
			}
		});
	}).observe(document.body, { childList: true , subtree: true, attributes: true, characterData: true, attributeFilter: ['src']});
});

plugin.onConfig((tools) => {
	console.log(tools);
	return dom("div", {},
		dom("span", { innerHTML: "打开正在播放界面以调整设置 " , style: { fontSize: "18px" } }),
		tools.makeBtn("打开", async () => {
			document.querySelector("a[data-action='max']").click();
		})
	);
});