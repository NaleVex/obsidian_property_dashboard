export const BOARD_VERSION = 1 as const;
export const UNKNOWN_COLUMN_ID = '__unknown__';
export const UNKNOWN_COLUMN_LABEL = 'Unknown';

export type LimitTo =
	| { mode: 'all' }
	| { mode: 'siblings' }
	| { mode: 'folder'; path: string };

export type BoardViewType = 'kanban';

export interface BoardViewConfig {
	id: string;
	type: BoardViewType;
	name: string;
}

export interface BoardSettings {
	triggerProperty: string;
	limitTo: LimitTo;
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

export function createDefaultDocument(name = 'Untitled'): BoardDocument {
	const viewId = createId();
	return {
		version: BOARD_VERSION,
		name,
		settings: {
			triggerProperty: 'status',
			limitTo: { mode: 'all' },
			values: ['todo', 'in-progress', 'done'],
		},
		views: [
			{
				id: viewId,
				type: 'kanban',
				name: 'Kanban',
			},
		],
		activeViewId: viewId,
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

function parseViews(raw: unknown): BoardViewConfig[] {
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
		views.push({
			id: item.id,
			type: 'kanban',
			name: item.name.trim() || 'Kanban',
		});
	}
	return views;
}

function parseSettings(raw: unknown): BoardSettings {
	const defaults = createDefaultDocument().settings;
	if (!isRecord(raw)) {
		return defaults;
	}

	const triggerProperty =
		typeof raw.triggerProperty === 'string' && raw.triggerProperty.trim()
			? raw.triggerProperty.trim()
			: defaults.triggerProperty;

	const values = Array.isArray(raw.values)
		? raw.values
				.filter((value): value is string => typeof value === 'string')
				.map((value) => value.trim())
				.filter((value) => value.length > 0)
		: defaults.values;

	return {
		triggerProperty,
		limitTo: parseLimitTo(raw.limitTo),
		values: values.length > 0 ? values : [...defaults.values],
	};
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

	const settings = parseSettings(parsed.settings);
	const views = Array.isArray(parsed.views)
		? parseViews(parsed.views)
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
		views,
		activeViewId,
	};
}

export function serializeBoardDocument(doc: BoardDocument): string {
	return `${JSON.stringify(doc, null, 2)}\n`;
}
