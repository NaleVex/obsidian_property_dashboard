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
import { Menu, setIcon } from 'obsidian';
import { useEffect, useRef, type MouseEvent } from 'react';
import {
	BoardViewConfig,
	SortDirection,
	SortRule,
	createDefaultSortRule,
} from '../board/schema';
import { getPropertyType } from '../data/propertyType';
import { directionLabelsForType } from '../data/sortCards';
import { strings } from '../i18n';
import { useBoardApp } from './BoardAppContext';
import {
	propertyPickerDisplayValue,
	propertyPickerMenuTitle,
	propertyPickerParseInput,
	viewPropertyPickerOptions,
	type PropertyOption,
} from './propertyOptions';

interface SortPanelProps {
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

function ActionIcon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, name);
		}
	}, [name]);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

function SortableSortRow({
	rule,
	propertyOptions,
	onChange,
	onDelete,
}: {
	rule: SortRule;
	propertyOptions: PropertyOption[];
	onChange: (next: SortRule) => void;
	onDelete: () => void;
}) {
	const { app } = useBoardApp();
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: rule.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	const propertyType = getPropertyType(app, rule.property);
	const directionLabels = directionLabelsForType(propertyType);

	const openPropertyMenu = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const menu = new Menu();
		for (const option of propertyOptions) {
			menu.addItem((item) => {
				item.setTitle(propertyPickerMenuTitle(option)).onClick(() => {
					onChange({ ...rule, property: option.property });
				});
				if (rule.property === option.property) {
					item.setChecked(true);
				}
			});
		}
		menu.showAtMouseEvent(event.nativeEvent);
	};

	return (
		<div ref={setNodeRef} style={style} className="pk-filter-row">
			<button
				type="button"
				className="pk-drag-handle"
				aria-label={strings.sort.reorder}
				{...attributes}
				{...listeners}
			>
				<GripIcon />
			</button>

			<div className="pk-filter-property-wrap">
				<input
					className="pk-input pk-filter-property"
					type="text"
					placeholder={strings.sort.propertyName}
					aria-label={strings.sort.sortProperty}
					value={propertyPickerDisplayValue(rule.property)}
					onChange={(event) => {
						onChange({
							...rule,
							property: propertyPickerParseInput(event.target.value),
						});
					}}
				/>
				<button
					type="button"
					className="pk-icon-button pk-filter-property-pick"
					aria-label={strings.sort.pickProperty}
					title={strings.sort.pickProperty}
					onClick={openPropertyMenu}
				>
					<ActionIcon name="chevron-down" />
				</button>
			</div>

			<select
				key={propertyType}
				className="pk-select pk-filter-op"
				aria-label={strings.sort.direction}
				value={rule.direction}
				onChange={(event) =>
					onChange({
						...rule,
						direction: event.target.value as SortDirection,
					})
				}
			>
				<option value="asc">{directionLabels.asc}</option>
				<option value="desc">{directionLabels.desc}</option>
			</select>

			<div className="pk-filter-actions">
				<label className="pk-switch" title={strings.sort.enable}>
					<input
						type="checkbox"
						checked={rule.enabled}
						onChange={(event) =>
							onChange({ ...rule, enabled: event.target.checked })
						}
					/>
					<span className="pk-switch-slider" />
				</label>
				<button
					type="button"
					className="pk-icon-button"
					aria-label={strings.sort.delete}
					title={strings.common.delete}
					onClick={onDelete}
				>
					<ActionIcon name="trash" />
				</button>
			</div>
		</div>
	);
}

export function SortPanel({ view }: SortPanelProps) {
	const { updateDocument } = useBoardApp();
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const sorts = view.sorts;
	const propertyOptions = viewPropertyPickerOptions(view);

	const patchSorts = (next: SortRule[]) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === view.id ? { ...item, sorts: next } : item,
			),
		}));
	};

	const onChange = (id: string, next: SortRule) => {
		patchSorts(sorts.map((rule) => (rule.id === id ? next : rule)));
	};

	const onAdd = () => {
		patchSorts([...sorts, createDefaultSortRule()]);
	};

	const onDelete = (id: string) => {
		patchSorts(sorts.filter((rule) => rule.id !== id));
	};

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = sorts.findIndex((rule) => rule.id === active.id);
		const newIndex = sorts.findIndex((rule) => rule.id === over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		patchSorts(arrayMove(sorts, oldIndex, newIndex));
	};

	return (
		<div className="pk-panel">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">{strings.sort.title}</h3>
				<button
					type="button"
					className="pk-icon-button"
					aria-label={strings.sort.add}
					title={strings.sort.add}
					onClick={onAdd}
				>
					<ActionIcon name="plus" />
				</button>
			</div>
			<p className="pk-panel-hint">{strings.sort.hint}</p>

			{sorts.length === 0 ? (
				<p className="pk-panel-hint">{strings.sort.empty}</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={sorts.map((rule) => rule.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="pk-filter-list">
							{sorts.map((rule) => (
								<SortableSortRow
									key={rule.id}
									rule={rule}
									propertyOptions={propertyOptions}
									onChange={(next) => onChange(rule.id, next)}
									onDelete={() => onDelete(rule.id)}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}
		</div>
	);
}
