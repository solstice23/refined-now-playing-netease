import './progressbar-preview.scss';
import { getSetting } from './utils.js';

const isFMSession = () => {
	return !document.querySelector(".m-player-fm").classList.contains("f-dn");
}

if (getSetting('enable-progressbar-preview', true)) {
	document.body.classList.add('enable-progressbar-preview');
}


const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;


function useRefState(initialValue) {
	const [value, setValue] = useState(initialValue);
	const valueRef = useRef(value);

	const updateValue = (val) => {
		valueRef.current = val;
		setValue(val);
	};

	return [valueRef, value, updateValue];
}

let totalLengthInit = 0;
legacyNativeCmder.appendRegisterCall('Load', 'audioplayer',  (_, info) => {
	totalLengthInit = info.duration * 1000;
});

function formatTime(time) {
	const h = Math.floor(time / 3600);
	const m = Math.floor((time - h * 3600) / 60);
	const s = Math.floor(time - h * 3600 - m * 60);
	return `${h ? `${h}:` : ''}${m < 10 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
}

export function ProgressbarPreview(props) {
	const isCurrentModeSession = () => { // 判断是否在当前模式播放 (普通/FM)
		return props.isFM ? isFMSession() : !isFMSession();
	}

	const [visible, setVisible] = useState(false);

	const xRef = useRef(0), yRef = useRef(0);

	const progressBarRef = useRef(null);
	useEffect(() => {
		progressBarRef.current = props.dom;
	}, []);

	const [_lyrics, lyrics, setLyrics] = useRefState(null);
	const [nonInterludeCount, setNonInterludeCount] = useState(0);

	const hoverPercentRef = useRef(0);
	const [currentLine, setCurrentLine] = useState(0);
	const [currentNonInterludeIndex, setCurrentNonInterludeIndex] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);

	const [_totalLength, totalLength, setTotalLength] = useRefState(totalLengthInit);

	const containerRef = useRef(null);

	const subprogressbarInnerRef = useRef(null);

	const onLyricsUpdate = (e) => {
		if (!isCurrentModeSession()) {
			return;
		}
		if (!e.detail) {
			return;
		}
		setLyrics(e.detail.lyrics);
		setNonInterludeCount(e.detail.lyrics.filter(l => l.originalLyric).length);
	}
	useEffect(() => {
		if (window.currentLyrics) {
			if (!isCurrentModeSession()) {
				return;
			}
			const currentLyrics = window.currentLyrics.lyrics;
			setLyrics(currentLyrics);
			setNonInterludeCount(currentLyrics.filter(l => l.originalLyric).length);
		}
		document.addEventListener('lyrics-updated', onLyricsUpdate);
		return () => {
			document.removeEventListener('lyrics-updated', onLyricsUpdate);
		}
	}, []);


	const onLoad = (_, info) => {
		setTotalLength(info.duration * 1000);
	}
	useEffect(() => {
		legacyNativeCmder.appendRegisterCall('Load', 'audioplayer', onLoad);
		return () => {
			legacyNativeCmder.removeRegisterCall('Load', 'audioplayer', onLoad);
		}
	}, []);

	const updateHoverPercent = () => {
		if (!progressBarRef.current) {
			return;
		}
		const rect = progressBarRef.current.getBoundingClientRect();
		const percent = (xRef.current - rect.left) / rect.width;
		hoverPercentRef.current = percent;
		const currentTime = _totalLength.current * percent;
		setCurrentTime(currentTime);
		if (_lyrics.current) {
			let cur = 0;
			let nonInterludeIndex = 0;
			for (let i = 0; i < _lyrics.current.length; i++) {
				if (_lyrics.current[i].time <= currentTime) {
					cur = i;
					if (_lyrics.current[i].originalLyric) {
						nonInterludeIndex++;
					}
				} else {
					break;
				}
			}
			if (
				cur == _lyrics.current.length - 1 &&
				_lyrics.current[cur].duration &&
				currentTime > _lyrics.current[cur].time + _lyrics.current[cur].duration + 500
			) {
				cur = _lyrics.current.length;
			}
			setCurrentLine(cur);
			setCurrentNonInterludeIndex(Math.max(nonInterludeIndex, 1));
			if (subprogressbarInnerRef.current) {
				let duration =  _lyrics.current[cur]?.duration;
				if (duration == 0) {
					duration = _totalLength.current - _lyrics.current[cur].time;
				}
				subprogressbarInnerRef.current.style.width = (currentTime - _lyrics.current[cur].time) / duration * 100 + '%';
			}
		}
	};
	const updatePosition = () => {
		if (!containerRef.current) {
			return;
		}
		const width = containerRef.current.clientWidth;
		const height = containerRef.current.clientHeight;
		const rect = progressBarRef.current.getBoundingClientRect();
		let left = xRef.current - width / 2;
		if (left < 0) {
			left = 0;
		}
		if (left + width > window.innerWidth) {
			left = window.innerWidth - width;
		}
		containerRef.current.style.left = left + 'px';
		containerRef.current.style.top = (rect.top - height - 5) + 'px';
	};
	useEffect(() => {
		updatePosition();
	}, [visible, currentLine]);
	

	const onMouseEnter = (e) => {
		setVisible(true);
		xRef.current = e.clientX;
		yRef.current = e.clientY;
		updateHoverPercent();
		updatePosition();
	};
	const onMouseLeave = (e) => {
		setVisible(false);
	};
	const onMouseMove = (e) => {
		xRef.current = e.clientX;
		yRef.current = e.clientY;
		updateHoverPercent();
		updatePosition();
	};
	useEffect(() => {
		if (!progressBarRef.current) {
			return;
		}
		progressBarRef.current.addEventListener('mouseenter', onMouseEnter);
		progressBarRef.current.addEventListener('mouseleave', onMouseLeave);
		progressBarRef.current.addEventListener('mousemove', onMouseMove);
		return () => {
			progressBarRef.current.removeEventListener('mouseenter', onMouseEnter);
			progressBarRef.current.removeEventListener('mouseleave', onMouseLeave);
			progressBarRef.current.removeEventListener('mousemove', onMouseMove);
		}
	}, [progressBarRef.current]);

	
	const isPureMusic = lyrics && (
		lyrics.length === 1 ||
		lyrics.length <= 10 && lyrics.some((x) => (x.originalLyric ?? '').includes('纯音乐')) ||
		document.querySelector('#main-player').getAttribute('data-log')?.includes('"s_ctype":"voice"') ||
		lyrics[0]?.unsynced
	);

	return (
		<div
			ref={containerRef}
			className={`progressbar-preview ${(visible && !isPureMusic) ? '' : 'invisible'}`}
		>
			{
				lyrics && lyrics[currentLine]?.originalLyric && (
					<div className="progressbar-preview-number">{currentNonInterludeIndex} / {nonInterludeCount}</div>
				)
			}
			{
				lyrics && lyrics[currentLine]?.dynamicLyric && (
					<div className="progressbar-preview-line-karaoke">
						{
							lyrics[currentLine].dynamicLyric.map((word, i) => {
								const percent = (currentTime - word.time) / word.duration;
								return (<span
									key={i}
									className={`progressbar-preview-line-karaoke-word ${percent >= 0 && percent <= 1 ? 'current' : ''} ${percent <0 ? 'upcoming' : ''}`}
									style={{
										'-webkit-mask-position': `${100 * (1 - Math.max(0, Math.min(1, (currentTime - word.time) / word.duration)))}%`,
									}}
								>
									{word.word}
								</span>);
							})
						}
					</div>
				)
			}
			{
				lyrics && !lyrics[currentLine]?.dynamicLyric && lyrics[currentLine]?.originalLyric && (
					<div className="progressbar-preview-line-original">{lyrics[currentLine]?.originalLyric}</div>
				)
			}
			{
				lyrics && lyrics[currentLine]?.originalLyric == '' && (
					<div className="progressbar-preview-line-original">♪</div>
				)
			}
			{
				lyrics && lyrics[currentLine]?.translatedLyric && (
					<div className="progressbar-preview-line-translated">{lyrics[currentLine]?.translatedLyric}</div>
				)
			}
			{
				lyrics && lyrics[currentLine] && (
					<div className="progressbar-preview-subprogressbar">
						<div className="progressbar-preview-subprogressbar-inner" ref={subprogressbarInnerRef}></div>
					</div>
				)
			}
			{
				lyrics && lyrics[currentLine] && (
					<div className="progressbar-preview-line-time">
						<div>{formatTime(lyrics[currentLine]?.time / 1000)}</div>
						<div>{lyrics[currentLine]?.duration > 0 ? formatTime((lyrics[currentLine]?.time + lyrics[currentLine]?.duration) / 1000) : formatTime(totalLength / 1000)}</div>
					</div>
				)
			}
		</div>
	);
}