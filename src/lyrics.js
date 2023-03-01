import './lyric-provider.js';
import { getSetting, setSetting, copyTextToClipboard } from './utils.js';
import { showContextMenu } from './context-menu';
import './lyrics.scss';

import _isEqual from 'lodash/isEqual';

const useState = React.useState;
const useEffect = React.useEffect;
const useLayoutEffect = React.useLayoutEffect;
const useMemo = React.useMemo;
const useCallback = React.useCallback;
const useRef = React.useRef;

const isFMSession = () => {
	return !document.querySelector(".m-player-fm").classList.contains("f-dn");
}
// TODO: 监听 DOM 更改以缓存此函数

const customBlurFunc = localStorage.getItem('rnp-custom-blur-func', null) ? new Function('offset', localStorage.getItem('rnp-custom-blur-func')) : null;
const customScaleFunc = localStorage.getItem('rnp-custom-scale-func', null) ? new Function('offset', localStorage.getItem('rnp-custom-scale-func')) : null;

export function Lyrics(props) {
	const isFM = props.isFM ?? false;

	const containerRef = useRef(null);

	let [lyrics, setLyrics] = useState(null);
	const _lyrics = useRef(null);
	const _setLyrics = setLyrics;
	setLyrics = (x) => {
		_lyrics.current = x;
		_setLyrics(x);
	}
	const [hasTranslation, setHasTranslation] = useState(false);
	const [hasRomaji, setHasRomaji] = useState(false);
	const [hasKaraoke, setHasKaraoke] = useState(false);

	const [lyricContributors, setLyricContributors] = useState(null);

	const [playState, setPlayState] = useState(null);
	const [songId, setSongId] = useState("0");
	const currentTime = useRef(0); // 当前播放时间
	const [seekCounter, setSeekCounter] = useState(0); // 拖动进度条时修改触发重渲染
	const [recalcCounter, setRecalcCounter] = useState(0); // 手动重计算时触发渲染

	let [currentLine, setCurrentLine] = useState(0);
	const _currentLine = useRef(0);
	const _setCurrentLine = setCurrentLine;
	setCurrentLine = (x) => {
		_currentLine.current = x;
		_setCurrentLine(x);
	}
	const [currentLineForScrolling, setCurrentLineForScrolling] = useState(0);	// 为提前 0.2s 滚动，使滚动 delay 与逐词歌词对应 而设置的 提前的，仅用于滚动的 currentLine

	const [globalOffset, setGlobalOffset] = useState(parseInt(getSetting('lyric-offset', 0)));

	const heightOfItems = useRef([]);

	const [containerHeight, setContainerHeight] = useState(0);
	const [containerWidth, setContainerWidth] = useState(0);

	const [fontSize, setFontSize] = useState(getSetting('lyric-font-size', 32));
	const [lyricZoom, setLyricZoom] = useState(getSetting('lyric-zoom', false));
	const [lyricBlur, setLyricBlur] = useState(getSetting('lyric-blur', false));
	const [showTranslation, setShowTranslation] = useState(getSetting('show-translation', true));
	const [showRomaji, setShowRomaji] = useState(getSetting('show-romaji', true));
	const [useKaraokeLyrics, setUseKaraokeLyrics] = useState(getSetting('use-karaoke-lyrics', true));
	const [karaokeAnimation, setKaraokeAnimation] = useState(getSetting('karaoke-animation', 'float'));
	const [currentLyricAlignmentPercentage, setCurrentLyricAlignmentPercentage] = useState(parseInt(getSetting('current-lyric-alignment-percentage', 50)));
	const [lyricStagger, setLyricStagger] = useState(getSetting('lyric-stagger', true));

	const [overviewMode, setOverviewMode] = useState(false);
	const [overviewModeScrolling, setOverviewModeScrolling] = useState(false);
	const exitOverviewModeScrollingTimeout = useRef(null);
	const overviewContainerRef = useRef(null);

	const [lineTransforms, setLineTransforms] = useState([]);
	const shouldTransit = useRef(true);

	const [allToNonInterludeLyricsMapping, setAllToNonInterludeLyricsMapping] = useState([]); // 所有歌词 index -> 非间奏歌词 index (间奏歌词则是往前最近的非间奏歌词)
	const [nonInterludeToAllLyricsMapping, setNonInterludeToAllLyricsMapping] = useState([]); // 非间奏歌词 index -> 所有歌词 index

	let [scrollingMode, setScrollingMode] = useState(false);
	const [scrollingFocusLine, setScrollingFocusLine] = useState(0);
	const _scrollingMode = useRef(false);
	const _scrollingFocusLine = useRef(0);
	const exitScrollingModeTimeout = useRef(null);
	const _setScrollingMode = setScrollingMode;
	setScrollingMode = (x) => {
		_scrollingMode.current = x;
		if (x) containerRef.current.classList.add('scrolling');
		else containerRef.current.classList.remove('scrolling');
		_setScrollingMode(x);
	}


	const isPureMusic = lyrics && (
		lyrics.length === 1 ||
		lyrics.length <= 10 && lyrics.some((x) => (x.originalLyric ?? '').includes('纯音乐'))
	);

	const isCurrentModeSession = () => { // 判断是否在当前模式播放 (普通/FM)
		return isFM ? isFMSession() : !isFMSession();
	}

	const preProcessMapping = (lyrics) => {
		lyrics ??= [];
		const allToNonInterlude = [], nonInterludeToAll = [];
		let cnt = 0;
		for (let i = 0; i < lyrics.length; i++) {
			const line = lyrics[i];
			if (line.isInterlude) {
				if (allToNonInterlude.length > 0) {
					allToNonInterlude.push(allToNonInterlude[allToNonInterlude.length - 1]);
				} else {
					allToNonInterlude.push(0);
				}
			} else {
				nonInterludeToAll.push(i);
				allToNonInterlude.push(cnt);
				cnt++;
			}
		}
		setAllToNonInterludeLyricsMapping(allToNonInterlude);
		setNonInterludeToAllLyricsMapping(nonInterludeToAll);
	}

	const onLyricsUpdate = (e) => {
		if (!e.detail) {
			return;
		}
		if (!isCurrentModeSession()) {
			return;
		}
		shouldTransit.current = false;
		setScrollingMode(false);
		preProcessMapping(e.detail.lyrics);
		setCurrentLine(0);
		setCurrentLineForScrolling(0);
		setLyrics(e.detail.lyrics);
		setHasTranslation(e.detail.lyrics.some((x) => x.translatedLyric));
		setHasRomaji(e.detail.lyrics.some((x) => x.romanLyric));
		setHasKaraoke(e.detail.lyrics.some((x) => x.dynamicLyric));

		setLyricContributors(e.detail.contributors);
	}

	useEffect(() => {
		shouldTransit.current = false;
		if (window.currentLyrics) {
			const currentLyrics = window.currentLyrics.lyrics;
			preProcessMapping(currentLyrics);
			setLyrics(currentLyrics);
			setHasTranslation(currentLyrics.some((x) => x.translatedLyric));
			setHasRomaji(currentLyrics.some((x) => x.romanLyric));
			setHasKaraoke(currentLyrics.some((x) => x.dynamicLyric));

			setLyricContributors(window.currentLyrics.contributors);
		}
		document.addEventListener('lyrics-updated', onLyricsUpdate);
		return () => {
			document.removeEventListener('lyrics-updated', onLyricsUpdate);
		}
	}, []);


	useEffect(() => { // Recalculate height of each line
		if (!lyrics) return;
		const container = containerRef.current;
		const items = container.children;
		const heights = [];
		for (const item of items) {
			heights.push(item.clientHeight);
		}
		heightOfItems.current = heights;
		//console.log('heightOfItems', heightOfItems.current);
	}, [lyrics, containerWidth, fontSize, showTranslation, showRomaji, useKaraokeLyrics, karaokeAnimation, recalcCounter]);

	/*const recalcHeightOfItems = () => {
		if (!lyrics) return;
		const container = containerRef.current;
		const items = container.children;
		const heights = [];
		for (const item of items) {
			heights.push(item.clientHeight);
		}
		heightOfItems.current = heights;
		//console.log('heightOfItems', heightOfItems.current);
	}*/
	
	const onResize = () => {
		shouldTransit.current = false;
		const container = containerRef.current;
		setContainerHeight(container.clientHeight);
		setContainerWidth(container.clientWidth);
		//console.log('resize', container.clientWidth, container.clientHeight);
	};

	useEffect(() => {
		const resizeObserver = new ResizeObserver(() => {
			onResize();
		});
		resizeObserver.observe(containerRef.current);
		//window.addEventListener("resize", onResize);
		return () => {
			//window.removeEventListener("resize", onResize);
			resizeObserver.disconnect();
		}
	}, []);

	useEffect(() => {
		const onRecalc = () => {
			setRecalcCounter(+ new Date());
		}
		window.addEventListener('recalc-lyrics', onRecalc);
		return () => {
			window.removeEventListener('recalc-lyrics', onRecalc);
		}
	});

	const previousFocusedLineRef = useRef(0);
	useEffect(() => { // Recalculate vertical positions and transforms of each line
		if (!lyrics?.length) return;

		const space = fontSize * 1.2;
		const delayByOffset = (offset) => {
			//console.log(currentLine, previousFocusedLineRef.current);
			if (currentLineForScrolling == previousFocusedLineRef.current || scrollingMode) {
				return 0;
			}
			if (!lyricStagger) {
				return 0;
			}
			let sign = currentLineForScrolling - previousFocusedLineRef.current > 0 ? 1 : -1;
			offset = Math.max(-4, Math.min(4, offset)) * sign + 4;
			return offset * 50;
		};
		const scaleByOffset = (offset) => {
			if (!lyricZoom) return 1;
			if (customScaleFunc) {
				try {
					return customScaleFunc(offset);
				} catch (e) {
					console.error('Error in custom scale function', e);
				}
			}
			offset = Math.abs(offset);
			offset =  Math.max(1 - offset * 0.2, 0);
			return offset * offset * offset /* offset*/ * 0.3 + 0.7;
		};
		const blurByOffset = (offset) => {
			if (!lyricBlur || scrollingMode) return 0;
			if (customBlurFunc) {
				try {
					return customBlurFunc(offset);
				} catch (e) {
					console.error('Error in custom blur function', e);
				}
			}				
			offset = Math.abs(offset);
			if (offset == 0) return 0;
			return Math.min(0.5 + 1 * offset, 4.5);
		};


		//console.log(currentLine, previousFocusedLineRef.current, currentLine - previousFocusedLineRef.current > 0 ? 1 : -1);

		const transforms = [];
		for (let i = 0; i <= lyrics.length; i++) transforms.push({ top: 0, scale: 1, delay: 0 });
		//console.log('containerHeight', containerHeight);
		let current = Math.min(Math.max(currentLineForScrolling ?? 0, 0), lyrics.length - 1);
		if (scrollingMode) {
			current = Math.min(Math.max(scrollingFocusLine ?? 0, 0), lyrics.length - 1);
		}

	//	if (!scrollingMode) recalcHeightOfItems();
		//console.log(currentLine, current);
		//transforms[current].top = containerHeight / 2 - heightOfItems.current[current] / 2;
		transforms[current].top = 
			containerRef.current.clientHeight * (currentLyricAlignmentPercentage * 0.01) - 
			heightOfItems.current[current] / 2;
		transforms[current].scale = 1;
		transforms[current].delay = delayByOffset(0);
		transforms[current].blur = blurByOffset(0);
		const currentLineHeight = heightOfItems.current[current];
		if (lyrics[current].isInterlude && !scrollingMode) {
			// temporary heighten the interlude line
			heightOfItems.current[current] = currentLineHeight + 50;
		}
		// all lines before current
		for (let i = current - 1; i >= 0; i--) {
			transforms[i].scale = scaleByOffset(current - i);
			transforms[i].blur = blurByOffset(i - current);
			let scaledHeight = heightOfItems.current[i] * transforms[i].scale;
			transforms[i].top = transforms[i + 1].top - scaledHeight - space;
			transforms[i].delay = delayByOffset(i - current);
		}
		// all lines after current
		for (let i = current + 1; i < lyrics.length; i++) {
			transforms[i].scale = scaleByOffset(i - current);
			transforms[i].blur = blurByOffset(i - current);
			const previousScaledHeight = heightOfItems.current[i - 1] * transforms[i - 1].scale;
			transforms[i].top = transforms[i - 1].top + previousScaledHeight + space;
			transforms[i].delay = delayByOffset(i - current);
		}
		// contributors line
		transforms[lyrics.length].scale = scaleByOffset(lyrics.length - 1 - current);
		transforms[lyrics.length].blur = blurByOffset(lyrics.length - 1 - current);
		const previousScaledHeight = heightOfItems.current[lyrics.length - 1] * transforms[lyrics.length - 1].scale;
		transforms[lyrics.length].top = transforms[lyrics.length - 1].top + previousScaledHeight + Math.min(space * 1.5, 90);
		transforms[lyrics.length].delay = delayByOffset(lyrics.length - current);
		// set the height of interlude line back to normal
		heightOfItems.current[current] = currentLineHeight;
		// reset delay to 0 if necessary
		// for no transition when resizing, etc.
		if (!shouldTransit.current && !scrollingMode) {
			for (let i = 0; i <= lyrics.length; i++) {
				transforms[i].delay = 0;
				transforms[i].duration = 0;
			}
		}
		// reduce duration when scrolling
		/*if (scrollingMode) {
			for (let i = 0; i <= lyrics.length; i++) {
				transforms[i].duration = 200;
			}
		}*/
	
		setLineTransforms(transforms);
		//console.log('transforms', transforms);
		previousFocusedLineRef.current = currentLineForScrolling;
	},[
		currentLineForScrolling,
		containerHeight, containerWidth,
		fontSize, lyricZoom, lyricBlur,
		showTranslation, showRomaji, useKaraokeLyrics,
		scrollingMode, scrollingFocusLine,
		currentLyricAlignmentPercentage,
		lyricStagger,
		recalcCounter,
		lyrics
	]);


	const onPlayStateChange = (id, state) => {
		if (!isCurrentModeSession()) {
			return;
		}
		if (!isFM) {
			setPlayState(document.querySelector("#main-player .btnp").classList.contains("btnp-pause"));
		} else {
			setPlayState(document.querySelector(".m-player-fm .btnp").classList.contains("btnp-pause"));
		}
		//setPlayState((state.split("|")[1] == "resume"));
		if (document.querySelector(".m-player-fm .btnp").classList.contains("btnp-pause")) {
			setCurrentLineForScrolling(currentLine);
		}
		setSongId(id);
	};
	const onPlayProgress = (id, progress) => {
		if (!isCurrentModeSession()) {
			return;
		}
		//console.log("new progress", id, progress);
		//setSongId(id);
		const lastTime = currentTime.current + globalOffset;
		currentTime.current = ((progress * 1000) || 0);
		const currentTimeWithOffset = currentTime.current + globalOffset;
		if (!_lyrics.current) return;
		let startIndex = 0;
		if (currentTimeWithOffset - lastTime > 0 && currentTimeWithOffset - lastTime < 50) {
			startIndex = Math.max(0, currentLine - 1);
		}
		if (currentTimeWithOffset < lastTime - 10) {
			setSeekCounter(+new Date());
		}
	
		let cur = 0;
		for (let i = startIndex; i < _lyrics.current.length; i++) {
			if (_lyrics.current[i].time <= currentTimeWithOffset) {
				cur = i;
			} else {
				break;
			}
		}
		if (
			cur == _lyrics.current.length - 1 &&
			_lyrics.current[cur].duration &&
			currentTimeWithOffset > _lyrics.current[cur].time + _lyrics.current[cur].duration + 500
		) {
			cur = _lyrics.current.length;
		}
	
		let curForScrolling = Math.max(0, cur - 1);
		const scrollingDelay = lyricStagger ? 200 : 0;
		for (let i = startIndex; i < _lyrics.current.length; i++) {
			if (_lyrics.current[i].time <= currentTimeWithOffset + scrollingDelay) {
				curForScrolling = i;
			} else {
				break;
			}
		}
		
		shouldTransit.current = true;
		if (!_scrollingMode.current) {
			setScrollingFocusLine(cur);
			_scrollingFocusLine.current = cur;
		}
		setCurrentLine(cur);
		setCurrentLineForScrolling(curForScrolling);
	};
	useEffect(() => {
		onPlayProgress(songId, currentTime.current / 1000);
	}, [lyrics, globalOffset]);


	useEffect(() => {
		legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", onPlayStateChange);
		legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", onPlayProgress);
		const _channalCall = channel.call;
		channel.call = (name, ...args) => {
			if (name == "audioplayer.seek") {
				if (isCurrentModeSession()) {
					currentTime.current = parseInt(args[1][2] * 1000);
					setScrollingMode(false);
					setSeekCounter(+new Date());
				}
			}
			_channalCall(name, ...args);
		};
		return () => {
			legacyNativeCmder.removeRegisterCall("PlayState", "audioplayer", onPlayStateChange);
			legacyNativeCmder.removeRegisterCall("PlayProgress", "audioplayer", onPlayProgress);
			channel.call = _channalCall;
		}
	});

	const jumpToTime = useCallback((time) => {
		time -= globalOffset;
		shouldTransit.current = true;
		setScrollingMode(false);
		//console.log(songId);
		channel.call("audioplayer.seek", () => {}, [
			songId,
			`${songId}|seek|${Math.random().toString(36).substring(6)}`,
			time / 1000,
		]);
		/*console.log("audioplayer.seek", () => {}, [
			songId,
			`${songId}|seek|${Math.random().toString(36).substring(6)}`,
			time / 1000,
		]);*/
		setSeekCounter(+new Date());
		if (!playState) {
			if (!isFM) document.querySelector("#main-player .btnp").click();
			else document.querySelector(".m-player-fm .btnp").click();
		}
	}, [songId, playState, globalOffset]);

	// Scrolling mode
	
	const exitScrollingModeSoon = useCallback((timeout = 2000) => {
		cancelExitScrollingModeTimeout();
		exitScrollingModeTimeout.current = setTimeout(() => {
			setScrollingMode(false);
			setScrollingFocusLine(_currentLine.current);
			shouldTransit.current = true;
			_scrollingFocusLine.current = _currentLine.current;
		}, timeout);
	}, [currentLine]);

	const cancelExitScrollingModeTimeout = useCallback(() => {
		if (exitScrollingModeTimeout.current) {
			clearTimeout(exitScrollingModeTimeout.current);
			exitScrollingModeTimeout.current = null;
		}
	}, []);

	const scrollingFocusOnLine = useCallback((line) => {
		if (line == null) return;
		shouldTransit.current = true;
		setScrollingMode(true);
		setScrollingFocusLine(line);
		_scrollingFocusLine.current = line;
	}, []);

	const onWheel = (e) => {
		if (e.deltaY > 0) {
			for (let target = _scrollingFocusLine.current + 1; target < _lyrics.current.length; target++) {
				if (!_lyrics.current[target].isInterlude) {
					scrollingFocusOnLine(target);
					break;
				}
			}
			exitScrollingModeSoon();
		} else if (e.deltaY < 0) {
			for (let target = _scrollingFocusLine.current - 1; target >= 0; target--) {
				if (!_lyrics.current[target].isInterlude) {
					scrollingFocusOnLine(target);
					break;
				}
			}
			exitScrollingModeSoon();
		}
		return false;
	};

	useEffect(() => {
		containerRef.current.addEventListener("scroll", (e) => {
			e.stopPropagation();
			e.preventDefault();
			return false;
		}, { passive: false });
		containerRef.current.addEventListener("wheel", (e) => {
			e.stopPropagation();
			e.preventDefault();
			onWheel(e);
			return false;
		}, { passive: false });
	}, []);

	useEffect(() => {
		const onMouseLeave = () => {
			exitScrollingModeSoon(0);
		}
		document.addEventListener("mouseleave", onMouseLeave);
		return () => {
			document.removeEventListener("mouseleave", onMouseLeave);
		}
	}, []);

	useEffect(() => {
		const onLyricFontSizeChange = (e) => {
			setFontSize(e.detail ?? 32);
		}
		const onLyricZoomChange = (e) => {
			setLyricZoom(e.detail ?? false);
		}
		const onLyricBlurChange = (e) => {
			setLyricBlur(e.detail ?? false);
		}
		const onKaraokeAnimationChange = (e) => {
			setKaraokeAnimation(e.detail ?? 'float');
			setTimeout(() => {
				window.dispatchEvent(new CustomEvent("recalc-lyrics"));
			}, 0);
		}
		const onCurrentLyricAlignmentPercentageChange = (e) => {
			setCurrentLyricAlignmentPercentage(parseInt(e.detail) ?? 50);
		}
		const onLyricStaggerChange = (e) => {
			setLyricStagger(e.detail ?? true);
		}
		document.addEventListener("rnp-lyric-font-size", onLyricFontSizeChange);
		document.addEventListener("rnp-lyric-zoom", onLyricZoomChange);
		document.addEventListener("rnp-lyric-blur", onLyricBlurChange);
		document.addEventListener("rnp-karaoke-animation", onKaraokeAnimationChange);
		document.addEventListener("rnp-current-lyric-alignment-percentage", onCurrentLyricAlignmentPercentageChange);
		document.addEventListener("rnp-lyric-stagger", onLyricStaggerChange);
		return () => {
			document.removeEventListener("rnp-lyric-font-size", onLyricFontSizeChange);
			document.removeEventListener("rnp-lyric-zoom", onLyricZoomChange);
			document.removeEventListener("rnp-lyric-blur", onLyricBlurChange);
			document.removeEventListener("rnp-karaoke-animation", onKaraokeAnimationChange);
			document.removeEventListener("rnp-current-lyric-alignment-percentage", onCurrentLyricAlignmentPercentageChange);
			document.removeEventListener("rnp-lyric-stagger", onLyricStaggerChange);
		}
	}, []);

	useEffect(() => {
		const onGlobalOffsetChange = (e) => {
			setGlobalOffset(parseInt(e.detail) ?? 0);
			setSeekCounter(+new Date());
		}
		document.addEventListener("rnp-global-offset", onGlobalOffsetChange);
		return () => {
			document.removeEventListener("rnp-global-offset", onGlobalOffsetChange);
		}
	}, []);

	// Overview mode related

	useLayoutEffect(() => {
		if (!overviewMode) return;
		if (overviewModeScrolling) return;
		if (!overviewContainerRef.current) return;
		const container = overviewContainerRef.current;
		const current = container.querySelector('.rnp-lyrics-overview-line.current');
		if (!current) return;
		const scrollTop = current.offsetTop - container.clientHeight / 2 + current.clientHeight / 2;
		container.scrollTop = scrollTop;
	}, [overviewMode, showRomaji, showTranslation]);

	useEffect(() => {
		if (!overviewMode) return;
		if (overviewModeScrolling) return;
		if (!overviewContainerRef.current) return;
		const container = overviewContainerRef.current;
		const current = container.querySelector('.rnp-lyrics-overview-line.current');
		if (!current) return;
		const scrollTop = current.offsetTop - container.clientHeight / 2 + current.clientHeight / 2;
		container.scrollTo({ top: scrollTop, behavior: 'smooth' });
	}, [currentLine, overviewModeScrolling]);

	const exitOverviewModeScrollingSoon = useCallback((timeout = 3000) => {
		cancelExitOverviewModeScrollingTimeout();
		exitOverviewModeScrollingTimeout.current = setTimeout(() => {
			setOverviewModeScrolling(false);
		}, timeout);
	}, []);

	const cancelExitOverviewModeScrollingTimeout = useCallback(() => {
		if (exitOverviewModeScrollingTimeout.current) {
			clearTimeout(exitOverviewModeScrollingTimeout.current);
			exitOverviewModeScrollingTimeout.current = null;
		}
	}, []);

	const overviewModeSelectAll = useCallback(() => {
		const container = overviewContainerRef.current;
		const selection = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(container);
		selection.removeAllRanges();
		selection.addRange(range);
	}, [overviewContainerRef]);

	const length = lyrics?.length ?? 0;

	return (
		<>
			<div
				className={`rnp-lyrics ${isPureMusic ? 'pure-music' : ''} ${overviewMode ? 'overview-mode-hide' : ''}`}
				ref={containerRef}
				style={{
					fontSize: `${fontSize}px`,
				}}>
				{lyrics && lyrics.map((line, index) => {
					return <Line
						key={`${songId} ${index}`}
						id={index}
						line={line}
						currentLine={currentLine}
						currentTime={currentTime.current + globalOffset}
						seekCounter={seekCounter}
						playState={playState}
						showTranslation={showTranslation}
						showRomaji={showRomaji}
						useKaraokeLyrics={useKaraokeLyrics}
						jumpToTime={isPureMusic ? () => {} : jumpToTime}
						transforms={lineTransforms[index] ?? { top: 0, scale: 1, delay: 0, blur: 0 }}
						karaokeAnimation={karaokeAnimation}
						outOfRangeScrolling={scrollingMode && length > 100 && Math.abs(index - scrollingFocusLine) > 20}
						outOfRangeKaraoke={/*length > 100 && */Math.abs(index - currentLine) > 10}
					/>
				})}
				<Contributors
					transforms={lineTransforms[lineTransforms.length - 1] ?? { top: 0, scale: 1, delay: 0, blur: 0 }}
					contributors={lyricContributors}
				/>
			</div>
			<Scrollbar
				nonInterludeToAll={nonInterludeToAllLyricsMapping}
				allToNonInterlude={allToNonInterludeLyricsMapping}
				currentLine={currentLine}
				containerHeight={containerHeight}
				scrollingMode={scrollingMode}
				scrollingFocusLine={scrollingFocusLine}
				scrollingFocusOnLine={scrollingFocusOnLine}
				exitScrollingModeSoon={exitScrollingModeSoon}
				overviewMode={overviewMode}
			/>
			<div className="rnp-lyrics-switch">
				<button
					className={`
						rnp-lyrics-switch-btn
						rnp-lyrics-switch-btn-top
						rnp-lyrics-switch-btn-placeholder
					`}
					style={{visibility: 'hidden'}}
				>
				</button>
				<button
					className={`
						rnp-lyrics-switch-btn
						rnp-lyrics-switch-btn-top
						rnp-lyrics-switch-btn-overview-mode
						${overviewMode ? 'active' : ''}
					`}
					title="复制模式"
					onClick={() => {
						setOverviewMode(!overviewMode);
					}}>
					<svg style={{transform: 'translate(-2px, -2px)'}} xmlns="http://www.w3.org/2000/svg" height="20" width="20"><path d="M4.146 14.854v-1.396h6.792v1.396Zm0-2.937v-1.396h11.729v1.396Zm0-2.959V7.562h11.729v1.396Zm0-2.937V4.625h11.729v1.396Z"/></svg>
				</button>
				{
					overviewMode &&
					<button
						className={`
							rnp-lyrics-switch-btn
							rnp-lyrics-switch-btn-top
							rnp-lyrics-switch-btn-select-all
						`}
						title="全选"
						onClick={() => {
							overviewModeSelectAll();
						}}>
						<svg style={{transform: 'translate(-1px, 0px)'}} xmlns="http://www.w3.org/2000/svg" height="20" width="20"><path d="M4.583 16.833q-.583 0-.989-.406t-.406-.989h1.395Zm-1.395-3v-1.479h1.395v1.479Zm0-3.083V9.271h1.395v1.479Zm0-3.083V6.188h1.395v1.479Zm0-3.084q0-.583.406-.989t.989-.406v1.395Zm2.874 9.375V6.062h7.896v7.896Zm.126 2.875v-1.395h1.479v1.395Zm0-12.25V3.188h1.479v1.395Zm1.27 7.979h5.104V7.458H7.458Zm1.813 4.271v-1.395h1.479v1.395Zm0-12.25V3.188h1.479v1.395Zm3.083 12.25v-1.395h1.479v1.395Zm0-12.25V3.188h1.479v1.395Zm3.084 12.25v-1.395h1.395q0 .583-.406.989t-.989.406Zm0-3v-1.479h1.395v1.479Zm0-3.083V9.271h1.395v1.479Zm0-3.083V6.188h1.395v1.479Zm0-3.084V3.188q.583 0 .989.406t.406.989Z" transform="scale(0.8)"/></svg>
					</button>
				}
				<div className="rnp-lyrics-switch-btn-divider"/>
				<button
					className={`
						rnp-lyrics-switch-btn
						${showTranslation ? 'active' : ''}
						${hasTranslation ? '' : 'unavailable'}
					`}
					title="翻译"
					onClick={() => {
						setSetting("show-translation", !showTranslation);
						setShowTranslation(!showTranslation);
					}}>译</button>
				<button 
					className={`
						rnp-lyrics-switch-btn
						${showRomaji ? 'active' : ''}
						${hasRomaji ? '' : 'unavailable'}
					`}
					title="罗马音"
					onClick={() => {
						setSetting("show-romaji", !showRomaji);
						setShowRomaji(!showRomaji);
					}}>音</button>
				<button 
					className={
						`rnp-lyrics-switch-btn
						${useKaraokeLyrics ? 'active' : ''}
						${hasKaraoke ? '' : 'unavailable'}
					`}
					title="逐字歌词"
					onClick={() => {
						setSetting("use-karaoke-lyrics", !useKaraokeLyrics);
						setUseKaraokeLyrics(!useKaraokeLyrics);
					}}>逐字</button>
			</div>
			{
				overviewMode &&
				<LyricOverview
					lyrics={lyrics}
					currentLine={currentLine}
					showRomaji={showRomaji}
					showTranslation={showTranslation}
					jumpToTime={jumpToTime}
					overviewContainerRef={overviewContainerRef}
					setOverviewModeScrolling={setOverviewModeScrolling}
					exitOverviewModeScrollingSoon={exitOverviewModeScrollingSoon}
				/>
			}
		</>
	);
}

function Line(props) {
	if (props.outOfRangeScrolling) {
		return (
			<div
				className={`rnp-lyrics-line ${props.line.isInterlude ? 'rnp-interlude' : ''}`}
				offset={offset}
				style={{display: 'none'}}
			/>
		)
	}
	if (props.line.originalLyric == '') {
		props.line.isInterlude = true;
	}
	const offset = props.id - props.currentLine;
	const karaokeAnimationFloat = (word) => {
		if (props.currentLine != props.id){
			return {
				transitionDuration: `200ms`,
				transitionDelay: `0ms`,
			};
		}
		if (props.playState == false && word.time + word.duration - props.currentTime > 0) {
			return {
				transitionDuration: `0s`,
				transitionDelay: `0ms`,
				opacity: Math.max(0.4 + 0.6 * (props.currentTime - word.time) / word.duration, 0.4),
				transform: `translateY(-${Math.max((props.currentTime - word.time) / word.duration * 2, 0)}px)`
			};
		}
		return {
			transitionDuration: `${word.duration}ms, ${word.duration + 150}ms`,
			transitionDelay: `${word.time - props.currentTime}ms`
		};
	};
	const karaokeAnimationSlide = (word) => {
		if (props.currentLine != props.id){
			return {
				transitionDuration: `0ms`,
				transitionDelay: `0ms`,
			};
		}
		if (props.playState == false && word.time + word.duration - props.currentTime > 0) {
			return {
				transitionDuration: `0s`,
				transitionDelay: `0ms`,
				transform: `translateY(-${Math.max((props.currentTime - word.time) / word.duration * 1, 0)}px)`,
				WebkitMaskPositionX: `${100 - Math.max((props.currentTime - word.time) / word.duration * 100, 0)}%`
			};
		}
		return {
			transitionDuration: `${word.duration}ms, ${word.duration * 0.8}ms`,
			transitionDelay: `${word.time - props.currentTime}ms, ${word.time - props.currentTime + word.duration * 0.5}ms`
		};
	};
	const getKaraokeAnimation = (word) => {
		if (props.karaokeAnimation == 'float') {
			return karaokeAnimationFloat(word);
		} else if (props.karaokeAnimation == 'slide') {
			return karaokeAnimationSlide(word);
		}
	};

	const karaokeLineRef = useRef(null);
	useEffect(() => {
		if (props.currentLine != props.id) return;
		if (!karaokeLineRef.current) return;
		karaokeLineRef.current.classList.add('force-refresh');
		setTimeout(() => {
			if (!karaokeLineRef.current) return;
			karaokeLineRef.current.classList.remove('force-refresh');
		}, 6);
	}, [props.useKaraokeLyrics, props.seekCounter, props.karaokeAnimation]);

	const CJKRegex = /([\p{Unified_Ideograph}|\u3040-\u309F|\u30A0-\u30FF])/gu;

	return (
		<div
			className={`rnp-lyrics-line ${props.line.isInterlude ? 'rnp-interlude' : ''}`}
			offset={offset}
			onClick={() => props.jumpToTime(props.line.time + 50)}
			onContextMenu={(e) => {
				e.preventDefault();
				if (props.line.isInterlude || !props.line.originalLyric) return;
				let all = props.line.originalLyric;
				if (props.showRomaji && props.line.romanLyric) all += '\n' + props.line.romanLyric;
				if (props.showTranslation && props.line.translatedLyric) all += '\n' + props.line.translatedLyric;
				const items = [
					{
						label: '复制该句歌词',
						callback: () => {
							copyTextToClipboard(all);
						}
					},
				];
				if (props.line.romanLyric || props.line.translatedLyric) {
					items.push({
						divider: true
					});
					items.push({
						label: '复制原文',
						callback: () => {
							copyTextToClipboard(props.line.originalLyric);
						}
					});
					if (props.line.romanLyric) {
						items.push({
							label: '复制罗马音',
							callback: () => {
								copyTextToClipboard(props.line.romanLyric);
							}
						});
					}
					if (props.line.translatedLyric) {
						items.push({
							label: '复制翻译',
							callback: () => {
								copyTextToClipboard(props.line.translatedLyric);
							}
						});
					}
				}
				showContextMenu(e.clientX, e.clientY, items);
			}}
			style={{
				display: props.outOfRangeScrolling ? 'none' : 'block',
				transform: `
					translateY(${props.transforms.top}px)
					scale(${props.transforms.scale})
				`,
				transitionDelay: `${props.transforms.delay}ms`,
				transitionDuration: `${props.transforms?.duration ?? 500}ms`,
				filter: props.transforms?.blur ? `blur(${props.transforms?.blur}px)` : 'none'
			}}>
			{ props.line.dynamicLyric && props.useKaraokeLyrics && !props.outOfRangeKaraoke && <div className="rnp-lyrics-line-karaoke" ref={karaokeLineRef}>
				{props.line.dynamicLyric.map((word, index) => {
					return <span
						key={`${props.karaokeAnimation} ${index}`}
						className={`rnp-karaoke-word ${CJKRegex.test(word.word) ? 'is-cjk' : ''} ${word.word.endsWith(' ') ? 'end-with-space' : ''}`}
						style={getKaraokeAnimation(word)}>
							{word.word}
					</span>
				})}
			</div> }
			{ !(props.line.dynamicLyric && props.useKaraokeLyrics && !props.outOfRangeKaraoke) && props.line.originalLyric && <div className="rnp-lyrics-line-original">
				{ props.line.originalLyric }
			</div> }
			{ props.line.romanLyric && props.showRomaji && <div className="rnp-lyrics-line-romaji">
				{ props.line.romanLyric }
			</div> }
			{ props.line.translatedLyric && props.showTranslation && <div className="rnp-lyrics-line-translated">
				{ props.line.translatedLyric }
			</div> }
			{ props.line.isInterlude && <Interlude
				id={props.id}
				line={props.line}
				currentLine={props.currentLine}
				currentTime={props.currentTime}
				seekCounter={props.seekCounter}
				playState={props.playState}
			/> }
		</div>
	)

}

function Interlude(props) {
	const dotContainerRef = useRef(null);

	const dotCount = 3;
	const perDotTime = parseInt(props.line.duration / dotCount);
	const dots = [];
	for (let i = 0; i < dotCount; i++) {
		dots.push({
			time: props.line.time + perDotTime * i,
			duration: perDotTime,
		});
	}
	const dotAnimation = (dot) => {
		if (dotContainerRef.current) dotContainerRef.current.classList.add('pause-breath');
		if (props.currentLine != props.id){
			return {
				transitionDuration: `200ms`,
				transitionDelay: `0ms`,
			};
		}
		if (props.playState == false && dot.time + dot.duration - props.currentTime > 0) {
			return {
				transitionDuration: `0s`,
				transitionDelay: `0ms`,
				opacity: Math.max(0.2 + 0.7 * (props.currentTime - dot.time) / dot.duration, 0.2),
				transform: `scale(${Math.max(0.9 + 0.1 * (props.currentTime - dot.time) / dot.duration * 2, 0.8)}px)`
			};
		}
		if (dotContainerRef.current) dotContainerRef.current.classList.remove('pause-breath');
		return {
			transitionDuration: `${dot.duration}ms, ${dot.duration + 150}ms`,
			transitionDelay: `${dot.time - props.currentTime}ms`
		};
	};

	useEffect(() => {
		if (props.currentLine != props.id) return;
		if (!dotContainerRef.current) return;
		dotContainerRef.current.classList.add('force-refresh');
		setTimeout(() => {
			dotContainerRef.current?.classList?.remove('force-refresh');
		}, 6);
	}, [props.seekCounter]);

	return (
		<div className="rnp-interlude-inner" ref={dotContainerRef}>
			{dots.map((dot, index) => {
				return <div
					key={index}
					className="rnp-interlude-dot"
					style={dotAnimation(dot)}
				/>
			})}
		</div>
	)
}

function Contributors(props) {
	const contributors = props.contributors;
	return (
		<div
			className="rnp-contributors"
			style={{
				transform: `
					translateY(${props.transforms.top}px)
					scale(${props.transforms.scale})
				`,
				transitionDelay: `${props.transforms.delay}ms, ${props.transforms.delay}ms, 0ms`,
				transitionDuration: `${props.transforms?.duration ?? 500}ms`,
				filter: props.transforms?.blur ? `blur(${props.transforms?.blur}px)` : 'none'
			}}>
			<Contributor text="歌词" user={contributors?.original} />
			<Contributor text="翻译" user={contributors?.translation} />
		</div>
	);
}

function Contributor(props) {
	if (!props.user) {
		return null;
	}
	return (
		<div className="rnp-contributor rnp-contributor-original">
			<span>{props.text}贡献者: </span>
			<a className="rnp-contributor-user" href={`#/m/personal/?uid=${props.user.userid}`}>
				{props.user.name}
			</a>
		</div>
	);
}
function Scrollbar(props) {
	const scrollbarRef = useRef(null);
	const thumbRef = useRef(null);

	const currentLine = props.scrollingMode ? props.scrollingFocusLine : props.currentLine;
	const totalSteps = props.nonInterludeToAll.length;
	const thumbHeight = Math.max(props.containerHeight / totalSteps, 30);
	const heightOfTrack = props.containerHeight - thumbHeight;
	const perStep = totalSteps > 1 ? heightOfTrack / (totalSteps - 1) : 0;
	const current = props.allToNonInterlude[currentLine];

	useEffect(() => {
		const thumb = thumbRef.current;
		const heightOfTrack = props.containerHeight - thumbHeight;
		const perStep = heightOfTrack / (totalSteps - 1);
		let dragging = false;
		let startX, startY, offsetX, offsetY, trackTopY;
		const onMouseDown = (e) => {
			dragging = true;
			thumb.classList.add('dragging');
			thumb.style.transitionDuration = '0.2s';
			thumb.style.transltionTimingFunction = 'ease-out';
			startX = e.clientX;
			startY = e.clientY;
			offsetX = e.offsetX;
			offsetY = e.offsetY;
			trackTopY = scrollbarRef.current.getBoundingClientRect().top;
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		}
		let lastFocusLine = props.current;
		const onMouseMove = (e) => {
			if (!dragging) return;
			const diffX = e.clientX - startX;
			let y = e.clientY - trackTopY - offsetY;
			if (Math.abs(diffX) > 300) {
				y = startY - trackTopY - offsetY;
			}
			const cloest = Math.max(Math.min(Math.round(y / perStep), totalSteps - 1), 0);
			//console.log(cloest);
			const yOfCloest = cloest * perStep;
			//const distance = y - cloest * perStep;
			thumb.style.top = `${yOfCloest}px`;
			//thumb.style.transform = `translateY(${distance * 0.3}px)`;
			if (lastFocusLine == cloest) return;
			lastFocusLine = cloest;
			//console.log(props.nonInterludeToAll[cloest]);
			props.scrollingFocusOnLine(props.nonInterludeToAll[cloest]);
		}
		const onMouseUp = (e) => {
			dragging = false;
			thumb.classList.remove('dragging');
			thumb.style.transitionDuration = '';
			//thumb.style.transform = `none`;
			thumb.style.transltionTimingFunction = '';
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			props.exitScrollingModeSoon();
		}
		thumb.addEventListener('mousedown', onMouseDown);
		return () => {
			dragging = false;
			thumb.classList.remove('dragging');
			thumb.style.transitionDuration = '';
			thumb.style.transltionTimingFunction = '';
			thumb.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
			props.exitScrollingModeSoon();
		}
	}, [props.nonInterludeToAll, props.allToNonInterlude, props.containerHeight]);

	return (
		<div 
			className={`rnp-lyrics-scrollbar ${props.overviewMode ? 'overview-mode-hide' : ''}`}
			ref={scrollbarRef}>
			<div 
				className={`rnp-lyrics-scrollbar-thumb ${totalSteps > 1 ? '' : 'no-scroll'}`}
				ref={thumbRef}
				style={{
					height: thumbHeight,
					top: `${current * perStep}px`
				}}/>
			{/*<div>{ props.allToNonInterlude[currentLine] }</div>*/}
		</div>
	)
}

function LyricOverview(props) {
	useEffect(() => {
		const container = props.overviewContainerRef.current;
		let selecting = false;
		const onWheel = () => {
			props.setOverviewModeScrolling(true);
			if (!selecting) props.exitOverviewModeScrollingSoon();
		};
		const onMouseDown = (e) => {
			if (e.button != 0) return;
			const line = e.target.closest('.rnp-lyrics-overview-line');
			if (!line) return;
			selecting = true;
			props.setOverviewModeScrolling(true);
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		};
		const onMouseMove = (e) => {
			if (!selecting) return;
			props.setOverviewModeScrolling(true);
		};
		const onMouseUp = (e) => {
			if (!selecting) return;
			selecting = false;
			props.setOverviewModeScrolling(true);
			props.exitOverviewModeScrollingSoon();
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};
		container.addEventListener('wheel', onWheel);
		container.addEventListener('mousedown', onMouseDown);
		return () => {
			container.removeEventListener('wheel', onWheel);
			container.removeEventListener('mousedown', onMouseDown);
			document.removeEventListener('mousemove', onMouseMove);
			document.removeEventListener('mouseup', onMouseUp);
		};
	}, []);

	return (
		<div className="rnp-lyrics rnp-lyrics-overview-container" ref={props.overviewContainerRef}>
			<div className="rnp-lyrics-overview">
				{props.lyrics.map((line, index) => {
					return <div 
						key={index}
						className={`
							rnp-lyrics-overview-line
							${index == props.currentLine ? 'current' : ''}
							${index < props.currentLine ? 'passed' : ''}
							${line.isInterlude ? 'interlude' : ''}
						`}
						onContextMenu={(e) => {
							e.preventDefault();
							props.jumpToTime(line.time + 50);
							props.exitOverviewModeScrollingSoon(0);
						}}>
							{ !line.isInterlude && <div className="rnp-lyrics-overview-line-original">{line.originalLyric}</div> }
							{ line.romanLyric && props.showRomaji && <div className="rnp-lyrics-overview-line-romaji">{line.romanLyric}</div> }
							{ line.translatedLyric && props.showTranslation && <div className="rnp-lyrics-overview-line-translation">{line.translatedLyric}</div> }
					</div>
				})}
			</div>
		</div>
	);
}