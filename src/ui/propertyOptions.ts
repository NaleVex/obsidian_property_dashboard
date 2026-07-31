import { App } from 'obsidian';
import {
	BoardViewConfig,
	SORT_HEADER_NAME_ID,
	getViewPropertyFields,
} from '../board/schema';
import { isFileProperty } from '../data/fileProperties';
import {
	getPropertyType,
	iconForProperty,
} from '../data/propertyType';
import {
	propertyDisplayLabel,
	type VaultPropertyOption,
} from '../data/vaultProperties';
import { strings } from '../i18n';

export interface PropertyOption {
	property: string;
	label: string;
	icon?: string;
}

/**
 * Property picker options for filter/sort/card-colors:
 * Header name plus properties configured in view settings.
 */
export function viewPropertyPickerOptions(
	app: App,
	view: BoardViewConfig,
): VaultPropertyOption[] {
	const options: VaultPropertyOption[] = [
		{
			property: SORT_HEADER_NAME_ID,
			label: strings.sort.headerName,
			icon: iconForProperty(app, SORT_HEADER_NAME_ID),
			kind: 'header',
			type: 'text',
		},
	];
	const seen = new Set<string>([SORT_HEADER_NAME_ID]);

	for (const field of getViewPropertyFields(view)) {
		const property = field.property.trim();
		if (!property || seen.has(property)) {
			continue;
		}
		seen.add(property);

		const label = field.label.trim() || propertyDisplayLabel(app, property) || property;
		const kind = isFileProperty(property)
			? 'file'
			: property === SORT_HEADER_NAME_ID
				? 'header'
				: 'frontmatter';

		options.push({
			property,
			label,
			icon: iconForProperty(app, property),
			kind,
			type: getPropertyType(app, property),
		});
	}

	return options;
}

export function propertyPickerDisplayValue(
	app: App,
	property: string,
): string {
	if (property === SORT_HEADER_NAME_ID) {
		return strings.sort.headerName;
	}
	return propertyDisplayLabel(app, property);
}

export function propertyPickerParseInput(raw: string): string {
	return raw === strings.sort.headerName ? SORT_HEADER_NAME_ID : raw;
}
