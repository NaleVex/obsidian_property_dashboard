import { TextFileView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import {
	BoardDocument,
	DEFAULT_TRIGGER_PROPERTY,
	DEFAULT_VALUES,
	isTableView,
	parseBoardDocument,
	serializeBoardDocument,
} from '../board/schema';
import { NoteIndex } from '../data/NoteIndex';
import { format, strings } from '../i18n';
import { BoardAppContext } from '../ui/BoardAppContext';
import { BoardShell } from '../ui/BoardShell';

export const VIEW_TYPE_BOARD = 'property-board-view';

export class BoardView extends TextFileView {
	private root: Root | null = null;
	private reactHost: HTMLElement | null = null;
	private document: BoardDocument = parseBoardDocument('', strings.board.defaultFileName);
	private noteIndex: NoteIndex;
	private parseError: string | null = null;
	private rawFallback: string | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.noteIndex = new NoteIndex(this.app);
	}

	getViewType(): string {
		return VIEW_TYPE_BOARD;
	}

	getDisplayText(): string {
		return this.document.name || this.file?.basename || strings.board.displayFallback;
	}

	getIcon(): string {
		return 'layout-dashboard';
	}

	getViewData(): string {
		if (this.parseError && this.rawFallback !== null) {
			return this.rawFallback;
		}
		return serializeBoardDocument(this.document);
	}

	setViewData(data: string, clear: boolean): void {
		if (clear) {
			this.clear();
		}

		const fallbackName = this.file?.basename ?? strings.board.defaultFileName;
		try {
			this.document = parseBoardDocument(data, fallbackName);
			this.parseError = null;
			this.rawFallback = null;
		} catch (error) {
			this.parseError =
				error instanceof Error
					? error.message
					: strings.notices.parseBoardFailed;
			this.rawFallback = data;
			this.document = parseBoardDocument('', fallbackName);
		}

		this.syncNoteIndex();
		this.renderReact();
	}

	clear(): void {
		this.document = parseBoardDocument('', this.file?.basename ?? strings.board.defaultFileName);
		this.parseError = null;
		this.rawFallback = null;
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass('pk-view');
		this.reactHost = this.contentEl.createDiv({ cls: 'pk-react-host' });
		this.noteIndex.start();
		this.syncNoteIndex();
		this.renderReact();
	}

	async onClose(): Promise<void> {
		this.noteIndex.stop();
		this.root?.unmount();
		this.root = null;
		this.reactHost = null;
	}

	private syncNoteIndex(): void {
		const boardPath = this.file?.path ?? '';
		const activeView =
			this.document.views.find((view) => view.id === this.document.activeViewId) ??
			this.document.views[0];

		if (activeView && isTableView(activeView)) {
			this.noteIndex.configure(
				{
					indexMode: 'table',
					limitTo: this.document.settings.limitTo,
				},
				boardPath,
				activeView.values,
			);
			return;
		}

		this.noteIndex.configure(
			{
				indexMode: 'kanban',
				limitTo: this.document.settings.limitTo,
				triggerProperty: activeView?.triggerProperty ?? DEFAULT_TRIGGER_PROPERTY,
				values: activeView?.type === 'kanban'
					? activeView.values
					: [...DEFAULT_VALUES],
			},
			boardPath,
			activeView?.type === 'kanban' ? activeView.cardFields : [],
		);
	}

	private updateDocument = (updater: (doc: BoardDocument) => BoardDocument): void => {
		this.document = updater(this.document);
		this.syncNoteIndex();
		this.renderReact();
		this.requestSave();
	};

	private renderReact(): void {
		if (!this.reactHost) {
			return;
		}

		if (!this.root) {
			this.root = createRoot(this.reactHost);
		}

		if (this.parseError) {
			this.root.render(
				<StrictMode>
					<div className="pk-board-empty">
						{format(strings.board.invalidFile, { reason: this.parseError })}
					</div>
				</StrictMode>,
			);
			return;
		}

		this.root.render(
			<StrictMode>
				<BoardAppContext.Provider
					value={{
						app: this.app,
						document: this.document,
						boardFilePath: this.file?.path ?? '',
						noteIndex: this.noteIndex,
						updateDocument: this.updateDocument,
					}}
				>
					<BoardShell />
				</BoardAppContext.Provider>
			</StrictMode>,
		);
	}
}
