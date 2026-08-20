import type { CardFieldDef } from '../board/schema';

export type FormulaValue =
	| { kind: 'number'; value: number }
	| { kind: 'date'; ms: number; datetime: boolean }
	| { kind: 'bool'; value: boolean }
	| { kind: 'string'; value: string }
	| { kind: 'err' };

export const FORMULA_ERR: FormulaValue = { kind: 'err' };

/** Display catalog for the formula editor cheatsheet; names match `evalCall`. */
export const FORMULA_FUNCTIONS = [
	{ name: 'MIN', signature: 'MIN(a, b, …)' },
	{ name: 'MAX', signature: 'MAX(a, b, …)' },
	{ name: 'IF', signature: 'IF(cond, then, else)' },
	{ name: 'AND', signature: 'AND(…)' },
	{ name: 'OR', signature: 'OR(…)' },
	{ name: 'CONCAT', signature: 'CONCAT(…)' },
	{ name: 'LEFT', signature: 'LEFT(text, n)' },
	{ name: 'RIGHT', signature: 'RIGHT(text, n)' },
	{ name: 'MID', signature: 'MID(text, start, n?)' },
	{ name: 'LOWER', signature: 'LOWER(text)' },
	{ name: 'UPPER', signature: 'UPPER(text)' },
	{ name: 'SEARCH', signature: 'SEARCH(text, needle)' },
] as const;

export type FormulaFunctionName = (typeof FORMULA_FUNCTIONS)[number]['name'];

const NUMBER_RE = /^-?\d+(\.\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

class FormulaParseError extends Error {
	constructor() {
		super('Invalid formula');
	}
}

type BinaryOp = '+' | '-' | '*' | '/' | '&' | '==' | '!=' | '>' | '<' | '>=' | '<=';

type Token =
	| { kind: 'number'; value: number }
	| { kind: 'string'; value: string }
	| { kind: 'ref'; name: string }
	| { kind: 'ident'; name: string }
	| { kind: 'bool'; value: boolean }
	| { kind: 'op'; op: BinaryOp }
	| { kind: 'comma' }
	| { kind: 'lparen' }
	| { kind: 'rparen' };

type FormulaAst =
	| { kind: 'number'; value: number }
	| { kind: 'string'; value: string }
	| { kind: 'bool'; value: boolean }
	| { kind: 'ref'; name: string }
	| { kind: 'unary'; op: '-'; arg: FormulaAst }
	| { kind: 'binary'; op: BinaryOp; left: FormulaAst; right: FormulaAst }
	| { kind: 'call'; name: string; args: FormulaAst[] };

export function parseFormulaTimestamp(raw: string): {
	ms: number;
	datetime: boolean;
} | null {
	const trimmed = raw.trim();
	if (!trimmed) {
		return null;
	}
	if (DATE_RE.test(trimmed)) {
		const ms = Date.parse(`${trimmed}T00:00:00`);
		return Number.isFinite(ms) ? { ms, datetime: false } : null;
	}
	if (DATETIME_RE.test(trimmed)) {
		const ms = Date.parse(trimmed);
		return Number.isFinite(ms) ? { ms, datetime: true } : null;
	}
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
		const ms = Date.parse(trimmed.slice(0, 16));
		return Number.isFinite(ms) ? { ms, datetime: true } : null;
	}
	return null;
}

function parsePlainNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (!NUMBER_RE.test(trimmed)) {
		return null;
	}
	const value = Number(trimmed);
	return Number.isFinite(value) ? value : null;
}

function parseBoolText(raw: string): boolean | null {
	const trimmed = raw.trim().toLowerCase();
	if (trimmed === 'true' || trimmed === '1') {
		return true;
	}
	if (trimmed === 'false' || trimmed === '0') {
		return false;
	}
	return null;
}

/** Coerce an already-evaluated / stored value. Quoted literals should not go through this. */
export function formulaValueFromText(raw: string | null | undefined): FormulaValue {
	if (raw === null || raw === undefined) {
		return { kind: 'string', value: '' };
	}
	const number = parsePlainNumber(raw);
	if (number !== null) {
		return { kind: 'number', value: number };
	}
	const date = parseFormulaTimestamp(raw);
	if (date) {
		return { kind: 'date', ms: date.ms, datetime: date.datetime };
	}
	const bool = parseBoolText(raw);
	if (bool !== null) {
		return { kind: 'bool', value: bool };
	}
	return { kind: 'string', value: raw };
}

export function formulaValueFromRaw(raw: unknown): FormulaValue {
	if (raw === null || raw === undefined) {
		return { kind: 'string', value: '' };
	}
	if (typeof raw === 'number') {
		return Number.isFinite(raw) ? { kind: 'number', value: raw } : FORMULA_ERR;
	}
	if (typeof raw === 'boolean') {
		return { kind: 'bool', value: raw };
	}
	if (typeof raw === 'string') {
		return formulaValueFromText(raw);
	}
	if (Array.isArray(raw)) {
		if (raw.length === 0) {
			return { kind: 'string', value: '' };
		}
		return formulaValueFromRaw(raw[0]);
	}
	return formulaValueFromText(String(raw));
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

function formatDateValue(ms: number, datetime: boolean): string {
	const date = new Date(ms);
	const y = date.getFullYear();
	const m = pad2(date.getMonth() + 1);
	const d = pad2(date.getDate());
	if (!datetime) {
		return `${y}-${m}-${d}`;
	}
	return `${y}-${m}-${d}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatNumber(value: number): string {
	if (!Number.isFinite(value)) {
		return 'ERR';
	}
	if (Number.isInteger(value)) {
		return String(value);
	}
	return String(Number(value.toPrecision(12)));
}

/** Format a formula result for cards/tables. Empty string → null (hide). ERR stays visible. */
export function formatFormulaValue(value: FormulaValue): string | null {
	switch (value.kind) {
		case 'err':
			return 'ERR';
		case 'number':
			return formatNumber(value.value);
		case 'date':
			return formatDateValue(value.ms, value.datetime);
		case 'bool':
			return value.value ? 'true' : 'false';
		case 'string':
			return value.value.length > 0 ? value.value : null;
	}
}

function asNumber(value: FormulaValue): number | null {
	if (value.kind === 'number' && Number.isFinite(value.value)) {
		return value.value;
	}
	if (value.kind === 'string') {
		return parsePlainNumber(value.value);
	}
	return null;
}

function asDate(value: FormulaValue): { ms: number; datetime: boolean } | null {
	if (value.kind === 'date') {
		return { ms: value.ms, datetime: value.datetime };
	}
	if (value.kind === 'string') {
		return parseFormulaTimestamp(value.value);
	}
	return null;
}

function asBool(value: FormulaValue): boolean | null {
	if (value.kind === 'bool') {
		return value.value;
	}
	if (value.kind === 'string') {
		return parseBoolText(value.value);
	}
	return null;
}

function stringifyValue(value: FormulaValue): string | null {
	if (value.kind === 'err') {
		return null;
	}
	if (value.kind === 'number') {
		return formatNumber(value.value);
	}
	if (value.kind === 'date') {
		return formatDateValue(value.ms, value.datetime);
	}
	if (value.kind === 'bool') {
		return value.value ? 'true' : 'false';
	}
	return value.value;
}

function isTruthy(value: FormulaValue): boolean | null {
	if (value.kind === 'err') {
		return null;
	}
	if (value.kind === 'bool') {
		return value.value;
	}
	if (value.kind === 'number') {
		return value.value !== 0;
	}
	if (value.kind === 'string') {
		const bool = parseBoolText(value.value);
		if (bool !== null) {
			return bool;
		}
		return value.value.length > 0;
	}
	return true;
}

function addDays(ms: number, days: number, datetime: boolean): FormulaValue {
	if (!Number.isFinite(days)) {
		return FORMULA_ERR;
	}
	const date = new Date(ms);
	const whole = Math.trunc(days);
	const frac = days - whole;
	date.setDate(date.getDate() + whole);
	if (frac !== 0) {
		date.setTime(date.getTime() + frac * 86_400_000);
		return { kind: 'date', ms: date.getTime(), datetime: true };
	}
	return { kind: 'date', ms: date.getTime(), datetime };
}

function tokenize(expression: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	const peek = (offset = 0): string | undefined => expression[i + offset];

	while (i < expression.length) {
		const ch = expression[i];
		if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
			i += 1;
			continue;
		}

		if (ch === '(') {
			tokens.push({ kind: 'lparen' });
			i += 1;
			continue;
		}
		if (ch === ')') {
			tokens.push({ kind: 'rparen' });
			i += 1;
			continue;
		}
		if (ch === ',') {
			tokens.push({ kind: 'comma' });
			i += 1;
			continue;
		}

		if (ch === '&') {
			tokens.push({ kind: 'op', op: '&' });
			i += 1;
			continue;
		}

		if (ch === '=' && peek(1) === '=') {
			tokens.push({ kind: 'op', op: '==' });
			i += 2;
			continue;
		}
		if (ch === '!' && peek(1) === '=') {
			tokens.push({ kind: 'op', op: '!=' });
			i += 2;
			continue;
		}
		if (ch === '>' && peek(1) === '=') {
			tokens.push({ kind: 'op', op: '>=' });
			i += 2;
			continue;
		}
		if (ch === '<' && peek(1) === '=') {
			tokens.push({ kind: 'op', op: '<=' });
			i += 2;
			continue;
		}
		if (ch === '>' || ch === '<') {
			tokens.push({ kind: 'op', op: ch });
			i += 1;
			continue;
		}
		if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
			tokens.push({ kind: 'op', op: ch });
			i += 1;
			continue;
		}

		if (ch === '{') {
			const end = expression.indexOf('}', i + 1);
			if (end < 0) {
				throw new FormulaParseError();
			}
			const name = expression.slice(i + 1, end).trim();
			if (!name) {
				throw new FormulaParseError();
			}
			tokens.push({ kind: 'ref', name });
			i = end + 1;
			continue;
		}

		if (ch === '"' || ch === "'") {
			const quote = ch;
			i += 1;
			let value = '';
			while (i < expression.length) {
				const next = expression[i];
				if (next === '\\' && i + 1 < expression.length) {
					value += expression[i + 1];
					i += 2;
					continue;
				}
				if (next === quote) {
					i += 1;
					tokens.push({ kind: 'string', value });
					break;
				}
				value += next;
				i += 1;
			}
			if (tokens[tokens.length - 1]?.kind !== 'string') {
				throw new FormulaParseError();
			}
			continue;
		}

		if (ch !== undefined && ((ch >= '0' && ch <= '9') || ch === '.')) {
			const start = i;
			i += 1;
			while (i < expression.length) {
				const next = expression[i];
				if (
					next !== undefined &&
					((next >= '0' && next <= '9') || next === '.')
				) {
					i += 1;
					continue;
				}
				break;
			}
			const raw = expression.slice(start, i);
			if (!/^\d+(\.\d+)?$/.test(raw)) {
				throw new FormulaParseError();
			}
			const value = Number(raw);
			if (!Number.isFinite(value)) {
				throw new FormulaParseError();
			}
			tokens.push({ kind: 'number', value });
			continue;
		}

		if (
			ch !== undefined &&
			((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_')
		) {
			const start = i;
			i += 1;
			while (i < expression.length) {
				const next = expression[i];
				if (
					next !== undefined &&
					((next >= 'A' && next <= 'Z') ||
						(next >= 'a' && next <= 'z') ||
						(next >= '0' && next <= '9') ||
						next === '_')
				) {
					i += 1;
					continue;
				}
				break;
			}
			const name = expression.slice(start, i);
			const upper = name.toUpperCase();
			if (upper === 'TRUE') {
				tokens.push({ kind: 'bool', value: true });
			} else if (upper === 'FALSE') {
				tokens.push({ kind: 'bool', value: false });
			} else {
				tokens.push({ kind: 'ident', name });
			}
			continue;
		}

		throw new FormulaParseError();
	}

	return tokens;
}

function parseTokens(tokens: Token[]): FormulaAst {
	let index = 0;

	const peek = (): Token | undefined => tokens[index];

	const consume = (): Token => {
		const token = tokens[index];
		if (!token) {
			throw new FormulaParseError();
		}
		index += 1;
		return token;
	};

	const parseComparison = (): FormulaAst => {
		let left = parseConcat();
		while (true) {
			const token = peek();
			if (
				!token ||
				token.kind !== 'op' ||
				(token.op !== '==' &&
					token.op !== '!=' &&
					token.op !== '>' &&
					token.op !== '<' &&
					token.op !== '>=' &&
					token.op !== '<=')
			) {
				break;
			}
			consume();
			const right = parseConcat();
			left = { kind: 'binary', op: token.op, left, right };
		}
		return left;
	};

	const parseConcat = (): FormulaAst => {
		let left = parseAdd();
		while (true) {
			const token = peek();
			if (!token || token.kind !== 'op' || token.op !== '&') {
				break;
			}
			consume();
			const right = parseAdd();
			left = { kind: 'binary', op: '&', left, right };
		}
		return left;
	};

	const parseAdd = (): FormulaAst => {
		let left = parseMul();
		while (true) {
			const token = peek();
			if (!token || token.kind !== 'op' || (token.op !== '+' && token.op !== '-')) {
				break;
			}
			consume();
			const right = parseMul();
			left = { kind: 'binary', op: token.op, left, right };
		}
		return left;
	};

	const parseMul = (): FormulaAst => {
		let left = parseUnary();
		while (true) {
			const token = peek();
			if (!token || token.kind !== 'op' || (token.op !== '*' && token.op !== '/')) {
				break;
			}
			consume();
			const right = parseUnary();
			left = { kind: 'binary', op: token.op, left, right };
		}
		return left;
	};

	const parseUnary = (): FormulaAst => {
		const token = peek();
		if (token?.kind === 'op' && token.op === '-') {
			consume();
			return { kind: 'unary', op: '-', arg: parseUnary() };
		}
		if (token?.kind === 'op' && token.op === '+') {
			consume();
			return parseUnary();
		}
		return parsePrimary();
	};

	const parseArgs = (): FormulaAst[] => {
		const args: FormulaAst[] = [];
		if (peek()?.kind === 'rparen') {
			return args;
		}
		args.push(parseComparison());
		while (peek()?.kind === 'comma') {
			consume();
			args.push(parseComparison());
		}
		return args;
	};

	const parsePrimary = (): FormulaAst => {
		const token = consume();
		if (token.kind === 'number') {
			return { kind: 'number', value: token.value };
		}
		if (token.kind === 'string') {
			return { kind: 'string', value: token.value };
		}
		if (token.kind === 'bool') {
			return { kind: 'bool', value: token.value };
		}
		if (token.kind === 'ref') {
			return { kind: 'ref', name: token.name };
		}
		if (token.kind === 'ident') {
			const next = peek();
			if (next?.kind === 'lparen') {
				consume();
				const args = parseArgs();
				const close = consume();
				if (close.kind !== 'rparen') {
					throw new FormulaParseError();
				}
				return { kind: 'call', name: token.name, args };
			}
			throw new FormulaParseError();
		}
		if (token.kind === 'lparen') {
			const inner = parseComparison();
			const close = consume();
			if (close.kind !== 'rparen') {
				throw new FormulaParseError();
			}
			return inner;
		}
		throw new FormulaParseError();
	};

	if (tokens.length === 0) {
		throw new FormulaParseError();
	}

	const ast = parseComparison();
	if (index !== tokens.length) {
		throw new FormulaParseError();
	}
	return ast;
}

function evalCompare(op: BinaryOp, left: FormulaValue, right: FormulaValue): FormulaValue {
	const leftNum = asNumber(left);
	const rightNum = asNumber(right);
	if (leftNum !== null && rightNum !== null) {
		return { kind: 'bool', value: compareNums(op, leftNum, rightNum) };
	}

	const leftDate = asDate(left);
	const rightDate = asDate(right);
	if (leftDate && rightDate) {
		return { kind: 'bool', value: compareNums(op, leftDate.ms, rightDate.ms) };
	}

	const leftBool = asBool(left);
	const rightBool = asBool(right);
	if (leftBool !== null && rightBool !== null) {
		return { kind: 'bool', value: compareNums(op, Number(leftBool), Number(rightBool)) };
	}

	if (left.kind === 'err' || right.kind === 'err') {
		return FORMULA_ERR;
	}

	const leftText = stringifyValue(left) ?? '';
	const rightText = stringifyValue(right) ?? '';
	if (op === '==') {
		return { kind: 'bool', value: leftText === rightText };
	}
	if (op === '!=') {
		return { kind: 'bool', value: leftText !== rightText };
	}
	return { kind: 'bool', value: compareNums(op, leftText < rightText ? -1 : leftText > rightText ? 1 : 0, 0) };
}

function compareNums(op: BinaryOp, left: number, right: number): boolean {
	switch (op) {
		case '==':
			return left === right;
		case '!=':
			return left !== right;
		case '>':
			return left > right;
		case '<':
			return left < right;
		case '>=':
			return left >= right;
		case '<=':
			return left <= right;
		default:
			return false;
	}
}

function evalAdd(op: '+' | '-', left: FormulaValue, right: FormulaValue): FormulaValue {
	if (left.kind === 'err' || right.kind === 'err') {
		return FORMULA_ERR;
	}

	const leftDate = asDate(left);
	const rightNum = asNumber(right);
	if (leftDate && rightNum !== null) {
		return addDays(leftDate.ms, op === '+' ? rightNum : -rightNum, leftDate.datetime);
	}

	const rightDate = asDate(right);
	const leftNum = asNumber(left);
	if (op === '+' && rightDate && leftNum !== null) {
		return addDays(rightDate.ms, leftNum, rightDate.datetime);
	}

	if (leftNum !== null && rightNum !== null) {
		return { kind: 'number', value: op === '+' ? leftNum + rightNum : leftNum - rightNum };
	}

	if (op === '-') {
		return FORMULA_ERR;
	}

	const leftText = stringifyValue(left);
	const rightText = stringifyValue(right);
	if (leftText === null || rightText === null) {
		return FORMULA_ERR;
	}
	return { kind: 'string', value: leftText + rightText };
}

function evalMul(op: '*' | '/', left: FormulaValue, right: FormulaValue): FormulaValue {
	const leftNum = asNumber(left);
	const rightNum = asNumber(right);
	if (leftNum === null || rightNum === null) {
		return FORMULA_ERR;
	}
	if (op === '/') {
		if (rightNum === 0) {
			return FORMULA_ERR;
		}
		return { kind: 'number', value: leftNum / rightNum };
	}
	return { kind: 'number', value: leftNum * rightNum };
}

function evalConcat(left: FormulaValue, right: FormulaValue): FormulaValue {
	const leftText = stringifyValue(left);
	const rightText = stringifyValue(right);
	if (leftText === null || rightText === null) {
		return FORMULA_ERR;
	}
	return { kind: 'string', value: leftText + rightText };
}

function comparableEntries(args: FormulaValue[]): Array<
	| { kind: 'number'; value: number }
	| { kind: 'date'; ms: number; datetime: boolean }
> {
	const entries: Array<
		| { kind: 'number'; value: number }
		| { kind: 'date'; ms: number; datetime: boolean }
	> = [];
	for (const arg of args) {
		if (arg.kind === 'err') {
			continue;
		}
		const num = asNumber(arg);
		if (num !== null) {
			entries.push({ kind: 'number', value: num });
			continue;
		}
		const date = asDate(arg);
		if (date) {
			entries.push({ kind: 'date', ms: date.ms, datetime: date.datetime });
		}
	}
	return entries;
}

function evalMinMax(args: FormulaValue[], mode: 'min' | 'max'): FormulaValue {
	const entries = comparableEntries(args);
	if (entries.length === 0) {
		return FORMULA_ERR;
	}
	const hasDate = entries.some((entry) => entry.kind === 'date');
	const pool = hasDate
		? entries.filter((entry): entry is { kind: 'date'; ms: number; datetime: boolean } => entry.kind === 'date')
		: entries.filter((entry): entry is { kind: 'number'; value: number } => entry.kind === 'number');
	if (pool.length === 0) {
		return FORMULA_ERR;
	}

	const first = pool[0];
	if (!first) {
		return FORMULA_ERR;
	}

	if (first.kind === 'date') {
		let best = first;
		for (const entry of pool) {
			if (entry.kind !== 'date') {
				continue;
			}
			if (mode === 'min' ? entry.ms < best.ms : entry.ms > best.ms) {
				best = entry;
			}
		}
		return { kind: 'date', ms: best.ms, datetime: best.datetime };
	}

	let bestNum = first.value;
	for (const entry of pool) {
		if (entry.kind !== 'number') {
			continue;
		}
		if (mode === 'min' ? entry.value < bestNum : entry.value > bestNum) {
			bestNum = entry.value;
		}
	}
	return { kind: 'number', value: bestNum };
}

function argAt(args: FormulaValue[], index: number): FormulaValue | null {
	return args[index] ?? null;
}

function evalCall(name: string, args: FormulaValue[]): FormulaValue {
	const fn = name.toUpperCase();
	if (args.some((arg) => arg.kind === 'err') && fn !== 'IF' && fn !== 'AND' && fn !== 'OR' && fn !== 'MIN' && fn !== 'MAX' && fn !== 'CONCAT') {
		return FORMULA_ERR;
	}

	switch (fn) {
		case 'MIN':
			return evalMinMax(args, 'min');
		case 'MAX':
			return evalMinMax(args, 'max');
		case 'IF': {
			const condVal = argAt(args, 0);
			const whenTrue = argAt(args, 1);
			const whenFalse = argAt(args, 2);
			if (!condVal || !whenTrue || !whenFalse || args.length !== 3) {
				return FORMULA_ERR;
			}
			const cond = isTruthy(condVal);
			if (cond === null) {
				return FORMULA_ERR;
			}
			return cond ? whenTrue : whenFalse;
		}
		case 'AND': {
			if (args.length === 0) {
				return FORMULA_ERR;
			}
			for (const arg of args) {
				const bit = isTruthy(arg);
				if (bit === null) {
					return FORMULA_ERR;
				}
				if (!bit) {
					return { kind: 'bool', value: false };
				}
			}
			return { kind: 'bool', value: true };
		}
		case 'OR': {
			if (args.length === 0) {
				return FORMULA_ERR;
			}
			for (const arg of args) {
				const bit = isTruthy(arg);
				if (bit === null) {
					return FORMULA_ERR;
				}
				if (bit) {
					return { kind: 'bool', value: true };
				}
			}
			return { kind: 'bool', value: false };
		}
		case 'CONCAT': {
			let out = '';
			for (const arg of args) {
				const text = stringifyValue(arg);
				if (text === null) {
					return FORMULA_ERR;
				}
				out += text;
			}
			return { kind: 'string', value: out };
		}
		case 'LEFT': {
			const source = argAt(args, 0);
			const countVal = argAt(args, 1);
			if (!source || !countVal || args.length !== 2) {
				return FORMULA_ERR;
			}
			const text = stringifyValue(source);
			const count = asNumber(countVal);
			if (text === null || count === null || count < 0) {
				return FORMULA_ERR;
			}
			return { kind: 'string', value: text.slice(0, Math.trunc(count)) };
		}
		case 'RIGHT': {
			const source = argAt(args, 0);
			const countVal = argAt(args, 1);
			if (!source || !countVal || args.length !== 2) {
				return FORMULA_ERR;
			}
			const text = stringifyValue(source);
			const count = asNumber(countVal);
			if (text === null || count === null || count < 0) {
				return FORMULA_ERR;
			}
			const n = Math.trunc(count);
			return { kind: 'string', value: n === 0 ? '' : text.slice(-n) };
		}
		case 'MID': {
			const source = argAt(args, 0);
			const posVal = argAt(args, 1);
			if (!source || !posVal || args.length < 2 || args.length > 3) {
				return FORMULA_ERR;
			}
			const text = stringifyValue(source);
			const pos = asNumber(posVal);
			if (text === null || pos === null) {
				return FORMULA_ERR;
			}
			const start = Math.trunc(pos) - 1;
			if (start < 0) {
				return FORMULA_ERR;
			}
			if (args.length === 2) {
				return { kind: 'string', value: text.slice(start) };
			}
			const countVal = argAt(args, 2);
			if (!countVal) {
				return FORMULA_ERR;
			}
			const count = asNumber(countVal);
			if (count === null || count < 0) {
				return FORMULA_ERR;
			}
			return { kind: 'string', value: text.slice(start, start + Math.trunc(count)) };
		}
		case 'LOWER': {
			const source = argAt(args, 0);
			if (!source || args.length !== 1) {
				return FORMULA_ERR;
			}
			const text = stringifyValue(source);
			return text === null ? FORMULA_ERR : { kind: 'string', value: text.toLowerCase() };
		}
		case 'UPPER': {
			const source = argAt(args, 0);
			if (!source || args.length !== 1) {
				return FORMULA_ERR;
			}
			const text = stringifyValue(source);
			return text === null ? FORMULA_ERR : { kind: 'string', value: text.toUpperCase() };
		}
		case 'SEARCH': {
			const source = argAt(args, 0);
			const needleVal = argAt(args, 1);
			if (!source || !needleVal || args.length !== 2) {
				return FORMULA_ERR;
			}
			const text = stringifyValue(source);
			const needle = stringifyValue(needleVal);
			if (text === null || needle === null) {
				return FORMULA_ERR;
			}
			if (needle.length === 0) {
				return { kind: 'number', value: 1 };
			}
			const found = text.indexOf(needle);
			return { kind: 'number', value: found < 0 ? 0 : found + 1 };
		}
		default:
			return FORMULA_ERR;
	}
}

function evalAst(
	ast: FormulaAst,
	resolve: (name: string) => FormulaValue,
): FormulaValue {
	switch (ast.kind) {
		case 'number':
			return { kind: 'number', value: ast.value };
		case 'string':
			return { kind: 'string', value: ast.value };
		case 'bool':
			return { kind: 'bool', value: ast.value };
		case 'ref':
			return resolve(ast.name);
		case 'unary': {
			const arg = evalAst(ast.arg, resolve);
			const num = asNumber(arg);
			if (num === null) {
				return FORMULA_ERR;
			}
			return { kind: 'number', value: -num };
		}
		case 'binary': {
			const left = evalAst(ast.left, resolve);
			const right = evalAst(ast.right, resolve);
			switch (ast.op) {
				case '+':
				case '-':
					return evalAdd(ast.op, left, right);
				case '*':
				case '/':
					return evalMul(ast.op, left, right);
				case '&':
					return evalConcat(left, right);
				default:
					return evalCompare(ast.op, left, right);
			}
		}
		case 'call':
			return evalCall(
				ast.name,
				ast.args.map((arg) => evalAst(arg, resolve)),
			);
	}
}

export function evaluateFormula(
	expression: string,
	resolve: (name: string) => FormulaValue,
): FormulaValue {
	const trimmed = expression.trim();
	if (!trimmed) {
		return { kind: 'string', value: '' };
	}

	try {
		return evalAst(parseTokens(tokenize(trimmed)), resolve);
	} catch {
		return FORMULA_ERR;
	}
}

/** Names a field can be referenced by inside `{...}`. */
export function formulaRefAliases(field: CardFieldDef): string[] {
	const names: string[] = [];
	const label = field.label.trim();
	if (label) {
		names.push(label);
	}
	if (field.type === 'property') {
		const property = field.property.trim();
		if (property) {
			names.push(property);
		}
	}
	if (field.type === 'namedParagraph') {
		const header = field.header.trim();
		if (header) {
			names.push(header);
		}
	}
	return names;
}

/**
 * Resolve `{name}` to another display field: label, named-paragraph header,
 * then property key. Exact match first, then case-insensitive.
 */
export function findFieldByRef(
	fields: CardFieldDef[],
	name: string,
	excludeId: string,
): CardFieldDef | undefined {
	const trimmed = name.trim();
	if (!trimmed) {
		return undefined;
	}
	const lower = trimmed.toLowerCase();
	const others = fields.filter((field) => field.id !== excludeId);

	const match = (
		pred: (field: CardFieldDef) => boolean,
	): CardFieldDef | undefined => others.find(pred);

	return (
		match((field) => field.label.trim() === trimmed) ??
		match(
			(field) =>
				field.type === 'namedParagraph' && field.header.trim() === trimmed,
		) ??
		match(
			(field) => field.type === 'property' && field.property.trim() === trimmed,
		) ??
		match((field) => field.label.trim().toLowerCase() === lower) ??
		match(
			(field) =>
				field.type === 'namedParagraph' &&
				field.header.trim().toLowerCase() === lower,
		) ??
		match(
			(field) =>
				field.type === 'property' && field.property.trim().toLowerCase() === lower,
		)
	);
}
