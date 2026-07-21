import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { PropertyKanbanPlugin } from '../plugin-types';
import { AppContext } from '../ui/AppContext';
import { KanbanBoard } from '../ui/KanbanBoard';

export const VIEW_TYPE_PROPERTY_KANBAN = 'property-kanban-view';

export class PropertyKanbanView extends ItemView {
	private root: Root | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: PropertyKanbanPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_PROPERTY_KANBAN;
	}

	getDisplayText(): string {
		return 'Property Kanban';
	}

	getIcon(): string {
		return 'layout-grid';
	}

	async onOpen(): Promise<void> {
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<AppContext.Provider
					value={{
						app: this.app,
						plugin: this.plugin,
						dataService: this.plugin.dataService,
					}}
				>
					<KanbanBoard />
				</AppContext.Provider>
			</StrictMode>,
		);
	}

	async onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;
	}
}
