import { useEffect, useMemo, useRef, useState } from 'react';
import { setIcon } from 'obsidian';
import {
	TableViewConfig,
	normalizeTableColumns,
} from '../board/schema';
import { filterCards } from '../data/filterCards';
import { useBoardApp } from './BoardAppContext';
import { CardColorsPanel } from './CardColorsPanel';
import { FilterPanel } from './FilterPanel';
import { TableColumnsPanel } from './TableColumnsPanel';
import { ViewSettingsModal } from './ViewSettingsModal';
import { TableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { getVisibleTableColumns } from './tableCells';
import { useNoteIndex } from './hooks/useNoteIndex';

type TablePanel = 'columns' | 'filter' | 'cardColors';

function ToolbarIcon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, name);
		}
	}, [name]);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

interface TableViewProps {
	view: TableViewConfig;
}

export function TableView({ view }: TableViewProps) {
	const { app, document, updateDocument, noteIndex } = useBoardApp();
	const state = useNoteIndex(noteIndex);
	const [panel, setPanel] = useState<TablePanel | null>(null);

	const documentRef = useRef(document);
	const updateDocumentRef = useRef(updateDocument);
	documentRef.current = document;
	updateDocumentRef.current = updateDocument;

	const visibleColumns = useMemo(
		() => getVisibleTableColumns(view),
		[view.columns, view.values],
	);

	const displayCards = useMemo(
		() => filterCards(state.cards, view.filters, app),
		[state.cards, view.filters, app],
	);

	const togglePanel = (id: TablePanel) => {
		setPanel((current) => (current === id ? null : id));
	};

	const openViewSettings = () => {
		new ViewSettingsModal(
			app,
			{
				app,
				getDocument: () => documentRef.current,
				updateDocument: (updater) => updateDocumentRef.current(updater),
			},
			view.id,
		).open();
	};

	const patchColumns = (columns: ReturnType<typeof normalizeTableColumns>) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === view.id && item.type === 'table'
					? {
							...item,
							columns: normalizeTableColumns(columns, item.values),
						}
					: item,
			),
		}));
	};

	const patchColumnWidth = (columnId: string, width: number) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === view.id && item.type === 'table'
					? {
							...item,
							columnWidths: {
								...item.columnWidths,
								[columnId]: width,
							},
						}
					: item,
			),
		}));
	};

	const hasActiveFilters = view.filters.some((rule) => rule.enabled);
	const hasActiveCardColors = view.cardColors.some((rule) => rule.enabled);

	return (
		<div className="pk-table-view">
			<div className="pk-table-toolbar">
				<div className="pk-kanban-instruments">
					<button
						type="button"
						className="pk-icon-button"
						aria-label="View settings"
						title="View settings"
						onClick={openViewSettings}
					>
						<ToolbarIcon name="settings" />
					</button>
					<button
						type="button"
						className={
							panel === 'columns'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label="Columns"
						title="Columns"
						onClick={() => togglePanel('columns')}
					>
						Columns
					</button>
					<button
						type="button"
						className={
							panel === 'filter'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label="Filter"
						title="Filter"
						onClick={() => togglePanel('filter')}
					>
						Filter
						{hasActiveFilters ? (
							<span className="pk-toolbar-badge">
								{view.filters.filter((rule) => rule.enabled).length}
							</span>
						) : null}
					</button>
					<button
						type="button"
						className={
							panel === 'cardColors'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label="Colors"
						title="Colors"
						onClick={() => togglePanel('cardColors')}
					>
						Colors
						{hasActiveCardColors ? (
							<span className="pk-toolbar-badge">
								{view.cardColors.filter((rule) => rule.enabled).length}
							</span>
						) : null}
					</button>
				</div>
			</div>

			{panel === 'columns' && <TableColumnsPanel view={view} />}
			{panel === 'filter' && <FilterPanel view={view} />}
			{panel === 'cardColors' && <CardColorsPanel view={view} />}

			{state.isLoading ? (
				<div className="pk-board-loading">Loading board…</div>
			) : state.cardCount === 0 ? (
				<div className="pk-board-empty">No notes in scope.</div>
			) : (
				<div className="pk-table-scroll">
					{displayCards.length === 0 && hasActiveFilters ? (
						<div className="pk-board-empty">
							No rows match the current filters.
						</div>
					) : (
						<table className="pk-table">
							<TableHeader
								view={view}
								columns={visibleColumns}
								onReorder={patchColumns}
								onResize={patchColumnWidth}
							/>
							<tbody>
								{displayCards.map((card) => (
									<TableRow
										key={card.id}
										card={card}
										view={view}
										columns={visibleColumns}
										app={app}
										onOpen={() => {
											void app.workspace.openLinkText(card.filePath, '', false);
										}}
									/>
								))}
							</tbody>
						</table>
					)}
				</div>
			)}
		</div>
	);
}
