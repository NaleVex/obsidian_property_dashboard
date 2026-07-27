import {
	TableColumnItem,
	TableValueDef,
	TableViewConfig,
	normalizeTableColumns,
} from '../board/schema';
import { BoardCard } from '../data/types';

export const DEFAULT_TABLE_COLUMN_WIDTH = 160;

export function getVisibleTableColumns(
	view: TableViewConfig,
): TableColumnItem[] {
	return normalizeTableColumns(view.columns, view.values).filter(
		(item) => item.enabled,
	);
}

export function columnHeaderLabel(
	view: TableViewConfig,
	item: TableColumnItem,
): string {
	if (item.kind === 'name') {
		return 'Name';
	}
	const value = view.values.find((entry) => entry.id === item.fieldId);
	if (!value) {
		return 'Field';
	}
	return value.label.trim() || value.property.trim() || 'Untitled field';
}

export function columnWidth(
	view: TableViewConfig,
	columnId: string,
): number {
	return view.columnWidths[columnId] ?? DEFAULT_TABLE_COLUMN_WIDTH;
}

export function renderTableCellText(
	card: BoardCard,
	item: TableColumnItem,
	valueDef: TableValueDef | undefined,
): string {
	if (item.kind === 'name') {
		return card.title;
	}
	if (!valueDef) {
		return '';
	}

	const raw = card.fields[valueDef.id] ?? null;
	if (raw === null) {
		return '—';
	}
	return raw;
}
