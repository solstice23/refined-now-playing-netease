// Trigger lyrics-updated event when lyrics are updated
// Also provide a global variable `currentLyrics` for other scripts to use

import { parseLyric } from './liblyric/index.ts'
import { cyrb53 } from './utils.js'

const preProcessLyrics = (lyrics) => {
	if (!lyrics) return null;
	if (!lyrics.lrc) lyrics.lrc = {};

	const original = (lyrics?.lrc?.lyric ?? '').replace(/\u3000/g, ' ');
	const translation = lyrics?.ytlrc?.lyric ?? lyrics?.ttlrc?.lyric ?? lyrics?.tlyric?.lyric ?? '';
	const roma = lyrics?.yromalrc?.lyric ?? lyrics?.romalrc?.lyric ?? '';
	const dynamic = lyrics?.yrc?.lyric ?? '';
	const approxLines = original.match(/\[(.*?)\]/g)?.length ?? 0;

	const parsed = parseLyric(
		original,
		translation,
		roma,
		dynamic
	);
	if (approxLines - parsed.length > approxLines * 0.7) { // 某些特殊情况（逐字歌词残缺不全）
		return parseLyric(
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

let currentRawLRC = null;

const _onProcessLyrics = window.onProcessLyrics ?? ((x) => x);
window.onProcessLyrics = (_rawLyrics) => {
	if (!_rawLyrics) return _onProcessLyrics(_rawLyrics);

	let rawLyrics = _rawLyrics;
	if (typeof(_rawLyrics) === 'string') { // local lyrics
		rawLyrics = {
			lrc: {
				lyric: _rawLyrics,
			},
			source: {
				name: '本地',
			}
		}
	}

	if ((rawLyrics?.lrc?.lyric ?? '') != currentRawLRC) {
		console.log('update raw lyrics', rawLyrics);
		currentRawLRC = (rawLyrics?.lrc?.lyric ?? '') ;
		const preprocessedLyrics = preProcessLyrics(rawLyrics);
		setTimeout(async () => {
			const processedLyrics = await processLyrics(preprocessedLyrics);
			const lyrics = {
				lyrics: processedLyrics,
				contributors: {}
			}
			if (rawLyrics?.lyricUser) {
				lyrics.contributors.original = {
					name: rawLyrics.lyricUser.nickname,
					userid: rawLyrics.lyricUser.userid,
				}
			}
			if (rawLyrics?.transUser) {
				lyrics.contributors.translation = {
					name: rawLyrics.transUser.nickname,
					userid: rawLyrics.transUser.userid,
				}
			}
			if (rawLyrics?.source) {
				lyrics.contributors.lyricSource = rawLyrics.source;
			}
			lyrics.hash = `${betterncm.ncm.getPlaying().id}-${cyrb53(processedLyrics.map((x) => x.originalLyric).join('\\'))}`;
			window.currentLyrics = lyrics;
			console.log('update processed lyrics', window.currentLyrics.lyrics);
			console.log('contributors', window.currentLyrics.contributors);
			console.log(window.currentLyrics);
			document.dispatchEvent(new CustomEvent('lyrics-updated', {detail: window.currentLyrics}));
		}, 0);
	}
	return _onProcessLyrics(_rawLyrics);
}