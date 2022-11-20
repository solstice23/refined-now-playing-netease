const getCurrentCDImage = () => {
	const cdImage = document.querySelector('.n-single .cdimg img');
	return cdImage.src;
}

const extraCSS = `
	.n-single .cdin,
	.n-single .cdimg {
		width: 95%;
		height: 95%;
	}
	#cd-bg-blur {
		display: block;
		width: 100%;
		height: 100%;
		background-position: center;
		background-repeat: no-repeat;
		background-size: cover;
		filter: blur(36px) brightness(0.45);
		opacity: 1;
		pointer-events: none;
		position: absolute;
		left: 0;
		top: 0;
		transform: scale(1.1);
	}
	.g-single-track .content {
		flex: 0;
		width: 100%;
		position: absolute;
		left: min(5vw, 30px);
		bottom: clamp(30px, 5%, 60px);
		display: flex;
		flex-direction: column;
		flex-wrap: nowrap;
		max-width: 100%;
	}
	.g-single-track .g-bd2 {
		max-width: min(1500px, 80%);
	}
	.g-singlec-ct {
		scroll-snap-type: y proximity;
	}
	.n-single {
		height: 100%;
		max-height: unset;
		scroll-snap-align: start;
	}
	.g-single-track .g-bd2 {
		scroll-snap-align: start;
	}
	.g-single-track .g-singlec-ct .n-single .sd {
		width: clamp(200px, 20vw, 500px);
		margin: 0;
		margin-left: 50px;
	}
	.g-single-track .g-singlec-ct .n-single .mn {
		width: 50vw;
		display: flex;
		position: static;
		flex: 0;
		max-width: unset;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head {
		flex: 0;
		width: 100%;
	}
	.g-singlec-comment,
	.g-singlec-comment-detail,
	.g-singlec-comment-top {
		display: none;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .title h1 {
		font-size: clamp(45px, 5vh, 600px);
		max-width: unset;
	}
	.g-single-track .g-singlec-ct .n-single .mn .lyric {
		position: absolute;
		left: 50vw;
		width: 40%;
		bottom: 10vh;
		height: 50vh;
		overflow: visible;
		z-index: -1;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul {
		flex-wrap: wrap;
		flex-direction: column;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li {
		max-width: unset;
		width: 100%;
		text-align: left;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info .alias {
		order: -1;
		font-size: 20px;
		height: auto;
		line-height: 2;
		margin-top: -5px;
		overflow: visible;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info {
		display: flex;
		flex-direction: column;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf {
		max-width: unset;
		-webkit-mask-image: linear-gradient(90deg, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 1) 95%, rgba(0, 0, 0, 0) 100%);
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info .alias:not(:has(*)) {
		height: 0 !important;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li {
		font-size: 0;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li a {
		font-size: 16px;
		transition: color .3s ease;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li a:hover {
		color: #fff;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li a:before {
		content: '';
		display: inline-block;
		width: 22px;
		height: 15px;
		background-repeat: no-repeat;
		background-position: left;
		background-size: contain;
		transform: translateY(2px);
		filter: invert(1);
		opacity: .4;
		pointer-events: none;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li:nth-of-type(1) a:before {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 640 512'%3E%3C!-- Font Awesome Pro 6.0.0-alpha2 by %40fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --%3E%3Cpath d='M389.418 347.664C358.834 320.578 318.732 304 274.664 304H173.336C77.609 304 0 381.602 0 477.332C0 496.477 15.523 512 34.664 512H355.193C333.4 493.432 320 468.27 320 440C320 399.045 348.041 364.709 389.418 347.664ZM224 256C294.695 256 352 198.691 352 128S294.695 0 224 0C153.312 0 96 57.309 96 128S153.312 256 224 256ZM601.725 160.631L505.725 179.832C490.768 182.824 480 195.957 480 211.211V372.408C469.945 369.727 459.281 368 448 368C394.98 368 352 400.234 352 440C352 479.764 394.98 512 448 512S544 479.764 544 440V300.176L614.275 286.121C629.232 283.131 640 269.996 640 254.742V192.01C640 171.816 621.525 156.672 601.725 160.631Z'/%3E%3C/svg%3E");
		transform: translate(1px, 2px);
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li:nth-of-type(3) a:before {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3C!-- Font Awesome Pro 6.0.0-alpha2 by %40fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --%3E%3Cpath d='M464 96H272L208 32H48C21.5 32 0 53.5 0 80V432C0 458.5 21.5 480 48 480H464C490.5 480 512 458.5 512 432V144C512 117.5 490.5 96 464 96ZM352 352C352 369.625 330.5 384 304 384S256 369.625 256 352S277.5 320 304 320C309.375 320 314.75 320.75 320 322.001V245.625L224 283.125V384C224 401.625 202.5 416 176 416S128 401.625 128 384S149.5 352 176 352C181.375 352 186.75 352.75 192 354.001V239.25C192 232.25 196.5 226.125 203.25 224L331.25 176.75C336 175.25 341.375 176.125 345.5 179.125S352 186.875 352 192V352Z'/%3E%3C/svg%3E");
		height: 17px;
		transform: translate(1px, 2px);
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li:nth-of-type(2) a:before {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3C!-- Font Awesome Pro 6.0.0-alpha2 by %40fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) --%3E%3Cpath d='M256 16C123.461 16 16 123.419 16 256S123.461 496 256 496S496 388.581 496 256S388.539 16 256 16ZM80.715 256H79.627C70.549 256 63.229 247.99 64.065 238.658C72.364 146.017 146.49 72.06 239.274 64.055C248.291 63.278 256 70.791 256 80.132V80.132C256 88.482 249.786 95.363 241.727 96.077C164.745 102.898 103.148 164.347 96.153 241.354C95.401 249.634 88.771 256 80.715 256ZM256 352C202.976 352 160 309 160 256S202.976 160 256 160S352 203 352 256S309.024 352 256 352ZM256 224C238.303 224 224 238.25 224 256S238.303 288 256 288C273.697 288 288 273.75 288 256S273.697 224 256 224Z'/%3E%3C/svg%3E");
		height: 18px;
		transform: translateY(3px);
	}
	.n-single .head .title h1 .name {
		white-space: nowrap;
		max-width: unset;
		animation: none;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .title h1 .tag-wrap {
		display: inline-block;
		opacity: 0;
		transition: opacity .3s ease;
		vertical-align: bottom;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf:hover .title h1 .tag-wrap {
		opacity: 0.8;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .title h1 .tag-wrap svg {
		fill: #fff;
		position: absolute;
		left: 0;
		top: 0;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li:nth-of-type(1) a:not(:first-of-type):before {
		background-image: none;
		content: '/';
		color: #fff;
		filter: none;
		width: max-content;
		height: auto;
		margin-left: 2px;
		margin-right: 3px;
		transform: none;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li {
		opacity: .5;
		transition: opacity .3s ease;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .info ul li:nth-of-type(3) {
		opacity: 0;
		transition: opacity .3s ease;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf:hover .info ul li {
		opacity: 1;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf:hover .info ul li:nth-of-type(3) {
		opacity: .4;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf:hover .info ul:hover li:nth-of-type(3) {
		opacity: 1;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf {
		transform: translateY(16px);
		transition: transform .3s ease;
	}
	.n-single .sd .cd {
		-webkit-transform: none !important;
		margin-top: 0 !important;
		-webkit-transition: none !important;
	}
	.n-single .sd .cdrun {
		display: none;
	}
	.n-single .cdbox {
		display: none;
	}
	.n-single .cdbg {
		border-radius: 1000px;
	}
	.n-single .sd .together-head {
		margin: 0;
		left: -20%;
		justify-content: left;
		top: 60px;
		left: 20px;
		position: fixed;
		z-index: 3;
		transition: opacity .2s ease !important;
	}
	body:not(.mq-playing) .n-single .sd .together-head,
	body:not(.mq-playing) .n-single .sd .together-text,
	body.mq-playing-scroll .n-single .sd .together-head,
	body.mq-playing-scroll .n-single .sd .together-text {
		opacity: 0;
	}
	.n-single .sd .together-head .ear_left,
	.n-single .sd .together-head .ear_right {
		display: none;
	}
	.g-single-track .g-singlec-ct .n-single .mn .head .inf .title {
		text-align: left;
		height: auto;
		margin-bottom: 10px;
		overflow: hidden;
	}
	.n-single>.wrap {
		max-width: max(80%, 1500px);
	}
	.n-single .sd .together-head .wrap:after {
		display: none;
	}
	.n-single .sd .together-head .face-1,
	.n-single .sd .together-head .face-2 {
		width: 30px;
		height: 30px;
	}
	.n-single .sd .together-text {
		position: fixed;
		top: 82px;
		left: 104px;
		transform: none;
		text-align: left;
		z-index: 3;
		transition: opacity .2s ease !important;
	}
	.n-single .sd .together-head .face-2 {
		margin-left: 15px;
	}
	.m-playlrc .word .text .z-crt p {
		font-size: 1.3rem !important;
		color: #fff;
	}
	.m-playlrc .word .text .z-crt p:not(:last-child) {
		margin-bottom: 10px !important;
	}
	.m-playlrc .word .text .z-crt p.translated {
		opacity: .8;
	}
	.m-playlrc .word .text p {
		transition: all .5s ease-out;
		transition-delay: 0.2s;
	}
	body.mq-playing .g-hd .m-leftbox {
		opacity: 0;
		transition: opacity .3s ease;
	}
	body.mq-playing .g-hd .m-sch {
		display: none;
	}
	body.mq-playing .g-hd:hover .m-leftbox {
		opacity: 1;
	}
	body.mq-playing #main-player {
		background: transparent;
	}
	body.mq-playing:not(.mq-playing-scroll) #main-player {
		border: none;
	}
	body.mq-playing .m-player .prg .has {
		background: #ffffff88;
	}
	body.mq-playing .m-player .prg .ctrl::before,
	.m-player .prg .ctrl::after {
		background: #fff;
	}
	.m-pinfo .zoom {
		display: none;
	}
	.m-pinfo .btns {
		left: 16px;
	}
	.m-pinfo .btn:not(.btn-love),
	#main-player>*:not(.f-cp, .prg, time),
	#main-player>.audioEffect,
	#main-player>.spk,
	#main-player>.listenTogether,
	#main-player>.list {
		opacity: 0;
		transition: opacity .3s ease;
	}
	body.bottombar-hover .m-pinfo .btn:not(.btn-love),
	body.bottombar-hover #main-player>*:not(.f-cp, .prg, time),
	body.bottombar-hover #main-player>.audioEffect,
	body.bottombar-hover #main-player>.spk,
	body.bottombar-hover #main-player>.listenTogether,
	body.bottombar-hover #main-player>.list,
	body.mq-playing-scroll .m-pinfo .btn:not(.btn-love),
	body.mq-playing-scroll #main-player>*:not(.f-cp, .prg, time),
	body.mq-playing-scroll #main-player>.audioEffect,
	body.mq-playing-scroll #main-player>.spk,
	body.mq-playing-scroll #main-player>.listenTogether,
	body.mq-playing-scroll #main-player>.list {
		opacity: 1;
	}
	.m-pinfo .btn-love {
		border-color: transparent;
		transition: border-color .3s ease;
	}
	body.bottombar-hover .btn-love,
	body.mq-playing-scroll .btn-love {
		border-color: rgba(255, 255, 255, 0.1);
		transition: border-color .3s ease;
	}
	section#auto-id-08OXGV5zDKD5O8Vo * {
		color: #fff !important;
	}
	.m-playlist {
		background: #00000033;
		backdrop-filter: blur(36px) brightness(0.8);
		border-radius: 16px;
	}
	.g-single-track .g-singlec-ct .n-single .mn .lyric .cnt > div:first-child:not(.inf) {
		display: none;
	}
	.g-singlec-live {
		display: none;
	}
`;

const InjectCSS = (css) => {
	const style = document.createElement('style');
	style.innerHTML = css;
	document.head.appendChild(style);
}

const InjectHTML = (type, html, parent, fun = (dom) => {}) => {
	const dom = document.createElement(type);
	dom.innerHTML = html;
	fun.call(this, dom);

	parent.appendChild(dom);
}
const WaitForElement = (selector, fun) => {
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

WaitForElement("#main-player, .m-pinfo", (dom) => {
	dom.addEventListener('mouseenter', () => {
		document.body.classList.add('bottombar-hover');
	});
	dom.addEventListener('mouseleave', () => {
		document.body.classList.remove('bottombar-hover');
	});
});
const main = () => {
	InjectCSS(extraCSS);
	const bodyObserver = new MutationObserver((mutations) => {
		if (document.querySelector('.g-single:not(.patched)')) {
			InjectHTML('div', '', document.querySelector('.g-single'), (dom) => {
				dom.id = 'cd-bg-blur';				
			});
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

main();