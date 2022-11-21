const that = this;
const loadFile = async (path) => {
	let fullPath = that.pluginPath + '/' + path;
	fullPath = fullPath.replace(/\\/g, '/');
    return await betterncm.fs.readFileText(fullPath);
}

const getCurrentCDImage = () => {
	const cdImage = document.querySelector('.n-single .cdimg img');
	return cdImage.src;
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
const waitForElement = (selector, fun) => {
	selector = selector.split(',');
	let done = true;
	let interval = setInterval(() => {
		console.log(selector);
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

const updateCDImage = () => {
	if (!document.querySelector('.g-single')) {
		return;
	}
	const cdImage = getCurrentCDImage();
	const cdBgBlur = document.querySelector('#cd-bg-blur');
	if (cdBgBlur.style.backgroundImage !== `url(${cdImage})`) {
		cdBgBlur.style.backgroundImage = `url(${cdImage})`;
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
	const initSettings = () => {
		const rectangleCover = document.querySelector('#rectangle-cover');
		const lyricBlur = document.querySelector('#lyric-blur');
		const useNotosans = document.querySelector('#use-notosans');

		rectangleCover.checked = getSetting('rectangle-cover', true);
		lyricBlur.checked = getSetting('lyric-blur', false);
		useNotosans.checked = getSetting('use-notosans', false);

		rectangleCover.addEventListener('change', () => {
			setSetting('rectangle-cover', rectangleCover.checked);
			addOrRemoveGlobalClassByOption('rectangle-cover', rectangleCover.checked);
		});
		lyricBlur.addEventListener('change', () => {
			setSetting('lyric-blur', lyricBlur.checked);
			addOrRemoveGlobalClassByOption('lyric-blur', lyricBlur.checked);
		});
		useNotosans.addEventListener('change', () => {
			setSetting('use-notosans', useNotosans.checked);
			addOrRemoveGlobalClassByOption('use-notosans', useNotosans.checked);
		});

		addOrRemoveGlobalClassByOption('rectangle-cover', rectangleCover.checked);
		addOrRemoveGlobalClassByOption('lyric-blur', lyricBlur.checked);
		addOrRemoveGlobalClassByOption('use-notosans', useNotosans.checked);
	}
	const settingsMenu = document.createElement('div');
	settingsMenu.id = 'settings-menu';
	settingsMenu.innerHTML = await loadFile('settings-menu.html');
	document.querySelector('.g-single').appendChild(settingsMenu);
	initSettings();
};

const main = async () => {
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
}
await main();