import { Menu } from 'obsidian';
import { KanbanCard as KanbanCardType } from '../data/types';
import { isUncategorizedStatus } from '../data/types';

interface StatusSelectProps {
	card: KanbanCardType;
	statuses: string[];
	onSelect: (filePath: string, status: string) => void;
}

export function StatusSelect({ card, statuses, onSelect }: StatusSelectProps) {
	const displayStatus = isUncategorizedStatus(card.status)
		? card.rawStatus || 'Uncategorized'
		: card.status;

	const openMenu = (event: React.MouseEvent) => {
		event.preventDefault();
		event.stopPropagation();

		const menu = new Menu();

		for (const status of statuses) {
			menu.addItem((item) => {
				item
					.setTitle(status)
					.setChecked(status === card.status)
					.onClick(() => {
						void onSelect(card.filePath, status);
					});
			});
		}

		menu.showAtMouseEvent(event.nativeEvent);
	};

	return (
		<button
			type="button"
			className="pk-card-status"
			onClick={openMenu}
			title="Change status"
		>
			{displayStatus}
		</button>
	);
}
