import { useEffect, useMemo, useRef, useState } from 'react';
import { setIcon } from 'obsidian';
import {
	TableViewConfig,
	normalizeTableColumns,
} from '../board/schema';
import { filterCards } from '../data/filterCards';
import { strings } from '../i18n';
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
						aria-label={strings.table.viewSettings}
						title={strings.table.viewSettings}
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
						aria-label={strings.table.columns}
						title={strings.table.columns}
						onClick={() => togglePanel('columns')}
					>
						{strings.table.columns}
					</button>
					<button
						type="button"
						className={
							panel === 'filter'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.table.filter}
						title={strings.table.filter}
						onClick={() => togglePanel('filter')}
					>
						{strings.table.filter}
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
						aria-label={strings.table.colors}
						title={strings.table.colors}
						onClick={() => togglePanel('cardColors')}
					>
						{strings.table.colors}
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
				<div className="pk-board-loading">{strings.board.loading}</div>
			) : state.cardCount === 0 ? (
				<div className="pk-board-empty">{strings.table.noNotesInScope}</div>
			) : (
				<div className="pk-table-scroll">
					{displayCards.length === 0 && hasActiveFilters ? (
						<div className="pk-board-empty">
							{strings.table.noRowsMatchFilters}
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
