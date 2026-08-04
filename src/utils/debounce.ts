export function debounce<T extends (...args: never[]) => void>(
	fn: T,
	waitMs: number,
): (...args: Parameters<T>) => void {
	let timer: number | null = null;

	return (...args: Parameters<T>) => {
		if (timer !== null) {
			window.clearTimeout(timer);
		}
		timer = window.setTimeout(() => {
			timer = null;
			fn(...args);
		}, waitMs);
	};
}
