export const COLOR_PRESETS: Array<{ hex: string; name: string }> = [
	{ hex: '#e74c3c', name: 'Red' },
	{ hex: '#e67e22', name: 'Orange' },
	{ hex: '#f1c40f', name: 'Yellow' },
	{ hex: '#2ecc71', name: 'Green' },
	{ hex: '#1abc9c', name: 'Teal' },
	{ hex: '#3498db', name: 'Blue' },
	{ hex: '#9b59b6', name: 'Purple' },
	{ hex: '#95a5a6', name: 'Gray' },
];

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
