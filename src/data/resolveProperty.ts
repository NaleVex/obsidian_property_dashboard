import { App } from 'obsidian';
import { parseViewFieldRef, SORT_HEADER_NAME_ID } from '../board/schema';
import {
	isFileProperty,
	resolveFilePropertyValue,
} from './fileProperties';
import { stringifyPropertyValue } from './propertyValue';
import { BoardCard } from './types';

export interface ResolvedPropertyValue {
	present: boolean;
	raw: unknown;
	text: string;
}

function frontmatterResolution(
	frontmatter: Record<string, unknown>,
	property: string,
): ResolvedPropertyValue {
	const key = property.trim();
	if (
		!key ||
		!Object.prototype.hasOwnProperty.call(frontmatter, key)
	) {
		return { present: false, raw: undefined, text: '' };
	}
	const raw = frontmatter[key];
	return {
		present: true,
		raw,
		text: stringifyPropertyValue(raw) ?? '',
	};
}

/**
 * Resolve a property value for a board card: header name, file.*, or frontmatter.
 */
export function resolvePropertyValue(
	app: App,
	card: BoardCard,
	property: string,
): ResolvedPropertyValue {
	const key = property.trim();
	if (!key) {
		return { present: false, raw: undefined, text: '' };
	}

	const fieldId = parseViewFieldRef(key);
	if (fieldId) {
		const text = card.fields[fieldId];
		if (text === null || text === undefined) {
			return { present: false, raw: undefined, text: '' };
		}
		return { present: true, raw: text, text };
	}

	if (key === SORT_HEADER_NAME_ID) {
		const title = card.title;
		return {
			present: title.trim().length > 0,
			raw: title,
			text: title,
		};
	}

	if (isFileProperty(key)) {
		return resolveFilePropertyValue(app, card.filePath, key);
	}

	return frontmatterResolution(card.frontmatter, key);
}
