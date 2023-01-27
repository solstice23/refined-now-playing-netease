import './lyrics.scss';

import _isEqual from 'lodash/isEqual';

const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;


let currentRawLyrics = null, currentLyrics = null;

const _onProcessLyrics = window.onProcessLyrics ?? ((x) => x);
window.onProcessLyrics = (lyrics) => {
	if (!lyrics) return _onProcessLyrics(lyrics);
	console.log('update original lyrics', lyrics);
	const processedLyrics = preProcessLyrics(lyrics);
	//if (!_isEqual(processedLyrics, currentRawLyrics)) {
		currentRawLyrics = processedLyrics;
		console.log('update raw lyrics', currentRawLyrics);
		setTimeout(async () => {
			currentLyrics = await processLyrics(processedLyrics);
			console.log('update lyrics', currentLyrics);
			document.dispatchEvent(new CustomEvent('lyrics-updated', {detail: currentLyrics}));
		}, 0);
	//}
	return _onProcessLyrics(lyrics);
}


const preProcessLyrics = (lyrics) => {
	if (!lyrics) return null;
	if (!lyrics.lrc) return null;
	
	return loadedPlugins.liblyric.parseLyric(
		lyrics?.yrc?.lyric ?? lyrics?.lrc?.lyric ?? '',
		lyrics?.ytlrc?.lyric ?? lyrics?.ttlrc?.lyric ?? lyrics?.tlyric?.lyric ?? '',
		lyrics?.yromalrc?.lyric ?? lyrics?.romalrc?.lyric ?? '',
		lyrics?.yrc?.lyric ?? ''
	);
}

const processLyrics = (lyrics) => {
	for (const line of lyrics) {
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
	}
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

	const [playState, setPlayState] = useState(null);
	const [songId, setSongId] = useState("0");
	const currentTime = useRef(0), lastTime = useRef(0);
	const [currentLine, setCurrentLine] = useState(0);
	const [globalOffset, setGlobalOffset] = useState(0);

	const heightOfItems = useRef([]);

	const [containerHeight, setContainerHeight] = useState(0);
	const [containerWidth, setContainerWidth] = useState(0);

	const [fontSize, setFontSize] = useState(36);

	const [lineTransforms, setLineTransforms] = useState([]);

	const onLyricsUpdated = (e) => {
		setLyrics(e.detail);
	}

	useEffect(() => {
		setLyrics(currentLyrics);
		document.addEventListener('lyrics-updated', onLyricsUpdated);
		return () => {
			document.removeEventListener('lyrics-updated', onLyricsUpdated);
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
		console.log('heightOfItems', heightOfItems.current);
	}, [lyrics, containerWidth, fontSize]);
	
	const onResize = () => {
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


	const previousFocusedLineRef = useRef(0);
	useEffect(() => { // Recalculate vertical positions and transforms of each line
		if (!lyrics?.length) return;

		const space = 30;
		const scaleByOffset = (offset) => {
			return 1;
			offset =  1 - offset * 0.1
			return Math.max(0.5, offset * offset * offset * offset * offset);
		};
		const delayByOffset = (offset) => {
			let sign = currentLine - previousFocusedLineRef.current > 0 ? 1 : -1;
			console.log(currentLine, previousFocusedLineRef.current);
			if (currentLine == previousFocusedLineRef.current) {
				return 0;
			}
			offset = Math.max(-4, Math.min(4, offset)) * sign + 4;
			return offset * 50;
		};

		console.log(currentLine, previousFocusedLineRef.current, currentLine - previousFocusedLineRef.current > 0 ? 1 : -1);

		const transforms = [];
		for (let i = 0; i < lyrics.length; i++) transforms.push({ top: 0, scale: 1, delay: 0 });
		console.log('containerHeight', containerHeight);
		let current = Math.max(currentLine ?? 0, 0);
		console.log(currentLine, current);
		transforms[current].top = containerHeight / 2 - heightOfItems.current[current] / 2;
		transforms[current].scale = 1;
		transforms[current].delay = delayByOffset(0);
		for (let i = current - 1; i >= 0; i--) {
			transforms[i].scale = scaleByOffset(current - i);
			const scaledHeight = heightOfItems.current[i] * transforms[i].scale;
			transforms[i].top = transforms[i + 1].top - scaledHeight - space;
			transforms[i].delay = delayByOffset(i - current);
		}
		for (let i = current + 1; i < lyrics.length; i++) {
			transforms[i].scale = scaleByOffset(i - current);
			const previousScaledHeight = heightOfItems.current[i - 1] * transforms[i - 1].scale;
			transforms[i].top = transforms[i - 1].top + previousScaledHeight + space;
			transforms[i].delay = delayByOffset(i - current);
		}
		setLineTransforms(transforms);
		console.log('transforms', transforms);
		previousFocusedLineRef.current = currentLine;
	}, [currentLine, containerHeight, containerWidth, fontSize, lyrics]);


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
		setCurrentLine(cur);
	};
	useEffect(() => {
		onPlayProgress(songId, currentTime.current);
	}, [lyrics, globalOffset]);


	useEffect(() => {
		legacyNativeCmder.appendRegisterCall("PlayState", "audioplayer", onPlayStateChange);
		legacyNativeCmder.appendRegisterCall("PlayProgress", "audioplayer", onPlayProgress);
		return () => {
			legacyNativeCmder.removeRegisterCall("PlayState", "audioplayer", onPlayStateChange);
			legacyNativeCmder.removeRegisterCall("PlayProgress", "audioplayer", onPlayProgress);
		}
	}, []);

	return (
		<div className="rnp-lyrics" ref={containerRef}>
			{lyrics && lyrics.map((line, index) => {
				return <Line
					key={index}
					id={index}
					line={line}
					currentLine={currentLine}
					currentTime={currentTime.current}
					playState={playState}
					fontSize={fontSize}
					transforms={lineTransforms[index] ?? { top: 0, scale: 1, delay: 0 }}
				/>
			})}
		</div>
	);
}

function Line(props) {
	if (props.originalLyric == '') {
		props.originalLyric = 'interlude';
	}
	const offset = props.id - props.currentLine;
	return (
		<div
			className="rnp-lyrics-line"
			offset={offset}
			style={{
				fontSize: props.fontSize,
				transform: `
					translateY(${props.transforms.top}px)
					scale(${props.transforms.scale})
				`,
				transitionDelay: `${props.transforms.delay}ms`,
			}}>
			<div className="rnp-lyrics-line-original">
				{props.line.dynamicLyric.map((word, index) => {
					return <span
						key={index}
						className="rnp-lyrics-word">
							{word.word}
					</span>
				})}
			</div>
			{ props.line.translatedLyric && <div className="rnp-lyrics-line-translated">
				{ props.line.translatedLyric }
			</div> }
			{ props.line.romanLyric && false && <div className="rnp-lyrics-line-roman">
				{ props.line.romanLyric }
			</div> }
		</div>
	)

}

function Interlude() {
	return (
		// TODO
		<div>interlude</div>
	)
}
