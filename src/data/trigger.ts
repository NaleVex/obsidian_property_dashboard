import { FrontMatterCache } from 'obsidian';
import { UNKNOWN_COLUMN_ID } from '../board/schema';

export function normalizeTriggerValue(raw: unknown): string {
	if (raw === null || raw === undefined) {
		return '';
	}

	if (Array.isArray(raw)) {
		if (raw.length === 0) {
			return '';
		}
		return normalizeTriggerValue(raw[0]);
	}

	return String(raw).trim();
}

export function hasTriggerProperty(
	frontmatter: FrontMatterCache | undefined,
	triggerProperty: string,
): boolean {
	if (!frontmatter || !triggerProperty) {
		return false;
	}
	return Object.prototype.hasOwnProperty.call(frontmatter, triggerProperty);
}

/**
 * Resolve which column a note belongs to.
 * Notes without the trigger property should be excluded before calling this.
 * Empty or unknown values map to the Unknown column.
 */
export function resolveColumnId(
	rawValue: string,
	values: string[],
): string {
	if (!rawValue) {
		return UNKNOWN_COLUMN_ID;
	}

	if (values.includes(rawValue)) {
		return rawValue;
	}

	return UNKNOWN_COLUMN_ID;
}

export function getTriggerFromFrontmatter(
	frontmatter: FrontMatterCache | undefined,
	triggerProperty: string,
	values: string[],
): { hasProperty: boolean; rawValue: string; columnId: string } {
	const hasProperty = hasTriggerProperty(frontmatter, triggerProperty);
	if (!hasProperty) {
		return {
			hasProperty: false,
			rawValue: '',
			columnId: UNKNOWN_COLUMN_ID,
		};
	}

	const rawValue = normalizeTriggerValue(frontmatter?.[triggerProperty]);
	return {
		hasProperty: true,
		rawValue,
		columnId: resolveColumnId(rawValue, values),
	};
}
