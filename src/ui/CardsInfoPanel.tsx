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
	BoardViewConfig,
	CARD_INFO_NAME_ID,
	CardInfoItem,
	normalizeCardInfo,
} from '../board/schema';
import { useBoardApp } from './BoardAppContext';

interface CardsInfoPanelProps {
	view: BoardViewConfig;
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

function itemLabel(view: BoardViewConfig, item: CardInfoItem): string {
	if (item.kind === 'name') {
		return 'Name';
	}
	const field = view.cardFields.find((entry) => entry.id === item.fieldId);
	if (!field) {
		return 'Field';
	}
	return field.label.trim() || field.property.trim() || 'Untitled field';
}

function SortableInfoRow({
	view,
	item,
	onToggle,
}: {
	view: BoardViewConfig;
	item: CardInfoItem;
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

export function CardsInfoPanel({ view }: CardsInfoPanelProps) {
	const { updateDocument } = useBoardApp();
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const cardInfo = normalizeCardInfo(view.cardInfo, view.cardFields);

	const patchCardInfo = (next: CardInfoItem[]) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === view.id
					? {
							...item,
							cardInfo: normalizeCardInfo(next, item.cardFields),
						}
					: item,
			),
		}));
	};

	const onToggle = (id: string, enabled: boolean) => {
		patchCardInfo(
			cardInfo.map((item) => (item.id === id ? { ...item, enabled } : item)),
		);
	};

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = cardInfo.findIndex((item) => item.id === active.id);
		const newIndex = cardInfo.findIndex((item) => item.id === over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		patchCardInfo(arrayMove(cardInfo, oldIndex, newIndex));
	};

	return (
		<div className="pk-panel">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">Cards info</h3>
			</div>
			<p className="pk-panel-hint">
				Choose which fields appear on cards and in what order.
			</p>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={onDragEnd}
			>
				<SortableContext
					items={cardInfo.map((item) => item.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="pk-cards-info-list">
						{cardInfo.map((item) => (
							<SortableInfoRow
								key={item.id === CARD_INFO_NAME_ID ? CARD_INFO_NAME_ID : item.id}
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
