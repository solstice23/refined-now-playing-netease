
import { getSetting, setSetting } from './utils.js';
import './lyrics.scss';

import _isEqual from 'lodash/isEqual';

const useState = React.useState;
const useEffect = React.useEffect;
const useLayoutEffect = React.useLayoutEffect;
const useMemo  = React.useMemo;
const useRef = React.useRef;


let currentRawLyrics = null, currentLyrics = null;

const _onProcessLyrics = window.onProcessLyrics ?? ((x) => x);
window.onProcessLyrics = (lyrics) => {
	if (!lyrics) return _onProcessLyrics(lyrics);
	console.log('update original lyrics', lyrics);
	const processedLyrics = preProcessLyrics(lyrics);
	if (!_isEqual(processedLyrics, currentRawLyrics)) {
		currentRawLyrics = processedLyrics;
		console.log('update raw lyrics', currentRawLyrics);
		setTimeout(async () => {
			currentLyrics = await processLyrics(processedLyrics);
			console.log('update lyrics', currentLyrics);
			document.dispatchEvent(new CustomEvent('lyrics-updated', {detail: currentLyrics}));
		}, 0);
	}
	return _onProcessLyrics(lyrics);
}

const CJKRegex = /([\p{Unified_Ideograph}|\u3040-\u309F|\u30A0-\u30FF])/gu;
const isCJK = (word) => {
	return CJKRegex.test(word);
}

const preProcessLyrics = (lyrics) => {
	if (!lyrics) return null;
	if (!lyrics.lrc) return null;
	
	const original = lyrics?.lrc?.lyric ?? '';
	const translation = lyrics?.ytlrc?.lyric ?? lyrics?.ttlrc?.lyric ?? lyrics?.tlyric?.lyric ?? '';
	const roma = lyrics?.yromalrc?.lyric ?? lyrics?.romalrc?.lyric ?? '';
	const dynamic = lyrics?.yrc?.lyric ?? '';
	const approxLines = original.match(/\[(.*?)\]/g)?.length ?? 0;

	const parsed = loadedPlugins.liblyric.parseLyric(
		original,
		translation,
		roma,
		dynamic
	);
	if (approxLines - parsed.length > 10) { // 某些特殊情况（逐字歌词残缺不全）
		return loadedPlugins.liblyric.parseLyric(
			original,
			translation,
			roma
		);
	}
	return parsed;
}

const processLyrics = (lyrics) => {
	for (const line of lyrics) {
		if (line.originalLyric == '') {
			line.isInterlude = true;
		}
	}
	/*for (const line of lyrics) {
		if (!line.dynamicLyric) {
			// 拆开每一个 CJK 字符，但是保留英文单词不拆
			// 例: "测试a test" => ["测", "试", "a", "test"]
			line.dynamicLyric = line.originalLyric.replace(/([\p{Unified_Ideograph}|\u3040-\u309F|\u30A0-\u30FF])/gu, ' $1 ').replace(/\s+/g, ' ').trim().split(' ').map((x) => {
				return {
					word: x,
				};
			});
		}
		for (const word of line.dynamicLyric) {
			// 如果是日语浊音符，就合并到前一个单词
			if (word.word === 'ﾞ' || word.word === 'ﾟ') {
				const prevWord = line.dynamicLyric[line.dynamicLyric.indexOf(word) - 1];
				if (prevWord) {
					prevWord.word += word.word;
					if (prevWord.durations) prevWord.durations += word.durations;
					line.dynamicLyric.splice(line.dynamicLyric.indexOf(word), 1);
				}
			}
		}
		// const sentense = line.dynamicLyric.map((x) => x.word).join('');
		// console.log(sentense);
	}*/
	return lyrics;
}


export function Lyrics(props) {
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

	const [playState, setPlayState] = useState(null);
	const [songId, setSongId] = useState("0");
	const currentTime = useRef(0), lastTime = useRef(0); // 当前播放时间，上一次获得的播放时间
	const [seekCounter, setSeekCounter] = useState(0); // 拖动进度条时修改触发重渲染

	let [currentLine, setCurrentLine] = useState(0);
	const _currentLine = useRef(0);
	const _setCurrentLine = setCurrentLine;
	setCurrentLine = (x) => {
		_currentLine.current = x;
		_setCurrentLine(x);
	}

	const [globalOffset, setGlobalOffset] = useState(0);

	const heightOfItems = useRef([]);

	const [containerHeight, setContainerHeight] = useState(0);
	const [containerWidth, setContainerWidth] = useState(0);

	const [fontSize, setFontSize] = useState(32);
	const [showTranslation, setShowTranslation] = useState(getSetting('show-translation', true));
	const [showRomaji, setShowRomaji] = useState(getSetting('show-romaji', true));
	const [useKaraokeLyrics, setUseKaraokeLyrics] = useState(getSetting('use-karaoke-lyrics', true));

	const [lineTransforms, setLineTransforms] = useState([]);
	const shouldTransit = useRef(true);

	const [allToNonInterludeLyricsMapping, setAllToNonInterludeLyricsMapping] = useState([]); // 所有歌词 index -> 非间奏歌词 index (间奏歌词则是往前最近的非间奏歌词)
	const [nonInterludeToAllLyricsMapping, setNonInterludeToAllLyricsMapping] = useState([]); // 非间奏歌词 index -> 所有歌词 index

	const [scrollingMode, setScrollingMode] = useState(false);
	const [scrollingFocusLine, setScrollingFocusLine] = useState(0);
	const _scrollingMode = useRef(false);
	const _scrollingFocusLine = useRef(0);
	const exitScrollingModeTimeout = useRef(null);

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
		shouldTransit.current = false;
		setScrollingMode(false);
		_scrollingMode.current = false;
		preProcessMapping(e.detail);
		setCurrentLine(0);
		setLyrics(e.detail);
		setHasTranslation(e.detail.some((x) => x.translatedLyric));
		setHasRomaji(e.detail.some((x) => x.romanLyric));
		setHasKaraoke(e.detail.some((x) => x.dynamicLyric));
	}

	useEffect(() => {
		shouldTransit.current = false;
		preProcessMapping(currentLyrics);
		setLyrics(currentLyrics);
		setHasTranslation(currentLyrics.some((x) => x.translatedLyric));
		setHasRomaji(currentLyrics.some((x) => x.romanLyric));
		setHasKaraoke(currentLyrics.some((x) => x.dynamicLyric));
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
	}, [lyrics, containerWidth, fontSize, showTranslation, showRomaji, useKaraokeLyrics]);
	
	const onResize = () => {
		shouldTransit.current = true;
		const container = containerRef.current;
		setContainerHeight(container.clientHeight);
		setContainerWidth(container.clientWidth);
	};

	useEffect(() => {
		onResize();
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("resize", onResize);
		}
	}, []);


	// TODO:
	// 1. 刚进去歌曲的时候和切歌的时候不应有过渡动画  DONE
	// 2. 修复某些时候的 Fatal Error（可能缺少原歌词？）DONE
	// 3. 点击歌词跳转到相应位置 DONE
	// 4. 逐字歌词（需要单独做而不是和计算 transform 放在一起，因为有滚轮和进度条的动作） DONE
	// 5. 支持滚轮与进度条拖动 DONE
	// 6. 自定义字体字号模糊缩放
	// 7. 微调 UI (字体相对大小，边距，container 大小) DONE
	// 8. 逐字注音而不是直接显示罗马音

	const previousFocusedLineRef = useRef(0);
	useEffect(() => { // Recalculate vertical positions and transforms of each line
		if (!lyrics?.length) return;

		const space = fontSize * 1.2;
		const scaleByOffset = (offset) => {
			//return 1;
			offset =  Math.max(1 - offset * 0.2, 0);
			return offset * offset * offset * offset * 0.3 + 0.7;
		};
		const delayByOffset = (offset) => {
			let sign = currentLine - previousFocusedLineRef.current > 0 ? 1 : -1;
			//console.log(currentLine, previousFocusedLineRef.current);
			if (currentLine == previousFocusedLineRef.current) {
				return 0;
			}
			offset = Math.max(-4, Math.min(4, offset)) * sign + 4;
			return offset * 50;
		};

		//console.log(currentLine, previousFocusedLineRef.current, currentLine - previousFocusedLineRef.current > 0 ? 1 : -1);

		const transforms = [];
		for (let i = 0; i < lyrics.length; i++) transforms.push({ top: 0, scale: 1, delay: 0 });
		//console.log('containerHeight', containerHeight);
		let current = Math.min(Math.max(currentLine ?? 0, 0), lyrics.length - 1);
		if (scrollingMode) {
			current = Math.min(Math.max(scrollingFocusLine ?? 0, 0), lyrics.length - 1);
		}
		//console.log(currentLine, current);
		transforms[current].top = containerHeight / 2 - heightOfItems.current[current] / 2;
		transforms[current].scale = 1;
		transforms[current].delay = delayByOffset(0);
		const currentLineHeight = heightOfItems.current[current];
		if (lyrics[current].isInterlude && !scrollingMode) {
			heightOfItems.current[current] = currentLineHeight + 50;
		}
		for (let i = current - 1; i >= 0; i--) {
			transforms[i].scale = scaleByOffset(current - i);
			let scaledHeight = heightOfItems.current[i] * transforms[i].scale;
			transforms[i].top = transforms[i + 1].top - scaledHeight - space;
			transforms[i].delay = delayByOffset(i - current);
		}
		for (let i = current + 1; i < lyrics.length; i++) {
			transforms[i].scale = scaleByOffset(i - current);
			const previousScaledHeight = heightOfItems.current[i - 1] * transforms[i - 1].scale;
			transforms[i].top = transforms[i - 1].top + previousScaledHeight + space;
			transforms[i].delay = delayByOffset(i - current);
		}
		heightOfItems.current[current] = currentLineHeight;
		if (!shouldTransit.current) {
			for (let i = 0; i < lyrics.length; i++) {
				transforms[i].delay = 0;
				transforms[i].duration = 0;
			}
		}
		setLineTransforms(transforms);
		//console.log('transforms', transforms);
		previousFocusedLineRef.current = currentLine;
	}, [currentLine, containerHeight, containerWidth, fontSize, showTranslation, showRomaji, useKaraokeLyrics, scrollingMode, scrollingFocusLine, lyrics]);


	const onPlayStateChange = (id, state) => {
		setPlayState(document.querySelector("#main-player .btnp").classList.contains("btnp-pause"));
		setSongId(id);
	};
	const onPlayProgress = (id, progress) => {
		const ms = ((progress * 1000) || 0) + globalOffset;
		lastTime.current = currentTime.current;
		currentTime.current = ms;
		if (!_lyrics.current) return;
		let cur = 0;
		let startIndex = 0;
		if (currentTime.current - lastTime.current > 0 && currentTime.current - lastTime.current < 50) {
			startIndex = Math.max(0, cur - 1);
		}
		for (let i = startIndex; i < _lyrics.current.length; i++) {
			if (_lyrics.current[i].time <= ms) {
				cur = i;
			}
		}
		shouldTransit.current = true;
		setCurrentLine(cur);
		if (!_scrollingMode.current) {
			setScrollingFocusLine(cur);
			_scrollingFocusLine.current = cur;
		}
	};
	useEffect(() => {
		onPlayProgress(songId, currentTime.current);
	}, [lyrics, globalOffset]);


	useEffect(() => {
		legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", onPlayStateChange);
		legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", onPlayProgress);
		const _channalCall = channel.call;
		channel.call = (name, ...args) => {
			if (name == "audioplayer.seek") {
				currentTime.current = parseInt(args[1][2] * 1000);
				setScrollingMode(false);
				_scrollingMode.current = false;
				setSeekCounter(+new Date());
			}
			_channalCall(name, ...args);
		};
		return () => {
			legacyNativeCmder.removeRegisterCall("PlayState", "audioplayer", onPlayStateChange);
			legacyNativeCmder.removeRegisterCall("PlayProgress", "audioplayer", onPlayProgress);
			channel.call = _channalCall;
		}
	}, []);

	const jumpToTime = React.useCallback((time) => {
		shouldTransit.current = true;
		setScrollingMode(false);
		_scrollingMode.current = false;
		channel.call("audioplayer.seek", () => {}, [
			songId,
			`${songId}|seek|${Math.random().toString(36).substring(6)}`,
			time / 1000,
		]);
		currentTime.current = time;
		setSeekCounter(+new Date());
		if (!playState) {
			document.querySelector("#main-player .btnp").click();
		}
	}, [songId, playState]);

	
	const exitScrollingModeSoon = React.useCallback((timeout = 2000) => {
		cancelExitScrollingModeTimeout();
		exitScrollingModeTimeout.current = setTimeout(() => {
			setScrollingMode(false);
			_scrollingMode.current = false;
			setScrollingFocusLine(_currentLine.current);
			_scrollingFocusLine.current = _currentLine.current;
		}, timeout);
	}, [currentLine]);

	const cancelExitScrollingModeTimeout = React.useCallback(() => {
		if (exitScrollingModeTimeout.current) {
			clearTimeout(exitScrollingModeTimeout.current);
			exitScrollingModeTimeout.current = null;
		}
	}, []);

	const scrollingFocusOnLine = React.useCallback((line) => {
		if (line == null) return;
		setScrollingMode(true);
		_scrollingMode.current = true;
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

	return (
		<>
			<div
				className="rnp-lyrics"
				ref={containerRef}>
				{lyrics && lyrics.map((line, index) => {
					return <Line
						key={`${songId} ${index}`}
						id={index}
						line={line}
						currentLine={currentLine}
						currentTime={currentTime.current}
						seekCounter={seekCounter}
						playState={playState}
						fontSize={fontSize}
						showTranslation={showTranslation}
						showRomaji={showRomaji}
						useKaraokeLyrics={useKaraokeLyrics}
						jumpToTime={jumpToTime}
						transforms={lineTransforms[index] ?? { top: 0, scale: 1, delay: 0 }}
					/>
				})}
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
			/>
			<div className="rnp-lyrics-switch">
				{/*<button className="rnp-lyrics-switch-btn" onClick={() => setFontSize(fontSize + 1)}>+</button>
				<button className="rnp-lyrics-switch-btn" onClick={() => setFontSize(fontSize - 1)}>-</button>*/}
				<button
					className={`
						rnp-lyrics-switch-btn
						${showTranslation ? 'active' : ''}
						${hasTranslation ? '' : 'unavailable'}
					`}
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
					onClick={() => {
					setSetting("use-karaoke-lyrics", !useKaraokeLyrics);
					setUseKaraokeLyrics(!useKaraokeLyrics);
				}}>逐字</button>
			</div>
		</>
	);
}

function Line(props) {
	if (props.line.originalLyric == '') {
		props.line.isInterlude = true;
	}
	const offset = props.id - props.currentLine;
	const karaokeAnimation = (word) => {
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
		//console.log(word, word.time, props.currentTime, word.time - props.currentTime);
		return {
			transitionDuration: `${word.duration}ms, ${word.duration + 150}ms`,
			transitionDelay: `${word.time - props.currentTime}ms`
		};
	};

	const karaokeLineRef = useRef(null);
	useEffect(() => {
		if (props.currentLine != props.id) return;
		if (!karaokeLineRef.current) return;
		karaokeLineRef.current.classList.add('force-refresh');
		setTimeout(() => {
			karaokeLineRef.current.classList.remove('force-refresh');
		}, 6);
	}, [props.useKaraokeLyrics, props.seekCounter]);

		
	
	return (
		<div
			className={`rnp-lyrics-line ${props.line.isInterlude ? 'rnp-interlude' : ''}`}
			offset={offset}
			onClick={() => props.jumpToTime(props.line.time + 50)}
			style={{
				fontSize: props.fontSize,
				transform: `
					translateY(${props.transforms.top}px)
					scale(${props.transforms.scale})
				`,
				transitionDelay: `${props.transforms.delay}ms`,
				transitionDuration: `${props.transforms?.duration ?? 500}ms`,
			}}>
			{ props.line.dynamicLyric && props.useKaraokeLyrics && <div className="rnp-lyrics-line-karaoke" ref={karaokeLineRef}>
				{props.line.dynamicLyric.map((word, index) => {
					return <span
						key={index}
						className={`rnp-karaoke-word ${isCJK(word.word) ? 'is-cjk' : ''} ${word.word.endsWith(' ') ? 'end-with-space' : ''}`}
						style={karaokeAnimation(word)}>
							{word.word}
					</span>
				})}
			</div> }
			{ !(props.line.dynamicLyric && props.useKaraokeLyrics) && props.line.originalLyric && <div className="rnp-lyrics-line-original">
				{ props.line.originalLyric }
			</div> }
			{ props.line.romanLyric && props.showRomaji && <div className="rnp-lyrics-line-romaji">
				{ props.line.romanLyric }
			</div> }
			{ props.line.translatedLyric && props.showTranslation && <div className="rnp-lyrics-line-translated">
				{ props.line.translatedLyric }
			</div> }
			{ props.line.isInterlude && <Interlude /> }
		</div>
	)

}

function Interlude() {
	return (
		<div className="rnp-interlude-inner">
			interlude
		</div>
	)
}

function Scrollbar(props) {
	const scrollbarRef = useRef(null);
	const thumbRef = useRef(null);

	const currentLine = props.scrollingMode ? props.scrollingFocusLine : props.currentLine;
	const totalSteps = props.nonInterludeToAll.length;
	const thumbHeight = Math.max(props.containerHeight / totalSteps, 30);
	const heightOfTrack = props.containerHeight - thumbHeight;
	const perStep = heightOfTrack / (totalSteps - 1);
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
			console.log(cloest);
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
		<div className="rnp-lyrics-scrollbar" ref={scrollbarRef}>
			<div 
				className="rnp-lyrics-scrollbar-thumb"
				ref={thumbRef}
				style={{
					height: thumbHeight,
					top: `${current * perStep}px`,
				}}/>
			{/*<div>{ props.allToNonInterlude[currentLine] }</div>*/}
		</div>
	)
}