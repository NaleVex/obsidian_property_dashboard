import { PluginSettings } from './types';

export const DEFAULT_SETTINGS: PluginSettings = {
	triggerProperty: 'status',
	statuses: ['todo', 'in-progress', 'done'],
	includeFilesWithoutProperty: false,
	folderFilter: '',
	showUncategorizedColumn: true,
	caseSensitiveStatus: false,
};
