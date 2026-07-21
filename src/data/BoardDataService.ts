import { Notice, Plugin, TFile } from 'obsidian';
import { getStatusFromFrontmatter } from './frontmatter';
import {
	BoardListener,
	BoardState,
	KanbanCard,
	KanbanColumn,
	createEmptyBoard,
} from './types';
import { PropertyKanbanPluginHost } from '../plugin-types';
import {
	UNCATEGORIZED_LABEL,
	UNCATEGORIZED_STATUS,
} from '../settings/types';
import { debounce } from '../utils/debounce';
import { canonicalStatusValue } from '../utils/normalizeStatus';

export class BoardDataService {
	private listeners = new Set<BoardListener>();
	private state: BoardState = createEmptyBoard(true);
	private pendingUpdates = new Set<string>();
	private cardIndex = new Map<string, KanbanCard>();
	private debouncedFullRebuild: () => void;

	constructor(private plugin: PropertyKanbanPluginHost) {
		this.debouncedFullRebuild = debounce(() => {
			this.rebuildBoard();
		}, 200);
	}

	init(): void {
		const { app } = this.plugin;

		this.plugin.registerEvent(
			app.metadataCache.on('changed', (file) => {
				if (!(file instanceof TFile)) {
					return;
				}
				if (this.pendingUpdates.has(file.path)) {
					return;
				}
				this.updateFileInBoard(file);
			}),
		);

		this.plugin.registerEvent(
			app.metadataCache.on('deleted', (file) => {
				this.removeCard(file.path);
			}),
		);

		this.plugin.registerEvent(
			app.vault.on('rename', (file, oldPath) => {
				if (!(file instanceof TFile)) {
					return;
				}
				this.renameCard(oldPath, file);
			}),
		);

		this.plugin.registerEvent(
			app.vault.on('create', (file) => {
				if (!(file instanceof TFile)) {
					return;
				}
				this.updateFileInBoard(file);
			}),
		);

		this.plugin.registerEvent(
			app.metadataCache.on('resolved', () => {
				this.debouncedFullRebuild();
			}),
		);

		this.rebuildBoard();
	}

	subscribe(listener: BoardListener): () => void {
		this.listeners.add(listener);
		listener(this.state);
		return () => {
			this.listeners.delete(listener);
		};
	}

	getState(): BoardState {
		return this.state;
	}

	onSettingsChanged(): void {
		this.rebuildBoard();
	}

	async updateFileStatus(file: TFile, columnStatus: string): Promise<void> {
		const { settings } = this.plugin;
		const newValue = canonicalStatusValue(columnStatus, settings.statuses);

		if (!newValue) {
			new Notice('Cannot update status: no configured statuses.');
			return;
		}

		this.pendingUpdates.add(file.path);

		const previousState = this.state;
		this.applyOptimisticMove(file.path, columnStatus, newValue);

		try {
			await this.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
				frontmatter[settings.triggerProperty] = newValue;
			});
		} catch (error) {
			this.state = previousState;
			this.reindexCards();
			this.emit();
			const message = error instanceof Error ? error.message : String(error);
			new Notice(`Failed to update ${file.basename}: ${message}`);
			throw error;
		} finally {
			this.pendingUpdates.delete(file.path);
		}
	}

	private emit(): void {
		for (const listener of this.listeners) {
			listener(this.state);
		}
	}

	private rebuildBoard(): void {
		const columns = this.buildColumnsFromVault();
		this.state = {
			columns,
			isLoading: false,
			lastUpdated: Date.now(),
		};
		this.reindexCards();
		this.emit();
	}

	private buildColumnsFromVault(): KanbanColumn[] {
		const { settings } = this.plugin;
		const columnMap = new Map<string, KanbanColumn>();

		const ensureColumn = (id: string, title: string): KanbanColumn => {
			const existing = columnMap.get(id);
			if (existing) {
				return existing;
			}

			const column: KanbanColumn = { id, title, cards: [] };
			columnMap.set(id, column);
			return column;
		};

		for (const status of settings.statuses) {
			ensureColumn(status, status);
		}

		if (settings.showUncategorizedColumn) {
			ensureColumn(UNCATEGORIZED_STATUS, UNCATEGORIZED_LABEL);
		}

		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			const card = this.createCardFromFile(file);
			if (!card) {
				continue;
			}

			const column = columnMap.get(card.status);
			if (column) {
				column.cards.push(card);
			}
		}

		const orderedColumns: KanbanColumn[] = [];

		for (const status of settings.statuses) {
			const column = columnMap.get(status);
			if (column) {
				orderedColumns.push(column);
			}
		}

		if (settings.showUncategorizedColumn) {
			const uncategorized = columnMap.get(UNCATEGORIZED_STATUS);
			if (uncategorized) {
				orderedColumns.push(uncategorized);
			}
		}

		for (const column of orderedColumns) {
			column.cards.sort((a, b) => a.title.localeCompare(b.title));
		}

		return orderedColumns;
	}

	private createCardFromFile(file: TFile): KanbanCard | null {
		const { settings } = this.plugin;

		if (settings.folderFilter && !file.path.startsWith(settings.folderFilter)) {
			return null;
		}

		const cache = this.plugin.app.metadataCache.getFileCache(file);
		const { rawValue, columnStatus, hasProperty } = getStatusFromFrontmatter(
			cache?.frontmatter,
			settings,
		);

		if (!hasProperty && !settings.includeFilesWithoutProperty) {
			return null;
		}

		if (
			columnStatus === UNCATEGORIZED_STATUS &&
			!settings.showUncategorizedColumn
		) {
			return null;
		}

		return {
			id: file.path,
			filePath: file.path,
			title: file.basename,
			status: columnStatus,
			rawStatus: rawValue,
		};
	}

	private updateFileInBoard(file: TFile): void {
		const card = this.createCardFromFile(file);
		this.removeCard(file.path, false);

		if (card) {
			this.cardIndex.set(card.id, card);
			const column = this.state.columns.find((col) => col.id === card.status);
			if (column) {
				column.cards.push(card);
				column.cards.sort((a, b) => a.title.localeCompare(b.title));
			} else {
				this.rebuildBoard();
				return;
			}
		}

		this.state = {
			...this.state,
			lastUpdated: Date.now(),
		};
		this.emit();
	}

	private removeCard(filePath: string, shouldEmit = true): void {
		this.cardIndex.delete(filePath);

		for (const column of this.state.columns) {
			column.cards = column.cards.filter((card) => card.id !== filePath);
		}

		if (shouldEmit) {
			this.state = {
				...this.state,
				lastUpdated: Date.now(),
			};
			this.emit();
		}
	}

	private renameCard(oldPath: string, file: TFile): void {
		const existing = this.cardIndex.get(oldPath);
		if (!existing) {
			this.updateFileInBoard(file);
			return;
		}

		this.removeCard(oldPath, false);

		const updatedCard: KanbanCard = {
			...existing,
			id: file.path,
			filePath: file.path,
			title: file.basename,
		};

		this.cardIndex.set(updatedCard.id, updatedCard);

		const column = this.state.columns.find((col) => col.id === updatedCard.status);
		if (column) {
			column.cards.push(updatedCard);
			column.cards.sort((a, b) => a.title.localeCompare(b.title));
		}

		this.state = {
			...this.state,
			lastUpdated: Date.now(),
		};
		this.emit();
	}

	private applyOptimisticMove(
		filePath: string,
		columnStatus: string,
		rawStatus: string,
	): void {
		const existing = this.cardIndex.get(filePath);
		this.removeCard(filePath, false);

		const file = this.plugin.app.vault.getAbstractFileByPath(filePath);

		const card: KanbanCard = {
			id: filePath,
			filePath,
			title:
				file instanceof TFile
					? file.basename
					: (existing?.title ?? filePath.split('/').pop() ?? filePath),
			status: columnStatus,
			rawStatus,
		};

		this.cardIndex.set(filePath, card);

		const column = this.state.columns.find((col) => col.id === columnStatus);
		if (column) {
			column.cards.push(card);
			column.cards.sort((a, b) => a.title.localeCompare(b.title));
		}

		this.state = {
			...this.state,
			lastUpdated: Date.now(),
		};
		this.emit();
	}

	private reindexCards(): void {
		this.cardIndex.clear();
		for (const column of this.state.columns) {
			for (const card of column.cards) {
				this.cardIndex.set(card.id, card);
			}
		}
	}
}
