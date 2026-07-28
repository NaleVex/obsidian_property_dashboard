import {
	DndContext,
	DragEndEvent,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	SortableContext,
	arrayMove,
	horizontalListSortingStrategy,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { setIcon } from 'obsidian';
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import {
	SORT_HEADER_NAME_ID,
	SortDirection,
	TableColumnItem,
	TableViewConfig,
	normalizeTableColumns,
} from '../board/schema';
import { strings } from '../i18n';
import { columnHeaderLabel, columnWidth } from './tableCells';

const MIN_COLUMN_WIDTH = 60;

export type ColumnSortState = 'none' | SortDirection;

interface TableHeaderProps {
	view: TableViewConfig;
	columns: TableColumnItem[];
	onReorder: (columns: TableColumnItem[]) => void;
	onResize: (columnId: string, width: number) => void;
	onToggleSort: (property: string) => void;
}

function SortIcon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, name);
		}
	}, [name]);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

function sortPropertyForColumn(
	view: TableViewConfig,
	column: TableColumnItem,
): string | null {
	if (column.kind === 'name') {
		return SORT_HEADER_NAME_ID;
	}
	const value = view.values.find((entry) => entry.id === column.fieldId);
	if (!value || value.type !== 'property') {
		return null;
	}
	const property = value.property.trim();
	return property.length > 0 ? property : null;
}

function sortStateForProperty(
	view: TableViewConfig,
	property: string,
): ColumnSortState {
	const rule = view.sorts.find((item) => item.property === property);
	if (!rule || !rule.enabled) {
		return 'none';
	}
	return rule.direction;
}

function SortableHeaderCell({
	view,
	column,
	onResize,
	onToggleSort,
}: {
	view: TableViewConfig;
	column: TableColumnItem;
	onResize: (columnId: string, width: number) => void;
	onToggleSort: (property: string) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: column.id });

	const [resizing, setResizing] = useState(false);
	const [localWidth, setLocalWidth] = useState<number | null>(null);
	const startRef = useRef({ x: 0, width: 0 });

	const width = localWidth ?? columnWidth(view, column.id);
	const sortProperty = sortPropertyForColumn(view, column);
	const sortState = sortProperty
		? sortStateForProperty(view, sortProperty)
		: 'none';

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
		width,
		minWidth: width,
		maxWidth: width,
	};

	const onResizePointerDown = (event: PointerEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		const startWidth = columnWidth(view, column.id);
		startRef.current = { x: event.clientX, width: startWidth };
		setLocalWidth(startWidth);
		setResizing(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const onResizePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		if (!resizing) {
			return;
		}
		const delta = event.clientX - startRef.current.x;
		const nextWidth = Math.max(MIN_COLUMN_WIDTH, startRef.current.width + delta);
		setLocalWidth(nextWidth);
	};

	const onResizePointerUp = (event: PointerEvent<HTMLDivElement>) => {
		if (!resizing) {
			return;
		}
		setResizing(false);
		event.currentTarget.releasePointerCapture(event.pointerId);
		if (localWidth !== null) {
			onResize(column.id, localWidth);
		}
		setLocalWidth(null);
	};

	const sortLabel =
		sortState === 'asc'
			? strings.table.sortAsc
			: sortState === 'desc'
				? strings.table.sortDesc
				: strings.table.sortNone;

	const sortIcon =
		sortState === 'asc'
			? 'arrow-up'
			: sortState === 'desc'
				? 'arrow-down'
				: 'chevrons-up-down';

	const onSortClick = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (sortProperty) {
			onToggleSort(sortProperty);
		}
	};

	const onSortPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
		event.stopPropagation();
	};

	return (
		<th
			ref={setNodeRef}
			className="pk-table-header-cell"
			style={style}
		>
			<div
				className="pk-table-header-content"
				aria-label={strings.table.reorderColumn}
				{...attributes}
				{...listeners}
			>
				<span className="pk-table-header-label">
					{columnHeaderLabel(view, column)}
				</span>
			</div>
			{sortProperty ? (
				<button
					type="button"
					className={
						sortState === 'none'
							? 'pk-table-sort-button'
							: 'pk-table-sort-button pk-table-sort-button-active'
					}
					aria-label={sortLabel}
					title={sortLabel}
					onClick={onSortClick}
					onPointerDown={onSortPointerDown}
				>
					<SortIcon name={sortIcon} />
				</button>
			) : null}
			<div
				className="pk-table-resize-handle"
				onPointerDown={onResizePointerDown}
				onPointerMove={onResizePointerMove}
				onPointerUp={onResizePointerUp}
				onPointerCancel={onResizePointerUp}
			/>
		</th>
	);
}

export function TableHeader({
	view,
	columns,
	onReorder,
	onResize,
	onToggleSort,
}: TableHeaderProps) {
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const allColumns = normalizeTableColumns(view.columns, view.values);
		const oldIndex = allColumns.findIndex((item) => item.id === active.id);
		const newIndex = allColumns.findIndex((item) => item.id === over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		onReorder(arrayMove(allColumns, oldIndex, newIndex));
	};

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={onDragEnd}
		>
			<SortableContext
				items={columns.map((column) => column.id)}
				strategy={horizontalListSortingStrategy}
			>
				<thead className="pk-table-header">
					<tr>
						{columns.map((column) => (
							<SortableHeaderCell
								key={column.id}
								view={view}
								column={column}
								onResize={onResize}
								onToggleSort={onToggleSort}
							/>
						))}
					</tr>
				</thead>
			</SortableContext>
		</DndContext>
	);
}
