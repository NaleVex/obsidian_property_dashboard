import {
	TableColumnItem,
	TableViewConfig,
} from '../board/schema';
import { resolveCardColors } from '../data/filterCards';
import { BoardCard } from '../data/types';
import { cardColorStyle } from './BoardCard';
import { columnWidth, renderTableCellText } from './tableCells';

interface TableRowProps {
	card: BoardCard;
	view: TableViewConfig;
	columns: TableColumnItem[];
	app: import('obsidian').App;
	onOpen: () => void;
}

function tableRowClassName(
	colors: ReturnType<typeof resolveCardColors>,
): string {
	const parts = ['pk-table-row'];
	if (colors?.border || colors?.background) {
		parts.push('pk-table-row-colored');
	}
	if (colors?.border) {
		parts.push('pk-table-row-colored-border');
	}
	if (colors?.background) {
		parts.push('pk-table-row-colored-bg');
	}
	return parts.join(' ');
}

export function TableRow({ card, view, columns, app, onOpen }: TableRowProps) {
	const colors = resolveCardColors(view.cardColors, card, app);

	return (
		<tr
			className={tableRowClassName(colors)}
			style={cardColorStyle(colors)}
			onClick={onOpen}
		>
			{columns.map((column) => {
				const valueDef =
					column.kind === 'field'
						? view.values.find((value) => value.id === column.fieldId)
						: undefined;
				const text = renderTableCellText(card, column, valueDef);
				const isName = column.kind === 'name';

				return (
					<td
						key={column.id}
						className={
							isName ? 'pk-table-cell pk-table-cell-name' : 'pk-table-cell'
						}
						style={{
							width: columnWidth(view, column.id),
							minWidth: columnWidth(view, column.id),
							maxWidth: columnWidth(view, column.id),
						}}
					>
						<span className={isName ? 'pk-table-cell-title' : undefined}>
							{text}
						</span>
					</td>
				);
			})}
		</tr>
	);
}
