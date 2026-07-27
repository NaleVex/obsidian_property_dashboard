import { useDroppable } from '@dnd-kit/core';
import { CSSProperties, MouseEvent } from 'react';
import { KanbanViewConfig } from '../board/schema';
import { BoardColumn as BoardColumnType } from '../data/types';
import { BoardCard } from './BoardCard';

interface BoardColumnProps {
	column: BoardColumnType;
	view: KanbanViewConfig;
	color?: string;
	onHeaderContextMenu?: (event: MouseEvent<HTMLElement>) => void;
}

export function BoardColumn({
	column,
	view,
	color,
	onHeaderContextMenu,
}: BoardColumnProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: column.id,
		data: {
			type: 'column',
			columnId: column.id,
		},
	});

	const style: CSSProperties | undefined = color
		? ({
				'--pk-column-accent': color,
			} as CSSProperties)
		: undefined;

	return (
		<section
			ref={setNodeRef}
			className={
				[
					'pk-column',
					isOver ? 'pk-column-over' : '',
					color ? 'pk-column-colored' : '',
				]
					.filter(Boolean)
					.join(' ')
			}
			style={style}
		>
			<header
				className="pk-column-header"
				onContextMenu={onHeaderContextMenu}
			>
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
