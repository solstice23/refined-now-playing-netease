// code from material you theme

import './refined-control-bar.scss';
import { waitForElement, getSetting, setSetting } from './utils.js';

const injectHTML = (type, html, parent, fun = (dom) => {}) => {
	const dom = document.createElement(type);
	dom.innerHTML = html;
	fun.call(this, dom);

	parent.appendChild(dom);
	return dom;
}
const addPrefixZero = (num, len) => {
	num = num.toString();
	while (num.length < len) {
		num = '0' + num;
	}
	return num;
}
const timeToSeconds = (time) => {
	let seconds = 0;
	const parts = time.split(':');
	for (let i = 0; i < parts.length; i++) {
		seconds += parseInt(parts[i]) * Math.pow(60, parts.length - i - 1);
	}
	return seconds;
}
const secondsToTime = (seconds) => {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${addPrefixZero(s, 2)}`;
}
const updateTimeIndicator = () => {
	const passed = document.querySelector('#rnp-time-passed');
	const rest = document.querySelector('#rnp-time-rest');

	const passedTime = timeToSeconds(document.querySelector('time.now').innerText);
	const totalTime = timeToSeconds(document.querySelector('time.all').innerText);
	const remainTime = totalTime - passedTime;

	passed.innerText = secondsToTime(passedTime);
	rest.innerText = window.rnpTimeIndicator == 'remain' ? '-' + secondsToTime(remainTime) : secondsToTime(totalTime);
}
const updateTimeIndicatorPosition = () => {
	const selectorList = ['.brt', '.speed', '.audioEffect', '.spk'];
	let leftestButton;
	for (const selector of selectorList) {
		leftestButton = document.querySelector('.m-player ' + selector);
		if (!leftestButton) {
			continue;
		}
		if (leftestButton.childElementCount != 0) {
			break;
		}
	}
	const right = parseInt(window.getComputedStyle(leftestButton).right) + leftestButton.clientWidth + 10;
	document.querySelector('#time-indicator').style.right = right + 'px';
}

const init = () => {
	if (document.body.classList.contains('material-you-theme') || ~~loadedPlugins.MaterialYouTheme || ~~loadedPlugins['ark-theme']) {
		return;
	}

	window.timeIndicator = getSetting('time-indicator', 'remain');
	waitForElement('#main-player', (dom) => {
		injectHTML('div', `
			<span id="rnp-time-passed">0:00</span>
			/
			<span id="rnp-time-rest">0:00</span>
		`, dom, (dom) => {
			dom.id = 'rnp-time-indicator';
			dom.style = 'opacity: 0';
		});
		document.querySelector('#rnp-time-rest').addEventListener('click', () => {
			if ((window.rnpTimeIndicator ?? 'remain') == 'remain') {
				window.rnpTimeIndicator = 'total';
			} else {
				window.rnpTimeIndicator = 'remain';
			}
			setSetting('time-indicator', window.rnpTimeIndicator);
			updateTimeIndicator();
			updateTimeIndicatorPosition();
		});

		new MutationObserver(() => {
			updateTimeIndicator();
		}).observe(document.querySelector('time.now'), { childList: true });
		new MutationObserver(() => {
			updateTimeIndicatorPosition();
		}).observe(document.querySelector('#main-player .brt'), { childList: true });
		
		new MutationObserver(() => {
			updateTimeIndicatorPosition();
		}).observe(document.querySelector('#main-player .speed'), { childList: true });
	});
};

init();