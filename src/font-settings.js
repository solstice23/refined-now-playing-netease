import * as React from 'react';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { getSetting, setSetting } from "./utils";

const darkTheme = createTheme({
	palette: {
		mode: 'dark',
	},
});

import './font-settings.scss';

const useEffect = React.useEffect;
const useState = React.useState;

export function FontSettings(props) {
	const [fontList, setFontList] = useState([]);
	const [fontFamily, setFontFamily] = useState(JSON.parse(getSetting('font-family', '[]')));
	
	useEffect(() => {
		async function getFontList() {
			setFontList((await legacyNativeCmder.call("os.querySystemFonts"))[1] ?? []);
		};
		getFontList();
	}, []);

	useEffect(() => {
		let style = document.querySelector('#rnp-font-family-controller');
		if (!style) {
			style = document.createElement('style');
			style.id = 'rnp-font-family-controller';
			document.head.appendChild(style);
		}
		style.innerHTML = `
			body.rnp-custom-font .g-single-track .lyric *,
			body.rnp-custom-font .n-single .head *,
			body.rnp-custom-font .m-fm > *:not(.fmcmt) * {
				font-family: ${fontFamily.length ? fontFamily.map(font => `'${font}'`).join(', ') : 'inherit'} !important;
			}
		`;
		setSetting('font-family', JSON.stringify(fontFamily));
	}, [fontFamily]);

	return (
		<>
			<ThemeProvider theme={darkTheme}>
				<Autocomplete
					multiple
					value={fontFamily}
					onChange={(event, newValue) => {
						setFontFamily(newValue);
					}}
					options={fontList}
					getOptionLabel={(option) => option}
					defaultValue={[]}
					fullWidth
					freeSolo
					forcePopupIcon={false}
					renderInput={(params) => (
						<TextField
							{...params}
							variant="outlined"
							label="选择字体"
							placeholder=""
						/>
					)}
				/>
			</ThemeProvider>
			<span className="rnp-checkbox-note">某些字体可能不在列表中，需要手动输入</span>
			<span className="rnp-checkbox-note">如果顺序在前的字体缺少某些字符，则会使用顺序在后的字体，依次顺延</span>
			<label className="rnp-checkbox-label">字体预设</label>
			<FontPreset fonts={['MiSans Medium', 'MiSans']} name="MISans" url="https://cdn.cnbj1.fds.api.mi-img.com/vipmlmodel/font/MiSans/MiSans.zip" setFontFamily={setFontFamily} fontList={fontList}/>
			<FontPreset fonts={['Source Han Sans SC VF', 'Source Han Sans CN', 'Noto Sans', '思源黑体', 'Source Han Sans VF', 'Source Han Sans']} name="思源黑体" url="https://github.com/adobe-fonts/source-han-sans/raw/release/Variable/OTF/SourceHanSansSC-VF.otf" setFontFamily={setFontFamily} fontList={fontList}/>
			<FontPreset fonts={['Source Han Serif SC VF', 'Source Han Serif CN', 'Noto Serif', '思源宋体', 'Source Han Serif VF', 'Source Han Serif']} name="思源宋体" url="https://github.com/adobe-fonts/source-han-serif/raw/release/Variable/OTF/SourceHanSerifSC-VF.otf" setFontFamily={setFontFamily} fontList={fontList}/>
			<FontPreset fonts={['PingFang SC', '苹方 常规'] } name="苹方" url="https://github.com/ShmilyHTT/PingFang/archive/refs/heads/master.zip" setFontFamily={setFontFamily} fontList={fontList}/>
			<FontPreset fonts={['Microsoft YaHei UI', 'Microsoft YaHei']} name="微软雅黑" url="" setFontFamily={setFontFamily} fontList={fontList}/>
			<FontPreset fonts={['Microsoft JhengHei UI', 'Microsoft JhengHei']} name="微软正黑" url="" setFontFamily={setFontFamily} fontList={fontList}/>
		</>
	  );
}
function FontPreset(props) {
	const hasFont = props.fonts.some(font => props.fontList.includes(font));

	return (
		<div className="rnp-font-preset">
			<label className="rnp-font-preset-label">{props.name}</label>
			{
				hasFont && (
					<button className="rnp-font-preset-button" onClick={() => props.setFontFamily(props.fonts)}>应用</button>
				)
			}
			{
				!hasFont && (
					<button className="rnp-download-font-button" onClick={async() => {
						await betterncm.app.exec(props.url);
					}}>
						<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 96 960 960" width="20"><path d="M259.717 895q-40.442 0-69.08-28.787Q162 837.425 162 797v-74h98v74h440v-74h98v74q0 40.425-28.799 69.213Q740.401 895 699.96 895H259.717ZM481 727 249 495l70-68 113 113V203h98v337l113-113 70 68-232 232Z"/></svg>
					</button>
				)
			}
		</div>
	)
}