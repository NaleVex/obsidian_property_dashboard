import { App, EventRef, TFile } from 'obsidian';
import {
	BoardSettings,
	UNKNOWN_COLUMN_ID,
	UNKNOWN_COLUMN_LABEL,
} from '../board/schema';
import { fileMatchesLimitTo } from './limitTo';
import { getTriggerFromFrontmatter } from './trigger';
import {
	BoardCard,
	BoardColumn,
	NoteIndexListener,
	NoteIndexState,
} from './types';
import { debounce } from '../utils/debounce';

function createEmptyState(isLoading: boolean): NoteIndexState {
	return {
		columns: [],
		isLoading,
		cardCount: 0,
	};
}

export class NoteIndex {
	private listeners = new Set<NoteIndexListener>();
	private state: NoteIndexState = createEmptyState(true);
	private settings: BoardSettings | null = null;
	private boardFilePath = '';
	private cardIndex = new Map<string, BoardCard>();
	private cleanups: Array<() => void> = [];
	private debouncedRebuild: () => void;

	constructor(private app: App) {
		this.debouncedRebuild = debounce(() => {
			this.rebuild();
		}, 200);
	}

	getState(): NoteIndexState {
		return this.state;
	}

	subscribe(listener: NoteIndexListener): () => void {
		this.listeners.add(listener);
		listener(this.state);
		return () => {
			this.listeners.delete(listener);
		};
	}

	configure(settings: BoardSettings, boardFilePath: string): void {
		this.settings = settings;
		this.boardFilePath = boardFilePath;
		this.rebuild();
	}

	start(): void {
		this.stop();

		const track = (owner: { offref: (ref: EventRef) => void }, ref: EventRef) => {
			this.cleanups.push(() => owner.offref(ref));
		};

		track(
			this.app.metadataCache,
			this.app.metadataCache.on('changed', (file) => {
				if (!(file instanceof TFile)) {
					return;
				}
				this.updateFile(file);
			}),
		);

		track(
			this.app.metadataCache,
			this.app.metadataCache.on('deleted', (file) => {
				this.removeCard(file.path);
			}),
		);

		track(
			this.app.vault,
			this.app.vault.on('rename', (file, oldPath) => {
				if (!(file instanceof TFile)) {
					return;
				}
				this.renameCard(oldPath, file);
			}),
		);

		track(
			this.app.vault,
			this.app.vault.on('create', (file) => {
				if (!(file instanceof TFile)) {
					return;
				}
				this.updateFile(file);
			}),
		);

		track(
			this.app.metadataCache,
			this.app.metadataCache.on('resolved', () => {
				this.debouncedRebuild();
			}),
		);

		this.rebuild();
	}

	stop(): void {
		for (const cleanup of this.cleanups) {
			cleanup();
		}
		this.cleanups = [];
	}

	private emit(): void {
		for (const listener of this.listeners) {
			listener(this.state);
		}
	}

	private setState(state: NoteIndexState): void {
		this.state = state;
		this.emit();
	}

	private rebuild(): void {
		if (!this.settings) {
			this.cardIndex.clear();
			this.setState(createEmptyState(false));
			return;
		}

		this.cardIndex.clear();
		const files = this.app.vault.getMarkdownFiles();

		for (const file of files) {
			const card = this.createCardFromFile(file);
			if (card) {
				this.cardIndex.set(card.filePath, card);
			}
		}

		this.setState(this.buildStateFromIndex(false));
	}

	private updateFile(file: TFile): void {
		if (!this.settings) {
			return;
		}

		if (file.extension !== 'md') {
			this.removeCard(file.path);
			return;
		}

		const card = this.createCardFromFile(file);
		if (!card) {
			this.removeCard(file.path);
			return;
		}

		this.cardIndex.set(card.filePath, card);
		this.setState(this.buildStateFromIndex(false));
	}

	private removeCard(filePath: string): void {
		if (!this.cardIndex.has(filePath)) {
			return;
		}
		this.cardIndex.delete(filePath);
		this.setState(this.buildStateFromIndex(false));
	}

	private renameCard(oldPath: string, file: TFile): void {
		this.cardIndex.delete(oldPath);
		this.updateFile(file);
	}

	private createCardFromFile(file: TFile): BoardCard | null {
		if (!this.settings) {
			return null;
		}

		if (file.path === this.boardFilePath) {
			return null;
		}

		if (!fileMatchesLimitTo(file, this.settings.limitTo, this.boardFilePath)) {
			return null;
		}

		const cache = this.app.metadataCache.getFileCache(file);
		const trigger = getTriggerFromFrontmatter(
			cache?.frontmatter,
			this.settings.triggerProperty,
			this.settings.values,
		);

		if (!trigger.hasProperty) {
			return null;
		}

		return {
			id: file.path,
			filePath: file.path,
			title: file.basename,
			columnId: trigger.columnId,
			rawValue: trigger.rawValue,
		};
	}

	private buildStateFromIndex(isLoading: boolean): NoteIndexState {
		if (!this.settings) {
			return createEmptyState(isLoading);
		}

		const columns: BoardColumn[] = this.settings.values.map((value) => ({
			id: value,
			title: value,
			cards: [],
		}));

		columns.push({
			id: UNKNOWN_COLUMN_ID,
			title: UNKNOWN_COLUMN_LABEL,
			cards: [],
		});

		const columnMap = new Map(columns.map((column) => [column.id, column]));

		const cards = Array.from(this.cardIndex.values()).sort((a, b) =>
			a.title.localeCompare(b.title),
		);

		for (const card of cards) {
			const column = columnMap.get(card.columnId) ?? columnMap.get(UNKNOWN_COLUMN_ID);
			column?.cards.push(card);
		}

		const visibleColumns = columns.filter(
			(column) =>
				column.id !== UNKNOWN_COLUMN_ID || column.cards.length > 0,
		);

		return {
			columns: visibleColumns,
			isLoading,
			cardCount: cards.length,
		};
	}
}
