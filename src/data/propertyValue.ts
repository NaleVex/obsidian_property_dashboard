export function stringifyPropertyValue(raw: unknown): string | null {
	if (raw === null || raw === undefined) {
		return null;
	}

	if (Array.isArray(raw)) {
		if (raw.length === 0) {
			return null;
		}
		return raw
			.map((item) => stringifyPropertyValue(item))
			.filter((item): item is string => item !== null)
			.join(', ');
	}

	if (typeof raw === 'object') {
		try {
			return JSON.stringify(raw);
		} catch {
			return String(raw);
		}
	}

	const text = String(raw).trim();
	return text.length > 0 ? text : null;
}
