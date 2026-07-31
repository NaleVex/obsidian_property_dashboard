import { App } from 'obsidian';
import { SORT_HEADER_NAME_ID } from '../board/schema';
import { strings } from '../i18n';
import {
	FILE_METADATA_DEFS,
	type FilePropertyDef,
} from './fileProperties';
import {
	getMetadataTypeManager,
	getPropertyWidgetType,
	iconForProperty,
	iconForWidgetType,
	mapWidgetTypeToValueType,
	type PropertyValueType,
} from './propertyType';

export type VaultPropertyKind = 'header' | 'file' | 'frontmatter';

export interface VaultPropertyOption {
	property: string;
	label: string;
	icon: string;
	kind: VaultPropertyKind;
	type: PropertyValueType;
}

export interface ListVaultPropertiesOptions {
	/** Include Header name sentinel (`__name__`). */
	includeHeaderName?: boolean;
	/** Exclude file.* metadata (e.g. kanban trigger). */
	frontmatterOnly?: boolean;
}

function frontmatterDisplayName(
	key: string,
	info: { name?: string } | undefined,
): string {
	const named = info?.name?.trim();
	if (named) {
		return named;
	}
	return key;
}

function collectFrontmatterKeys(app: App): Map<string, string> {
	const manager = getMetadataTypeManager(app);
	const byLower = new Map<string, string>();

	const ingest = (key: string, preferredName?: string) => {
		const trimmed = key.trim();
		if (!trimmed || trimmed.startsWith('file.')) {
			return;
		}
		const lower = trimmed.toLowerCase();
		const existing = byLower.get(lower);
		if (!existing) {
			byLower.set(lower, preferredName?.trim() || trimmed);
			return;
		}
		// Prefer casing that matches a non-lower display name when available
		if (preferredName?.trim() && existing === lower) {
			byLower.set(lower, preferredName.trim());
		}
	};

	if (manager?.getAllProperties) {
		for (const [key, info] of Object.entries(manager.getAllProperties())) {
			ingest(key, info?.name);
		}
	}

	if (manager?.properties) {
		for (const [key, info] of Object.entries(manager.properties)) {
			ingest(key, info?.name);
		}
	}

	if (manager?.types) {
		for (const key of Object.keys(manager.types)) {
			ingest(key);
		}
	}

	return byLower;
}

function filePropertyLabel(def: FilePropertyDef): string {
	return strings.fileProperties[def.labelKey];
}

/**
 * List properties for the picker: optional header name, vault frontmatter, then file metadata.
 */
export function listVaultProperties(
	app: App,
	options: ListVaultPropertiesOptions = {},
): VaultPropertyOption[] {
	const { includeHeaderName = false, frontmatterOnly = false } = options;
	const result: VaultPropertyOption[] = [];
	const seen = new Set<string>();

	const push = (option: VaultPropertyOption) => {
		if (seen.has(option.property)) {
			return;
		}
		seen.add(option.property);
		result.push(option);
	};

	if (includeHeaderName) {
		push({
			property: SORT_HEADER_NAME_ID,
			label: strings.sort.headerName,
			icon: iconForProperty(app, SORT_HEADER_NAME_ID),
			kind: 'header',
			type: 'text',
		});
	}

	const keys = collectFrontmatterKeys(app);
	const sorted = Array.from(keys.entries()).sort((a, b) =>
		a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }),
	);

	for (const [lower, display] of sorted) {
		const widget = getPropertyWidgetType(app, lower);
		push({
			property: display,
			label: frontmatterDisplayName(display, { name: display }),
			icon: iconForWidgetType(app, widget ?? 'text'),
			kind: 'frontmatter',
			type: mapWidgetTypeToValueType(widget),
		});
	}

	if (!frontmatterOnly) {
		for (const def of FILE_METADATA_DEFS) {
			push({
				property: def.id,
				label: filePropertyLabel(def),
				icon: def.icon,
				kind: 'file',
				type: def.type,
			});
		}
	}

	return result;
}

export function propertyDisplayLabel(
	app: App,
	property: string,
	options: ListVaultPropertiesOptions = {},
): string {
	const key = property.trim();
	if (!key) {
		return '';
	}
	if (key === SORT_HEADER_NAME_ID) {
		return strings.sort.headerName;
	}
	const fileDef = FILE_METADATA_DEFS.find((def) => def.id === key);
	if (fileDef) {
		return filePropertyLabel(fileDef);
	}
	const match = listVaultProperties(app, {
		...options,
		includeHeaderName: false,
	}).find(
		(item) =>
			item.property === key ||
			item.property.toLowerCase() === key.toLowerCase(),
	);
	return match?.label ?? key;
}
