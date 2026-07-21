export const UNCATEGORIZED_STATUS = '__uncategorized__';
export const UNCATEGORIZED_LABEL = 'Uncategorized';

export interface PluginSettings {
	triggerProperty: string;
	statuses: string[];
	includeFilesWithoutProperty: boolean;
	folderFilter: string;
	showUncategorizedColumn: boolean;
	caseSensitiveStatus: boolean;
}
