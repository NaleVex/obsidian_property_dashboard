import { FrontMatterCache } from 'obsidian';
import { PluginSettings } from '../settings/types';
import {
	normalizeStatusValue,
	resolveColumnStatus,
} from '../utils/normalizeStatus';

export function readTriggerPropertyValue(
	frontmatter: FrontMatterCache | undefined,
	triggerProperty: string,
): unknown {
	if (!frontmatter) {
		return undefined;
	}

	return frontmatter[triggerProperty];
}

export function getStatusFromFrontmatter(
	frontmatter: FrontMatterCache | undefined,
	settings: PluginSettings,
): { rawValue: string; columnStatus: string; hasProperty: boolean } {
	const hasProperty =
		!!frontmatter && Object.prototype.hasOwnProperty.call(frontmatter, settings.triggerProperty);

	if (!hasProperty) {
		return {
			rawValue: '',
			columnStatus: resolveColumnStatus('', settings.statuses, settings.caseSensitiveStatus),
			hasProperty: false,
		};
	}

	const rawValue = normalizeStatusValue(
		readTriggerPropertyValue(frontmatter, settings.triggerProperty),
	);

	return {
		rawValue,
		columnStatus: resolveColumnStatus(
			rawValue,
			settings.statuses,
			settings.caseSensitiveStatus,
		),
		hasProperty: true,
	};
}
