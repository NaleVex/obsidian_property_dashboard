import { useCallback } from 'react';
import {
	DndContext,
	DragEndEvent,
	DragOverlay,
	DragStartEvent,
	PointerSensor,
	TouchSensor,
	closestCorners,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { useBoardData } from './hooks/useBoardData';
import { useStatusUpdate } from './hooks/useStatusUpdate';
import { KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType } from '../data/types';

export function KanbanBoard() {
	const board = useBoardData();
	const { updateStatus } = useStatusUpdate();
	const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 200, tolerance: 8 },
		}),
	);

	const handleStatusSelect = useCallback(
		(filePath: string, status: string) => {
			void updateStatus(filePath, status);
		},
		[updateStatus],
	);

	const findColumnIdForCard = (cardId: string): string | undefined => {
		for (const column of board.columns) {
			if (column.cards.some((card: KanbanCardType) => card.id === cardId)) {
				return column.id;
			}
		}
		return undefined;
	};

	const handleDragStart = (event: DragStartEvent) => {
		const cardId = String(event.active.id);
		for (const column of board.columns) {
			const card = column.cards.find((c: KanbanCardType) => c.id === cardId);
			if (card) {
				setActiveCard(card);
				break;
			}
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveCard(null);

		const { active, over } = event;
		if (!over) {
			return;
		}

		const activeId = String(active.id);
		const sourceColumnId =
			(active.data.current?.columnId as string | undefined) ??
			findColumnIdForCard(activeId);

		let targetColumnId: string | undefined;

		if (over.data.current?.type === 'column') {
			targetColumnId = over.data.current.columnId as string;
		} else if (over.data.current?.type === 'card') {
			targetColumnId = over.data.current.columnId as string;
		} else {
			targetColumnId = String(over.id);
		}

		if (!sourceColumnId || !targetColumnId || sourceColumnId === targetColumnId) {
			return;
		}

		void updateStatus(activeId, targetColumnId);
	};

	if (board.isLoading) {
		return <div className="pk-board-loading">Loading board…</div>;
	}

	if (board.columns.length === 0) {
		return (
			<div className="pk-board-empty">
				<p>No columns configured.</p>
				<p>Add statuses in plugin settings to create Kanban columns.</p>
			</div>
		);
	}

	const totalCards = board.columns.reduce(
		(sum: number, column: KanbanColumnType) => sum + column.cards.length,
		0,
	);

	return (
		<div className="pk-board-container">
			{totalCards === 0 && (
				<div className="pk-board-hint">
					No matching notes found. Add frontmatter with your trigger property to
					see cards here.
				</div>
			)}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				<div className="pk-board">
					{board.columns.map((column: KanbanColumnType) => (
						<KanbanColumn
							key={column.id}
							column={column}
							onStatusSelect={handleStatusSelect}
						/>
					))}
				</div>
				<DragOverlay>
					{activeCard ? (
						<div className="pk-card pk-card-overlay">
							<div className="pk-card-title">{activeCard.title}</div>
						</div>
					) : null}
				</DragOverlay>
			</DndContext>
		</div>
	);
}
