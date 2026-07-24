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
import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import {
	BoardViewConfig,
	CardColorEffect,
	CardColorRule,
	FilterOp,
	FilterSource,
	coerceFilterOp,
	createDefaultCardColorRule,
	createId,
	opNeedsValue,
} from '../board/schema';
import { useBoardApp } from './BoardAppContext';
import { COLOR_PRESETS, pickCustomColor } from './colorPresets';

interface CardColorsPanelProps {
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

const TEXT_OP_OPTIONS: Array<{ value: FilterOp; label: string }> = [
	{ value: 'eq', label: 'is equal' },
	{ value: 'neq', label: 'is not' },
	{ value: 'contains', label: 'contains' },
	{ value: 'not_contains', label: 'not contains' },
	{ value: 'empty', label: 'is empty' },
	{ value: 'not_empty', label: 'not empty' },
];

const NUMERIC_OP_OPTIONS: Array<{ value: FilterOp; label: string }> = [
	{ value: 'eq', label: '==' },
	{ value: 'neq', label: '!=' },
	{ value: 'lte', label: '<=' },
	{ value: 'lt', label: '<' },
	{ value: 'gt', label: '>' },
	{ value: 'gte', label: '>=' },
];

interface PropertyOption {
	property: string;
	label: string;
}

function ColorEffectButton({
	label,
	effect,
	onChange,
}: {
	label: string;
	effect: CardColorEffect;
	onChange: (next: CardColorEffect) => void;
}) {
	const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const menu = new Menu();

		menu.addItem((item) => {
			item.setTitle(label).setIsLabel(true);
		});

		menu.addItem((item) => {
			item.setTitle('Do not color').setIcon('circle-slash').onClick(() => {
				onChange({ kind: 'none' });
			});
			if (effect.kind === 'none') {
				item.setChecked(true);
			}
		});

		menu.addItem((item) => {
			item.setTitle('Reset color').setIcon('circle-off').onClick(() => {
				onChange({ kind: 'reset' });
			});
			if (effect.kind === 'reset') {
				item.setChecked(true);
			}
		});

		menu.addSeparator();

		for (const preset of COLOR_PRESETS) {
			menu.addItem((item) => {
				const title = window.document.createDocumentFragment();
				const swatch = window.document.createElement('span');
				swatch.className = 'pk-color-swatch';
				swatch.style.background = preset.hex;
				title.appendChild(swatch);
				title.appendChild(window.document.createTextNode(preset.name));
				item.setTitle(title).onClick(() => {
					onChange({ kind: 'color', hex: preset.hex });
				});
				if (effect.kind === 'color' && effect.hex === preset.hex) {
					item.setChecked(true);
				}
			});
		}

		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle('Custom…').setIcon('palette').onClick(() => {
				pickCustomColor(
					effect.kind === 'color' ? effect.hex : undefined,
					(hex) => onChange({ kind: 'color', hex }),
				);
			});
			if (
				effect.kind === 'color' &&
				!COLOR_PRESETS.some((preset) => preset.hex === effect.hex)
			) {
				item.setChecked(true);
			}
		});

		menu.showAtMouseEvent(event.nativeEvent);
	};

	const style: CSSProperties | undefined =
		effect.kind === 'color'
			? { background: effect.hex }
			: undefined;

	const title =
		effect.kind === 'color'
			? `${label}: ${effect.hex}`
			: effect.kind === 'reset'
				? `${label}: reset`
				: `${label}: do not color`;

	return (
		<button
			type="button"
			className={
				effect.kind === 'color'
					? 'pk-card-color-swatch'
					: effect.kind === 'reset'
						? 'pk-card-color-swatch is-reset'
						: 'pk-card-color-swatch is-none'
			}
			style={style}
			aria-label={title}
			title={title}
			onClick={openMenu}
		/>
	);
}

function SortableColorRow({
	rule,
	propertyOptions,
	onChange,
	onCopy,
	onDelete,
}: {
	rule: CardColorRule;
	propertyOptions: PropertyOption[];
	onChange: (next: CardColorRule) => void;
	onCopy: () => void;
	onDelete: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
		useSortable({ id: rule.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	const numeric = rule.source === 'property' && rule.numeric;
	const opOptions = numeric ? NUMERIC_OP_OPTIONS : TEXT_OP_OPTIONS;
	const showValue = opNeedsValue(rule.op);

	const openPropertyMenu = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const menu = new Menu();
		if (propertyOptions.length === 0) {
			menu.addItem((item) => {
				item.setTitle('No card fields').setDisabled(true);
			});
		} else {
			for (const option of propertyOptions) {
				menu.addItem((item) => {
					const title =
						option.label === option.property
							? option.property
							: `${option.label} (${option.property})`;
					item.setTitle(title).onClick(() => {
						onChange({ ...rule, property: option.property });
					});
					if (rule.property === option.property) {
						item.setChecked(true);
					}
				});
			}
		}
		menu.showAtMouseEvent(event.nativeEvent);
	};

	return (
		<div ref={setNodeRef} style={style} className="pk-filter-row">
			<button
				type="button"
				className="pk-drag-handle"
				aria-label="Reorder color rule"
				{...attributes}
				{...listeners}
			>
				<GripIcon />
			</button>

			<select
				className="pk-select pk-filter-source"
				aria-label="Source"
				value={rule.source}
				onChange={(event) => {
					const source = event.target.value as FilterSource;
					const nextNumeric = source === 'property' ? rule.numeric : false;
					onChange({
						...rule,
						source,
						numeric: nextNumeric,
						op: coerceFilterOp(rule.op, nextNumeric),
					});
				}}
			>
				<option value="property">property</option>
				<option value="body">body</option>
			</select>

			{rule.source === 'property' && (
				<>
					<div className="pk-filter-property-wrap">
						<input
							className="pk-input pk-filter-property"
							type="text"
							placeholder="Property name"
							aria-label="Property name"
							value={rule.property}
							onChange={(event) =>
								onChange({ ...rule, property: event.target.value })
							}
						/>
						<button
							type="button"
							className="pk-icon-button pk-filter-property-pick"
							aria-label="Pick from card fields"
							title="Pick from card fields"
							onClick={openPropertyMenu}
						>
							<ActionIcon name="chevron-down" />
						</button>
					</div>
					<label className="pk-toggle pk-filter-numeric">
						<input
							type="checkbox"
							checked={rule.numeric}
							onChange={(event) => {
								const nextNumeric = event.target.checked;
								onChange({
									...rule,
									numeric: nextNumeric,
									op: coerceFilterOp(rule.op, nextNumeric),
								});
							}}
						/>
						numeric
					</label>
				</>
			)}

			<select
				className="pk-select pk-filter-op"
				aria-label="Operator"
				value={rule.op}
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

			{showValue && (
				<input
					className="pk-input pk-filter-value"
					type="text"
					placeholder="Value"
					aria-label="Comparison value"
					value={rule.value}
					onChange={(event) => onChange({ ...rule, value: event.target.value })}
				/>
			)}

			<div className="pk-card-color-effects" aria-label="Color effects">
				<ColorEffectButton
					label="Border color"
					effect={rule.border}
					onChange={(border) => onChange({ ...rule, border })}
				/>
				<ColorEffectButton
					label="Background color"
					effect={rule.background}
					onChange={(background) => onChange({ ...rule, background })}
				/>
			</div>

			<div className="pk-filter-actions">
				<label className="pk-switch" title="Enable color rule">
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
					aria-label="Copy color rule"
					title="Copy"
					onClick={onCopy}
				>
					<ActionIcon name="copy" />
				</button>
				<button
					type="button"
					className="pk-icon-button"
					aria-label="Delete color rule"
					title="Delete"
					onClick={onDelete}
				>
					<ActionIcon name="trash" />
				</button>
			</div>
		</div>
	);
}

function cardFieldPropertyOptions(view: BoardViewConfig): PropertyOption[] {
	const seen = new Set<string>();
	const options: PropertyOption[] = [];
	for (const field of view.cardFields) {
		const property = field.property.trim();
		if (!property || seen.has(property)) {
			continue;
		}
		seen.add(property);
		const label = field.label.trim() || property;
		options.push({ property, label });
	}
	return options;
}

export function CardColorsPanel({ view }: CardColorsPanelProps) {
	const { updateDocument } = useBoardApp();
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const cardColors = view.cardColors;
	const propertyOptions = cardFieldPropertyOptions(view);

	const patchCardColors = (next: CardColorRule[]) => {
		updateDocument((doc) => ({
			...doc,
			views: doc.views.map((item) =>
				item.id === view.id ? { ...item, cardColors: next } : item,
			),
		}));
	};

	const onChange = (id: string, next: CardColorRule) => {
		patchCardColors(cardColors.map((rule) => (rule.id === id ? next : rule)));
	};

	const onAdd = () => {
		patchCardColors([createDefaultCardColorRule(), ...cardColors]);
	};

	const onCopy = (index: number) => {
		const rule = cardColors[index];
		if (!rule) {
			return;
		}
		const copy: CardColorRule = { ...rule, id: createId() };
		const next = [...cardColors];
		next.splice(index, 0, copy);
		patchCardColors(next);
	};

	const onDelete = (id: string) => {
		patchCardColors(cardColors.filter((rule) => rule.id !== id));
	};

	const onDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) {
			return;
		}
		const oldIndex = cardColors.findIndex((rule) => rule.id === active.id);
		const newIndex = cardColors.findIndex((rule) => rule.id === over.id);
		if (oldIndex < 0 || newIndex < 0) {
			return;
		}
		patchCardColors(arrayMove(cardColors, oldIndex, newIndex));
	};

	return (
		<div className="pk-panel">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">Card colors</h3>
				<button
					type="button"
					className="pk-icon-button"
					aria-label="Add color rule"
					title="Add color rule"
					onClick={onAdd}
				>
					<ActionIcon name="plus" />
				</button>
			</div>
			<p className="pk-panel-hint">
				Color cards that match these rules. Rules apply bottom to top; higher
				rules overwrite lower ones. Use do not color to leave a channel
				unchanged, or reset to clear it.
			</p>

			{cardColors.length === 0 ? (
				<p className="pk-panel-hint">No color rules yet. Click + to add one.</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={onDragEnd}
				>
					<SortableContext
						items={cardColors.map((rule) => rule.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="pk-filter-list">
							{cardColors.map((rule, index) => (
								<SortableColorRow
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
