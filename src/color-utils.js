export const rgb2Hsl = ([r, g, b]) => {
	r /= 255, g /= 255, b /= 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	let h, s, l = (max + min) / 2;

	if (max == min) {
		h = s = 0;
	} else {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}
	return [h, s, l];
}
export const hsl2Rgb = ([h, s, l]) => {
	let r, g, b;

	if (s == 0) {
		r = g = b = l;
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		}
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	return [r * 255, g * 255, b * 255];
}
export const normalizeColor = ([r, g, b]) => {
	if (Math.max(r, g, b) - Math.min(r, g, b) < 5) {
		return [150, 150, 150];
	}

	const mix = (a, b, p) => Math.round(a * (1 - p) + b * p);

	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	if (luminance < 60) {
		[r, g, b] = [r, g, b].map((c) => mix(c, 255, 0.3 * (1 - luminance / 60)));
	} else if (luminance > 180) {
		[r, g, b] = [r, g, b].map((c) => mix(c, 0, 0.5 * ((luminance - 180) / 76)));
	}

	let [h, s, l] = rgb2Hsl([r, g, b]);

	s = Math.max(0.3, Math.min(0.8, s));
	l = Math.max(0.5, Math.min(0.8, l));

	[r, g, b] = hsl2Rgb([h, s, l]);

	return [r, g, b];
}

export const calcWhiteShadeColor = ([r, g, b], p = 0.50) => {
	const mix = (a, b, p) => Math.round(a * (1 - p) + b * p);
	return [r, g, b].map((c) => mix(c, 255, p));
}

export const calcLuminance = (color) => {
	let [r, g, b] = color.map((c) => c / 255);
	[r, g, b] = [r, g, b].map((c) => {
		if (c <= 0.03928) {
			return c / 12.92;
		}
		return Math.pow((c + 0.055) / 1.055, 2.4);
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const rgb2Lab = (color) => {
	let [r, g, b] = color.map((c) => c / 255);
	[r, g, b] = [r, g, b].map((c) => {
		if (c <= 0.03928) {
			return c / 12.92;
		}
		return Math.pow((c + 0.055) / 1.055, 2.4);
	});
	[r, g, b] = [r, g, b].map((c) => c * 100);
	const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
	const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
	const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
	const xyz2Lab = (c) => {
		if (c > 0.008856) {
			return Math.pow(c, 1 / 3);
		}
		return 7.787 * c + 16 / 116;
	}
	const L = 116 * xyz2Lab(y / 100) - 16;
	const A = 500 * (xyz2Lab(x / 95.047) - xyz2Lab(y / 100));
	const B = 200 * (xyz2Lab(y / 100) - xyz2Lab(z / 108.883));
	return [L, A, B];
}

export const calcColorDifference = (color1, color2) => {
	const [L1, A1, B1] = rgb2Lab(color1);
	const [L2, A2, B2] = rgb2Lab(color2);
	const deltaL = L1 - L2;
	const deltaA = A1 - A2;
	const deltaB = B1 - B2;
	return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

export const getGradientFromPalette = (palette) => {
	palette = palette.sort((a, b) => {
		return calcLuminance(a) - calcLuminance(b);
	});
	palette = palette.slice(palette.length / 2 - 4, palette.length / 2 + 4);
	palette = palette.sort((a, b) => {
		return rgb2Hsl(b)[1] - rgb2Hsl(a)[1];
	});
	palette = palette.slice(0, 6);

	let differences = new Array(6);
	for(let i = 0; i < differences.length; i++){
		differences[i] = new Array(6).fill(0);
	}
	for (let i = 0; i < palette.length; i++) {
		for (let j = i + 1; j < palette.length; j++) {
			differences[i][j] = calcColorDifference(palette[i], palette[j]);
			differences[j][i] = differences[i][j];
		}
	}

	let used = new Array(6).fill(false);
	let min = 10000000, ansSeq = [];
	const dfs = (depth, seq = [], currentMax = -1) => {
		if (depth === 6) {
			if (currentMax < min) {
				min = currentMax;
				ansSeq = seq;
			}
			return;
		}
		for (let i = 0; i < 6; i++) {
			if (used[i]) continue;
			used[i] = true;
			dfs(depth + 1, seq.concat(i), Math.max(currentMax, differences[seq[depth - 1]][i]));
			used[i] = false;
		}
	}
	for (let i = 0; i < 6; i++) {
		used[i] = true;
		dfs(1, [i]);
		used[i] = false;
	}

	let colors = [];
	for (let i of ansSeq) {
		colors.push(palette[ansSeq[i]]);
	}
	let ans = 'linear-gradient(-45deg,';
	for (let i = 0; i < colors.length; i++) {
		ans += `rgb(${colors[i][0]}, ${colors[i][1]}, ${colors[i][2]})`;
		if (i !== colors.length - 1) {
			ans += ',';
		}
	}
	ans += ')';
	return ans;
}
export const argb2Rgb = (x) => {
	// const a = (x >> 24) & 0xff;
	const r = (x >> 16) & 0xff;
	const g = (x >> 8) & 0xff;
	const b = x & 0xff;
	return [r, g, b];
};
export const Rgb2Hex = (r, g, b) => {
	return '#' + [r, g, b].map((x) => {
		const hex = x.toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	}).join('');
};