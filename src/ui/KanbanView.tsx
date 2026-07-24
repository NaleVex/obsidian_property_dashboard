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
import { BoardViewConfig } from '../board/schema';
import { countCards, filterColumns } from '../data/filterCards';
import { BoardCard as BoardCardType } from '../data/types';
import { useBoardApp } from './BoardAppContext';
import { BoardColumn } from './BoardColumn';
import { CardDragPreview } from './CardDragPreview';
import { CardsInfoPanel } from './CardsInfoPanel';
import { FilterPanel } from './FilterPanel';
import { ViewSettingsModal } from './ViewSettingsModal';
import { useNoteIndex } from './hooks/useNoteIndex';

interface DragPreviewState {
	card: BoardCardType;
	offset: { x: number; y: number };
	initialPosition: { x: number; y: number };
	width: number;
}

const COLUMN_COLOR_PRESETS: Array<{ hex: string; name: string }> = [
	{ hex: '#e74c3c', name: 'Red' },
	{ hex: '#e67e22', name: 'Orange' },
	{ hex: '#f1c40f', name: 'Yellow' },
	{ hex: '#2ecc71', name: 'Green' },
	{ hex: '#1abc9c', name: 'Teal' },
	{ hex: '#3498db', name: 'Blue' },
	{ hex: '#9b59b6', name: 'Purple' },
	{ hex: '#95a5a6', name: 'Gray' },
];

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
	view: BoardViewConfig;
}

export function KanbanView({ view }: KanbanViewProps) {
	const { app, document, updateDocument, noteIndex } = useBoardApp();
	const state = useNoteIndex(noteIndex);
	const [panel, setPanel] = useState<'cardsInfo' | 'filter' | null>(null);
	const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);

	const documentRef = useRef(document);
	const updateDocumentRef = useRef(updateDocument);
	documentRef.current = document;
	updateDocumentRef.current = updateDocument;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const filteredColumns = useMemo(
		() => filterColumns(state.columns, view.filters),
		[state.columns, view.filters],
	);

	const filteredCardCount = useMemo(
		() => countCards(filteredColumns),
		[filteredColumns],
	);

	const cardLookup = useMemo(() => {
		const map = new Map<string, BoardCardType>();
		for (const column of filteredColumns) {
			for (const card of column.cards) {
				map.set(card.id, card);
			}
		}
		return map;
	}, [filteredColumns]);

	const togglePanel = (id: 'cardsInfo' | 'filter') => {
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
				if (item.id !== view.id) {
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
			item.setTitle('Color').setIsLabel(true);
		});

		menu.addItem((item) => {
			item.setTitle('Default').setIcon('circle-off').onClick(() => {
				setColumnColor(columnId, null);
			});
			if (!current) {
				item.setChecked(true);
			}
		});

		for (const preset of COLUMN_COLOR_PRESETS) {
			menu.addItem((item) => {
				const title = window.document.createDocumentFragment();
				const swatch = window.document.createElement('span');
				swatch.className = 'pk-color-swatch';
				swatch.style.background = preset.hex;
				title.appendChild(swatch);
				title.appendChild(window.document.createTextNode(preset.name));
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
			item.setTitle('Custom…').setIcon('palette').onClick(() => {
				const input = window.document.createElement('input');
				input.type = 'color';
				input.value = current && /^#[0-9a-fA-F]{6}$/.test(current)
					? current
					: '#3498db';
				input.style.position = 'fixed';
				input.style.left = '-9999px';
				window.document.body.appendChild(input);
				input.addEventListener(
					'change',
					() => {
						setColumnColor(columnId, input.value);
						input.remove();
					},
					{ once: true },
				);
				input.addEventListener(
					'cancel',
					() => {
						input.remove();
					},
					{ once: true },
				);
				input.click();
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
			if (filteredColumns.some((column) => column.id === overId)) {
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

	return (
		<div className="pk-kanban">
			<div className="pk-kanban-toolbar">
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
							panel === 'cardsInfo'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label="Cards info"
						title="Cards info"
						onClick={() => togglePanel('cardsInfo')}
					>
						Cards info
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
							<span className="pk-toolbar-badge">{view.filters.filter((r) => r.enabled).length}</span>
						) : null}
					</button>
				</div>
			</div>

			{panel === 'cardsInfo' && <CardsInfoPanel view={view} />}
			{panel === 'filter' && <FilterPanel view={view} />}

			{state.isLoading ? (
				<div className="pk-board-loading">Loading board…</div>
			) : state.cardCount === 0 ? (
				<div className="pk-board-empty">
					No notes with the trigger property in scope.
				</div>
			) : (
				<>
					{filteredCardCount === 0 && hasActiveFilters && (
						<div className="pk-board-empty">
							No cards match the current filters.
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
							{filteredColumns.map((column) => (
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
