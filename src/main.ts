import { Notice, Plugin, TFolder } from 'obsidian';
import {
	createDefaultDocument,
	serializeBoardDocument,
} from './board/schema';
import { applyLocale, strings } from './i18n';
import {
	DEFAULT_PLUGIN_SETTINGS,
	normalizePluginSettings,
	type PluginSettings,
} from './pluginSettings';
import { PluginSettingsTab } from './ui/PluginSettingsTab';
import { BoardView, VIEW_TYPE_BOARD } from './views/BoardView';

export default class PropertyKanbanPlugin extends Plugin {
	settings: PluginSettings = { ...DEFAULT_PLUGIN_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();
		applyLocale(this.settings.language);

		this.registerView(VIEW_TYPE_BOARD, (leaf) => new BoardView(leaf));
		this.registerExtensions(['board'], VIEW_TYPE_BOARD);
		this.addSettingTab(new PluginSettingsTab(this.app, this));

		this.addCommand({
			id: 'create-new-board',
			name: strings.commands.createBoard,
			callback: () => {
				void this.createNewBoard();
			},
		});

		this.addRibbonIcon('layout-dashboard', strings.commands.createBoard, () => {
			void this.createNewBoard();
		});
	}

	onunload(): void {}

	async loadSettings(): Promise<void> {
		this.settings = normalizePluginSettings(await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private getCreateFolder(): TFolder {
		const activeFile = this.app.workspace.getActiveFile();
		if (activeFile?.parent) {
			return activeFile.parent;
		}
		return this.app.vault.getRoot();
	}

	private getUniqueBoardPath(folder: TFolder): string {
		const folderPath = folder.path;
		const prefix = folderPath ? `${folderPath}/` : '';
		const base = 'Untitled';
		let candidate = `${prefix}${base}.board`;
		let index = 1;

		while (this.app.vault.getAbstractFileByPath(candidate)) {
			candidate = `${prefix}${base} ${index}.board`;
			index += 1;
		}

		return candidate;
	}

	async createNewBoard(): Promise<void> {
		try {
			const folder = this.getCreateFolder();
			const path = this.getUniqueBoardPath(folder);
			const name = path.split('/').pop()?.replace(/\.board$/, '') ?? 'Untitled';
			const content = serializeBoardDocument(createDefaultDocument(name));
			const file = await this.app.vault.create(path, content);

			await this.app.workspace.getLeaf(true).openFile(file);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: strings.notices.createBoardFailed;
			new Notice(message);
		}
	}
}
