import { App, Modal } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode, useState } from 'react';
import { BoardDocument, BoardViewConfig, isKanbanView, isTableView, KanbanViewConfig, TableViewConfig } from '../board/schema';
import { CardFieldsEditor } from './CardFieldsEditor';
import { TableValuesEditor } from './TableValuesEditor';
import { ViewColumnSettings } from './ViewColumnSettings';

export interface ViewSettingsModalHost {
	app: App;
	getDocument: () => BoardDocument;
	updateDocument: (updater: (doc: BoardDocument) => BoardDocument) => void;
}

function ViewSettingsForm({
	host,
	viewId,
}: {
	host: ViewSettingsModalHost;
	viewId: string;
}) {
	const [, setTick] = useState(0);

	const view = host.getDocument().views.find((item) => item.id === viewId);
	if (!view) {
		return <div className="pk-board-empty">View not found.</div>;
	}

	const onUpdateView = (updater: (current: BoardViewConfig) => BoardViewConfig) => {
		host.updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === viewId ? updater(item) : item,
			),
		}));
		setTick((value) => value + 1);
	};

	const onUpdateKanbanView = (
		updater: (current: KanbanViewConfig) => KanbanViewConfig,
	) => {
		onUpdateView((current) =>
			current.type === 'kanban' ? updater(current) : current,
		);
	};

	const onUpdateTableView = (
		updater: (current: TableViewConfig) => TableViewConfig,
	) => {
		onUpdateView((current) =>
			current.type === 'table' ? updater(current) : current,
		);
	};

	return (
		<div className="pk-settings pk-settings-modal">
			{isKanbanView(view) ? (
				<>
					<ViewColumnSettings view={view} onUpdateView={onUpdateKanbanView} />
					<CardFieldsEditor view={view} onUpdateView={onUpdateKanbanView} />
				</>
			) : isTableView(view) ? (
				<TableValuesEditor view={view} onUpdateView={onUpdateTableView} />
			) : null}
		</div>
	);
}

export class ViewSettingsModal extends Modal {
	private root: Root | null = null;

	constructor(
		app: App,
		private host: ViewSettingsModalHost,
		private viewId: string,
	) {
		super(app);
	}

	onOpen(): void {
		const view = this.host.getDocument().views.find((item) => item.id === this.viewId);
		this.titleEl.setText(
			view ? `View settings — ${view.name}` : 'View settings',
		);
		this.modalEl.addClass('pk-view-settings-modal');
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<ViewSettingsForm host={this.host} viewId={this.viewId} />
			</StrictMode>,
		);
	}

	onClose(): void {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
	}
}
