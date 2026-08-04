import { App, TFile } from 'obsidian';
import { getParentFolderPath } from './limitTo';
import type { PropertyValueType } from './propertyType';

export type FilePropertyId =
	| 'file.name'
	| 'file.path'
	| 'file.folder'
	| 'file.ext'
	| 'file.size'
	| 'file.ctime'
	| 'file.mtime'
	| 'file.tags'
	| 'file.links'
	| 'file.backlinks'
	| 'file.embeds';

export type FilePropertyLabelKey =
	| 'name'
	| 'path'
	| 'folder'
	| 'ext'
	| 'size'
	| 'ctime'
	| 'mtime'
	| 'tags'
	| 'links'
	| 'backlinks'
	| 'embeds';

export interface FilePropertyDef {
	id: FilePropertyId;
	/** Key under strings.fileProperties */
	labelKey: FilePropertyLabelKey;
	type: PropertyValueType;
	icon: string;
}

/** Bases-compatible file metadata properties. */
export const FILE_METADATA_DEFS: readonly FilePropertyDef[] = [
	{ id: 'file.name', labelKey: 'name', type: 'text', icon: 'info' },
	{ id: 'file.path', labelKey: 'path', type: 'text', icon: 'info' },
	{ id: 'file.folder', labelKey: 'folder', type: 'text', icon: 'info' },
	{ id: 'file.ext', labelKey: 'ext', type: 'text', icon: 'info' },
	{ id: 'file.size', labelKey: 'size', type: 'number', icon: 'info' },
	{ id: 'file.ctime', labelKey: 'ctime', type: 'datetime', icon: 'info' },
	{ id: 'file.mtime', labelKey: 'mtime', type: 'datetime', icon: 'info' },
	{ id: 'file.tags', labelKey: 'tags', type: 'text', icon: 'info' },
	{ id: 'file.links', labelKey: 'links', type: 'text', icon: 'info' },
	{ id: 'file.backlinks', labelKey: 'backlinks', type: 'text', icon: 'info' },
	{ id: 'file.embeds', labelKey: 'embeds', type: 'text', icon: 'info' },
] as const;

const FILE_DEF_BY_ID = new Map(
	FILE_METADATA_DEFS.map((def) => [def.id, def] as const),
);

export function isFileProperty(property: string): property is FilePropertyId {
	return FILE_DEF_BY_ID.has(property.trim() as FilePropertyId);
}

export function getFilePropertyDef(
	property: string,
): FilePropertyDef | undefined {
	return FILE_DEF_BY_ID.get(property.trim() as FilePropertyId);
}

export function getFilePropertyType(
	property: string,
): PropertyValueType | null {
	return getFilePropertyDef(property)?.type ?? null;
}

function pad2(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

/** Format epoch ms as local datetime-local string (YYYY-MM-DDTHH:mm). */
export function formatLocalDatetime(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function joinList(items: string[]): string | null {
	const cleaned = items.map((item) => item.trim()).filter(Boolean);
	return cleaned.length > 0 ? cleaned.join(', ') : null;
}

function collectTags(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	const tags = new Set<string>();
	for (const entry of cache?.tags ?? []) {
		if (entry.tag) {
			tags.add(entry.tag);
		}
	}
	const fmTags: unknown = cache?.frontmatter?.['tags'];
	if (typeof fmTags === 'string' && fmTags.trim()) {
		tags.add(fmTags.startsWith('#') ? fmTags : `#${fmTags}`);
	} else if (Array.isArray(fmTags)) {
		for (const tag of fmTags) {
			if (typeof tag === 'string' && tag.trim()) {
				tags.add(tag.startsWith('#') ? tag : `#${tag}`);
			}
		}
	}
	return Array.from(tags);
}

function collectLinks(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	return (cache?.links ?? [])
		.map((link) => link.link)
		.filter((link): link is string => typeof link === 'string' && link.length > 0);
}

function collectEmbeds(app: App, file: TFile): string[] {
	const cache = app.metadataCache.getFileCache(file);
	return (cache?.embeds ?? [])
		.map((embed) => embed.link)
		.filter((link): link is string => typeof link === 'string' && link.length > 0);
}

function collectBacklinks(app: App, filePath: string): string[] {
	const resolved = app.metadataCache.resolvedLinks;
	const backlinks: string[] = [];
	for (const [source, targets] of Object.entries(resolved)) {
		if (targets && typeof targets === 'object' && filePath in targets) {
			backlinks.push(source);
		}
	}
	return backlinks;
}

export interface FilePropertyResolution {
	present: boolean;
	raw: unknown;
	text: string;
}

export function resolveFilePropertyValue(
	app: App,
	filePath: string,
	property: string,
): FilePropertyResolution {
	const def = getFilePropertyDef(property);
	if (!def) {
		return { present: false, raw: undefined, text: '' };
	}

	const abstract = app.vault.getAbstractFileByPath(filePath);
	if (!(abstract instanceof TFile)) {
		return { present: false, raw: undefined, text: '' };
	}
	const file = abstract;

	switch (def.id) {
		case 'file.name': {
			const raw = file.name;
			return { present: true, raw, text: raw };
		}
		case 'file.path': {
			const raw = file.path;
			return { present: true, raw, text: raw };
		}
		case 'file.folder': {
			const raw = getParentFolderPath(file.path) || '/';
			return { present: true, raw, text: raw };
		}
		case 'file.ext': {
			const raw = file.extension;
			return { present: true, raw, text: raw };
		}
		case 'file.size': {
			const raw = file.stat.size;
			return { present: true, raw, text: String(raw) };
		}
		case 'file.ctime': {
			const raw = formatLocalDatetime(file.stat.ctime);
			return { present: true, raw, text: raw };
		}
		case 'file.mtime': {
			const raw = formatLocalDatetime(file.stat.mtime);
			return { present: true, raw, text: raw };
		}
		case 'file.tags': {
			const list = collectTags(app, file);
			const text = joinList(list);
			return {
				present: list.length > 0,
				raw: list,
				text: text ?? '',
			};
		}
		case 'file.links': {
			const list = collectLinks(app, file);
			const text = joinList(list);
			return {
				present: list.length > 0,
				raw: list,
				text: text ?? '',
			};
		}
		case 'file.backlinks': {
			const list = collectBacklinks(app, file.path);
			const text = joinList(list);
			return {
				present: list.length > 0,
				raw: list,
				text: text ?? '',
			};
		}
		case 'file.embeds': {
			const list = collectEmbeds(app, file);
			const text = joinList(list);
			return {
				present: list.length > 0,
				raw: list,
				text: text ?? '',
			};
		}
		default:
			return { present: false, raw: undefined, text: '' };
	}
}
