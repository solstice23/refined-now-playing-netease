import ColorThief from 'colorthief';
import './styles.scss';
import settingsMenuHTML from './settings-menu.html';
import './settings-menu.scss';
import {normalizeColor, calcWhiteShadeColor, getGradientFromPalette} from './color-utils.js';

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

const updateAccentColor = ([r, g, b]) => {
	[r, g, b] = normalizeColor([r, g, b]);
	const [r1, g1, b1] = calcWhiteShadeColor([r, g, b], 0.2);
	document.body.style.setProperty('--rnp-accent-color', `rgb(${r1}, ${g1}, ${b1})`);
	document.body.style.setProperty('--rnp-accent-color-rgb', `${r1}, ${g1}, ${b1}`);
	const [r2, g2, b2] = calcWhiteShadeColor([r, g, b], 0.3);
	document.body.style.setProperty('--rnp-accent-color-shade-1', `rgb(${calcWhiteShadeColor([r2, g2, b2])})`);
	document.body.style.setProperty('--rnp-accent-color-shade-1-rgb', `${r2}, ${g2}, ${b2}`);
	const [r3, g3, b3] = calcWhiteShadeColor([r, g, b], 0.45);
	document.body.style.setProperty('--rnp-accent-color-shade-2', `rgb(${calcWhiteShadeColor([r3, g3, b3])})`);
	document.body.style.setProperty('--rnp-accent-color-shade-2-rgb', `${r3}, ${g3}, ${b3}`);
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
	testDiv.style.fontSize = `${fontSize}px`;
	const width = testDiv.clientWidth;
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
	console.log('recalculateVerticalAlignMiddleOffset');
	const page_height = document.querySelector('.g-single .g-singlec-ct').clientHeight;
	const inner_height = document.querySelector('.g-single .content').clientHeight;
	let offset = ( page_height - parseInt(getComputedStyle(document.querySelector(".g-single-track .content")).bottom) - inner_height ) - (page_height / 2 - inner_height / 2 );
	if (document.body.classList.contains('applemusic-like-lyrics')) {
		offset -= 120;
	}
	verticalAlignMiddleController.innerHTML = `
		body.vertical-align-middle .g-single-track .g-singlec-ct .n-single .sd,
		body.vertical-align-middle .g-single-track .g-singlec-ct .n-single .mn .head {
			transform: translateY(-${offset}px);
		}
		body.vertical-align-middle .g-single-track .g-singlec-ct .n-single .mn .lyric {
			bottom: 15vh;
		}
	`;
}
recalculateVerticalAlignMiddleOffset();

window.addEventListener('resize', () => {
	recalculateTitleSize(true);
	recalculateVerticalAlignMiddleOffset();
});

const moveTags = () => {
	const titleBase = document.querySelector(".g-single-track .g-singlec-ct .n-single .mn .head .inf .title");
	if (!titleBase) {
		return;
	}
	const tags = titleBase.querySelector("h1 > .name > .tag-wrap");
	if (!tags) {
		return;
	}
	const existingTags = titleBase.querySelector("h1 > .tag-wrap");
	if (existingTags) {
		existingTags.remove();
	}
	titleBase.querySelector("h1").appendChild(tags);
}
const calcTitleScroll = () => {
	moveTags();
	const titleContainer = document.querySelector('.g-single .g-singlec-ct .n-single .mn .head .inf .title .name');
	if (!titleContainer) {
		return;
	}
	if ((titleContainer?.firstChild?.nodeType ?? 0 ) === 3) {
		const titleInner = document.createElement('div');
		titleInner.classList.add('name-inner');
		titleInner.innerHTML = titleContainer.innerHTML;
		titleContainer.innerHTML = '';
		titleContainer.appendChild(titleInner);
	}
	const containerWidth = titleContainer.clientWidth;
	const innerWidth = titleContainer.querySelector('.name-inner').clientWidth;
	if (containerWidth < innerWidth && innerWidth - containerWidth < 20) {
		titleSizeController.innerHTML = `
			.g-single .g-singlec-ct .n-single .mn .head .inf .title h1 {
				font-size: ${titleSizeController.innerHTML.match(/font-size: (\d+)px/)[1] - 1}px !important;
			}
		`;
	}
	if (containerWidth < innerWidth) {
		titleContainer.classList.add('scroll');
	} else {
		titleContainer.classList.remove('scroll');
	}
	titleContainer.style.setProperty('--scroll-offset', `${innerWidth - containerWidth}px`);
	titleContainer.style.setProperty('--scroll-speed', `${(innerWidth - containerWidth) / 30}s`);
}

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
			const bg = `linear-gradient(90deg, var(--rnp-accent-color) ${percent * 100}%, #dfe1e422 ${percent * 100}%)`;
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
	const bindSliderToCSSVariable = (slider, variable, defalutValue = 0, event = 'input', mapping = (x) => { return x }, addClassWhenAdjusting = '') => {
		slider.value = getSetting(slider.id, defalutValue);
		slider.dispatchEvent(new Event("input"));
		slider.addEventListener(event, e => {
			const value = e.target.value;
			document.body.style.setProperty(variable, mapping(value));
		});
		slider.addEventListener("change", e => {
			setSetting(slider.id, e.target.value);
		});
		if (addClassWhenAdjusting) {
			slider.addEventListener("mousedown", e => {
				document.body.classList.add(addClassWhenAdjusting);
			});
			slider.addEventListener("mouseup", e => {
				document.body.classList.remove(addClassWhenAdjusting);
			});
		}
		document.body.style.setProperty(variable, mapping(slider.value));
		sliderEnhance(slider);
	}
	const bindSliderToFunction = (slider, func, defalutValue = 0, event = 'input', mapping = (x) => { return x }, addClassWhenAdjusting = '') => {
		slider.value = getSetting(slider.id, defalutValue);
		slider.dispatchEvent(new Event("input"));
		slider.addEventListener(event, e => {
			const value = e.target.value;
			func(mapping(value));
		});
		slider.addEventListener("change", e => {
			setSetting(slider.id, e.target.value);
		});
		if (addClassWhenAdjusting) {
			slider.addEventListener("mousedown", e => {
				document.body.classList.add(addClassWhenAdjusting);
			});
			slider.addEventListener("mouseup", e => {
				document.body.classList.remove(addClassWhenAdjusting);
			});
		}

		func(mapping(slider.value));
		sliderEnhance(slider);
	}
	const bindSelectGroupToClasses = (selectGroup, defaultValue, mapping = (x) => { return x }, afterClick = () => {}) => {
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
				afterClick();
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
		const useAMLLBg = document.querySelector('#use-amll-bg');

		bindCheckboxToClass(rectangleCover, 'rectangle-cover', true);
		bindCheckboxToClass(lyricBlur, 'lyric-blur', true);
		bindCheckboxToClass(enableAccentColor, 'enable-accent-color', true);
		bindCheckboxToClass(useNotosans, 'use-notosans', false);
		bindCheckboxToClass(hideComments, 'hide-comments', false);
		bindCheckboxToClass(lyricBreakWord, 'lyric-break-word', true);
		bindCheckboxToClass(partialBg, 'partial-bg', false);
		bindCheckboxToClass(gradientBgDynamic, 'gradient-bg-dynamic', true);
		bindCheckboxToClass(useAMLLBg, 'use-amll-bg', true);


		const bgBlur = document.querySelector('#bg-blur');
		const bgDim = document.querySelector('#bg-dim');
		const bgDimForGradientBg = document.querySelector('#bg-dim-for-gradient-bg');
		const bgOpacity = document.querySelector('#bg-opacity');
		const albumSize = document.querySelector('#album-size');
		const fontSizeLyric = document.querySelector('#font-size-lyric');
		const fontSizeLyricCurrent = document.querySelector('#font-size-lyric-current');

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
		bindSliderToCSSVariable(fontSizeLyric, '--font-size-lyric', 1.05, 'input', (x) => {
			if (fontSizeLyricCurrent.value < x) {
				fontSizeLyricCurrent.value = x;
				fontSizeLyricCurrent.dispatchEvent(new Event("input"));
			}
			return x + 'rem';
		}, 'adjusting-lyric-size');
		bindSliderToCSSVariable(fontSizeLyricCurrent, '--font-size-lyric-current', 1.3, 'input', (x) => { return x + 'rem' }, 'adjusting-lyric-size');

		const verticalAlign = document.querySelector('#vertical-align');
		const bgType = document.querySelector('#bg-type');
		bindSelectGroupToClasses(verticalAlign, 'bottom', (x) => { return 'vertical-align-' + x }, () => { recalculateVerticalAlignMiddleOffset() });
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
			if (src.startsWith('data:image/gif;')) {
				src = `orpheus://cache/?https://p1.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg`;
			}
		}
		return _src.set.call(this, src);
	}
});

const compatibleWithAppleMusicLikeLyrics = () => {
	const nsingle = document.querySelector('#applemusic-like-lyrics-view + .n-single');
	if (!nsingle) {
		return;
	}
	//document.querySelector('#applemusic-like-lyrics-view').prepend(nsingle);
	document.body.classList.add('applemusic-like-lyrics');
}

plugin.onLoad(async (p) => {
	pluginPath = p.pluginPath;

	document.body.classList.add('refined-now-playing');

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
		compatibleWithAppleMusicLikeLyrics();
	}).observe(document.body, { childList: true });

	new MutationObserver((mutations) => {
		updateCDImage();
		recalculateTitleSize();
		calcTitleScroll();
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

	// Fix incomptibility with light theme
	const lightThemeFixStyle = document.createElement('link');
	lightThemeFixStyle.rel = 'stylesheet';
	document.head.appendChild(lightThemeFixStyle);
	new MutationObserver(() => {
		if (document.body.classList.contains('mq-playing')) {
			if (lightThemeFixStyle.href != 'orpheus://orpheus/style/res/less/default/css/skin.ls.css') {
				lightThemeFixStyle.href = 'orpheus://orpheus/style/res/less/default/css/skin.ls.css';
			}
		} else {
			if (lightThemeFixStyle.href != '') {
				lightThemeFixStyle.href = '';
			}
		}
	}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
});

plugin.onConfig((tools) => {
	return dom("div", {},
		dom("span", { innerHTML: "打开正在播放界面以调整设置 " , style: { fontSize: "18px" } }),
		tools.makeBtn("打开", async () => {
			document.querySelector("a[data-action='max']").click();
		})
	);
});