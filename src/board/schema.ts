export const BOARD_VERSION = 1 as const;
export const UNKNOWN_COLUMN_ID = '__unknown__';
export const UNKNOWN_COLUMN_LABEL = 'Unknown';
export const CARD_INFO_NAME_ID = '__name__';
export const TABLE_COLUMN_NAME_ID = CARD_INFO_NAME_ID;
/** Sentinel property for sorting by note title (header name). */
export const SORT_HEADER_NAME_ID = CARD_INFO_NAME_ID;

export type LimitTo =
	| { mode: 'all' }
	| { mode: 'siblings' }
	| { mode: 'folder'; path: string };

export type BoardViewType = 'kanban' | 'table';
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
export type FilterCheckboxOp = 'is_true' | 'is_false';
export type FilterOp = FilterTextOp | FilterNumericOp | FilterCheckboxOp;

export interface FilterRule {
	id: string;
	combinator: FilterCombinator;
	source: FilterSource;
	property: string;
	op: FilterOp;
	value: string;
	enabled: boolean;
}

/** Shared match fields used by filters and card color rules. */
export interface RuleCondition {
	source: FilterSource;
	property: string;
	op: FilterOp;
	value: string;
}

export type CardColorEffect =
	| { kind: 'color'; hex: string }
	| { kind: 'reset' }
	| { kind: 'none' };

export interface CardColorRule extends RuleCondition {
	id: string;
	enabled: boolean;
	border: CardColorEffect;
	background: CardColorEffect;
}

export type SortDirection = 'asc' | 'desc';

export interface SortRule {
	id: string;
	/** Frontmatter property name, or `SORT_HEADER_NAME_ID` for note title. */
	property: string;
	direction: SortDirection;
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

export interface TableValueDef {
	id: string;
	type: CardFieldType;
	property: string;
	label: string;
	showIfMissing: boolean;
}

export type TableColumnItem =
	| { id: typeof TABLE_COLUMN_NAME_ID; kind: 'name'; enabled: boolean }
	| { id: string; kind: 'field'; fieldId: string; enabled: boolean };

export interface KanbanViewConfig {
	id: string;
	type: 'kanban';
	name: string;
	triggerProperty: string;
	values: string[];
	columnColors: Record<string, string>;
	cardFields: CardFieldDef[];
	cardInfo: CardInfoItem[];
	filters: FilterRule[];
	sorts: SortRule[];
	cardColors: CardColorRule[];
}

export interface TableViewConfig {
	id: string;
	type: 'table';
	name: string;
	values: TableValueDef[];
	columns: TableColumnItem[];
	columnWidths: Record<string, number>;
	filters: FilterRule[];
	sorts: SortRule[];
	cardColors: CardColorRule[];
}

export type BoardViewConfig = KanbanViewConfig | TableViewConfig;

export function isKanbanView(view: BoardViewConfig): view is KanbanViewConfig {
	return view.type === 'kanban';
}

export function isTableView(view: BoardViewConfig): view is TableViewConfig {
	return view.type === 'table';
}

export interface BoardSettings {
	limitTo: LimitTo;
}

/** Effective indexing config: board scope + active view column settings. */
export type NoteIndexConfig =
	| {
			indexMode: 'kanban';
			limitTo: LimitTo;
			triggerProperty: string;
			values: string[];
	  }
	| {
			indexMode: 'table';
			limitTo: LimitTo;
	  };

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
		op: 'eq',
		value: '',
		enabled: true,
	};
}

export function createDefaultCardColorRule(): CardColorRule {
	return {
		id: createId(),
		source: 'property',
		property: '',
		op: 'eq',
		value: '',
		enabled: true,
		border: { kind: 'none' },
		background: { kind: 'none' },
	};
}

export function createDefaultSortRule(): SortRule {
	return {
		id: createId(),
		property: '',
		direction: 'asc',
		enabled: true,
	};
}

export const DEFAULT_TRIGGER_PROPERTY = 'status';
export const DEFAULT_VALUES = ['todo', 'in-progress', 'done'];

export function createDefaultKanbanView(name = 'Kanban'): KanbanViewConfig {
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
		sorts: [],
		cardColors: [],
	};
}

export function createDefaultTableColumns(): TableColumnItem[] {
	return [{ id: TABLE_COLUMN_NAME_ID, kind: 'name', enabled: true }];
}

export function createDefaultTableView(name = 'Table'): TableViewConfig {
	return {
		id: createId(),
		type: 'table',
		name,
		values: [],
		columns: createDefaultTableColumns(),
		columnWidths: {},
		filters: [],
		sorts: [],
		cardColors: [],
	};
}

export function cloneView(source: BoardViewConfig): BoardViewConfig {
	return {
		...structuredClone(source),
		id: createId(),
		name: `${source.name} copy`,
	};
}

/** @deprecated Use cloneView instead */
export function cloneKanbanView(source: KanbanViewConfig): KanbanViewConfig {
	return cloneView(source) as KanbanViewConfig;
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
	return (
		op !== 'empty' &&
		op !== 'not_empty' &&
		op !== 'is_true' &&
		op !== 'is_false'
	);
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
const CHECKBOX_OPS: FilterCheckboxOp[] = ['is_true', 'is_false'];
const COMBINATORS: FilterCombinator[] = ['and', 'or', 'not'];
const SOURCES: FilterSource[] = ['property', 'body'];
const SORT_DIRECTIONS: SortDirection[] = ['asc', 'desc'];

export function isTextOp(op: string): op is FilterTextOp {
	return (TEXT_OPS as string[]).includes(op);
}

export function isNumericOp(op: string): op is FilterNumericOp {
	return (NUMERIC_OPS as string[]).includes(op);
}

export function isCheckboxOp(op: string): op is FilterCheckboxOp {
	return (CHECKBOX_OPS as string[]).includes(op);
}

function parseFilterOp(raw: unknown): FilterOp {
	if (typeof raw !== 'string') {
		return 'eq';
	}
	if (isTextOp(raw) || isNumericOp(raw) || isCheckboxOp(raw)) {
		return raw;
	}
	return 'eq';
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

export function createTableValueDef(
	partial: Partial<Omit<TableValueDef, 'id' | 'type'>> = {},
): TableValueDef {
	return {
		id: createId(),
		type: 'property',
		property: partial.property ?? '',
		label: partial.label ?? '',
		showIfMissing: partial.showIfMissing ?? false,
	};
}

export function getViewPropertyFields(
	view: BoardViewConfig,
): Array<{ property: string; label: string }> {
	if (isKanbanView(view)) {
		return view.cardFields.map((field) => ({
			property: field.property,
			label: field.label,
		}));
	}
	return view.values.map((value) => ({
		property: value.property,
		label: value.label,
	}));
}

/** Ensure Name exists; drop orphan field refs; keep order. */
export function normalizeTableColumns(
	columns: TableColumnItem[],
	values: TableValueDef[],
): TableColumnItem[] {
	const fieldIds = new Set(values.map((value) => value.id));
	const seen = new Set<string>();
	const result: TableColumnItem[] = [];

	for (const item of columns) {
		if (item.kind === 'name') {
			if (seen.has(TABLE_COLUMN_NAME_ID)) {
				continue;
			}
			seen.add(TABLE_COLUMN_NAME_ID);
			result.push({
				id: TABLE_COLUMN_NAME_ID,
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

	if (!seen.has(TABLE_COLUMN_NAME_ID)) {
		result.unshift({
			id: TABLE_COLUMN_NAME_ID,
			kind: 'name',
			enabled: true,
		});
	}

	for (const value of values) {
		if (result.some((item) => item.kind === 'field' && item.fieldId === value.id)) {
			continue;
		}
		result.push({
			id: createId(),
			kind: 'field',
			fieldId: value.id,
			enabled: true,
		});
	}

	return result;
}

export function addTableValueToView(view: TableViewConfig): TableViewConfig {
	const value = createTableValueDef();
	const values = [...view.values, value];
	const columns = [
		...view.columns,
		{ id: createId(), kind: 'field' as const, fieldId: value.id, enabled: true },
	];
	return {
		...view,
		values,
		columns: normalizeTableColumns(columns, values),
	};
}

export function removeTableValueFromView(
	view: TableViewConfig,
	valueId: string,
): TableViewConfig {
	const values = view.values.filter((value) => value.id !== valueId);
	const columns = view.columns.filter(
		(item) => !(item.kind === 'field' && item.fieldId === valueId),
	);
	return {
		...view,
		values,
		columns: normalizeTableColumns(columns, values),
	};
}

export function addCardFieldToView(view: KanbanViewConfig): KanbanViewConfig {
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
	view: KanbanViewConfig,
	fieldId: string,
): KanbanViewConfig {
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

	return {
		id: raw.id,
		combinator,
		source,
		property: typeof raw.property === 'string' ? raw.property : '',
		op: parseFilterOp(raw.op),
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

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function parseCardColorEffect(raw: unknown): CardColorEffect {
	if (!isRecord(raw) || typeof raw.kind !== 'string') {
		return { kind: 'none' };
	}
	if (raw.kind === 'reset') {
		return { kind: 'reset' };
	}
	if (raw.kind === 'color' && typeof raw.hex === 'string' && HEX_COLOR_RE.test(raw.hex)) {
		return { kind: 'color', hex: raw.hex };
	}
	return { kind: 'none' };
}

function parseCardColorRule(raw: unknown): CardColorRule | null {
	if (!isRecord(raw) || typeof raw.id !== 'string') {
		return null;
	}

	const source = SOURCES.includes(raw.source as FilterSource)
		? (raw.source as FilterSource)
		: 'property';

	return {
		id: raw.id,
		source,
		property: typeof raw.property === 'string' ? raw.property : '',
		op: parseFilterOp(raw.op),
		value: typeof raw.value === 'string' ? raw.value : '',
		enabled: raw.enabled !== false,
		border: parseCardColorEffect(raw.border),
		background: parseCardColorEffect(raw.background),
	};
}

function parseCardColors(raw: unknown): CardColorRule[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	const rules: CardColorRule[] = [];
	for (const item of raw) {
		const rule = parseCardColorRule(item);
		if (rule) {
			rules.push(rule);
		}
	}
	return rules;
}

function parseSortDirection(raw: unknown): SortDirection {
	if (typeof raw === 'string' && (SORT_DIRECTIONS as string[]).includes(raw)) {
		return raw as SortDirection;
	}
	return 'asc';
}

function parseSortRule(raw: unknown): SortRule | null {
	if (!isRecord(raw) || typeof raw.id !== 'string') {
		return null;
	}

	return {
		id: raw.id,
		property: typeof raw.property === 'string' ? raw.property : '',
		direction: parseSortDirection(raw.direction),
		enabled: raw.enabled !== false,
	};
}

function parseSorts(raw: unknown): SortRule[] {
	if (!Array.isArray(raw)) {
		return [];
	}
	const sorts: SortRule[] = [];
	for (const item of raw) {
		const rule = parseSortRule(item);
		if (rule) {
			sorts.push(rule);
		}
	}
	return sorts;
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

function parseTableValues(raw: unknown): TableValueDef[] {
	if (!Array.isArray(raw)) {
		return [];
	}

	const values: TableValueDef[] = [];
	for (const item of raw) {
		if (!isRecord(item) || typeof item.id !== 'string') {
			continue;
		}
		if (item.type !== 'property') {
			continue;
		}
		values.push({
			id: item.id,
			type: 'property',
			property: typeof item.property === 'string' ? item.property : '',
			label: typeof item.label === 'string' ? item.label : '',
			showIfMissing: Boolean(item.showIfMissing),
		});
	}
	return values;
}

function parseTableColumns(
	raw: unknown,
	values: TableValueDef[],
): TableColumnItem[] {
	const items: TableColumnItem[] = [];
	if (!Array.isArray(raw)) {
		return normalizeTableColumns(createDefaultTableColumns(), values);
	}

	for (const item of raw) {
		if (!isRecord(item) || typeof item.id !== 'string') {
			continue;
		}
		if (item.kind === 'name' || item.id === TABLE_COLUMN_NAME_ID) {
			items.push({
				id: TABLE_COLUMN_NAME_ID,
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

	return normalizeTableColumns(items, values);
}

function parseColumnWidths(raw: unknown): Record<string, number> {
	if (!isRecord(raw)) {
		return {};
	}
	const widths: Record<string, number> = {};
	for (const [key, value] of Object.entries(raw)) {
		if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
			widths[key] = value;
		}
	}
	return widths;
}

function parseKanbanView(
	item: Record<string, unknown>,
	legacy: LegacyBoardSettings,
): KanbanViewConfig | null {
	if (typeof item.id !== 'string' || typeof item.name !== 'string') {
		return null;
	}

	const cardFields = parseCardFields(item.cardFields);
	const hasViewTrigger = typeof item.triggerProperty === 'string';
	const hasViewValues = Array.isArray(item.values);
	const hasViewColors = isRecord(item.columnColors);

	return {
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
		sorts: parseSorts(item.sorts),
		cardColors: parseCardColors(item.cardColors),
	};
}

function parseTableView(item: Record<string, unknown>): TableViewConfig | null {
	if (typeof item.id !== 'string' || typeof item.name !== 'string') {
		return null;
	}

	const values = parseTableValues(item.values);

	return {
		id: item.id,
		type: 'table',
		name: item.name.trim() || 'Table',
		values,
		columns: parseTableColumns(item.columns, values),
		columnWidths: parseColumnWidths(item.columnWidths),
		filters: parseFilters(item.filters),
		sorts: parseSorts(item.sorts),
		cardColors: parseCardColors(item.cardColors),
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
		if (item.type === 'kanban') {
			const view = parseKanbanView(item, legacy);
			if (view) {
				views.push(view);
			}
			continue;
		}
		if (item.type === 'table') {
			const view = parseTableView(item);
			if (view) {
				views.push(view);
			}
		}
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
