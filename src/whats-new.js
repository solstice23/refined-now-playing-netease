import './whats-new.scss';
import changeLog from './whats-new.json';

import { compareVersions } from 'compare-versions';

const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;


function WhatsNew(props) {
	const modelRef = useRef(null);

	return (
		<div class="rnp-whats-new" ref={modelRef}>
			<div class="rnp-whats-new-title">
				<h2>What's New?</h2>
				<h3>Refined Now Playing</h3>
			</div>
			<div class="rnp-whats-new-content">
				{
					changeLog.filter(version => compareVersions(version.version, props.lastVersion) > 0).map((version) => (
						<div class="rnp-whats-new-version">
							<h3>{version.version}</h3>
							<ul>
								{
									version.changes.map((change) => (
										<li class={`${change.startsWith('*') ? 'major' : ''}`}>
											{change.startsWith('*') ? change.slice(1) : change}
										</li>
									))
								}
							</ul>
						</div>
					))
				}
			</div>
			<div class="rnp-whats-new-buttons">
				<button class="rnp-whats-new-button" onClick={() => {
					const mask = modelRef.current.parentElement;
					const model = modelRef.current;
					model.animate([
						{ opacity: 1, transform: 'translateY(0)' },
						{ opacity: 0, transform: 'translateY(50px)' }
					], {
						duration: 300,
						easing: 'ease'
					});
					mask.animate([
						{ opacity: 1 },
						{ opacity: 0 }
					], {
						duration: 300,
						easing: 'ease'
					}).onfinish = () => {
						mask.remove();
					};
				}}>关闭</button>
			</div>
		</div>
	)
}


export function whatsNew() {
	const lastVersion = localStorage.getItem("refined-now-playing-last-version") ?? "0.0.0";
	const currentVersion = loadedPlugins.RefinedNowPlaying.manifest.version;
	if (compareVersions(lastVersion, currentVersion) >= 0) return;
	localStorage.setItem("refined-now-playing-last-version", currentVersion);
	const whatsNew = document.createElement("div");
	whatsNew.id = "refined-now-playing-whats-new";
	document.body.appendChild(whatsNew);
	ReactDOM.render(<WhatsNew lastVersion={lastVersion}/>, whatsNew);
}