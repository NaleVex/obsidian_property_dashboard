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
	useSortable,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';
import {
	TABLE_COLUMN_NAME_ID,
	TableColumnItem,
	TableViewConfig,
	normalizeTableColumns,
} from '../board/schema';
import { useBoardApp } from './BoardAppContext';

interface TableColumnsPanelProps {
	view: TableViewConfig;
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

function itemLabel(view: TableViewConfig, item: TableColumnItem): string {
	if (item.kind === 'name') {
		return 'Name';
	}
	const value = view.values.find((entry) => entry.id === item.fieldId);
	if (!value) {
		return 'Field';
	}
	return value.label.trim() || value.property.trim() || 'Untitled field';
}

function SortableColumnRow({
	view,
	item,
	onToggle,
}: {
	view: TableViewConfig;
	item: TableColumnItem;
	onToggle: (id: string, enabled: boolean) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: item.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="pk-cards-info-row">
			<button
				type="button"
				className="pk-drag-handle"
				aria-label="Reorder"
				{...attributes}
				{...listeners}
			>
				<GripIcon />
			</button>
			<span className="pk-cards-info-label">{itemLabel(view, item)}</span>
			<label className="pk-switch">
				<input
					type="checkbox"
					checked={item.enabled}
					onChange={(event) => onToggle(item.id, event.target.checked)}
				/>
				<span className="pk-switch-slider" />
			</label>
		</div>
	);
}

export function TableColumnsPanel({ view }: TableColumnsPanelProps) {
	const { updateDocument } = useBoardApp();
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const columns = normalizeTableColumns(view.columns, view.values);

	const patchColumns = (next: TableColumnItem[]) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === view.id && item.type === 'table'
					? {
							...item,
							columns: normalizeTableColumns(next, item.values),
						}
					: item,
			),
		}));
	};

	const onToggle = (id: string, enabled: boolean) => {
		patchColumns(
			columns.map((item) => (item.id === id ? { ...item, enabled } : item)),
		);
	};

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = columns.findIndex((item) => item.id === active.id);
		const newIndex = columns.findIndex((item) => item.id === over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		patchColumns(arrayMove(columns, oldIndex, newIndex));
	};

	return (
		<div className="pk-panel">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">Columns</h3>
			</div>
			<p className="pk-panel-hint">
				Choose which columns are visible and in what order.
			</p>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={onDragEnd}
			>
				<SortableContext
					items={columns.map((item) => item.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="pk-cards-info-list">
						{columns.map((item) => (
							<SortableColumnRow
								key={
									item.id === TABLE_COLUMN_NAME_ID
										? TABLE_COLUMN_NAME_ID
										: item.id
								}
								view={view}
								item={item}
								onToggle={onToggle}
							/>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}
