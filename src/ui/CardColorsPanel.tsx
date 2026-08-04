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
	createDefaultCardColorRule,
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
import { format, strings } from '../i18n';
import { useBoardApp } from './BoardAppContext';
import { getColorPresets, pickCustomColor } from './colorPresets';
import { PropertyPicker } from './PropertyPicker';
import { viewPropertyPickerOptions } from './propertyOptions';

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
		const presets = getColorPresets();

		menu.addItem((item) => {
			item.setTitle(label).setIsLabel(true);
		});

		menu.addItem((item) => {
			item.setTitle(strings.cardColors.doNotColor).setIcon('circle-slash').onClick(() => {
				onChange({ kind: 'none' });
			});
			if (effect.kind === 'none') {
				item.setChecked(true);
			}
		});

		menu.addItem((item) => {
			item.setTitle(strings.cardColors.resetColor).setIcon('circle-off').onClick(() => {
				onChange({ kind: 'reset' });
			});
			if (effect.kind === 'reset') {
				item.setChecked(true);
			}
		});

		menu.addSeparator();

		for (const preset of presets) {
			menu.addItem((item) => {
				const title = createFragment((frag) => {
					const swatch = frag.createSpan({ cls: 'pk-color-swatch' });
					swatch.style.background = preset.hex;
					frag.appendText(preset.name);
				});
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
			item.setTitle(strings.common.customEllipsis).setIcon('palette').onClick(() => {
				pickCustomColor(
					effect.kind === 'color' ? effect.hex : undefined,
					(hex) => onChange({ kind: 'color', hex }),
				);
			});
			if (
				effect.kind === 'color' &&
				!presets.some((preset) => preset.hex === effect.hex)
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
			? format(strings.cardColors.effectHex, { label, hex: effect.hex })
			: effect.kind === 'reset'
				? format(strings.cardColors.effectReset, { label })
				: format(strings.cardColors.effectNone, { label });

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
	propertyOptions: ReturnType<typeof viewPropertyPickerOptions>;
	onChange: (next: CardColorRule) => void;
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
				aria-label={strings.cardColors.reorder}
				{...attributes}
				{...listeners}
			>
				<GripIcon />
			</button>

			<select
				className="pk-select pk-filter-source"
				aria-label={strings.cardColors.source}
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
					ariaLabel={strings.cardColors.propertyName}
					placeholder={strings.cardColors.propertyName}
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
				aria-label={strings.cardColors.operator}
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
					aria-label={strings.cardColors.comparisonValue}
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

			<div className="pk-card-color-effects" aria-label={strings.cardColors.effects}>
				<ColorEffectButton
					label={strings.cardColors.borderColor}
					effect={rule.border}
					onChange={(border) => onChange({ ...rule, border })}
				/>
				<ColorEffectButton
					label={strings.cardColors.backgroundColor}
					effect={rule.background}
					onChange={(background) => onChange({ ...rule, background })}
				/>
			</div>

			<div className="pk-filter-actions">
				<label className="pk-switch" title={strings.cardColors.enable}>
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
					aria-label={strings.cardColors.copy}
					title={strings.common.copy}
					onClick={onCopy}
				>
					<ActionIcon name="copy" />
				</button>
				<button
					type="button"
					className="pk-icon-button"
					aria-label={strings.cardColors.delete}
					title={strings.common.delete}
					onClick={onDelete}
				>
					<ActionIcon name="trash" />
				</button>
			</div>
		</div>
	);
}

export function CardColorsPanel({ view }: CardColorsPanelProps) {
	const { app, updateDocument } = useBoardApp();
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const cardColors = view.cardColors;
	const propertyOptions = viewPropertyPickerOptions(app, view);

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
				<h3 className="pk-panel-title">{strings.cardColors.title}</h3>
				<button
					type="button"
					className="pk-icon-button"
					aria-label={strings.cardColors.add}
					title={strings.cardColors.add}
					onClick={onAdd}
				>
					<ActionIcon name="plus" />
				</button>
			</div>
			<p className="pk-panel-hint">{strings.cardColors.hint}</p>

			{cardColors.length === 0 ? (
				<p className="pk-panel-hint">{strings.cardColors.empty}</p>
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
