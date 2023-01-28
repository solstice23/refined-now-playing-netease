import './styles.scss';
import settingsMenuHTML from './settings-menu.html';
import './settings-menu.scss';
import {normalizeColor, calcWhiteShadeColor, getGradientFromPalette, argb2Rgb} from './color-utils.js';
import { getSetting, setSetting, chunk } from './utils.js';
import { Background } from './background.js';
import { Lyrics } from './lyrics.js';
import { themeFromSourceColor, QuantizerCelebi, Hct, Score } from "@importantimport/material-color-utilities";

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

const updateAccentColor = (name, argb) => {
	const [r, g, b] = [...argb2Rgb(argb)];
	document.body.style.setProperty(`--${name}`, `rgb(${r}, ${g}, ${b})`);
	document.body.style.setProperty(`--${name}-rgb`, `${r}, ${g}, ${b}`);
}

const calcAccentColor = (dom) => {
	const canvas = document.createElement('canvas');
	canvas.width = 50;
	canvas.height = 50;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(dom, 0, 0, dom.naturalWidth, dom.naturalHeight, 0, 0, 50, 50);
	const pixels = chunk(ctx.getImageData(0, 0, 50, 50).data, 4).map((pixel) => {
		return ((pixel[3] << 24 >>> 0) | (pixel[0] << 16 >>> 0) | (pixel[1] << 8 >>> 0) | pixel[2]) >>> 0;
	});
	const quantizedColors = QuantizerCelebi.quantize(pixels, 128);
	const ranked = Score.score(quantizedColors);
	const top = ranked[0];

	const theme = themeFromSourceColor(top);

	// theme.schemes.light.bgDarken = (Hct.from(theme.palettes.neutral.hue, theme.palettes.neutral.chroma, 97.5)).toInt();
	updateAccentColor('rnp-accent-color', theme.schemes.dark.primary);
	updateAccentColor('rnp-accent-color-shade-1', theme.schemes.light.outlineVariant);
	updateAccentColor('rnp-accent-color-shade-2', theme.schemes.light.surfaceVariant);
}

var lastCDImage = '';
const updateCDImage = () => {
	if (!document.querySelector('.g-single')) {
		return;
	}
	
	const imgDom = document.querySelector('.n-single .cdimg img');
	if (!imgDom) {
		return;
	}

	const realCD = document.querySelector('.n-single .cdimg');

	const update = () => {
		const cdImage = imgDom.src;
		if (cdImage == lastCDImage) {
			return;
		}
		lastCDImage = cdImage;
		calcAccentColor(imgDom);
	}

	if (imgDom.complete) {
		update();
		realCD.classList.remove('loading');
	} else {
		realCD.classList.add('loading');
	}
}
waitForElement('.n-single .cdimg img', (dom) => {
	dom.addEventListener('load', updateCDImage);
	new MutationObserver(updateCDImage).observe(dom, {attributes: true, attributeFilter: ['src']});
});
	


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
	const bindSelectGroupToClasses = (selectGroup, defaultValue, mapping = (x) => { return x }, callback = (x) => {}) => {
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
				callback(value);
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
		callback(value);
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
		const bgDimForFluidBg = document.querySelector('#bg-dim-for-fluid-bg');
		const bgOpacity = document.querySelector('#bg-opacity');
		const albumSize = document.querySelector('#album-size');
		const fontSizeLyric = document.querySelector('#font-size-lyric');
		const fontSizeLyricCurrent = document.querySelector('#font-size-lyric-current');

		bindSliderToCSSVariable(bgBlur, '--bg-blur', 36, 'change', (x) => { return x + 'px' });
		bindSliderToCSSVariable(bgDim, '--bg-dim', 55, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgDimForGradientBg, '--bg-dim-for-gradient-bg', 45, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgDimForFluidBg, '--bg-dim-for-fluid-bg', 30, 'input', (x) => { return x / 100 });
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
		const backgroundType = document.querySelector('#background-type');
		bindSelectGroupToClasses(verticalAlign, 'bottom', (x) => { return 'vertical-align-' + x }, () => { recalculateVerticalAlignMiddleOffset() });
		bindSelectGroupToClasses(backgroundType, 'fluid', (x) => `rnp-bg-${x}`, (x) => {
			document.dispatchEvent(new CustomEvent('rnp-background-type', { detail: { type: x } }));
		});
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

	const bodyObserver = new MutationObserver(async (mutations) => {
		if (document.querySelector('.g-single:not(.patched)')) {
			document.querySelector('.g-single').classList.add('patched');
			const background = document.createElement('div');
			background.classList.add('rnp-bg');
			ReactDOM.render(<Background type={getSetting('background-type', 'fluid')} image={await betterncm.utils.waitForElement(".n-single .cdimg img")}/>, background);
			document.querySelector('.g-single').appendChild(background);

			const lyrics = document.createElement('div');
			lyrics.classList.add('lyric');
			ReactDOM.render(<Lyrics />, lyrics);
			const oldLyrics = document.querySelector('.g-single-track .g-singlec-ct .n-single .mn .lyric');
			if (oldLyrics) {
				oldLyrics.parentNode.insertBefore(lyrics, oldLyrics.nextSibling);
				oldLyrics.remove();
			}

			addSettingsMenu();
		}
		compatibleWithAppleMusicLikeLyrics();
	}).observe(document.body, { childList: true });

	new MutationObserver((mutations) => {
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


	let previousHasClass = document.body.classList.contains('mq-playing');
	new MutationObserver(() => {
		const hasClass = document.body.classList.contains('mq-playing');
		if (hasClass != previousHasClass) {
			previousHasClass = hasClass;
			if (hasClass) {
				window.dispatchEvent(new Event('resize'));
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