import { strings } from '../i18n';

const COLOR_PRESET_HEXES = [
	{ hex: '#e74c3c', key: 'red' as const },
	{ hex: '#e67e22', key: 'orange' as const },
	{ hex: '#f1c40f', key: 'yellow' as const },
	{ hex: '#2ecc71', key: 'green' as const },
	{ hex: '#1abc9c', key: 'teal' as const },
	{ hex: '#3498db', key: 'blue' as const },
	{ hex: '#9b59b6', key: 'purple' as const },
	{ hex: '#95a5a6', key: 'gray' as const },
];

export function getColorPresets(): Array<{ hex: string; name: string }> {
	return COLOR_PRESET_HEXES.map(({ hex, key }) => ({
		hex,
		name: strings.colors[key],
	}));
}

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function pickCustomColor(
	current: string | undefined,
	onPick: (hex: string) => void,
): void {
	const input = window.document.createElement('input');
	input.type = 'color';
	input.value =
		current && HEX_COLOR_RE.test(current) ? current : '#3498db';
	input.style.position = 'fixed';
	input.style.left = '-9999px';
	window.document.body.appendChild(input);
	input.addEventListener(
		'change',
		() => {
			onPick(input.value);
			input.remove();
		},
		{ once: true },
	);
	input.addEventListener(
		'cancel',
		() => {
			input.remove();
		},
		{ once: true },
	);
	input.click();
}
