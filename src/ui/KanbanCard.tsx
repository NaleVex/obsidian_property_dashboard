import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { KanbanCard as KanbanCardType } from '../data/types';
import { StatusSelect } from './StatusSelect';
import { useAppContext } from './AppContext';

interface KanbanCardProps {
	card: KanbanCardType;
	onStatusSelect: (filePath: string, status: string) => void;
}

export function KanbanCard({ card, onStatusSelect }: KanbanCardProps) {
	const { app, plugin } = useAppContext();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({
			id: card.id,
			data: {
				type: 'card',
				columnId: card.status,
				card,
			},
		});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const openNote = () => {
		void app.workspace.openLinkText(card.filePath, '');
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className="pk-card"
			{...attributes}
			{...listeners}
		>
			<button type="button" className="pk-card-title" onClick={openNote}>
				{card.title}
			</button>
			<div className="pk-card-meta">
				<span className="pk-card-path">{card.filePath}</span>
				<StatusSelect
					card={card}
					statuses={plugin.settings.statuses}
					onSelect={onStatusSelect}
				/>
			</div>
		</div>
	);
}
