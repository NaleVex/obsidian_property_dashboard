import { App } from 'obsidian';
import {
	FilterCheckboxOp,
	FilterNumericOp,
	FilterOp,
	FilterTextOp,
	SORT_HEADER_NAME_ID,
} from '../board/schema';
import { strings } from '../i18n';
import { getFilePropertyType, isFileProperty } from './fileProperties';

export type PropertyValueType =
	| 'text'
	| 'number'
	| 'date'
	| 'datetime'
	| 'checkbox';

export interface PropertyInfoLike {
	/** Current Obsidian: widget type id (e.g. "number"). */
	widget?: string;
	/** Older Obsidian / types.json-shaped entries. */
	type?: string;
	name?: string;
}

export interface PropertyWidgetLike {
	icon?: string;
	type?: string;
}

export interface MetadataTypeManagerLike {
	/** Current Obsidian. */
	getAssignedWidget?: (property: string) => string | null | undefined;
	/** Legacy Obsidian. */
	getAssignedType?: (property: string) => string | null | undefined;
	getPropertyInfo?: (property: string) => PropertyInfoLike | null | undefined;
	getAllProperties?: () => Record<string, PropertyInfoLike | undefined>;
	properties?: Record<string, PropertyInfoLike | undefined>;
	assignedWidgets?: Record<string, PropertyInfoLike | undefined>;
	types?: Record<string, string | PropertyInfoLike | undefined>;
	registeredTypeWidgets?: Record<string, PropertyWidgetLike | undefined>;
}

export function getMetadataTypeManager(
	app: App,
): MetadataTypeManagerLike | undefined {
	return (app as App & { metadataTypeManager?: MetadataTypeManagerLike })
		.metadataTypeManager;
}

const DEFAULT_PROPERTY_ICON = 'lucide-text';

const WIDGET_ICON_FALLBACKS: Record<string, string> = {
	text: DEFAULT_PROPERTY_ICON,
	number: 'binary',
	date: 'calendar',
	datetime: 'calendar-clock',
	checkbox: 'check-square',
	aliases: 'forward',
	tags: 'tags',
	multitext: 'list',
};

/** Lucide icon name for an Obsidian property widget type. */
export function iconForWidgetType(
	app: App,
	widgetType: string | null | undefined,
): string {
	const raw = widgetType?.trim();
	if (!raw) {
		return DEFAULT_PROPERTY_ICON;
	}
	const manager = getMetadataTypeManager(app);
	const fromWidget = manager?.registeredTypeWidgets?.[raw]?.icon?.trim();
	if (fromWidget) {
		return fromWidget;
	}
	return WIDGET_ICON_FALLBACKS[raw] ?? DEFAULT_PROPERTY_ICON;
}

/** Resolve widget type id string for a frontmatter property (not file.*). */
export function getPropertyWidgetType(
	app: App,
	property: string,
): string | null {
	const key = property.trim();
	if (!key || key === SORT_HEADER_NAME_ID || isFileProperty(key)) {
		return null;
	}

	const manager = getMetadataTypeManager(app);
	if (!manager) {
		return null;
	}

	const normalized = key.toLowerCase();
	const candidates = normalized === key ? [normalized] : [normalized, key];

	for (const candidate of candidates) {
		const assigned =
			manager.getAssignedWidget?.(candidate) ??
			manager.getAssignedType?.(candidate);
		if (assigned) {
			return assigned.trim();
		}
	}

	for (const candidate of candidates) {
		const fromAssignedWidgets = widgetFromEntry(
			manager.assignedWidgets?.[candidate],
		);
		if (fromAssignedWidgets) {
			return fromAssignedWidgets;
		}

		const fromInfo = widgetFromEntry(
			manager.getPropertyInfo?.(candidate) ?? null,
		);
		if (fromInfo) {
			return fromInfo;
		}

		const fromProperties = widgetFromEntry(manager.properties?.[candidate]);
		if (fromProperties) {
			return fromProperties;
		}

		const fromTypes = widgetFromEntry(manager.types?.[candidate]);
		if (fromTypes) {
			return fromTypes;
		}
	}

	return null;
}

const TEXT_OPS: FilterTextOp[] = [
	'eq',
	'neq',
	'contains',
	'not_contains',
	'empty',
	'not_empty',
];

const COMPARE_OPS: FilterNumericOp[] = ['eq', 'neq', 'lte', 'lt', 'gt', 'gte'];

const CHECKBOX_OPS: FilterCheckboxOp[] = ['is_true', 'is_false'];

function textOpOptions(): Array<{ value: FilterOp; label: string }> {
	return [
		{ value: 'eq', label: strings.ops.eq },
		{ value: 'neq', label: strings.ops.neq },
		{ value: 'contains', label: strings.ops.contains },
		{ value: 'not_contains', label: strings.ops.notContains },
		{ value: 'empty', label: strings.ops.empty },
		{ value: 'not_empty', label: strings.ops.notEmpty },
	];
}

function compareOpOptions(): Array<{ value: FilterOp; label: string }> {
	return [
		{ value: 'eq', label: strings.ops.eqSym },
		{ value: 'neq', label: strings.ops.neqSym },
		{ value: 'lte', label: strings.ops.lte },
		{ value: 'lt', label: strings.ops.lt },
		{ value: 'gt', label: strings.ops.gt },
		{ value: 'gte', label: strings.ops.gte },
	];
}

function checkboxOpOptions(): Array<{ value: FilterOp; label: string }> {
	return [
		{ value: 'is_true', label: strings.ops.isTrue },
		{ value: 'is_false', label: strings.ops.isFalse },
	];
}

function widgetFromEntry(
	entry: string | PropertyInfoLike | null | undefined,
): string | null {
	if (typeof entry === 'string' && entry.trim()) {
		return entry.trim();
	}
	if (!entry || typeof entry !== 'object') {
		return null;
	}
	if (typeof entry.widget === 'string' && entry.widget.trim()) {
		return entry.widget.trim();
	}
	if (typeof entry.type === 'string' && entry.type.trim()) {
		return entry.type.trim();
	}
	return null;
}

export function mapWidgetTypeToValueType(
	raw: string | null | undefined,
): PropertyValueType {
	switch (raw) {
		case 'number':
			return 'number';
		case 'date':
			return 'date';
		case 'datetime':
			return 'datetime';
		case 'checkbox':
			return 'checkbox';
		default:
			return 'text';
	}
}

/**
 * Resolve property value type for filter/sort UI and evaluation.
 * Handles header name, file.* metadata, and Obsidian frontmatter widgets.
 */
export function getPropertyType(app: App, property: string): PropertyValueType {
	const key = property.trim();
	if (!key || key === SORT_HEADER_NAME_ID) {
		return 'text';
	}

	const fileType = getFilePropertyType(key);
	if (fileType) {
		return fileType;
	}

	return mapWidgetTypeToValueType(getPropertyWidgetType(app, key));
}

/** Icon for a property id (frontmatter widget, file metadata, or header). */
export function iconForProperty(app: App, property: string): string {
	const key = property.trim();
	if (key === SORT_HEADER_NAME_ID) {
		return 'type';
	}
	if (isFileProperty(key)) {
		return 'info';
	}
	return iconForWidgetType(app, getPropertyWidgetType(app, key) ?? 'text');
}

export function opsForPropertyType(type: PropertyValueType): FilterOp[] {
	switch (type) {
		case 'number':
		case 'date':
		case 'datetime':
			return [...COMPARE_OPS];
		case 'checkbox':
			return [...CHECKBOX_OPS];
		default:
			return [...TEXT_OPS];
	}
}

export function coerceOpForType(op: FilterOp, type: PropertyValueType): FilterOp {
	const allowed = opsForPropertyType(type);
	if ((allowed as string[]).includes(op)) {
		return op;
	}
	return allowed[0] ?? 'eq';
}

export function opOptionsForType(
	type: PropertyValueType,
): Array<{ value: FilterOp; label: string }> {
	switch (type) {
		case 'number':
		case 'date':
		case 'datetime':
			return compareOpOptions();
		case 'checkbox':
			return checkboxOpOptions();
		default:
			return textOpOptions();
	}
}

export function valueInputTypeForPropertyType(
	type: PropertyValueType,
): 'text' | 'number' | 'date' | 'datetime-local' | null {
	switch (type) {
		case 'number':
			return 'number';
		case 'date':
			return 'date';
		case 'datetime':
			return 'datetime-local';
		case 'checkbox':
			return null;
		default:
			return 'text';
	}
}

/** Normalize datetime-local values for storage / display. */
export function normalizeDatetimeInputValue(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return '';
	}
	// datetime-local may include seconds; Obsidian often uses YYYY-MM-DDTHH:mm
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
		return trimmed.slice(0, 16);
	}
	return trimmed;
}
