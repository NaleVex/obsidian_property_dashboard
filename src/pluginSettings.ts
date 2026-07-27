import {
	isPluginLanguage,
	type PluginLanguage,
} from './i18n';

export interface PluginSettings {
	language: PluginLanguage;
}

export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
	language: 'auto',
};

export function normalizePluginSettings(raw: unknown): PluginSettings {
	if (!raw || typeof raw !== 'object') {
		return { ...DEFAULT_PLUGIN_SETTINGS };
	}
	const data = raw as Partial<PluginSettings>;
	return {
		language: isPluginLanguage(data.language)
			? data.language
			: DEFAULT_PLUGIN_SETTINGS.language,
	};
}
