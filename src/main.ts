import { Notice, Plugin, TFolder } from 'obsidian';
import {
	createDefaultDocument,
	serializeBoardDocument,
} from './board/schema';
import { BoardView, VIEW_TYPE_BOARD } from './views/BoardView';

export default class PropertyKanbanPlugin extends Plugin {
	async onload(): Promise<void> {
		this.registerView(VIEW_TYPE_BOARD, (leaf) => new BoardView(leaf));
		this.registerExtensions(['board'], VIEW_TYPE_BOARD);

		this.addCommand({
			id: 'create-new-board',
			name: 'Create new board',
			callback: () => {
				void this.createNewBoard();
			},
		});

		this.addRibbonIcon('layout-dashboard', 'Create new board', () => {
			void this.createNewBoard();
		});
	}

	onunload(): void {}

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
				error instanceof Error ? error.message : 'Could not create board file';
			new Notice(message);
		}
	}
}
