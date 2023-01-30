import './styles.scss';
import './FM.scss'
import settingsMenuHTML from './settings-menu.html';
import './settings-menu.scss';
import {normalizeColor, calcWhiteShadeColor, getGradientFromPalette, argb2Rgb, rgb2Argb} from './color-utils.js';
import { getSetting, setSetting, chunk } from './utils.js';
import { Background } from './background.js';
import { Lyrics } from './lyrics.js';
import { themeFromSourceColor, QuantizerCelebi, Hct, Score } from "@importantimport/material-color-utilities";
import { compatibilityWizard } from './compatibility-check.js';

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
const waitForElementAsync = async (selector) => {
	if (document.querySelector(selector)) {
		return document.querySelector(selector);
	}
	return await betterncm.utils.waitForElement(selector);
}

const updateAccentColor = (name, argb, isFM = false) => {
	const [r, g, b] = [...argb2Rgb(argb)];
	if (isFM) {
		document.querySelector('.g-mn:not(.better-ncm-manager)').style.setProperty(`--${name}`, `rgb(${r}, ${g}, ${b})`);
		document.querySelector('.g-mn:not(.better-ncm-manager)').style.setProperty(`--${name}-rgb`, `${r}, ${g}, ${b}`);
	}
	document.body.style.setProperty(`--${name}`, `rgb(${r}, ${g}, ${b})`);
	document.body.style.setProperty(`--${name}-rgb`, `${r}, ${g}, ${b}`);
}

const useGreyAccentColor = (isFM = false) => {
	updateAccentColor('rnp-accent-color', rgb2Argb(150, 150, 150), isFM);
	updateAccentColor('rnp-accent-color-on-primary', rgb2Argb(250, 250, 250), isFM);
	updateAccentColor('rnp-accent-color-shade-1', rgb2Argb(210, 210, 210), isFM);
	updateAccentColor('rnp-accent-color-shade-2', rgb2Argb(255, 255, 255), isFM);
}


const calcAccentColor = (dom, isFM = false) => {
	const canvas = document.createElement('canvas');
	canvas.width = 50;
	canvas.height = 50;
	const ctx = canvas.getContext('2d');
	ctx.drawImage(dom, 0, 0, dom.naturalWidth, dom.naturalHeight, 0, 0, 50, 50);
	const pixels = chunk(ctx.getImageData(0, 0, 50, 50).data, 4).map((pixel) => {
		return ((pixel[3] << 24 >>> 0) | (pixel[0] << 16 >>> 0) | (pixel[1] << 8 >>> 0) | pixel[2]) >>> 0;
	});
	const quantizedColors = QuantizerCelebi.quantize(pixels, 128);
	const sortedQuantizedColors = Array.from(quantizedColors).sort((a, b) => b[1] - a[1]);

	/*Array.from(quantizedColors).sort((a, b) => b[1] - a[1]).slice(0, 50).map((x) => {
		console.log(...argb2Rgb(x[0]), x[1]);
	});*/
	const mostFrequentColors = sortedQuantizedColors.slice(0, 5).map((x) => argb2Rgb(x[0]));
	if (mostFrequentColors.every((x) => Math.max(...x) - Math.min(...x) < 5)) {
		useGreyAccentColor();
		return;
	}

	const ranked = Score.score(new Map(sortedQuantizedColors.slice(0, 50)));
	const top = ranked[0];
	const theme = themeFromSourceColor(top);

	// theme.schemes.light.bgDarken = (Hct.from(theme.palettes.neutral.hue, theme.palettes.neutral.chroma, 97.5)).toInt();
	updateAccentColor('rnp-accent-color', theme.schemes.dark.primary, isFM);
	updateAccentColor('rnp-accent-color-on-primary', (Hct.from(theme.palettes.primary.hue, theme.palettes.primary.chroma, 100)).toInt(), isFM);
	updateAccentColor('rnp-accent-color-shade-1', (Hct.from(theme.palettes.primary.hue, theme.palettes.primary.chroma, 80)).toInt(), isFM);
	updateAccentColor('rnp-accent-color-shade-2', (Hct.from(theme.palettes.primary.hue, theme.palettes.primary.chroma, 90)).toInt(), isFM);
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
	const targetWidth = document.querySelector('.g-single-track .g-singlec-ct .n-single .mn .head .inf .title').clientWidth;

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

	verticalAlignMiddleController.innerHTML = `
		body.vertical-align-middle .g-single-track .g-singlec-ct .n-single .sd,
		body.vertical-align-middle .g-single-track .g-singlec-ct .n-single .mn .head {
			transform: translateY(-${offset}px);
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

const shouldSettingMenuReload = [true, true]; // index = int(isFM)
const addSettingsMenu = async (isFM = false) => {
	if (shouldSettingMenuReload[isFM ? 1 : 0]) {
		shouldSettingMenuReload[isFM ? 1 : 0] = false;
	} else {
		return;
	}

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
			shouldSettingMenuReload[isFM ? 1 : 0] = true;
			setSetting(checkbox.id, e.target.checked);
			addOrRemoveGlobalClassByOption(className, e.target.checked);
		});
		addOrRemoveGlobalClassByOption(className, checkbox.checked);
	}
	const bindCheckboxToFunction = (checkbox, func, defaultValue = false) => {
		checkbox.checked = getSetting(checkbox.id, defaultValue);
		checkbox.addEventListener("change", e => {
			shouldSettingMenuReload[isFM ? 1 : 0] = true;
			setSetting(checkbox.id, e.target.checked);
			func(e.target.checked);
		});
		func(checkbox.checked);
	}
	const bindSliderToCSSVariable = (slider, variable, defaultValue = 0, event = 'input', mapping = (x) => { return x }, addClassWhenAdjusting = '') => {
		slider.value = getSetting(slider.id, defaultValue);
		slider.dispatchEvent(new Event("input"));
		slider.addEventListener(event, e => {
			const value = e.target.value;
			document.body.style.setProperty(variable, mapping(value));
		});
		slider.addEventListener("change", e => {
			shouldSettingMenuReload[isFM ? 1 : 0] = true;
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
	const bindSliderToFunction = (slider, func, defaultValue = 0, event = 'input', mapping = (x) => { return x }, addClassWhenAdjusting = '') => {
		slider.value = getSetting(slider.id, defaultValue);
		slider.dispatchEvent(new Event("input"));
		slider.addEventListener(event, e => {
			const value = e.target.value;
			func(mapping(value));
		});
		slider.addEventListener("change", e => {
			shouldSettingMenuReload[isFM ? 1 : 0] = true;
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
				shouldSettingMenuReload[isFM ? 1 : 0] = true;
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
	const getOptionDom = (selector) => {
		if (isFM) return document.querySelector(`${selector}-fm`);
		return document.querySelector(selector);
	}


	const initSettings = () => {
		const rectangleCover = getOptionDom('#rectangle-cover');
		const lyricBlur = getOptionDom('#lyric-blur');
		const lyricZoom = getOptionDom('#lyric-zoom');
		const enableAccentColor = getOptionDom('#enable-accent-color');
		const useNotosans = getOptionDom('#use-notosans');
		const hideComments = getOptionDom('#hide-comments');
		const lyricBreakWord = getOptionDom('#lyric-break-word');
		const partialBg = getOptionDom('#partial-bg');
		const gradientBgDynamic = getOptionDom('#gradient-bg-dynamic');

		bindCheckboxToClass(rectangleCover, 'rectangle-cover', true);
		bindCheckboxToClass(enableAccentColor, 'enable-accent-color', true);
		bindCheckboxToClass(useNotosans, 'use-notosans', false);
		bindCheckboxToClass(hideComments, 'hide-comments', false);
		bindCheckboxToClass(lyricBreakWord, 'lyric-break-word', true);
		bindCheckboxToClass(partialBg, 'partial-bg', false);
		bindCheckboxToClass(gradientBgDynamic, 'gradient-bg-dynamic', true);
		
		bindCheckboxToFunction(lyricBlur, (x) => {
			document.dispatchEvent(new CustomEvent('rnp-lyric-blur', { detail: x }));
		}, false);
		bindCheckboxToFunction(lyricZoom, (x) => {
			document.dispatchEvent(new CustomEvent('rnp-lyric-zoom', { detail: x }));
		}, false);


		const bgBlur = getOptionDom('#bg-blur');
		const bgDim = getOptionDom('#bg-dim');
		const bgDimForGradientBg = getOptionDom('#bg-dim-for-gradient-bg');
		const bgDimForFluidBg = getOptionDom('#bg-dim-for-fluid-bg');
		const bgOpacity = getOptionDom('#bg-opacity');
		const albumSize = getOptionDom('#album-size');
		const lyricFontSize = getOptionDom('#lyric-font-size');

		bindSliderToCSSVariable(bgBlur, '--bg-blur', 36, 'change', (x) => { return x + 'px' });
		bindSliderToCSSVariable(bgDim, '--bg-dim', 55, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgDimForGradientBg, '--bg-dim-for-gradient-bg', 45, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgDimForFluidBg, '--bg-dim-for-fluid-bg', 30, 'input', (x) => { return x / 100 });
		bindSliderToCSSVariable(bgOpacity, '--bg-opacity', 0, 'input', (x) => { return 1 - x / 100 });
		bindSliderToFunction(albumSize, (x) => {
			window.albumSize = x;
			const img = getOptionDom('.n-single .cdimg img');// ?? getOptionDom('.m-fm .fmplay .covers .cvr.j-curr');
			if (!img?.src) return;
			const currentSrc = img.src;
			const newSrc = currentSrc.replace(/thumbnail=\d+y\d+/g, `thumbnail=${window.albumSize}y${window.albumSize}`);
			if (currentSrc != newSrc) {
				img.src = newSrc;
			}
		}, 200, 'change', (x) => { return x == 200 ? 210 : x });
		bindSliderToFunction(lyricFontSize, (x) => {
			document.dispatchEvent(new CustomEvent('rnp-lyric-font-size', { detail: x }));
		}, 32, 'change'); 

		const verticalAlign = getOptionDom('#vertical-align');
		const backgroundType = getOptionDom('#background-type');
		bindSelectGroupToClasses(verticalAlign, 'bottom', (x) => { return 'vertical-align-' + x }, () => { recalculateVerticalAlignMiddleOffset() });
		bindSelectGroupToClasses(backgroundType, 'fluid', (x) => `rnp-bg-${x}`, (x) => {
			document.dispatchEvent(new CustomEvent('rnp-background-type', { detail: { type: x } }));
		});

		const lyricOffsetAdd = getOptionDom('#rnp-lyric-offset-add');
		const lyricOffsetSub = getOptionDom('#rnp-lyric-offset-sub');
		const lyricOffsetReset = getOptionDom('#rnp-lyric-offset-reset');
		const lyricOffsetNumber = getOptionDom('#rnp-lyric-offset-number');
		const lyricOffsetTip = getOptionDom('#rnp-lyric-offset-tip');
		const setLyricOffsetValue = (ms, save = false) => {
			lyricOffsetNumber.innerHTML = `${['-', '', '+'][Math.sign(ms) + 1]}${(Math.abs(ms) / 1000).toFixed(1).replace(/\.0$/, '')}s`;
			if (ms == 0) lyricOffsetTip.innerHTML = '未设置偏移';
			else lyricOffsetTip.innerHTML = (ms > 0 ? '歌词提前' : '歌词延后');
			if (ms == 0) lyricOffsetAdd.classList.remove('active'), lyricOffsetSub.classList.remove('active'), lyricOffsetReset.classList.remove('active');
			else if (ms > 0) lyricOffsetAdd.classList.add('active'), lyricOffsetSub.classList.remove('active'), lyricOffsetReset.classList.add('active');
			else lyricOffsetAdd.classList.remove('active'), lyricOffsetSub.classList.add('active'), lyricOffsetReset.classList.add('active');
			document.dispatchEvent(new CustomEvent('rnp-global-offset', { detail: ms }));
			if (save) {
				shouldSettingMenuReload[isFM ? 1 : 0] = true;
				setSetting('lyric-offset', ms);
			}
		};
		setLyricOffsetValue(parseInt(getSetting('lyric-offset', 0)));
		lyricOffsetAdd.addEventListener('click', () => {
			setLyricOffsetValue(parseInt(getSetting('lyric-offset', 0)) + 500, true);
		});
		lyricOffsetSub.addEventListener('click', () => {
			setLyricOffsetValue(parseInt(getSetting('lyric-offset', 0)) - 500, true);
		});
		lyricOffsetReset.addEventListener('click', () => {
			setLyricOffsetValue(0, true);
		});
	}

	const settingsMenu = document.createElement('div');
	if (isFM) {
		settingsMenu.id = 'settings-menu-fm';
		settingsMenu.innerHTML = settingsMenuHTML.replace(/(id|for)="(.*?)"/gi, '$1="$2-fm"');
	} else {
		settingsMenu.id = 'settings-menu';
		settingsMenu.innerHTML = settingsMenuHTML;
	}

	if (document.querySelector(settingsMenu.id)) {
		document.querySelector(settingsMenu.id).remove();
	}

	if (!isFM) document.querySelector('.g-single').appendChild(settingsMenu);
	else document.querySelector('#page_pc_userfm_songplay').appendChild(settingsMenu);
	initSettings();
	channel.call(
		"app.getLocalConfig", 
		(GpuAccelerationEnabled) => {
			if (!~~GpuAccelerationEnabled) {
				document.body.classList.add('gpu-acceleration-disabled');
			}
		}, 
		["setting", "hardware-acceleration"]
	);
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
		if (element.classList.contains('j-flag')/* || (element.parentElement && element.parentElement.classList.contains('.j-curr'))*/) {
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


plugin.onLoad(async (p) => {
	pluginPath = p.pluginPath;
	
	compatibilityWizard();

	document.body.classList.add('refined-now-playing');

	new MutationObserver(async (mutations) => { // Now playing page
		if (document.querySelector('.g-single:not(.patched)')) {
			document.querySelector('.g-single').classList.add('patched');
			const background = document.createElement('div');
			background.classList.add('rnp-bg');
			ReactDOM.render(
				<Background
					type={getSetting('background-type', 'fluid')}
					image={
						await (async () => {
							if (document.querySelector(".n-single .cdimg img")) {
								return document.querySelector(".n-single .cdimg img");
							}
							return await betterncm.utils.waitForElement(".n-single .cdimg img");
						})()
					}
				/>
			, background);
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
				for (let i = 0; i < 10; i++) {
					setTimeout(() => {
						window.dispatchEvent(new Event('recalc-lyrics'));
						window.dispatchEvent(new Event('recalc-title'));
					}, 50 * i);
				}
			}
		}
	}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

	
	// 私人 FM
	const patchFM = async () => {
		if (document.querySelector('#page_pc_userfm_songplay:not(.patched)')) {
			document.querySelector('#page_pc_userfm_songplay').classList.add('patched');
			FMObserver.disconnect();
			
			const lyrics = document.createElement('div');
			lyrics.classList.add('lyric');
			document.querySelector('#page_pc_userfm_songplay').appendChild(lyrics);
			ReactDOM.render(<Lyrics isFM={true}/>, lyrics);
			for (let i = 0; i < 15; i++) {
				setTimeout(() => {
					window.dispatchEvent(new Event('resize'));
				}, 200 * i);
			}

			const background = document.createElement('div');
			background.classList.add('rnp-bg', 'fm-bg');
			ReactDOM.render(
				<Background
					type={getSetting('background-type', 'fluid')}
					image={
						await waitForElementAsync('#page_pc_userfm_songplay .fmplay .covers')
					}
					isFM={true}
					imageChangedCallback={(dom) => {
						if (!dom) return;
						calcAccentColor(dom, true);
					}}
				/>
			, background);
			document.querySelector('#page_pc_userfm_songplay').appendChild(background);
			addSettingsMenu(true);
		}
	};
	let FMObserver = new MutationObserver(patchFM);
	window.addEventListener('hashchange', async () => {
		if (!window.location.hash.startsWith('#/m/fm/')) {
			FMObserver.disconnect();
			return;
		}
		console.log('private fm');
		for (let i = 0; i < 10; i++) {
			setTimeout(() => {
				window.dispatchEvent(new Event('recalc-lyrics'));
				window.dispatchEvent(new Event('recalc-title'));
			}, 50 * i);
		}
		FMObserver.observe(document.body, { childList: true });
		window.dispatchEvent(new Event('recalc-lyrics'));
	});
});

plugin.onConfig((tools) => {
	return dom("div", {},
		dom("span", { innerHTML: "打开正在播放界面以调整设置 " , style: { fontSize: "18px" } }),
		tools.makeBtn("打开", async () => {
			document.querySelector("a[data-action='max']").click();
		}),
		dom("div", { innerHTML: "" , style: { height: "20px" } }),
		dom("span", { innerHTML: "进入兼容性检查页面 " , style: { fontSize: "18px" } }),
		tools.makeBtn("兼容性检查", async () => {
			compatibilityWizard(true);
		})
	);
});