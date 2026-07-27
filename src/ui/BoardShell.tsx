import { Menu, setIcon } from 'obsidian';
import { useEffect, useRef, type MouseEvent } from 'react';
import {
	BoardViewConfig,
	cloneView,
	createDefaultKanbanView,
	createDefaultTableView,
	isKanbanView,
	isTableView,
} from '../board/schema';
import { strings } from '../i18n';
import { useBoardApp } from './BoardAppContext';
import { BoardSettingsModal } from './BoardSettingsModal';
import { KanbanView } from './KanbanView';
import { TableView } from './TableView';
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

	const addView = (type: 'kanban' | 'table') => {
		void promptForText(app, {
			title: strings.board.newView,
			label: strings.board.viewName,
			defaultValue: type === 'kanban' ? 'Kanban' : 'Table',
			placeholder: type === 'kanban' ? 'Kanban' : 'Table',
			submitLabel: strings.common.create,
		}).then((name) => {
			if (name === null) {
				return;
			}
			const trimmed = name.trim() || (type === 'kanban' ? 'Kanban' : 'Table');
			const view =
				type === 'kanban'
					? createDefaultKanbanView(trimmed)
					: createDefaultTableView(trimmed);
			updateDocument((doc) => ({
				...doc,
				views: [...doc.views, view],
				activeViewId: view.id,
			}));
		});
	};

	const openAddViewMenu = (event: MouseEvent) => {
		event.preventDefault();
		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle(strings.board.kanban).setIcon('columns').onClick(() => {
				addView('kanban');
			});
		});
		menu.addItem((item) => {
			item.setTitle(strings.board.table).setIcon('table').onClick(() => {
				addView('table');
			});
		});
		menu.showAtMouseEvent(event.nativeEvent);
	};

	const renameView = (view: BoardViewConfig) => {
		void promptForText(app, {
			title: strings.board.renameView,
			label: strings.board.viewName,
			defaultValue: view.name,
			submitLabel: strings.common.rename,
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

	const copyView = (view: BoardViewConfig) => {
		const cloned = cloneView(view);
		updateDocument((doc) => ({
			...doc,
			views: [...doc.views, cloned],
			activeViewId: cloned.id,
		}));
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
			item.setTitle(strings.common.rename).setIcon('pencil').onClick(() => {
				renameView(view);
			});
		});
		menu.addItem((item) => {
			item.setTitle(strings.common.copy).setIcon('copy').onClick(() => {
				copyView(view);
			});
		});
		menu.addItem((item) => {
			item.setTitle(strings.common.delete).setIcon('trash').onClick(() => {
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
					aria-label={strings.board.nameAria}
					onChange={(event) => {
						const name = event.target.value;
						updateDocument((doc) => ({ ...doc, name }));
					}}
				/>

				<nav className="pk-tabs" aria-label={strings.board.viewsAria}>
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
						onClick={openAddViewMenu}
						aria-label={strings.board.addView}
						title={strings.board.addView}
					>
						+
					</button>
				</nav>

				<button
					type="button"
					className="pk-icon-button pk-header-settings"
					aria-label={strings.board.settings}
					title={strings.board.settings}
					onClick={openBoardSettings}
				>
					<Icon name="settings" />
				</button>
			</header>

			{activeView && isKanbanView(activeView) ? (
				<KanbanView view={activeView} />
			) : activeView && isTableView(activeView) ? (
				<TableView view={activeView} />
			) : (
				<div className="pk-board-empty">{strings.board.noViews}</div>
			)}
		</div>
	);
}
