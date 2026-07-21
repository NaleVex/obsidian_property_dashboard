import { App, FuzzySuggestModal, TFolder } from 'obsidian';

function collectFolders(root: TFolder): TFolder[] {
	const folders: TFolder[] = [root];
	for (const child of root.children) {
		if (child instanceof TFolder) {
			folders.push(...collectFolders(child));
		}
	}
	return folders;
}

export class FolderSuggestModal extends FuzzySuggestModal<TFolder> {
	constructor(
		app: App,
		private onChoose: (folder: TFolder) => void,
	) {
		super(app);
		this.setPlaceholder('Select a folder…');
	}

	getItems(): TFolder[] {
		return collectFolders(this.app.vault.getRoot());
	}

	getItemText(item: TFolder): string {
		return item.path === '' ? '/' : item.path;
	}

	onChooseItem(item: TFolder): void {
		this.onChoose(item);
	}
}
