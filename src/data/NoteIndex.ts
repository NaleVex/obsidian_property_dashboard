import { App, EventRef, Notice, TFile } from 'obsidian';
import {
	CardFieldDef,
	NoteIndexConfig,
	UNKNOWN_COLUMN_ID,
} from '../board/schema';
import { strings } from '../i18n';
import { fileMatchesLimitTo } from './limitTo';
import { isFileProperty, resolveFilePropertyValue } from './fileProperties';
import { snapshotFrontmatter, stripFrontmatter } from './noteBody';
import { extractParagraphSlice } from './paragraphValue';
import { stringifyPropertyValue } from './propertyValue';
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
		cards: [],
		isLoading,
		cardCount: 0,
	};
}

export class NoteIndex {
	private listeners = new Set<NoteIndexListener>();
	private state: NoteIndexState = createEmptyState(true);
	private settings: NoteIndexConfig | null = null;
	private cardFields: CardFieldDef[] = [];
	private boardFilePath = '';
	private cardIndex = new Map<string, BoardCard>();
	private pendingUpdates = new Set<string>();
	private cleanups: Array<() => void> = [];
	private rebuildGeneration = 0;
	private debouncedRebuild: () => void;

	constructor(private app: App) {
		this.debouncedRebuild = debounce(() => {
			void this.rebuild();
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

	configure(
		settings: NoteIndexConfig,
		boardFilePath: string,
		cardFields: CardFieldDef[] = [],
	): void {
		this.settings = settings;
		this.boardFilePath = boardFilePath;
		this.cardFields = cardFields;
		void this.rebuild();
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
				if (this.pendingUpdates.has(file.path)) {
					return;
				}
				void this.updateFile(file);
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
				void this.updateFile(file);
			}),
		);

		track(
			this.app.vault,
			this.app.vault.on('modify', (file) => {
				if (!(file instanceof TFile)) {
					return;
				}
				if (this.pendingUpdates.has(file.path)) {
					return;
				}
				void this.updateFile(file);
			}),
		);

		track(
			this.app.metadataCache,
			this.app.metadataCache.on('resolved', () => {
				this.debouncedRebuild();
			}),
		);

		void this.rebuild();
	}

	stop(): void {
		for (const cleanup of this.cleanups) {
			cleanup();
		}
		this.cleanups = [];
	}

	async updateTriggerProperty(filePath: string, columnId: string): Promise<void> {
		if (!this.settings || this.settings.indexMode !== 'kanban') {
			return;
		}

		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(strings.notices.noteNotFound);
			return;
		}

		const card = this.cardIndex.get(filePath);
		if (!card || card.columnId === columnId) {
			return;
		}

		const previous = { ...card };
		const newValue = columnId === UNKNOWN_COLUMN_ID ? '' : columnId;

		this.pendingUpdates.add(filePath);
		this.moveCardOptimistically(filePath, columnId, newValue);

		try {
			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter: Record<string, unknown>) => {
					if (this.settings?.indexMode === 'kanban') {
						frontmatter[this.settings.triggerProperty] = newValue;
					}
				},
			);
		} catch (error) {
			this.cardIndex.set(filePath, previous);
			this.setState(this.buildStateFromIndex(false));
			const message =
				error instanceof Error
					? error.message
					: strings.notices.updatePropertyFailed;
			new Notice(message);
		} finally {
			window.setTimeout(() => {
				this.pendingUpdates.delete(filePath);
			}, 300);
		}
	}

	private moveCardOptimistically(
		filePath: string,
		columnId: string,
		rawValue: string,
	): void {
		const card = this.cardIndex.get(filePath);
		if (!card || !this.settings || this.settings.indexMode !== 'kanban') {
			return;
		}
		const frontmatter = { ...card.frontmatter };
		frontmatter[this.settings.triggerProperty] = rawValue;
		this.cardIndex.set(filePath, {
			...card,
			columnId,
			rawValue,
			frontmatter,
		});
		this.setState(this.buildStateFromIndex(false));
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

	private async rebuild(): Promise<void> {
		const generation = ++this.rebuildGeneration;

		if (!this.settings) {
			this.cardIndex.clear();
			this.setState(createEmptyState(false));
			return;
		}

		this.setState(createEmptyState(true));
		const files = this.app.vault.getMarkdownFiles();
		const nextIndex = new Map<string, BoardCard>();

		for (const file of files) {
			const card = await this.createCardFromFile(file);
			if (generation !== this.rebuildGeneration) {
				return;
			}
			if (card) {
				nextIndex.set(card.filePath, card);
			}
		}

		if (generation !== this.rebuildGeneration) {
			return;
		}

		this.cardIndex = nextIndex;
		this.setState(this.buildStateFromIndex(false));
	}

	private async updateFile(file: TFile): Promise<void> {
		if (!this.settings) {
			return;
		}

		if (file.extension !== 'md') {
			this.removeCard(file.path);
			return;
		}

		const card = await this.createCardFromFile(file);
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
		this.pendingUpdates.delete(oldPath);
		void this.updateFile(file);
	}

	private readCardFields(
		file: TFile,
		frontmatter: Record<string, unknown> | undefined,
		body: string,
	): Record<string, string | null> {
		const fields: Record<string, string | null> = {};
		for (const def of this.cardFields) {
			if (def.type === 'paragraph') {
				fields[def.id] = extractParagraphSlice(
					body,
					def.paragraph,
					def.end,
				);
				continue;
			}

			if (!def.property) {
				fields[def.id] = null;
				continue;
			}

			if (isFileProperty(def.property)) {
				const resolved = resolveFilePropertyValue(
					this.app,
					file.path,
					def.property,
				);
				fields[def.id] = resolved.present
					? resolved.text || stringifyPropertyValue(resolved.raw)
					: null;
				continue;
			}

			if (
				!frontmatter ||
				!Object.prototype.hasOwnProperty.call(frontmatter, def.property)
			) {
				fields[def.id] = null;
				continue;
			}
			fields[def.id] = stringifyPropertyValue(frontmatter[def.property]);
		}
		return fields;
	}

	private async createCardFromFile(file: TFile): Promise<BoardCard | null> {
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
		const frontmatter = cache?.frontmatter;

		let columnId = '';
		let rawValue = '';

		if (this.settings.indexMode === 'kanban') {
			const trigger = getTriggerFromFrontmatter(
				frontmatter,
				this.settings.triggerProperty,
				this.settings.values,
			);

			if (!trigger.hasProperty) {
				return null;
			}

			columnId = trigger.columnId;
			rawValue = trigger.rawValue;
		}

		let body = '';
		try {
			const content = await this.app.vault.cachedRead(file);
			body = stripFrontmatter(content);
		} catch {
			body = '';
		}

		return {
			id: file.path,
			filePath: file.path,
			title: file.basename,
			columnId,
			rawValue,
			fields: this.readCardFields(file, frontmatter, body),
			frontmatter: snapshotFrontmatter(frontmatter),
			body,
		};
	}

	private buildStateFromIndex(isLoading: boolean): NoteIndexState {
		if (!this.settings) {
			return createEmptyState(isLoading);
		}

		const cards = Array.from(this.cardIndex.values()).sort((a, b) =>
			a.title.localeCompare(b.title),
		);

		if (this.settings.indexMode === 'table') {
			return {
				columns: [],
				cards,
				isLoading,
				cardCount: cards.length,
			};
		}

		const columns: BoardColumn[] = this.settings.values.map((value) => ({
			id: value,
			title: value,
			cards: [],
		}));

		columns.push({
			id: UNKNOWN_COLUMN_ID,
			title: strings.board.unknownColumn,
			cards: [],
		});

		const columnMap = new Map(columns.map((column) => [column.id, column]));

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
			cards: [],
			isLoading,
			cardCount: cards.length,
		};
	}
}
