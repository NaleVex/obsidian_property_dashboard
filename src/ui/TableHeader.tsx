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
import { useEffect, useRef, useState } from 'react';
import {
	TableColumnItem,
	TableViewConfig,
	normalizeTableColumns,
} from '../board/schema';
import { columnHeaderLabel, columnWidth } from './tableCells';

const MIN_COLUMN_WIDTH = 60;

interface TableHeaderProps {
	view: TableViewConfig;
	columns: TableColumnItem[];
	onReorder: (columns: TableColumnItem[]) => void;
	onResize: (columnId: string, width: number) => void;
}

function GripIcon() {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, 'grip-vertical');
		}
	}, []);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

function SortableHeaderCell({
	view,
	column,
	onResize,
}: {
	view: TableViewConfig;
	column: TableColumnItem;
	onResize: (columnId: string, width: number) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: column.id });

	const [resizing, setResizing] = useState(false);
	const [localWidth, setLocalWidth] = useState<number | null>(null);
	const startRef = useRef({ x: 0, width: 0 });

	const width = localWidth ?? columnWidth(view, column.id);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
		width,
		minWidth: width,
		maxWidth: width,
	};

	const onResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		const startWidth = columnWidth(view, column.id);
		startRef.current = { x: event.clientX, width: startWidth };
		setLocalWidth(startWidth);
		setResizing(true);
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const onResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!resizing) {
			return;
		}
		const delta = event.clientX - startRef.current.x;
		const nextWidth = Math.max(MIN_COLUMN_WIDTH, startRef.current.width + delta);
		setLocalWidth(nextWidth);
	};

	const onResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
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

	return (
		<th
			ref={setNodeRef}
			className="pk-table-header-cell"
			style={style}
		>
			<div className="pk-table-header-content">
				<button
					type="button"
					className="pk-drag-handle pk-table-header-drag"
					aria-label="Reorder column"
					{...attributes}
					{...listeners}
				>
					<GripIcon />
				</button>
				<span className="pk-table-header-label">
					{columnHeaderLabel(view, column)}
				</span>
			</div>
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
							/>
						))}
					</tr>
				</thead>
			</SortableContext>
		</DndContext>
	);
}
