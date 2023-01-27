import './background.scss';
import { getGradientFromPalette } from './color-utils';
import ColorThief from 'colorthief';

const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

const colorThief = new ColorThief();

export function Background(props) {
	const [type, setType] = useState(props.type ?? 'blur'); // blur, gradient, fluid , solid
	const [url, setUrl] = useState('');
	const image = props.image;

	
	useEffect(() => {
		const observer = new MutationObserver(() => {
			if (image.src === url) return;
			if (image.complete) {
				setUrl(image.src);
			}
		});
		observer.observe(image, { attributes: true, attributeFilter: ['src'] });
		const onload = () => {
			setUrl(image.src);
		};
		image.addEventListener('load', onload);
		return () => {
			observer.disconnect();
			image.removeEventListener('load', onload);
		}
	}, [image]);

	useEffect(() => {
		document.addEventListener('rnp-background-type', (e) => {
			setType(e.detail.type ?? 'blur');
		});
	}, []);
	
	return (
		<>
			{type === 'blur' && (
				<BlurBackground url={url} />
			)}
			{type === 'gradient' && (
				<GradientBackground url={url} />
			)}
			{type === 'fluid' && (
				<FluidBackground url={url} />
			)}
		</>
	);
}
function BlurBackground(props) {
	const ref = useRef();
	useEffect(() => {
		if (!props.url) return;
		ref.current.style.backgroundImage = `url(${props.url})`;
		ref.current.style.transition = 'background-image 1.5s ease';
	}, [props.url]);

	return (
		<div ref={ref} className="rnp-background-blur"/>
	);
}

function GradientBackground(props) {
	const [gradient, setGradient] = useState('linear-gradient(-45deg, #666, #fff)');
	useEffect(() => {
		const image = new Image();
		image.crossOrigin = 'Anonymous';
		console.log('loading image');
		image.onload = () => {
			console.log('image loaded');
			const palette = colorThief.getPalette(image);
			setGradient(getGradientFromPalette(palette));
		};
		image.src = props.url;
	}, [props.url]);

	return (
		<div className="rnp-background-gradient" style={{ backgroundImage: gradient }} />
	);
}

function FluidBackground(props) {
	const [canvas1, canvas2, canvas3, canvas4] = [useRef(), useRef(), useRef(), useRef()];
	const [feTurbulence, feDisplacementMap] = [useRef(), useRef()];
	const [songId, setSongId] = useState("0");

	const playState = useRef(document.querySelector("#main-player .btnp").classList.contains("btnp-pause"));

	const onPlayStateChange = (id, state) => {
		//playState.current = (state.split('|')[1] == 'resume');
		playState.current = document.querySelector("#main-player .btnp").classList.contains("btnp-pause");
		setSongId(id);
		//console.log(id, playState.current, state.split('|')[1], document.querySelector("#main-player .btnp").classList.contains("btnp-pause"));
	};

	useEffect(() => {
		legacyNativeCmder.appendRegisterCall(
			"PlayState",
			"audioplayer",
			onPlayStateChange
		);
		return () => {
			legacyNativeCmder.removeRegisterCall(	
				"PlayState",
				"audioplayer",
				onPlayStateChange
			);
		}
	}, []);

	useEffect(() => {
		canvas1.current.getContext('2d').filter = 'blur(5px)';
		canvas2.current.getContext('2d').filter = 'blur(5px)';
		canvas3.current.getContext('2d').filter = 'blur(5px)';
		canvas4.current.getContext('2d').filter = 'blur(5px)';
	}, []);

	useEffect(() => {
		const image = new Image();
		image.crossOrigin = 'Anonymous';
		image.onload = () => {
			const { width, height } = image;
			canvas1.current.getContext('2d').drawImage(image, 0, 0, width / 2, height / 2, 0, 0, 100, 100);
			canvas2.current.getContext('2d').drawImage(image, width / 2, 0, width / 2, height / 2, 0, 0, 100, 100);
			canvas3.current.getContext('2d').drawImage(image, 0, height / 2, width / 2, height / 2, 0, 0, 100, 100);
			canvas4.current.getContext('2d').drawImage(image, width / 2, height / 2, width / 2, height / 2, 0, 0, 100, 100);
		};
		image.src = props.url;
		feTurbulence.current.setAttribute('seed', parseInt(Math.random() * 1000));
	}, [props.url]);

	const onResize = () => {
		const { width, height } = document.body.getBoundingClientRect();
		const viewSize = Math.max(width, height);
		const canvasSize = viewSize * 0.707;

		const canvasList = [canvas1, canvas2, canvas3, canvas4];
		for (let x = 0; x <= 1; x++) {
			for (let y = 0; y <= 1; y++) {
				const canvas = canvasList[y * 2 + x];
				canvas.current.style.width = `${canvasSize}px`;
				canvas.current.style.height = `${canvasSize}px`;
				const signX = x === 0 ? -1 : 1, signY = y === 0 ? -1 : 1;
				canvas.current.style.left = `${(width / 2 + signX * canvasSize * 0.35) - canvasSize / 2}px`;
				canvas.current.style.top = `${(height / 2 + signY * canvasSize * 0.35) - canvasSize / 2}px`;
			}
		}
	}

	useEffect(() => {
		window.addEventListener('resize', onResize);
		onResize();
		return () => {
			window.removeEventListener('resize', onResize);
		}
	}, []);


	// Audio-responsive background (For LibVolumeLevelProvider)
	if (loadedPlugins.LibFrontendPlay) {
		const processor = useRef({});
		useEffect(() => {
			processor.current.audioContext = new AudioContext();
			processor.current.audioSource = null;
			processor.current.analyser = processor.current.audioContext.createAnalyser();
			//processor.current.analyser.connect(processor.current.audioContext.destination);
			processor.current.analyser.fftSize = 512;
			processor.current.filter = processor.current.audioContext.createBiquadFilter();
			processor.current.filter.type = 'lowpass';
			processor.current.bufferLength = processor.current.analyser.frequencyBinCount;
			processor.current.dataArray = new Float32Array(processor.current.bufferLength);
		}, []);

		const onAudioSourceChange = (e) => {
			processor.current.audio = e.detail;
			console.log('audio source changed', processor.current.audio);
			if (!processor.current.audio) return;
			if (processor.current.audioSource) processor.current.audioSource.disconnect();
			processor.current.audioSource = processor.current.audioContext.createMediaElementSource(processor.current.audio);
			processor.current.audioSource.connect(processor.current.filter).connect(processor.current.analyser);
			processor.current.audioSource.connect(processor.current.audioContext.destination);
		};
			
		useEffect(() => {
			loadedPlugins.LibFrontendPlay.addEventListener(
				"updateCurrentAudioPlayer",
				onAudioSourceChange
			);
			return () => {
				loadedPlugins.LibFrontendPlay.removeEventListener(
					"updateCurrentAudioPlayer",
					onAudioSourceChange
				);
			}
		}, []);

		const request = useRef(0);
		useEffect(() => {
			const animate = () => {
				request.current = requestAnimationFrame(animate);
				if (!playState.current) return;
				processor.current.analyser.getFloatFrequencyData(processor.current.dataArray);
				const max = Math.max(...processor.current.dataArray);
				//const percentage = (max - processor.current.analyser.minDecibels) / (processor.current.analyser.maxDecibels - processor.current.analyser.minDecibels);
				const percentage = Math.pow(1.3, max / 20) * 2 - 1;
				//console.log(max, percentage, processor.current.audio.volume);
				feDisplacementMap.current.setAttribute('scale', Math.min(600, Math.max(200, 800 - percentage * 800)));
			};
			request.current = requestAnimationFrame(animate);
			return () => {
				cancelAnimationFrame(request.current);
			}
		}, []);
	}
	// Audio-responsive background (For LibVolumeLevelProvider)
	else if (typeof(registerAudioLevelCallback) == "function") {
		let audioLevels = {}, audioLevelSum = 0, now = 0;
		let maxq = [], minq = [];
		let percentage;
		const onAudioLevelChange = (value) => {
			if (!playState.current) return;
			now += 1;
			if (now <= 100) {
				audioLevels[now] = value;
				audioLevelSum += value;
				while (maxq.length && audioLevels[maxq[maxq.length - 1]] <= value) maxq.pop();
				maxq.push(now);
				while (minq.length && audioLevels[minq[minq.length - 1]] >= value) minq.pop();
				minq.push(now);
				feDisplacementMap.current.setAttribute('scale', 400 - value * 200);
				return;
			}
			audioLevelSum -= audioLevels[now - 100];
			delete audioLevels[now - 100];
			audioLevels[now] = value;
			audioLevelSum += value;
			while (maxq.length && audioLevels[maxq[maxq.length - 1]] <= value) maxq.pop();
			maxq.push(now);
			while (maxq[0] <= now - 100) maxq.shift();
			while (minq.length && audioLevels[minq[minq.length - 1]] >= value) minq.pop();
			minq.push(now);
			while (minq[0] <= now - 100) minq.shift();
			//console.log(audioLevels[maxq[0]], audioLevels[minq[0]], audioLevels[maxq[0]] - audioLevels[minq[0]]);
			//console.log(value, audioLevelSum / 100, value - audioLevelSum / 100);
			percentage = (value - audioLevels[minq[0]]) / (audioLevels[maxq[0]] - audioLevels[minq[0]]);
			function easeInOutQuint(x) {
				return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
			}
			//console.log('percentage', percentage, easeInOutQuint(percentage));
			percentage = easeInOutQuint(percentage);
			const scale = 500 - (percentage) * 300;
			//feDisplacementMap.current.setAttribute('scale', scale);
			const oldScale = parseFloat(feDisplacementMap.current.getAttribute('scale'));
			feDisplacementMap.current.setAttribute('scale', oldScale + (scale - oldScale) * 0.1);
		}
		useEffect(() => {
			registerAudioLevelCallback(onAudioLevelChange);
			return () => {
				unregisterAudioLevelCallback(onAudioLevelChange);
				feDisplacementMap.current.setAttribute('scale', 400);
			}
		}, []);
		useEffect(() => {
			audioLevels = [];
			audioLevelSum = 0;
		}, [songId]);
	}


	return (
		<>
			<svg width="0" height="0" style={{ position: 'absolute' }}>
				<filter id="fluid-filter" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
					<feTurbulence ref={feTurbulence} type="fractalNoise" baseFrequency="0.005" numOctaves="1" seed="0"></feTurbulence> 
					<feDisplacementMap ref={feDisplacementMap} in="SourceGraphic" scale="400"></feDisplacementMap>
					{/*<feGaussianBlur stdDeviation="80 60" x="0%" y="0%" width="100%" height="100%" in="" edgeMode="duplicate" result="blur"></feGaussianBlur>*/}
				</filter>
			</svg>
			<div className="rnp-background-fluid" style={{ backgroundImage: `url(${props.url})` }}>
				<div className="rnp-background-fluid-rect">
					<canvas ref={canvas1} className="rnp-background-fluid-canvas" canvasID="1" width="100" height="100"/>
					<canvas ref={canvas2} className="rnp-background-fluid-canvas" canvasID="2" width="100" height="100"/>
					<canvas ref={canvas3} className="rnp-background-fluid-canvas" canvasID="3" width="100" height="100"/>
					<canvas ref={canvas4} className="rnp-background-fluid-canvas" canvasID="4" width="100" height="100"/>
				</div>
			</div>
		</>
	);
}