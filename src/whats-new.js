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
					changeLog
						.filter(version => compareVersions(version.version, props.lastVersion) > 0)
						.sort((a, b) => compareVersions(b.version, a.version))
						.map((version) => (
						<div class="rnp-whats-new-version">
							<h3>{version.version}</h3>
							<ul>
								{
									version.changes.map((change) => (
										<li class={`${change[2] ? 'major' : ''}`}>
											{
												(() => {
													switch (change[0]) {
														case 'add':
															return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z"/></svg>
														case 'fix':
															return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>
														case 'remove':
															return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"/></svg>
														case 'revert':
															return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M205 34.8c11.5 5.1 19 16.6 19 29.2v64H336c97.2 0 176 78.8 176 176c0 113.3-81.5 163.9-100.2 174.1c-2.5 1.4-5.3 1.9-8.1 1.9c-10.9 0-19.7-8.9-19.7-19.7c0-7.5 4.3-14.4 9.8-19.5c9.4-8.8 22.2-26.4 22.2-56.7c0-53-43-96-96-96H224v64c0 12.6-7.4 24.1-19 29.2s-25 3-34.4-5.4l-160-144C3.9 225.7 0 217.1 0 208s3.9-17.7 10.6-23.8l160-144c9.4-8.5 22.9-10.6 34.4-5.4z"/></svg>;
													}
												})()
											}
											{change[1]}
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
	if (changeLog.filter(version => compareVersions(version.version, lastVersion) > 0).length === 0) return;
	const whatsNew = document.createElement("div");
	whatsNew.id = "refined-now-playing-whats-new";
	document.body.appendChild(whatsNew);
	ReactDOM.render(<WhatsNew lastVersion={lastVersion}/>, whatsNew);
}