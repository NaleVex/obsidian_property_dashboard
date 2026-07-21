import { UNCATEGORIZED_STATUS } from '../settings/types';

export function normalizeStatusValue(raw: unknown): string {
	if (raw === null || raw === undefined) {
		return '';
	}

	if (Array.isArray(raw)) {
		return normalizeStatusValue(raw[0]);
	}

	return String(raw).trim();
}

export function resolveColumnStatus(
	rawValue: string,
	configuredStatuses: string[],
	caseSensitive: boolean,
): string {
	if (!rawValue) {
		return UNCATEGORIZED_STATUS;
	}

	const match = configuredStatuses.find((status) =>
		caseSensitive
			? status === rawValue
			: status.toLowerCase() === rawValue.toLowerCase(),
	);

	return match ?? UNCATEGORIZED_STATUS;
}

export function canonicalStatusValue(
	columnStatus: string,
	configuredStatuses: string[],
): string {
	if (columnStatus === UNCATEGORIZED_STATUS) {
		return configuredStatuses[0] ?? '';
	}

	return columnStatus;
}
