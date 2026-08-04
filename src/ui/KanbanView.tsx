import {
	DndContext,
	DragEndEvent,
	DragStartEvent,
	PointerSensor,
	closestCorners,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { Menu, setIcon } from 'obsidian';
import { MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { KanbanViewConfig } from '../board/schema';
import { countCards, filterColumns, filterColumnsByQuickSearch } from '../data/filterCards';
import { sortColumns } from '../data/sortCards';
import { BoardCard as BoardCardType } from '../data/types';
import { strings } from '../i18n';
import { useBoardApp } from './BoardAppContext';
import { BoardColumn } from './BoardColumn';
import { CardDragPreview } from './CardDragPreview';
import { CardColorsPanel } from './CardColorsPanel';
import { CardsInfoPanel } from './CardsInfoPanel';
import { getColorPresets, HEX_COLOR_RE, pickCustomColor } from './colorPresets';
import { FilterPanel } from './FilterPanel';
import { QuickSearchBar } from './QuickSearchBar';
import { useQuickSearch } from './QuickSearchContext';
import { SortPanel } from './SortPanel';
import { ViewSettingsModal } from './ViewSettingsModal';
import { useNoteIndex } from './hooks/useNoteIndex';

interface DragPreviewState {
	card: BoardCardType;
	offset: { x: number; y: number };
	initialPosition: { x: number; y: number };
	width: number;
}

type KanbanPanel = 'cardsInfo' | 'filter' | 'sort' | 'cardColors';

function ToolbarIcon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, name);
		}
	}, [name]);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

interface KanbanViewProps {
	view: KanbanViewConfig;
}

export function KanbanView({ view }: KanbanViewProps) {
	const { app, document, updateDocument, noteIndex } = useBoardApp();
	const { query: quickSearch, applyWithFilters } = useQuickSearch();
	const state = useNoteIndex(noteIndex);
	const [panel, setPanel] = useState<KanbanPanel | null>(null);
	const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);

	const documentRef = useRef(document);
	const updateDocumentRef = useRef(updateDocument);
	documentRef.current = document;
	updateDocumentRef.current = updateDocument;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const filteredColumns = useMemo(() => {
		const hasQuickSearch = quickSearch.trim().length > 0;
		let columns =
			hasQuickSearch && !applyWithFilters
				? filterColumnsByQuickSearch(state.columns, quickSearch)
				: filterColumns(state.columns, view.filters, app);
		if (hasQuickSearch && applyWithFilters) {
			columns = filterColumnsByQuickSearch(columns, quickSearch);
		}
		return columns;
	}, [state.columns, view.filters, app, quickSearch, applyWithFilters]);

	const displayColumns = useMemo(
		() => sortColumns(filteredColumns, view.sorts, app),
		[filteredColumns, view.sorts, app],
	);

	const filteredCardCount = useMemo(
		() => countCards(displayColumns),
		[displayColumns],
	);

	const cardLookup = useMemo(() => {
		const map = new Map<string, BoardCardType>();
		for (const column of displayColumns) {
			for (const card of column.cards) {
				map.set(card.id, card);
			}
		}
		return map;
	}, [displayColumns]);

	const togglePanel = (id: KanbanPanel) => {
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

	const setColumnColor = (columnId: string, color: string | null) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) => {
				if (item.id !== view.id || item.type !== 'kanban') {
					return item;
				}
				const columnColors = { ...item.columnColors };
				if (!color) {
					delete columnColors[columnId];
				} else {
					columnColors[columnId] = color;
				}
				return { ...item, columnColors };
			}),
		}));
	};

	const openColumnMenu = (
		event: MouseEvent<HTMLElement>,
		columnId: string,
	) => {
		event.preventDefault();
		const menu = new Menu();
		const current = view.columnColors[columnId];

		menu.addItem((item) => {
			item.setTitle(strings.common.color).setIsLabel(true);
		});

		menu.addItem((item) => {
			item.setTitle(strings.common.default).setIcon('circle-off').onClick(() => {
				setColumnColor(columnId, null);
			});
			if (!current) {
				item.setChecked(true);
			}
		});

		for (const preset of getColorPresets()) {
			menu.addItem((item) => {
				const title = createFragment((frag) => {
					const swatch = frag.createSpan({ cls: 'pk-color-swatch' });
					swatch.style.background = preset.hex;
					frag.appendText(preset.name);
				});
				item.setTitle(title).onClick(() => {
					setColumnColor(columnId, preset.hex);
				});
				if (current === preset.hex) {
					item.setChecked(true);
				}
			});
		}

		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle(strings.common.customEllipsis).setIcon('palette').onClick(() => {
				pickCustomColor(
					current && HEX_COLOR_RE.test(current) ? current : undefined,
					(hex) => setColumnColor(columnId, hex),
				);
			});
		});

		menu.showAtMouseEvent(event.nativeEvent);
	};

	const clearDrag = () => {
		setDragPreview(null);
	};

	const onDragStart = (event: DragStartEvent) => {
		const card = cardLookup.get(String(event.active.id));
		if (!card) {
			return;
		}

		const activator = event.activatorEvent;
		let offset = { x: 12, y: 12 };
		let width = 220;
		let initialPosition = { x: 0, y: 0 };

		if (activator instanceof PointerEvent) {
			const el =
				activator.currentTarget instanceof HTMLElement
					? activator.currentTarget
					: activator.target instanceof HTMLElement
						? activator.target.closest('.pk-card')
						: null;

			if (el instanceof HTMLElement) {
				const rect = el.getBoundingClientRect();
				offset = {
					x: activator.clientX - rect.left,
					y: activator.clientY - rect.top,
				};
				width = rect.width;
				initialPosition = { x: rect.left, y: rect.top };
			} else {
				initialPosition = {
					x: activator.clientX - offset.x,
					y: activator.clientY - offset.y,
				};
			}
		}

		setDragPreview({ card, offset, initialPosition, width });
	};

	const onDragEnd = (event: DragEndEvent) => {
		clearDrag();
		const { active, over } = event;
		if (!over) {
			return;
		}

		const card = cardLookup.get(String(active.id));
		if (!card) {
			return;
		}

		const overData = over.data.current;
		let targetColumnId: string | null = null;

		if (overData?.type === 'column') {
			targetColumnId = String(overData.columnId);
		} else if (overData?.type === 'card') {
			targetColumnId = String(overData.columnId);
		} else {
			const overId = String(over.id);
		if (displayColumns.some((column) => column.id === overId)) {
			targetColumnId = overId;
		} else {
			const overCard = cardLookup.get(overId);
			targetColumnId = overCard?.columnId ?? null;
		}
		}

		if (!targetColumnId || targetColumnId === card.columnId) {
			return;
		}

		void noteIndex.updateTriggerProperty(card.filePath, targetColumnId);
	};

	const hasActiveFilters = view.filters.some((rule) => rule.enabled);
	const hasActiveSorts = view.sorts.some((rule) => rule.enabled);
	const hasActiveCardColors = view.cardColors.some((rule) => rule.enabled);
	const hasQuickSearch = quickSearch.trim().length > 0;

	return (
		<div className="pk-kanban">
			<div className="pk-kanban-toolbar">
				<div className="pk-kanban-instruments">
					<button
						type="button"
						className="pk-icon-button"
						aria-label={strings.kanban.viewSettings}
						title={strings.kanban.viewSettings}
						onClick={openViewSettings}
					>
						<ToolbarIcon name="settings" />
					</button>
					<button
						type="button"
						className={
							panel === 'cardsInfo'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.kanban.cardsInfo}
						title={strings.kanban.cardsInfo}
						onClick={() => togglePanel('cardsInfo')}
					>
						{strings.kanban.cardsInfo}
					</button>
					<button
						type="button"
						className={
							panel === 'filter'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.kanban.filter}
						title={strings.kanban.filter}
						onClick={() => togglePanel('filter')}
					>
						{strings.kanban.filter}
						{hasActiveFilters ? (
							<span className="pk-toolbar-badge">{view.filters.filter((r) => r.enabled).length}</span>
						) : null}
					</button>
					<button
						type="button"
						className={
							panel === 'sort'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.kanban.sort}
						title={strings.kanban.sort}
						onClick={() => togglePanel('sort')}
					>
						{strings.kanban.sort}
						{hasActiveSorts ? (
							<span className="pk-toolbar-badge">
								{view.sorts.filter((r) => r.enabled).length}
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
						aria-label={strings.kanban.colors}
						title={strings.kanban.colors}
						onClick={() => togglePanel('cardColors')}
					>
						{strings.kanban.colors}
						{hasActiveCardColors ? (
							<span className="pk-toolbar-badge">
								{view.cardColors.filter((r) => r.enabled).length}
							</span>
						) : null}
					</button>
				</div>
				<QuickSearchBar />
			</div>

			{panel === 'cardsInfo' && <CardsInfoPanel view={view} />}
			{panel === 'filter' && <FilterPanel view={view} />}
			{panel === 'sort' && <SortPanel view={view} />}
			{panel === 'cardColors' && <CardColorsPanel view={view} />}

			{state.isLoading ? (
				<div className="pk-board-loading">{strings.board.loading}</div>
			) : state.cardCount === 0 ? (
				<div className="pk-board-empty">
					{strings.kanban.noNotesInScope}
				</div>
			) : (
				<>
					{filteredCardCount === 0 &&
						(hasActiveFilters || hasQuickSearch) && (
						<div className="pk-board-empty">
							{strings.kanban.noCardsMatchFilters}
						</div>
					)}
					<DndContext
						sensors={sensors}
						collisionDetection={closestCorners}
						onDragStart={onDragStart}
						onDragCancel={clearDrag}
						onDragEnd={onDragEnd}
					>
						<div
							className={
								dragPreview ? 'pk-board pk-board-dragging' : 'pk-board'
							}
						>
							{displayColumns.map((column) => (
								<BoardColumn
									key={column.id}
									column={column}
									view={view}
									color={view.columnColors[column.id]}
									onHeaderContextMenu={(event) =>
										openColumnMenu(event, column.id)
									}
								/>
							))}
						</div>
						{dragPreview && (
							<CardDragPreview
								card={dragPreview.card}
								view={view}
								offset={dragPreview.offset}
								initialPosition={dragPreview.initialPosition}
								width={dragPreview.width}
							/>
						)}
					</DndContext>
				</>
			)}
		</div>
	);
}
