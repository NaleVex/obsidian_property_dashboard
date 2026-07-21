import { useDroppable } from '@dnd-kit/core';
import {
	SortableContext,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { KanbanColumn as KanbanColumnType } from '../data/types';
import { KanbanCard } from './KanbanCard';

interface KanbanColumnProps {
	column: KanbanColumnType;
	onStatusSelect: (filePath: string, status: string) => void;
}

export function KanbanColumn({ column, onStatusSelect }: KanbanColumnProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: column.id,
		data: {
			type: 'column',
			columnId: column.id,
		},
	});

	const cardIds = column.cards.map((card) => card.id);

	return (
		<div className="pk-column">
			<div className="pk-column-header">
				<span className="pk-column-title">{column.title}</span>
				<span className="pk-column-count">{column.cards.length}</span>
			</div>
			<div
				ref={setNodeRef}
				className={`pk-column-body${isOver ? ' pk-column-body-over' : ''}`}
			>
				<SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
					{column.cards.map((card) => (
						<KanbanCard
							key={card.id}
							card={card}
							onStatusSelect={onStatusSelect}
						/>
					))}
				</SortableContext>
				{column.cards.length === 0 && (
					<div className="pk-column-empty">Drop cards here</div>
				)}
			</div>
		</div>
	);
}
