import { FilterOp, FilterRule, FilterCombinator } from '../board/schema';
import { stringifyPropertyValue } from './propertyValue';
import { BoardCard, BoardColumn } from './types';

interface FilterGroup {
	combinator: FilterCombinator;
	members: FilterRule[];
}

function parseFiniteNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (!trimmed) {
		return null;
	}
	const value = Number(trimmed);
	return Number.isFinite(value) ? value : null;
}

function propertyText(
	frontmatter: Record<string, unknown>,
	property: string,
): string {
	const key = property.trim();
	if (
		!key ||
		!Object.prototype.hasOwnProperty.call(frontmatter, key)
	) {
		return '';
	}
	return stringifyPropertyValue(frontmatter[key]) ?? '';
}

function matchTextOp(haystack: string, op: FilterOp, value: string): boolean {
	switch (op) {
		case 'eq':
			return haystack === value;
		case 'neq':
			return haystack !== value;
		case 'contains':
			return haystack.includes(value);
		case 'not_contains':
			return !haystack.includes(value);
		case 'empty':
			return haystack.length === 0;
		case 'not_empty':
			return haystack.length > 0;
		default:
			return false;
	}
}

function matchNumericOp(
	leftRaw: string,
	op: FilterOp,
	rightRaw: string,
): boolean {
	if (op === 'empty') {
		return leftRaw.trim().length === 0;
	}
	if (op === 'not_empty') {
		return leftRaw.trim().length > 0;
	}

	const left = parseFiniteNumber(leftRaw);
	const right = parseFiniteNumber(rightRaw);
	if (left === null || right === null) {
		return false;
	}

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

export function matchesFilterRule(rule: FilterRule, card: BoardCard): boolean {
	if (rule.source === 'body') {
		return matchTextOp(card.body, rule.op, rule.value);
	}

	const text = propertyText(card.frontmatter, rule.property);
	if (rule.numeric) {
		return matchNumericOp(text, rule.op, rule.value);
	}
	return matchTextOp(text, rule.op, rule.value);
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

export function matchesFilterRules(rules: FilterRule[], card: BoardCard): boolean {
	const groups = groupFilterRules(rules);
	if (groups.length === 0) {
		return true;
	}

	let result: boolean | null = null;

	for (const group of groups) {
		let memberResult = group.members.every((rule) => matchesFilterRule(rule, card));
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
): BoardColumn[] {
	if (groupFilterRules(rules).length === 0) {
		return columns;
	}

	return columns.map((column) => ({
		...column,
		cards: column.cards.filter((card) => matchesFilterRules(rules, card)),
	}));
}

export function countCards(columns: BoardColumn[]): number {
	return columns.reduce((sum, column) => sum + column.cards.length, 0);
}
