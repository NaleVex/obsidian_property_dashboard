import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';
import { BoardDataService } from './data/BoardDataService';
import { PropertyKanbanPlugin as IPropertyKanbanPlugin } from './plugin-types';
import { DEFAULT_SETTINGS } from './settings/defaults';
import { PropertyKanbanSettingTab } from './settings/PropertyKanbanSettingTab';
import { PluginSettings } from './settings/types';
import {
	PropertyKanbanView,
	VIEW_TYPE_PROPERTY_KANBAN,
} from './views/PropertyKanbanView';

export default class PropertyKanbanPlugin
	extends Plugin
	implements IPropertyKanbanPlugin
{
	settings!: PluginSettings;
	dataService!: BoardDataService;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.dataService = new BoardDataService(this);
		this.dataService.init();

		this.registerView(
			VIEW_TYPE_PROPERTY_KANBAN,
			(leaf) => new PropertyKanbanView(leaf, this),
		);

		this.addRibbonIcon('layout-grid', 'Open Property Kanban', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open-property-kanban',
			name: 'Open Property Kanban board',
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new PropertyKanbanSettingTab(this.app, this));
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<PluginSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.dataService?.onSettingsChanged();
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(
			VIEW_TYPE_PROPERTY_KANBAN,
		)[0] ?? null;

		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) {
				new Notice('Could not open Property Kanban view.');
				return;
			}
			await leaf.setViewState({
				type: VIEW_TYPE_PROPERTY_KANBAN,
				active: true,
			});
		}

		workspace.revealLeaf(leaf);
	}
}
