export const BOARD_VERSION = 1 as const;
export const UNKNOWN_COLUMN_ID = '__unknown__';
export const UNKNOWN_COLUMN_LABEL = 'Unknown';
export const CARD_INFO_NAME_ID = '__name__';

export type LimitTo =
	| { mode: 'all' }
	| { mode: 'siblings' }
	| { mode: 'folder'; path: string };

export type BoardViewType = 'kanban';
export type CardFieldType = 'property';

export type FilterCombinator = 'and' | 'or' | 'not';
export type FilterSource = 'property' | 'body';
export type FilterTextOp =
	| 'eq'
	| 'neq'
	| 'contains'
	| 'not_contains'
	| 'empty'
	| 'not_empty';
export type FilterNumericOp = 'eq' | 'neq' | 'lte' | 'lt' | 'gt' | 'gte';
export type FilterOp = FilterTextOp | FilterNumericOp;

export interface FilterRule {
	id: string;
	combinator: FilterCombinator;
	source: FilterSource;
	property: string;
	numeric: boolean;
	op: FilterOp;
	value: string;
	enabled: boolean;
}

export interface CardFieldDef {
	id: string;
	type: CardFieldType;
	property: string;
	label: string;
	showIfMissing: boolean;
}

export type CardInfoItem =
	| { id: typeof CARD_INFO_NAME_ID; kind: 'name'; enabled: boolean }
	| { id: string; kind: 'field'; fieldId: string; enabled: boolean };

export interface BoardViewConfig {
	id: string;
	type: BoardViewType;
	name: string;
	triggerProperty: string;
	values: string[];
	columnColors: Record<string, string>;
	cardFields: CardFieldDef[];
	cardInfo: CardInfoItem[];
	filters: FilterRule[];
}

export interface BoardSettings {
	limitTo: LimitTo;
}

/** Effective indexing config: board scope + active view column settings. */
export interface NoteIndexConfig {
	limitTo: LimitTo;
	triggerProperty: string;
	values: string[];
}

export interface BoardDocument {
	version: typeof BOARD_VERSION;
	name: string;
	settings: BoardSettings;
	views: BoardViewConfig[];
	activeViewId: string | null;
}

export function createId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultCardInfo(): CardInfoItem[] {
	return [{ id: CARD_INFO_NAME_ID, kind: 'name', enabled: true }];
}

export function createDefaultFilterRule(): FilterRule {
	return {
		id: createId(),
		combinator: 'and',
		source: 'property',
		property: '',
		numeric: false,
		op: 'eq',
		value: '',
		enabled: true,
	};
}

export const DEFAULT_TRIGGER_PROPERTY = 'status';
export const DEFAULT_VALUES = ['todo', 'in-progress', 'done'];

export function createDefaultKanbanView(name = 'Kanban'): BoardViewConfig {
	return {
		id: createId(),
		type: 'kanban',
		name,
		triggerProperty: DEFAULT_TRIGGER_PROPERTY,
		values: [...DEFAULT_VALUES],
		columnColors: {},
		cardFields: [],
		cardInfo: createDefaultCardInfo(),
		filters: [],
	};
}

export function cloneKanbanView(source: BoardViewConfig): BoardViewConfig {
	return {
		...structuredClone(source),
		id: createId(),
		name: `${source.name} copy`,
	};
}

export function createDefaultDocument(name = 'Untitled'): BoardDocument {
	const view = createDefaultKanbanView('Kanban');
	return {
		version: BOARD_VERSION,
		name,
		settings: {
			limitTo: { mode: 'all' },
		},
		views: [view],
		activeViewId: view.id,
	};
}

export function opNeedsValue(op: FilterOp): boolean {
	return op !== 'empty' && op !== 'not_empty';
}

const TEXT_OPS: FilterTextOp[] = [
	'eq',
	'neq',
	'contains',
	'not_contains',
	'empty',
	'not_empty',
];
const NUMERIC_OPS: FilterNumericOp[] = ['eq', 'neq', 'lte', 'lt', 'gt', 'gte'];
const COMBINATORS: FilterCombinator[] = ['and', 'or', 'not'];
const SOURCES: FilterSource[] = ['property', 'body'];

export function isTextOp(op: string): op is FilterTextOp {
	return (TEXT_OPS as string[]).includes(op);
}

export function isNumericOp(op: string): op is FilterNumericOp {
	return (NUMERIC_OPS as string[]).includes(op);
}

export function coerceFilterOp(op: FilterOp, numeric: boolean): FilterOp {
	if (numeric) {
		return isNumericOp(op) ? op : 'eq';
	}
	return isTextOp(op) ? op : 'eq';
}

export function createCardFieldDef(
	partial: Partial<Omit<CardFieldDef, 'id' | 'type'>> = {},
): CardFieldDef {
	return {
		id: createId(),
		type: 'property',
		property: partial.property ?? '',
		label: partial.label ?? '',
		showIfMissing: partial.showIfMissing ?? false,
	};
}

/** Ensure Name exists; drop orphan field refs; keep order. */
export function normalizeCardInfo(
	cardInfo: CardInfoItem[],
	cardFields: CardFieldDef[],
): CardInfoItem[] {
	const fieldIds = new Set(cardFields.map((field) => field.id));
	const seen = new Set<string>();
	const result: CardInfoItem[] = [];

	for (const item of cardInfo) {
		if (item.kind === 'name') {
			if (seen.has(CARD_INFO_NAME_ID)) {
				continue;
			}
			seen.add(CARD_INFO_NAME_ID);
			result.push({
				id: CARD_INFO_NAME_ID,
				kind: 'name',
				enabled: item.enabled,
			});
			continue;
		}

		if (!fieldIds.has(item.fieldId) || seen.has(item.id)) {
			continue;
		}
		seen.add(item.id);
		result.push({
			id: item.id,
			kind: 'field',
			fieldId: item.fieldId,
			enabled: item.enabled,
		});
	}

	if (!seen.has(CARD_INFO_NAME_ID)) {
		result.unshift({
			id: CARD_INFO_NAME_ID,
			kind: 'name',
			enabled: true,
		});
	}

	for (const field of cardFields) {
		if (result.some((item) => item.kind === 'field' && item.fieldId === field.id)) {
			continue;
		}
		result.push({
			id: createId(),
			kind: 'field',
			fieldId: field.id,
			enabled: true,
		});
	}

	return result;
}

export function addCardFieldToView(view: BoardViewConfig): BoardViewConfig {
	const field = createCardFieldDef();
	const cardFields = [...view.cardFields, field];
	const cardInfo = [
		...view.cardInfo,
		{ id: createId(), kind: 'field' as const, fieldId: field.id, enabled: true },
	];
	return {
		...view,
		cardFields,
		cardInfo: normalizeCardInfo(cardInfo, cardFields),
	};
}

export function removeCardFieldFromView(
	view: BoardViewConfig,
	fieldId: string,
): BoardViewConfig {
	const cardFields = view.cardFields.filter((field) => field.id !== fieldId);
	const cardInfo = view.cardInfo.filter(
		(item) => !(item.kind === 'field' && item.fieldId === fieldId),
	);
	return {
		...view,
		cardFields,
		cardInfo: normalizeCardInfo(cardInfo, cardFields),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLimitTo(raw: unknown): LimitTo {
	if (!isRecord(raw) || typeof raw.mode !== 'string') {
		return { mode: 'all' };
	}

	if (raw.mode === 'siblings') {
		return { mode: 'siblings' };
	}

	if (raw.mode === 'folder') {
		const path = typeof raw.path === 'string' ? raw.path.trim() : '';
		return { mode: 'folder', path };
	}

	return { mode: 'all' };
}

function parseCardFields(raw: unknown): CardFieldDef[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const fields: CardFieldDef[] = [];
	for (const item of raw) {
		if (!isRecord(item) || typeof item.id !== 'string') {
			continue;
		}
		if (item.type !== 'property') {
			continue;
		}
		fields.push({
			id: item.id,
			type: 'property',
			property: typeof item.property === 'string' ? item.property : '',
			label: typeof item.label === 'string' ? item.label : '',
			showIfMissing: Boolean(item.showIfMissing),
		});
	}
	return fields;
}

function parseCardInfo(raw: unknown, cardFields: CardFieldDef[]): CardInfoItem[] {
	const items: CardInfoItem[] = [];
	if (!Array.isArray(raw)) {
		return normalizeCardInfo(createDefaultCardInfo(), cardFields);
	}

	for (const item of raw) {
		if (!isRecord(item) || typeof item.id !== 'string') {
			continue;
		}
		if (item.kind === 'name' || item.id === CARD_INFO_NAME_ID) {
			items.push({
				id: CARD_INFO_NAME_ID,
				kind: 'name',
				enabled: item.enabled !== false,
			});
			continue;
		}
		if (item.kind === 'field' && typeof item.fieldId === 'string') {
			items.push({
				id: item.id,
				kind: 'field',
				fieldId: item.fieldId,
				enabled: item.enabled !== false,
			});
		}
	}

	return normalizeCardInfo(items, cardFields);
}

function parseFilterRule(raw: unknown): FilterRule | null {
	if (!isRecord(raw) || typeof raw.id !== 'string') {
		return null;
	}

	const combinator = COMBINATORS.includes(raw.combinator as FilterCombinator)
		? (raw.combinator as FilterCombinator)
		: 'and';
	const source = SOURCES.includes(raw.source as FilterSource)
		? (raw.source as FilterSource)
		: 'property';
	const numeric = source === 'property' && Boolean(raw.numeric);
	const rawOp = typeof raw.op === 'string' ? raw.op : 'eq';
	const op = coerceFilterOp(
		(isTextOp(rawOp) || isNumericOp(rawOp) ? rawOp : 'eq') as FilterOp,
		numeric,
	);

	return {
		id: raw.id,
		combinator,
		source,
		property: typeof raw.property === 'string' ? raw.property : '',
		numeric,
		op,
		value: typeof raw.value === 'string' ? raw.value : '',
		enabled: raw.enabled !== false,
	};
}

function parseFilters(raw: unknown): FilterRule[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	const filters: FilterRule[] = [];
	for (const item of raw) {
		const rule = parseFilterRule(item);
		if (rule) {
			filters.push(rule);
		}
	}
	return filters;
}

function parseValues(raw: unknown, fallback: string[]): string[] {
	if (!Array.isArray(raw)) {
		return [...fallback];
	}
	const values = raw
		.filter((value): value is string => typeof value === 'string')
		.map((value) => value.trim())
		.filter((value) => value.length > 0);
	return values.length > 0 ? values : [...fallback];
}

function parseTriggerProperty(raw: unknown, fallback: string): string {
	if (typeof raw === 'string' && raw.trim()) {
		return raw.trim();
	}
	return fallback;
}

interface LegacyBoardSettings {
	limitTo: LimitTo;
	triggerProperty: string;
	values: string[];
	columnColors: Record<string, string>;
}

function parseLegacySettings(raw: unknown): LegacyBoardSettings {
	const defaults = {
		triggerProperty: DEFAULT_TRIGGER_PROPERTY,
		values: [...DEFAULT_VALUES],
		columnColors: {} as Record<string, string>,
	};
	if (!isRecord(raw)) {
		return {
			limitTo: { mode: 'all' },
			...defaults,
		};
	}

	return {
		limitTo: parseLimitTo(raw.limitTo),
		triggerProperty: parseTriggerProperty(raw.triggerProperty, defaults.triggerProperty),
		values: parseValues(raw.values, defaults.values),
		columnColors: parseColumnColors(raw.columnColors),
	};
}

function parseViews(
	raw: unknown,
	legacy: LegacyBoardSettings,
): BoardViewConfig[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const views: BoardViewConfig[] = [];
	for (const item of raw) {
		if (!isRecord(item)) {
			continue;
		}
		if (typeof item.id !== 'string' || typeof item.name !== 'string') {
			continue;
		}
		if (item.type !== 'kanban') {
			continue;
		}
		const cardFields = parseCardFields(item.cardFields);
		const hasViewTrigger = typeof item.triggerProperty === 'string';
		const hasViewValues = Array.isArray(item.values);
		const hasViewColors = isRecord(item.columnColors);

		views.push({
			id: item.id,
			type: 'kanban',
			name: item.name.trim() || 'Kanban',
			triggerProperty: hasViewTrigger
				? parseTriggerProperty(item.triggerProperty, legacy.triggerProperty)
				: legacy.triggerProperty,
			values: hasViewValues
				? parseValues(item.values, legacy.values)
				: [...legacy.values],
			columnColors: hasViewColors
				? parseColumnColors(item.columnColors)
				: { ...legacy.columnColors },
			cardFields,
			cardInfo: parseCardInfo(item.cardInfo, cardFields),
			filters: parseFilters(item.filters),
		});
	}
	return views;
}

function parseColumnColors(raw: unknown): Record<string, string> {
	if (!isRecord(raw)) {
		return {};
	}
	const colors: Record<string, string> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (typeof value === 'string' && value.trim()) {
			colors[key] = value.trim();
		}
	}
	return colors;
}

/** Parse board JSON; always returns a usable document (repairs missing pieces). */
export function parseBoardDocument(raw: string, fallbackName = 'Untitled'): BoardDocument {
	const defaults = createDefaultDocument(fallbackName);
	const trimmed = raw.trim();

	if (!trimmed) {
		return defaults;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		throw new Error('Board file is not valid JSON');
	}

	if (!isRecord(parsed)) {
		throw new Error('Board file must contain a JSON object');
	}

	const name =
		typeof parsed.name === 'string' && parsed.name.trim()
			? parsed.name.trim()
			: fallbackName;

	const legacy = parseLegacySettings(parsed.settings);
	const settings: BoardSettings = { limitTo: legacy.limitTo };
	const views = Array.isArray(parsed.views)
		? parseViews(parsed.views, legacy)
		: defaults.views;

	let activeViewId =
		typeof parsed.activeViewId === 'string' ? parsed.activeViewId : null;

	if (!activeViewId || !views.some((view) => view.id === activeViewId)) {
		activeViewId = views[0]?.id ?? null;
	}

	return {
		version: BOARD_VERSION,
		name,
		settings,
		views: views.length > 0 ? views : defaults.views,
		activeViewId,
	};
}

export function serializeBoardDocument(doc: BoardDocument): string {
	return `${JSON.stringify(doc, null, 2)}\n`;
}
