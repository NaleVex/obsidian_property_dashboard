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
	FilterCombinator,
	FilterOp,
	FilterRule,
	FilterSource,
	createDefaultFilterRule,
	createId,
	opNeedsValue,
} from '../board/schema';
import {
	coerceOpForType,
	getPropertyType,
	normalizeDatetimeInputValue,
	opOptionsForType,
	valueInputTypeForPropertyType,
} from '../data/propertyType';
import { strings } from '../i18n';
import { useBoardApp } from './BoardAppContext';
import { PropertyPicker } from './PropertyPicker';
import { viewPropertyPickerOptions } from './propertyOptions';

interface FilterPanelProps {
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

function SortableFilterRow({
	rule,
	propertyOptions,
	onChange,
	onCopy,
	onDelete,
}: {
	rule: FilterRule;
	propertyOptions: ReturnType<typeof viewPropertyPickerOptions>;
	onChange: (next: FilterRule) => void;
	onCopy: () => void;
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

	const propertyType =
		rule.source === 'property'
			? getPropertyType(app, rule.property)
			: 'text';
	const opOptions = opOptionsForType(propertyType);
	const coercedOp = coerceOpForType(rule.op, propertyType);
	const showValue = opNeedsValue(coercedOp);
	const valueInputType = valueInputTypeForPropertyType(propertyType);
	const valueForInput =
		propertyType === 'datetime'
			? normalizeDatetimeInputValue(rule.value)
			: rule.value;

	return (
		<div ref={setNodeRef} style={style} className="pk-filter-row">
			<button
				type="button"
				className="pk-drag-handle"
				aria-label={strings.filter.reorder}
				{...attributes}
				{...listeners}
			>
				<GripIcon />
			</button>

			<select
				className="pk-select pk-filter-combinator"
				aria-label={strings.filter.combinator}
				value={rule.combinator}
				onChange={(event) =>
					onChange({
						...rule,
						combinator: event.target.value as FilterCombinator,
					})
				}
			>
				<option value="and">{strings.common.and}</option>
				<option value="or">{strings.common.or}</option>
				<option value="not">{strings.common.not}</option>
			</select>

			<select
				className="pk-select pk-filter-source"
				aria-label={strings.filter.source}
				value={rule.source}
				onChange={(event) => {
					const source = event.target.value as FilterSource;
					const nextType =
						source === 'property'
							? getPropertyType(app, rule.property)
							: 'text';
					onChange({
						...rule,
						source,
						op: coerceOpForType(rule.op, nextType),
					});
				}}
			>
				<option value="property">{strings.common.property}</option>
				<option value="body">{strings.common.body}</option>
			</select>

			{rule.source === 'property' && (
				<PropertyPicker
					app={app}
					value={rule.property}
					options={propertyOptions}
					allowCreate={false}
					ariaLabel={strings.filter.propertyName}
					placeholder={strings.filter.propertyName}
					onChange={(property) => {
						const nextType = getPropertyType(app, property);
						onChange({
							...rule,
							property,
							op: coerceOpForType(rule.op, nextType),
						});
					}}
				/>
			)}

			<select
				key={propertyType}
				className="pk-select pk-filter-op"
				aria-label={strings.filter.operator}
				value={coercedOp}
				onChange={(event) =>
					onChange({ ...rule, op: event.target.value as FilterOp })
				}
			>
				{opOptions.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>

			{showValue && valueInputType && (
				<input
					className="pk-input pk-filter-value"
					type={valueInputType}
					placeholder={strings.common.value}
					aria-label={strings.filter.comparisonValue}
					value={valueForInput}
					onChange={(event) => {
						const next =
							propertyType === 'datetime'
								? normalizeDatetimeInputValue(event.target.value)
								: event.target.value;
						onChange({ ...rule, value: next });
					}}
				/>
			)}

			<div className="pk-filter-actions">
				<label className="pk-switch" title={strings.filter.enable}>
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
					aria-label={strings.filter.copy}
					title={strings.common.copy}
					onClick={onCopy}
				>
					<ActionIcon name="copy" />
				</button>
				<button
					type="button"
					className="pk-icon-button"
					aria-label={strings.filter.delete}
					title={strings.common.delete}
					onClick={onDelete}
				>
					<ActionIcon name="trash" />
				</button>
			</div>
		</div>
	);
}

export function FilterPanel({ view }: FilterPanelProps) {
	const { app, updateDocument } = useBoardApp();
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const filters = view.filters;
	const propertyOptions = viewPropertyPickerOptions(app, view);

	const patchFilters = (next: FilterRule[]) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === view.id ? { ...item, filters: next } : item,
			),
		}));
	};

	const onChange = (id: string, next: FilterRule) => {
		patchFilters(filters.map((rule) => (rule.id === id ? next : rule)));
	};

	const onAdd = () => {
		patchFilters([...filters, createDefaultFilterRule()]);
	};

	const onCopy = (index: number) => {
		const rule = filters[index];
		if (!rule) {
			return;
		}
		const copy: FilterRule = { ...rule, id: createId() };
		const next = [...filters];
		next.splice(index + 1, 0, copy);
		patchFilters(next);
	};

	const onDelete = (id: string) => {
		patchFilters(filters.filter((rule) => rule.id !== id));
	};

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = filters.findIndex((rule) => rule.id === active.id);
		const newIndex = filters.findIndex((rule) => rule.id === over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		patchFilters(arrayMove(filters, oldIndex, newIndex));
	};

	return (
		<div className="pk-panel">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">{strings.filter.title}</h3>
				<button
					type="button"
					className="pk-icon-button"
					aria-label={strings.filter.add}
					title={strings.filter.add}
					onClick={onAdd}
				>
					<ActionIcon name="plus" />
				</button>
			</div>
			<p className="pk-panel-hint">{strings.filter.hint}</p>

			{filters.length === 0 ? (
				<p className="pk-panel-hint">{strings.filter.empty}</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={filters.map((rule) => rule.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="pk-filter-list">
							{filters.map((rule, index) => (
								<SortableFilterRow
									key={rule.id}
									rule={rule}
									propertyOptions={propertyOptions}
									onChange={(next) => onChange(rule.id, next)}
									onCopy={() => onCopy(index)}
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
