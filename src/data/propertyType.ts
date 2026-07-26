import { App } from 'obsidian';
import {
	FilterCheckboxOp,
	FilterNumericOp,
	FilterOp,
	FilterTextOp,
} from '../board/schema';

export type PropertyValueType =
	| 'text'
	| 'number'
	| 'date'
	| 'datetime'
	| 'checkbox';

interface PropertyInfoLike {
	/** Current Obsidian: widget type id (e.g. "number"). */
	widget?: string;
	/** Older Obsidian / types.json-shaped entries. */
	type?: string;
}

interface MetadataTypeManagerLike {
	/** Current Obsidian. */
	getAssignedWidget?: (property: string) => string | null | undefined;
	/** Legacy Obsidian. */
	getAssignedType?: (property: string) => string | null | undefined;
	getPropertyInfo?: (property: string) => PropertyInfoLike | null | undefined;
	properties?: Record<string, PropertyInfoLike | undefined>;
	assignedWidgets?: Record<string, PropertyInfoLike | undefined>;
	types?: Record<string, string | PropertyInfoLike | undefined>;
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

const TEXT_OP_OPTIONS: Array<{ value: FilterOp; label: string }> = [
	{ value: 'eq', label: 'is equal' },
	{ value: 'neq', label: 'is not' },
	{ value: 'contains', label: 'contains' },
	{ value: 'not_contains', label: 'not contains' },
	{ value: 'empty', label: 'is empty' },
	{ value: 'not_empty', label: 'not empty' },
];

const COMPARE_OP_OPTIONS: Array<{ value: FilterOp; label: string }> = [
	{ value: 'eq', label: '==' },
	{ value: 'neq', label: '!=' },
	{ value: 'lte', label: '<=' },
	{ value: 'lt', label: '<' },
	{ value: 'gt', label: '>' },
	{ value: 'gte', label: '>=' },
];

const CHECKBOX_OP_OPTIONS: Array<{ value: FilterOp; label: string }> = [
	{ value: 'is_true', label: 'is true' },
	{ value: 'is_false', label: 'is false' },
];

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

function mapWidgetType(raw: string | null | undefined): PropertyValueType {
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
 * Resolve Obsidian vault property widget type for a frontmatter key.
 * Current Obsidian uses getAssignedWidget / info.widget; older builds used
 * getAssignedType / info.type. Property keys are lowercased in the registry.
 */
export function getPropertyType(app: App, property: string): PropertyValueType {
	const key = property.trim();
	if (!key) {
		return 'text';
	}

	const manager = (app as App & { metadataTypeManager?: MetadataTypeManagerLike })
		.metadataTypeManager;
	if (!manager) {
		return 'text';
	}

	const normalized = key.toLowerCase();
	const candidates = normalized === key ? [normalized] : [normalized, key];

	for (const candidate of candidates) {
		const assigned =
			manager.getAssignedWidget?.(candidate) ??
			manager.getAssignedType?.(candidate);
		if (assigned) {
			return mapWidgetType(assigned);
		}
	}

	for (const candidate of candidates) {
		const fromAssignedWidgets = widgetFromEntry(
			manager.assignedWidgets?.[candidate],
		);
		if (fromAssignedWidgets) {
			return mapWidgetType(fromAssignedWidgets);
		}

		const fromInfo = widgetFromEntry(
			manager.getPropertyInfo?.(candidate) ?? null,
		);
		if (fromInfo) {
			return mapWidgetType(fromInfo);
		}

		const fromProperties = widgetFromEntry(manager.properties?.[candidate]);
		if (fromProperties) {
			return mapWidgetType(fromProperties);
		}

		const fromTypes = widgetFromEntry(manager.types?.[candidate]);
		if (fromTypes) {
			return mapWidgetType(fromTypes);
		}
	}

	return 'text';
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
			return COMPARE_OP_OPTIONS;
		case 'checkbox':
			return CHECKBOX_OP_OPTIONS;
		default:
			return TEXT_OP_OPTIONS;
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
