import { App } from 'obsidian';
import {
	SORT_HEADER_NAME_ID,
	SortDirection,
	SortRule,
} from '../board/schema';
import { strings } from '../i18n';
import { getPropertyType, type PropertyValueType } from './propertyType';
import { resolvePropertyValue } from './resolveProperty';
import { BoardCard, BoardColumn } from './types';

function parseFiniteNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) {
		return null;
	}
	const value = Number(trimmed);
	return Number.isFinite(value) ? value : null;
}

function parseTimestamp(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) {
		return null;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const ms = Date.parse(`${trimmed}T00:00:00`);
		return Number.isFinite(ms) ? ms : null;
	}
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
		const ms = Date.parse(trimmed);
		return Number.isFinite(ms) ? ms : null;
	}
	const ms = Date.parse(trimmed);
	return Number.isFinite(ms) ? ms : null;
}

function isCheckboxTrue(raw: unknown): boolean {
	if (raw === true || raw === 1) {
		return true;
	}
	if (typeof raw === 'string') {
		const trimmed = raw.trim().toLowerCase();
		return trimmed === 'true' || trimmed === '1';
	}
	return false;
}

type SortKey =
	| { kind: 'missing' }
	| { kind: 'number'; value: number }
	| { kind: 'text'; value: string }
	| { kind: 'checkbox'; value: boolean };

function resolveSortKey(
	app: App,
	card: BoardCard,
	property: string,
	type: PropertyValueType,
): SortKey {
	const resolved = resolvePropertyValue(app, card, property);

	if (type === 'checkbox') {
		if (!resolved.present) {
			return { kind: 'missing' };
		}
		return {
			kind: 'checkbox',
			value: isCheckboxTrue(resolved.raw),
		};
	}

	const text = resolved.text;
	if (!text) {
		return { kind: 'missing' };
	}

	if (type === 'number') {
		const value = parseFiniteNumber(text);
		if (value === null) {
			return { kind: 'missing' };
		}
		return { kind: 'number', value };
	}

	if (type === 'date' || type === 'datetime') {
		const value = parseTimestamp(text);
		if (value === null) {
			return { kind: 'missing' };
		}
		return { kind: 'number', value };
	}

	return { kind: 'text', value: text };
}

function compareDefinedKeys(
	left: Exclude<SortKey, { kind: 'missing' }>,
	right: Exclude<SortKey, { kind: 'missing' }>,
	direction: SortDirection,
): number {
	let result = 0;

	if (left.kind === 'number' && right.kind === 'number') {
		result = left.value - right.value;
	} else if (left.kind === 'checkbox' && right.kind === 'checkbox') {
		// Asc: True → False (true before false)
		result = Number(right.value) - Number(left.value);
	} else if (left.kind === 'text' && right.kind === 'text') {
		result = left.value.localeCompare(right.value);
	} else {
		result = left.kind.localeCompare(right.kind);
	}

	if (result === 0) {
		return 0;
	}
	return direction === 'asc' ? result : -result;
}

function compareSortKeys(
	left: SortKey,
	right: SortKey,
	direction: SortDirection,
): number {
	if (left.kind === 'missing' && right.kind === 'missing') {
		return 0;
	}
	if (left.kind === 'missing') {
		return 1;
	}
	if (right.kind === 'missing') {
		return -1;
	}
	return compareDefinedKeys(left, right, direction);
}

function activeSortRules(sorts: SortRule[]): SortRule[] {
	return sorts.filter(
		(rule) => rule.enabled && rule.property.trim().length > 0,
	);
}

function compareCards(
	a: BoardCard,
	b: BoardCard,
	rules: SortRule[],
	app: App,
): number {
	for (const rule of rules) {
		const property = rule.property.trim();
		const type: PropertyValueType =
			property === SORT_HEADER_NAME_ID
				? 'text'
				: getPropertyType(app, property);
		const result = compareSortKeys(
			resolveSortKey(app, a, property, type),
			resolveSortKey(app, b, property, type),
			rule.direction,
		);
		if (result !== 0) {
			return result;
		}
	}
	return 0;
}

export function sortColumns(
	columns: BoardColumn[],
	sorts: SortRule[],
	app: App,
): BoardColumn[] {
	const rules = activeSortRules(sorts);
	if (rules.length === 0) {
		return columns;
	}

	return columns.map((column) => ({
		...column,
		cards: [...column.cards].sort((a, b) => compareCards(a, b, rules, app)),
	}));
}

export function sortCards(
	cards: BoardCard[],
	sorts: SortRule[],
	app: App,
): BoardCard[] {
	const rules = activeSortRules(sorts);
	if (rules.length === 0) {
		return cards;
	}

	return [...cards].sort((a, b) => compareCards(a, b, rules, app));
}

export function directionLabelsForType(
	type: PropertyValueType,
): { asc: string; desc: string } {
	if (type === 'number' || type === 'date' || type === 'datetime') {
		return { asc: strings.sort.asc09, desc: strings.sort.desc90 };
	}
	if (type === 'checkbox') {
		return {
			asc: strings.sort.ascTrueFalse,
			desc: strings.sort.descFalseTrue,
		};
	}
	return { asc: strings.sort.ascAZ, desc: strings.sort.descZA };
}
