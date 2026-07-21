import { BoardCard as BoardCardType } from '../data/types';
import { useBoardApp } from './BoardAppContext';

interface BoardCardProps {
	card: BoardCardType;
}

export function BoardCard({ card }: BoardCardProps) {
	const { app } = useBoardApp();

	const openNote = () => {
		void app.workspace.openLinkText(card.filePath, '', false);
	};

	return (
		<button type="button" className="pk-card" onClick={openNote}>
			<span className="pk-card-title">{card.title}</span>
		</button>
	);
}
