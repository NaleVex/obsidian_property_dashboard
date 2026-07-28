import {
	BoardViewConfig,
	SORT_HEADER_NAME_ID,
	getViewPropertyFields,
} from '../board/schema';
import { strings } from '../i18n';

export interface PropertyOption {
	property: string;
	label: string;
}

/** Property picker options: Header name plus configured property fields. */
export function viewPropertyPickerOptions(
	view: BoardViewConfig,
): PropertyOption[] {
	const options: PropertyOption[] = [
		{ property: SORT_HEADER_NAME_ID, label: strings.sort.headerName },
	];
	const seen = new Set<string>([SORT_HEADER_NAME_ID]);
	for (const field of getViewPropertyFields(view)) {
		const property = field.property.trim();
		if (!property || seen.has(property)) {
			continue;
		}
		seen.add(property);
		const label = field.label.trim() || property;
		options.push({ property, label });
	}
	return options;
}

export function propertyPickerDisplayValue(property: string): string {
	return property === SORT_HEADER_NAME_ID
		? strings.sort.headerName
		: property;
}

export function propertyPickerParseInput(raw: string): string {
	return raw === strings.sort.headerName ? SORT_HEADER_NAME_ID : raw;
}

export function propertyPickerMenuTitle(option: PropertyOption): string {
	if (
		option.property === SORT_HEADER_NAME_ID ||
		option.label === option.property
	) {
		return option.label;
	}
	return `${option.label} (${option.property})`;
}
