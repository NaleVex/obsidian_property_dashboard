import { useDroppable } from '@dnd-kit/core';
import { BoardViewConfig } from '../board/schema';
import { BoardColumn as BoardColumnType } from '../data/types';
import { BoardCard } from './BoardCard';

interface BoardColumnProps {
	column: BoardColumnType;
	view: BoardViewConfig;
}

export function BoardColumn({ column, view }: BoardColumnProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: column.id,
		data: {
			type: 'column',
			columnId: column.id,
		},
	});

	return (
		<section
			ref={setNodeRef}
			className={isOver ? 'pk-column pk-column-over' : 'pk-column'}
		>
			<header className="pk-column-header">
				<span className="pk-column-title">{column.title}</span>
				<span className="pk-column-count">{column.cards.length}</span>
			</header>
			<div className="pk-column-cards">
				{column.cards.map((card) => (
					<BoardCard key={card.id} card={card} view={view} />
				))}
			</div>
		</section>
	);
}
