import './compatibility-check.scss';

const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;

function Wizard(props) {
	const [isBetterNCMOutdated, setIsBetterNCMOutdated] = useState(false);
	const [isGPUDisabled, setIsGPUDisabled] = useState(false);
	const [isHijackDisabled, setIsHijackDisabled] = useState(false);

	useEffect(async () => {
		try {
			if (
				typeof(betterncm_native) == "undefined" ||
				typeof(betterncm.app.writeConfig) == "undefined" ||
				typeof(betterncm.app.readConfig) == "undefined" ||
				typeof(betterncm_native.app.reloadIgnoreCache) == "undefined"
			) {
				setIsBetterNCMOutdated(true);
			}
		} catch (e) {
			setIsBetterNCMOutdated(true);
		}
	}, []);

	useEffect(async () => {
		if (typeof(betterncm.app.readConfig) == "undefined") return;
		try {
			if (
				await betterncm.app.readConfig("cc.microblock.betterncm.remove-disable-gpu") != "true" &&
				await new Promise((resolve, reject) => {
					channel.call(
						"app.getLocalConfig", 
						(GpuAccelerationEnabled) => {
							if (!~~GpuAccelerationEnabled) {
								resolve(true);
							} else {
								resolve(false);
							}
						}, 
						["setting", "hardware-acceleration"]
					);
				})

			) {
				setIsGPUDisabled(true);
			}
		} catch (e) {
		}
	}, []);

	useEffect(async () => {
		if (typeof(betterncm.app.readConfig) == "undefined") return;
		try {
			if (await betterncm.app.readConfig("cc.microblock.betterncm.cpp_side_inject_feature_disabled") == "true")
				setIsHijackDisabled(true);
		} catch (e) {
		}
	}, []);

	


	return (
		<div class="rnp-compatibility-check">
			<div class="rnp-compatibility-check__title">
				<h2>兼容性检查</h2>
				<h3>Refined Now Playing</h3>
			</div>
			<div class="rnp-compatibility-check__content">
				<p>欢迎使用 Refined Now Playing。</p>
				<p>在开始之前，请依照本提示检查和更正兼容性问题，否则可能会遇到渲染错误、性能降低、功能失效等问题。</p>
				<h1>BetterNCM 版本</h1>
				<p>请尽可能将 BetterNCM 更新到最新版本，BetterNCM 版本过低会导致 Refined Now Playing 插件无法运行。</p>
				<p>目前请使用 Nightly 测试版。在 BetterNCM Installer 中，勾选 “测试通道” 后，点击 “重装/更新” 以更新最新版。</p>
				{isBetterNCMOutdated && <p className="warning">检测到您的 BetterNCM 版本过旧，可能会导致 Refined Now Playing 无法正常工作。请更新 BetterNCM。</p>}
				{!isBetterNCMOutdated && <p className="pass">检测到您的 BetterNCM 版本没有过旧。但如果仍然出现问题，请尝试更新 BetterNCM。</p>}
				<Button text="下载 BetterNCM Installer" disabledAfterDone={false} onClick={async() => {
					await betterncm.app.exec("https://github.com/MicroCBer/BetterNCM-Installer/releases");
				}}/>
				<h1>GPU 加速</h1>
				<p>如果 GPU 加速被禁用，可能会导致：卡顿、模糊背景渲染错误、帧数低、CPU 占用高等问题。</p>
				{
					isGPUDisabled ? (
						<p className="warning">检测到您的 GPU 加速已被禁用，可能会导致 Refined Now Playing 无法正常工作。请启用 GPU 加速。</p>
					) : (
						<p className="pass">未检测到您的 GPU 加速被禁用。但如果仍旧出现以上问题，请尝试使用以下的按钮启用 GPU 加速。</p>
					)
				}
				<Button text="启用 GPU 加速" disabledAfterDone={true} onClick={async () => {
					await betterncm.app.writeConfig("cc.microblock.betterncm.remove-disable-gpu", "true");
					await betterncm_native.app.restart();
				}} clickedText="已启用 GPU 加速" />
				<h1>Hijack JS 注入</h1>
				<p>如果 Hijack JS 注入被禁用，会导致无法正常显示歌词。</p>
				{
					isHijackDisabled ? (
						<p className="warning">检测到您的 Hijack JS 注入已被禁用。请启用 Hijack JS 注入。</p>
					) : (
						<p className="pass">Hijack JS 注入未被禁用。但如果仍旧无法显示歌词，请点击以下 "清空 Hijack 缓存按钮"。</p>
					)
				}
				{
					<Button text="启用 Hijack JS 注入" disabledAfterDone={true} disabled={!isHijackDisabled} onClick={async () => {
						await betterncm.app.writeConfig("cc.microblock.betterncm.cpp_side_inject_feature_disabled", "false");
						setIsHijackDisabled(false);
					}} clickedText="已启用 Hijack JS 注入" />
				}
				{
					!isHijackDisabled && (
						<Button text="清空 Hijack 缓存" disabledAfterDone={true} onClick={async () => {
							betterncm_native.app.reloadIgnoreCache();
						}}/>
					)
				}
				<h1>性能</h1>
				{
					<>
						<p>Refined Now Playing 的某些效果依赖 GPU 渲染，如果设备 GPU 性能较差，会造成低帧率、高占用等问题。</p>
						<p>如果已完成上述步骤，<b>但仍然出现性能问题，请尝试在播放页面右上角菜单中，避免开启以下选项：</b></p>
						<ul>
							<li><b>流体背景</b></li>
							<li>歌词模糊</li>
							<li>文字阴影</li>
						</ul>
					</>
				}
				<h1>完成</h1>
				{
					isBetterNCMOutdated || isGPUDisabled || isHijackDisabled ? (
						<>
							<p className="warning">请先完成上述检查步骤，然后点击完成。</p>
							<p>您也可以选择跳过。如果出现问题需要修复，可以在插件设置中调出此页面。</p>
						</>
					) : (
						<>
							<p className="pass">🎉 您的 Refined Now Playing 已经可以正常工作了。</p>
							<p>点击下方按钮关闭本引导。如果需要，您可以随时可以在插件设置中调出此页面。</p>
						</>
					)
				}
				<button
					className="finish"
					onClick={() => {
						localStorage.setItem("refined-now-playing-wizard-done", "true");
						betterncm_native.app.reloadIgnoreCache();
					}}
					disabled={isBetterNCMOutdated || isGPUDisabled || isHijackDisabled}
				>
					完成并不再提示
				</button>
				{
					(isBetterNCMOutdated || isGPUDisabled || isHijackDisabled) && 
					<>
						<Button text="跳过" disabledAfterDone={true} onClick={() => {
							document.querySelector("#refined-now-playing-wizard").remove();
						}}/>
						<Button text="跳过并不再提示" disabledAfterDone={true} onClick={() => {
							localStorage.setItem("refined-now-playing-wizard-done", "true");
							document.querySelector("#refined-now-playing-wizard").remove();
						}}/>
					</>
				}
			</div>
		</div>
	)
}

function Button(props) {
	const [clicked, setClicked] = useState(false);
	const [disabled, setDisabled] = useState(false);
	return (
		<button
			class="action-button"
			disabled={disabled || props.disabled}
			onClick={async () => {
				if (disabled) return;
				setDisabled(true);
				props.onClick();
				setClicked(true);
				if (!(props.disabledAfterDone ?? true)) {
					setDisabled(false);
				}

			}}
		>
			{ clicked ? (props.clickedText ?? props.text) : props.text }
		</button>
	)
}

export function compatibilityWizard(force = false) {
	if (force) {
		localStorage.removeItem("refined-now-playing-wizard-done");
	}
	const wizardDone = localStorage.getItem("refined-now-playing-wizard-done");
	if (wizardDone) return;
	const wizard = document.createElement("div");
	wizard.id = "refined-now-playing-wizard";
	document.body.appendChild(wizard);
	ReactDOM.render(<Wizard />, wizard);
}