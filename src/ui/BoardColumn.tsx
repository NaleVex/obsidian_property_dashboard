import { BoardColumn as BoardColumnType } from '../data/types';
import { BoardCard } from './BoardCard';

interface BoardColumnProps {
	column: BoardColumnType;
}

export function BoardColumn({ column }: BoardColumnProps) {
	return (
		<section className="pk-column">
			<header className="pk-column-header">
				<span className="pk-column-title">{column.title}</span>
				<span className="pk-column-count">{column.cards.length}</span>
			</header>
			<div className="pk-column-cards">
				{column.cards.map((card) => (
					<BoardCard key={card.id} card={card} />
				))}
			</div>
		</section>
	);
}
