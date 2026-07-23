import {
	DndContext,
	DragEndEvent,
	DragStartEvent,
	PointerSensor,
	closestCorners,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { setIcon } from 'obsidian';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BoardViewConfig } from '../board/schema';
import { BoardCard as BoardCardType } from '../data/types';
import { useBoardApp } from './BoardAppContext';
import { BoardColumn } from './BoardColumn';
import { CardDragPreview } from './CardDragPreview';
import { CardsInfoPanel } from './CardsInfoPanel';
import { ViewSettingsModal } from './ViewSettingsModal';
import { useNoteIndex } from './hooks/useNoteIndex';

interface DragPreviewState {
	card: BoardCardType;
	offset: { x: number; y: number };
	initialPosition: { x: number; y: number };
	width: number;
}

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
	const [panel, setPanel] = useState<'cardsInfo' | null>(null);
	const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);

	const documentRef = useRef(document);
	const updateDocumentRef = useRef(updateDocument);
	documentRef.current = document;
	updateDocumentRef.current = updateDocument;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const cardLookup = useMemo(() => {
		const map = new Map<string, BoardCardType>();
		for (const column of state.columns) {
			for (const card of column.cards) {
				map.set(card.id, card);
			}
		}
		return map;
	}, [state.columns]);

	const togglePanel = (id: 'cardsInfo') => {
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
			if (state.columns.some((column) => column.id === overId)) {
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
				</div>
			</div>

			{panel === 'cardsInfo' && <CardsInfoPanel view={view} />}

			{state.isLoading ? (
				<div className="pk-board-loading">Loading board…</div>
			) : state.cardCount === 0 ? (
				<div className="pk-board-empty">
					No notes with the trigger property in scope.
				</div>
			) : (
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
						{state.columns.map((column) => (
							<BoardColumn key={column.id} column={column} view={view} />
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
			)}
		</div>
	);
}
