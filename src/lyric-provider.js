// Trigger lyrics-updated event when lyrics are updated
// Also provide a global variable `currentLyrics` for other scripts to use

import { parseLyric } from './liblyric/index.ts'

let currentRawLRC = null;

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

const _onProcessLyrics = window.onProcessLyrics ?? ((x) => x);
window.onProcessLyrics = (lyrics) => {
	if (!lyrics) return _onProcessLyrics(lyrics);
	if ((lyrics?.lrc?.lyric ?? '') != currentRawLRC) {
		console.log('update raw lyrics', lyrics);
		currentRawLRC = (lyrics?.lrc?.lyric ?? '') ;
		const preprocessedLyrics = preProcessLyrics(lyrics);
		setTimeout(async () => {
			window.currentLyrics = await processLyrics(preprocessedLyrics);
			console.log('update processed lyrics', window.currentLyrics);
			document.dispatchEvent(new CustomEvent('lyrics-updated', {detail: window.currentLyrics}));
		}, 0);
	}
	return _onProcessLyrics(lyrics);
}