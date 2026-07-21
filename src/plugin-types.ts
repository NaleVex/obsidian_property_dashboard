import { App, EventRef, Plugin } from 'obsidian';
import { BoardDataService } from './data/BoardDataService';
import { PluginSettings } from './settings/types';

export interface PropertyKanbanPlugin extends Plugin {
	settings: PluginSettings;
	dataService: BoardDataService;
	saveSettings(): Promise<void>;
}

export type PropertyKanbanPluginHost = {
	app: App;
	settings: PluginSettings;
	registerEvent(eventRef: EventRef): void;
};
