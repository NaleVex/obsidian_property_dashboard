import { App } from 'obsidian';
import {
	CardColorEffect,
	CardColorRule,
	FilterOp,
	FilterRule,
	FilterCombinator,
	RuleCondition,
} from '../board/schema';
import { getPropertyType, coerceOpForType, type PropertyValueType } from './propertyType';
import { extractNamedParagraphSlice } from './paragraphValue';
import { resolvePropertyValue } from './resolveProperty';
import { stringifyPropertyValue } from './propertyValue';
import { BoardCard, BoardColumn } from './types';

interface FilterGroup {
	combinator: FilterCombinator;
	members: FilterRule[];
}

export interface ResolvedCardColors {
	border?: string;
	background?: string;
}

function parseFiniteNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) {
		return null;
	}
	const value = Number(trimmed);
	return Number.isFinite(value) ? value : null;
}

function matchTextOp(haystack: string, op: FilterOp, value: string): boolean {
	const left = haystack.toLowerCase();
	const right = value.toLowerCase();
	switch (op) {
		case 'eq':
			return left === right;
		case 'neq':
			return left !== right;
		case 'contains':
			return left.includes(right);
		case 'not_contains':
			return !left.includes(right);
		case 'empty':
			return haystack.length === 0;
		case 'not_empty':
			return haystack.length > 0;
		default:
			return false;
	}
}

function cardQuickSearchHaystack(card: BoardCard): string {
	const parts: string[] = [card.title, card.body];
	for (const value of Object.values(card.frontmatter)) {
		const text = stringifyPropertyValue(value);
		if (text) {
			parts.push(text);
		}
	}
	return parts.join('\n');
}

export function matchesQuickSearch(card: BoardCard, query: string): boolean {
	const trimmed = query.trim();
	if (!trimmed) {
		return true;
	}
	return cardQuickSearchHaystack(card)
		.toLowerCase()
		.includes(trimmed.toLowerCase());
}

export function filterCardsByQuickSearch(
	cards: BoardCard[],
	query: string,
): BoardCard[] {
	const trimmed = query.trim();
	if (!trimmed) {
		return cards;
	}
	return cards.filter((card) => matchesQuickSearch(card, trimmed));
}

export function filterColumnsByQuickSearch(
	columns: BoardColumn[],
	query: string,
): BoardColumn[] {
	const trimmed = query.trim();
	if (!trimmed) {
		return columns;
	}
	return columns.map((column) => ({
		...column,
		cards: column.cards.filter((card) => matchesQuickSearch(card, trimmed)),
	}));
}

function compareOrdered(
	left: number,
	right: number,
	op: FilterOp,
): boolean {
	switch (op) {
		case 'eq':
			return left === right;
		case 'neq':
			return left !== right;
		case 'lte':
			return left <= right;
		case 'lt':
			return left < right;
		case 'gt':
			return left > right;
		case 'gte':
			return left >= right;
		default:
			return false;
	}
}

function matchNumericOp(
	leftRaw: string,
	op: FilterOp,
	rightRaw: string,
): boolean {
	const left = parseFiniteNumber(leftRaw);
	const right = parseFiniteNumber(rightRaw);
	if (left === null || right === null) {
		return false;
	}
	return compareOrdered(left, right, op);
}

function parseTimestamp(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) {
		return null;
	}
	// Date-only: compare as UTC midnight for stable ordering
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const ms = Date.parse(`${trimmed}T00:00:00`);
		return Number.isFinite(ms) ? ms : null;
	}
	// datetime-local style without seconds/timezone
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
		const ms = Date.parse(trimmed);
		return Number.isFinite(ms) ? ms : null;
	}
	const ms = Date.parse(trimmed);
	return Number.isFinite(ms) ? ms : null;
}

function matchDateOp(
	leftRaw: string,
	op: FilterOp,
	rightRaw: string,
): boolean {
	const left = parseTimestamp(leftRaw);
	const right = parseTimestamp(rightRaw);
	if (left === null || right === null) {
		return false;
	}
	return compareOrdered(left, right, op);
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

function matchCheckboxOp(raw: unknown, op: FilterOp): boolean {
	const isTrue = isCheckboxTrue(raw);
	if (op === 'is_true') {
		return isTrue;
	}
	if (op === 'is_false') {
		return !isTrue;
	}
	return false;
}

export function matchesFilterRule(
	rule: RuleCondition,
	card: BoardCard,
	app: App,
): boolean {
	if (rule.source === 'body') {
		const op = coerceOpForType(rule.op, 'text');
		return matchTextOp(card.body, op, rule.value);
	}

	if (rule.source === 'namedParagraph') {
		const op = coerceOpForType(rule.op, 'text');
		const text = extractNamedParagraphSlice(card.body, rule.header, 0) ?? '';
		return matchTextOp(text, op, rule.value);
	}

	const type: PropertyValueType = getPropertyType(app, rule.property);
	const op = coerceOpForType(rule.op, type);
	const resolved = resolvePropertyValue(app, card, rule.property);

	if (type === 'checkbox') {
		return matchCheckboxOp(resolved.raw, op);
	}

	const text = resolved.text;

	if (type === 'number') {
		return matchNumericOp(text, op, rule.value);
	}

	if (type === 'date' || type === 'datetime') {
		return matchDateOp(text, op, rule.value);
	}

	return matchTextOp(text, op, rule.value);
}

function applyColorEffect(
	current: string | undefined,
	effect: CardColorEffect,
): string | undefined {
	if (effect.kind === 'none') {
		return current;
	}
	if (effect.kind === 'reset') {
		return undefined;
	}
	return effect.hex;
}

/**
 * Apply enabled matching color rules from bottom to top.
 * Higher rules overwrite lower ones; `none` leaves the prior value.
 */
export function resolveCardColors(
	rules: CardColorRule[],
	card: BoardCard,
	app: App,
): ResolvedCardColors | null {
	let border: string | undefined;
	let background: string | undefined;

	for (let i = rules.length - 1; i >= 0; i -= 1) {
		const rule = rules[i];
		if (!rule || !rule.enabled || !matchesFilterRule(rule, card, app)) {
			continue;
		}
		border = applyColorEffect(border, rule.border);
		background = applyColorEffect(background, rule.background);
	}

	if (border === undefined && background === undefined) {
		return null;
	}
	return { border, background };
}

/** Group enabled rules: trailing `and` rules join the current group. */
export function groupFilterRules(rules: FilterRule[]): FilterGroup[] {
	const enabled = rules.filter((rule) => rule.enabled);
	const groups: FilterGroup[] = [];
	let current: FilterGroup | null = null;

	for (const rule of enabled) {
		if (!current) {
			current = { combinator: rule.combinator, members: [rule] };
			continue;
		}
		if (rule.combinator === 'and') {
			current.members.push(rule);
			continue;
		}
		groups.push(current);
		current = { combinator: rule.combinator, members: [rule] };
	}

	if (current) {
		groups.push(current);
	}

	return groups;
}

export function matchesFilterRules(
	rules: FilterRule[],
	card: BoardCard,
	app: App,
): boolean {
	const groups = groupFilterRules(rules);
	if (groups.length === 0) {
		return true;
	}

	let result: boolean | null = null;

	for (const group of groups) {
		let memberResult = group.members.every((rule) =>
			matchesFilterRule(rule, card, app),
		);
		if (group.combinator === 'not') {
			memberResult = !memberResult;
		}

		if (result === null) {
			result = memberResult;
			continue;
		}

		if (group.combinator === 'or') {
			result = result || memberResult;
		} else {
			result = result && memberResult;
		}
	}

	return result ?? true;
}

export function filterColumns(
	columns: BoardColumn[],
	rules: FilterRule[],
	app: App,
): BoardColumn[] {
	if (groupFilterRules(rules).length === 0) {
		return columns;
	}

	return columns.map((column) => ({
		...column,
		cards: column.cards.filter((card) => matchesFilterRules(rules, card, app)),
	}));
}

export function filterCards(
	cards: BoardCard[],
	rules: FilterRule[],
	app: App,
): BoardCard[] {
	if (groupFilterRules(rules).length === 0) {
		return cards;
	}

	return cards.filter((card) => matchesFilterRules(rules, card, app));
}

export function countCards(columns: BoardColumn[]): number {
	return columns.reduce((sum, column) => sum + column.cards.length, 0);
}
