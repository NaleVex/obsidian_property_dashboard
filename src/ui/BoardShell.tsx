import { Menu, setIcon } from 'obsidian';
import { useEffect, useRef, type MouseEvent } from 'react';
import { BoardViewConfig, createDefaultKanbanView } from '../board/schema';
import { useBoardApp } from './BoardAppContext';
import { BoardSettingsModal } from './BoardSettingsModal';
import { KanbanView } from './KanbanView';
import { promptForText } from './TextPromptModal';

function Icon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, name);
		}
	}, [name]);

	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

export function BoardShell() {
	const { app, document, updateDocument } = useBoardApp();
	const documentRef = useRef(document);
	const updateDocumentRef = useRef(updateDocument);
	documentRef.current = document;
	updateDocumentRef.current = updateDocument;

	const activeView =
		document.views.find((view) => view.id === document.activeViewId) ??
		document.views[0] ??
		null;

	const openBoardSettings = () => {
		new BoardSettingsModal(app, {
			app,
			getDocument: () => documentRef.current,
			updateDocument: (updater) => updateDocumentRef.current(updater),
		}).open();
	};

	const setActiveView = (viewId: string) => {
		updateDocument((doc) => ({
			...doc,
			activeViewId: viewId,
		}));
	};

	const addKanbanView = () => {
		void promptForText(app, {
			title: 'New view',
			label: 'View name',
			defaultValue: 'Kanban',
			placeholder: 'Kanban',
			submitLabel: 'Create',
		}).then((name) => {
			if (name === null) {
				return;
			}
			const trimmed = name.trim() || 'Kanban';
			const view = createDefaultKanbanView(trimmed);
			updateDocument((doc) => ({
				...doc,
				views: [...doc.views, view],
				activeViewId: view.id,
			}));
		});
	};

	const renameView = (view: BoardViewConfig) => {
		void promptForText(app, {
			title: 'Rename view',
			label: 'View name',
			defaultValue: view.name,
			submitLabel: 'Rename',
		}).then((name) => {
			if (name === null) {
				return;
			}
			const trimmed = name.trim();
			if (!trimmed || trimmed === view.name) {
				return;
			}
			updateDocument((doc) => ({
				...doc,
				views: doc.views.map((item) =>
					item.id === view.id ? { ...item, name: trimmed } : item,
				),
			}));
		});
	};

	const deleteView = (viewId: string) => {
		updateDocument((doc) => {
			const views = doc.views.filter((view) => view.id !== viewId);
			const activeViewId =
				doc.activeViewId === viewId
					? (views[0]?.id ?? null)
					: doc.activeViewId;
			return {
				...doc,
				views,
				activeViewId,
			};
		});
	};

	const openViewMenu = (event: MouseEvent, view: BoardViewConfig) => {
		event.preventDefault();
		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle('Rename').setIcon('pencil').onClick(() => {
				renameView(view);
			});
		});
		menu.addItem((item) => {
			item.setTitle('Delete').setIcon('trash').onClick(() => {
				deleteView(view.id);
			});
		});
		menu.showAtMouseEvent(event.nativeEvent);
	};

	return (
		<div className="pk-shell">
			<header className="pk-header">
				<input
					className="pk-header-title"
					type="text"
					value={document.name}
					aria-label="Board name"
					onChange={(event) => {
						const name = event.target.value;
						updateDocument((doc) => ({ ...doc, name }));
					}}
				/>

				<nav className="pk-tabs" aria-label="Board views">
					{document.views.map((view) => (
						<button
							key={view.id}
							type="button"
							className={
								view.id === activeView?.id
									? 'pk-tab pk-tab-active'
									: 'pk-tab'
							}
							onClick={() => setActiveView(view.id)}
							onContextMenu={(event) => openViewMenu(event, view)}
						>
							{view.name}
						</button>
					))}
					<button
						type="button"
						className="pk-tab pk-tab-add"
						onClick={addKanbanView}
						aria-label="Add kanban view"
						title="Add kanban view"
					>
						+
					</button>
				</nav>

				<button
					type="button"
					className="pk-icon-button pk-header-settings"
					aria-label="Board settings"
					title="Board settings"
					onClick={openBoardSettings}
				>
					<Icon name="settings" />
				</button>
			</header>

			{activeView?.type === 'kanban' ? (
				<KanbanView view={activeView} />
			) : (
				<div className="pk-board-empty">No views yet. Add a kanban view.</div>
			)}
		</div>
	);
}
