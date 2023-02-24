import { findLast } from "lodash";

export interface DynamicLyricWord {
	time: number;
	duration: number;
	flag: number;
	word: string;
}

export interface LyricLine {
	time: number;
	duration: number;
	originalLyric: string;
	translatedLyric?: string;
	romanLyric?: string;
	dynamicLyricTime?: number;
	dynamicLyric?: DynamicLyricWord[];
}

export interface LyricPureLine {
	time: number;
	lyric: string;
	originalLyric?: string;
	translatedLyric?: string;
	romanLyric?: string;
}


export const PURE_MUSIC_LYRIC_LINE = [
	{
		time: 0,
		duration: 5940000,
		originalLyric: "纯音乐，请欣赏",
	},
];

export const PURE_MUSIC_LYRIC_DATA = {
	sgc: false,
	sfy: false,
	qfy: false,
	needDesc: true,
	lrc: {
		version: 1,
		lyric: "[99:00.00]纯音乐，请欣赏\n",
	},
	code: 200,
	briefDesc: null,
};


const simularityCache: Record<string, number> = {};
function calcSimularity(a: string, b: string) {
	if (typeof(a) === "undefined") a = "";
	if (typeof(b) === "undefined") b = "";
	const key = `${a}::${b}`;
	if (simularityCache[key] !== undefined) {
		return simularityCache[key];
	}
	const m = a.length;
	const n = b.length;
	const d: number[][] = [];
	for (let i = 0; i <= m; i++) {
		d[i] = [];
		d[i][0] = i;
	}
	for (let j = 0; j <= n; j++) {
		d[0][j] = j;
	}
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				d[i][j] = d[i - 1][j - 1];
			} else {
				d[i][j] = Math.min(d[i - 1][j - 1] + 1, d[i][j - 1] + 1, d[i - 1][j] + 1);
			}
		}
	}
	return d[m][n];
}

export function parseLyric(
	original: string,
	translated: string = "",
	roman: string = "",
	dynamic: string = "",
): LyricLine[] {
	if (dynamic.trim().length === 0) {
		const result: LyricLine[] = parsePureLyric(original).map((v) => ({
			time: v.time,
			originalLyric: v.lyric,
			duration: 0,
		}));

		parsePureLyric(translated).forEach((line) => {
			const target = result.find((v) => v.time === line.time);
			if (target) {
				target.translatedLyric = line.lyric;
			}
		});

		parsePureLyric(roman).forEach((line) => {
			const target = result.find((v) => v.time === line.time);
			if (target) {
				target.romanLyric = line.lyric;
			}
		});

		result.sort((a, b) => a.time - b.time);

		// log("原始歌词解析", JSON.parse(JSON.stringify(result)));

		const processed = processLyric(result);

		// log("处理完成歌词解析", JSON.parse(JSON.stringify(processed)));

		for (let i = 0; i < processed.length; i++) {
			if (i < processed.length - 1) {
				processed[i].duration = processed[i + 1].time - processed[i].time;
			}
		}

		return processLyric(result);
	} else {
		const processed = parsePureDynamicLyric(dynamic);

		const originalLyrics = parsePureLyric(original);

		const attachOriginalLyric = (lyric: LyricPureLine[]) => {
			//console.log(JSON.parse(JSON.stringify(originalLyrics)), JSON.parse(JSON.stringify(lyric)));
			originalLyrics.forEach((line) => {
				let target = findLast(lyric, (v) => v.time === line.time);
				//console.log(line, target);
				/*if (!target) {
					lyric.forEach((v) => {
						if (target) {
							if (
								Math.abs(target.time - line.time) > Math.abs(v.time - line.time)
							) {
								target = v;
							}
						} else {
							target = v;
						}
					});
				}*/
				if (target) {
					target.originalLyric = target.originalLyric || "";
					if (target.originalLyric.length > 0) {
						target.originalLyric += " ";
					}
					target.originalLyric += line.lyric;
				}
			});
			//console.log(JSON.parse(JSON.stringify(originalLyrics)), JSON.parse(JSON.stringify(lyric)));
			return lyric;
		}
		const attachLyricToDynamic = (lyric: LyricPureLine[], field: string) => {
			lyric.forEach((line, index) => {
				let targetIndex = 0;
				processed.forEach((v, index) => {
					if (
						Math.abs(processed[targetIndex].time - line.time) > Math.abs(v.time - line.time)
					) {
						targetIndex = index;
					}
				});
				//console.log(line, index, targetIndex);
				let sequence = [targetIndex];
				for (let offset = 1; offset <= 5; offset++) {
					if (targetIndex - offset >= 0) sequence.push(targetIndex - offset);
					if (targetIndex + offset < processed.length) sequence.push(targetIndex + offset);
				}/*
				if (targetIndex - 1 >= 0) sequence.push(targetIndex - 1);
				if (targetIndex + 1 < processed.length) sequence.push(targetIndex + 1);
				if (targetIndex - 2 >= 0) sequence.push(targetIndex - 2);
				if (targetIndex + 2 < processed.length) sequence.push(targetIndex + 2);*/

				sequence = sequence.reverse();
				
				//console.log(sequence);

				//let minSimilarity = 1000000000;
				let minWeight = 1000000000;

				for (let index of sequence) {
					const v = processed[index];
					const similarity = calcSimularity(line.originalLyric as string, v.originalLyric as string);
					const weight = similarity * 1000 + (v[field] ? 1 : 0);
					//console.log("similarity", similarity, line.originalLyric, v.originalLyric);
					//console.log("weight", index, weight, line.originalLyric, v.originalLyric);
					if (weight < minWeight) {
						minWeight = weight;
						targetIndex = index;
					}
				}

				//console.log(targetIndex);

				const target = processed[targetIndex];

				//console.log(targetIndex, target);
				target[field] = target[field] || "";
				if (target[field].length > 0) {
					target[field] += " ";
				}
				target[field] += line.lyric;
			});
		}

		const translatedParsed = attachOriginalLyric(parsePureLyric(translated));
		const romanParsed = attachOriginalLyric(parsePureLyric(roman));

		//console.log("translatedParsed", JSON.parse(JSON.stringify(translatedParsed)));

		attachLyricToDynamic(translatedParsed, 'translatedLyric');
		attachLyricToDynamic(romanParsed, 'romanLyric');

		
		//console.log("processed", JSON.parse(JSON.stringify(processed)));

		// 插入空行
		for (let i = 0; i < processed.length; i++) {
			const thisLine = processed[i];
			const nextLine = processed[i + 1];
			if (
				thisLine &&
				nextLine &&
				thisLine.originalLyric.trim().length > 0 &&
				nextLine.originalLyric.trim().length > 0 &&
				thisLine.duration > 0
			) {
				const thisLineEndTime =
					(thisLine?.dynamicLyricTime || thisLine.time) + thisLine.duration;
				let nextLineStartTime = nextLine.time;
				if (
					nextLine.dynamicLyricTime &&
					nextLineStartTime > nextLine.dynamicLyricTime
				) {
					nextLineStartTime = nextLine.dynamicLyricTime;
				}
				if (nextLineStartTime - thisLineEndTime >= 5000) {
					processed.splice(i + 1, 0, {
						time: thisLineEndTime,
						originalLyric: "",
						duration: nextLineStartTime - thisLineEndTime,
					});
				}
			}
		}

		return processLyric(processed);
	}
}

const yrcLineRegexp = /^\[(?<time>[0-9]+),(?<duration>[0-9]+)\](?<line>.*)/;
const yrcWordTimeRegexp =
	/^\((?<time>[0-9]+),(?<duration>[0-9]+),(?<flag>[0-9]+)\)(?<word>[^\(]*)/;
const timeRegexp = /^\[((?<min>[0-9]+):)?(?<sec>[0-9]+([\.:]([0-9]+))?)\]/;
export function parsePureLyric(lyric: string): LyricPureLine[] {
	const result: LyricPureLine[] = [];

	for (const line of lyric.split("\n")) {
		let lyric = line.trim();
		const timestamps: number[] = [];
		while (true) {
			const matches = lyric.match(timeRegexp);
			if (matches) {
				const min = Number(matches.groups?.min || "0");
				const sec = Number(matches.groups?.sec.replace(/:/, ".") || "0");
				timestamps.push(Math.floor((min * 60 + sec) * 1000));
				lyric =
					lyric.slice(0, matches.index) +
					lyric.slice((matches.index || 0) + matches[0].length);
				lyric = lyric.trim();
			} else {
				break;
			}
		}
		lyric = lyric.trim();
		for (const time of timestamps) {
			result.push({
				time,
				lyric,
			});
		}
	}

	return result.sort((a, b) => a.time - b.time);;
}

export function parsePureDynamicLyric(lyric: string): LyricLine[] {
	const result: LyricLine[] = [];
	// 解析逐词歌词
	for (const line of lyric.trim().split("\n")) {
		let tmp = line.trim();
		const lineMatches = tmp.match(yrcLineRegexp);
		if (lineMatches) {
			const time = parseInt(lineMatches.groups?.time || "0");
			const duration = parseInt(lineMatches.groups?.duration || "0");
			tmp = lineMatches.groups?.line || "";
			const words: DynamicLyricWord[] = [];
			while (tmp.length > 0) {
				const wordMatches = tmp.match(yrcWordTimeRegexp);
				if (wordMatches) {
					const wordTime = parseInt(wordMatches.groups?.time || "0");
					const wordDuration = parseInt(wordMatches.groups?.duration || "0");
					const flag = parseInt(wordMatches.groups?.flag || "0");
					const word = wordMatches.groups?.word.trimStart();
					const splitedWords = word
						?.split(/\s+/)
						.filter((v) => v.trim().length > 0); // 有些歌词一个单词还是一个句子的就离谱
					if (splitedWords) {
						const splitedDuration = wordDuration / splitedWords.length;
						splitedWords.forEach((subWord, i) => {
							if (i === splitedWords.length - 1) {
								if (/\s/.test((word ?? '')[(word ?? '').length - 1])) {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: `${subWord.trimStart()} `,
									});
								} else {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: subWord.trimStart(),
									});
								}
							} else if (i === 0) {
								if (/\s/.test((word ?? '')[0])) {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: ` ${subWord.trimStart()}`,
									});
								} else {
									words.push({
										time: wordTime + i * splitedDuration,
										duration: splitedDuration,
										flag,
										word: subWord.trimStart(),
									});
								}
							} else {
								words.push({
									time: wordTime + i * splitedDuration,
									duration: splitedDuration,
									flag,
									word: `${subWord.trimStart()} `,
								});
							}
						});
					}
					tmp = tmp.slice(wordMatches.index || 0 + wordMatches[0].length);
				} else {
					break;
				}
			}
			const line: LyricLine = {
				time,
				duration,
				originalLyric: words.map((v) => v.word).join(""),
				dynamicLyric: words,
				dynamicLyricTime: time,
			};
			result.push(line);
		}
	}
	return result.sort((a, b) => a.time - b.time);
}

// 处理歌词，去除一些太短的空格间曲段，并为前摇太长的歌曲加前导空格
export function processLyric(lyric: LyricLine[]): LyricLine[] {
	if (
		lyric.length > 0 &&
		lyric[lyric.length - 1].time === 5940000 &&
		lyric[lyric.length - 1].duration === 0
	) {
		// 纯音乐，请欣赏
		return PURE_MUSIC_LYRIC_LINE;
	}

	const result: LyricLine[] = [];

	let isSpace = false;
	lyric.forEach((thisLyric, i, lyric) => {
		if (thisLyric.originalLyric.trim().length === 0) {
			const nextLyric = lyric[i + 1];
			if (nextLyric && nextLyric.time - thisLyric.time > 5000 && !isSpace) {
				result.push(thisLyric);
				isSpace = true;
			}
		} else {
			isSpace = false;
			result.push(thisLyric);
		}
	});

	while (result[0]?.originalLyric.length === 0) {
		result.shift();
	}

	if (result[0]?.time > 5000) {
		result.unshift({
			time: 500,
			duration: result[0]?.time - 500,
			originalLyric: "",
		});
	}

	return result;
}
/*
plugin.onLoad((injectPlugin) => {
	const plugin = injectPlugin.mainPlugin;
	plugin.parseLyric = parseLyric;
	plugin.getLyricData = getLyricData;
	plugin.parsePureLyric = parsePureLyric;
	plugin.parsePureDynamicLyric = parsePureDynamicLyric;
});
*/