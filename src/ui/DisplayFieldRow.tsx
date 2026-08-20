import { App, Menu, setIcon } from 'obsidian';
import {
	CSSProperties,
	KeyboardEvent,
	MouseEvent,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CardFieldDef, CardFieldType } from '../board/schema';
import { formulaRefAliases } from '../data/formulaValue';
import { listVaultProperties } from '../data/vaultProperties';
import { strings } from '../i18n';
import { PropertyPicker } from './PropertyPicker';

function TrashIcon() {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, 'trash');
		}
	}, []);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

function FormulaIcon() {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, 'sigma');
		}
	}, []);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

function TypeIcon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			ref.current.replaceChildren();
			setIcon(ref.current, name);
		}
	}, [name]);
	return (
		<span
			ref={ref}
			className="pk-property-picker-item-icon"
			aria-hidden="true"
		/>
	);
}

function parseFieldNumber(raw: string, fallback: number): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value < 0) {
		return fallback;
	}
	return value;
}

function typeLabel(type: CardFieldType): string {
	if (type === 'paragraph') {
		return strings.common.paragraph;
	}
	if (type === 'namedParagraph') {
		return strings.common.namedParagraph;
	}
	if (type === 'formula') {
		return strings.common.formula;
	}
	return strings.common.property;
}

const FIELD_TYPES: CardFieldType[] = [
	'property',
	'paragraph',
	'namedParagraph',
	'formula',
];

function patchForType(type: CardFieldType): Partial<CardFieldDef> {
	if (type === 'paragraph') {
		return {
			type: 'paragraph',
			property: '',
			header: '',
			paragraph: 1,
			end: 0,
			formula: '',
		};
	}
	if (type === 'namedParagraph') {
		return {
			type: 'namedParagraph',
			property: '',
			header: '',
			paragraph: 1,
			end: 0,
			formula: '',
		};
	}
	if (type === 'formula') {
		return {
			type: 'formula',
			property: '',
			header: '',
			paragraph: 1,
			end: 0,
			formula: '',
		};
	}
	return {
		type: 'property',
		property: '',
		header: '',
		formula: '',
	};
}

interface BraceQuery {
	start: number;
	end: number;
	query: string;
	hasClose: boolean;
}

function braceQueryAt(text: string, caret: number): BraceQuery | null {
	const before = text.slice(0, caret);
	const open = before.lastIndexOf('{');
	if (open < 0) {
		return null;
	}
	if (before.indexOf('}', open) >= 0) {
		return null;
	}
	const after = text.slice(caret);
	const closeAfter = after.indexOf('}');
	const hasClose = closeAfter >= 0;
	const end = hasClose ? caret + closeAfter : caret;
	const query = text.slice(open + 1, caret);
	if (query.length < 1) {
		return null;
	}
	return { start: open + 1, end, query, hasClose };
}

type SuggestItem = {
	insert: string;
	label: string;
	icon: string;
	key: string;
};

function filterSuggest(items: SuggestItem[], query: string): SuggestItem[] {
	const q = query.trim().toLowerCase();
	if (!q) {
		return [];
	}
	return items.filter(
		(item) =>
			item.label.toLowerCase().includes(q) ||
			item.insert.toLowerCase().includes(q),
	);
}

function resolvePortalParent(anchor: HTMLElement | null): HTMLElement {
	const modal = anchor?.closest('.modal');
	if (modal instanceof HTMLElement) {
		return modal;
	}
	return window.document.body;
}

function FormulaInput({
	app,
	field,
	siblingFields,
	onUpdate,
}: {
	app: App;
	field: CardFieldDef;
	siblingFields: CardFieldDef[];
	onUpdate: (patch: Partial<CardFieldDef>) => void;
}) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [caret, setCaret] = useState(0);
	const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
	const [activeIndex, setActiveIndex] = useState(0);
	const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
	const [portalParent, setPortalParent] = useState<HTMLElement>(
		() => window.document.body,
	);
	const pendingCaret = useRef<number | null>(null);

	const brace = braceQueryAt(field.formula, caret);

	const suggestions = useMemo(() => {
		const items: SuggestItem[] = [];
		const seen = new Set<string>();

		const push = (item: SuggestItem) => {
			const key = item.insert.toLowerCase();
			if (seen.has(key)) {
				return;
			}
			seen.add(key);
			items.push(item);
		};

		for (const sibling of siblingFields) {
			if (sibling.id === field.id) {
				continue;
			}
			const icon =
				sibling.type === 'formula'
					? 'sigma'
					: sibling.type === 'namedParagraph'
						? 'heading'
						: sibling.type === 'property'
							? 'list'
							: 'text';
			for (const alias of formulaRefAliases(sibling)) {
				push({
					insert: alias,
					label: alias,
					icon,
					key: `field:${sibling.id}:${alias.toLowerCase()}`,
				});
			}
		}

		for (const option of listVaultProperties(app, { frontmatterOnly: true })) {
			push({
				insert: option.property,
				label: option.label,
				icon: option.icon,
				key: `prop:${option.property}`,
			});
		}

		return filterSuggest(items, brace?.query ?? '');
	}, [app, siblingFields, field.id, brace?.query]);

	const open =
		Boolean(brace) &&
		suggestions.length > 0 &&
		brace?.query !== dismissedQuery;

	const syncCaret = () => {
		const el = textareaRef.current;
		if (el) {
			setCaret(el.selectionStart ?? 0);
		}
	};

	const updateMenuPosition = () => {
		const anchor = wrapRef.current;
		if (!anchor) {
			return;
		}
		const rect = anchor.getBoundingClientRect();
		const gutter = 8;
		const maxHeight = Math.min(220, window.innerHeight - gutter * 2);
		const spaceBelow = window.innerHeight - rect.bottom - gutter;
		const spaceAbove = rect.top - gutter;
		const openUp = spaceBelow < 120 && spaceAbove > spaceBelow;
		const height = Math.min(maxHeight, Math.max(80, openUp ? spaceAbove : spaceBelow));
		const width = Math.max(rect.width, 220);
		let left = rect.left;
		if (left + width > window.innerWidth - gutter) {
			left = Math.max(gutter, window.innerWidth - width - gutter);
		}
		setMenuStyle({
			position: 'fixed',
			zIndex: 10000,
			left,
			width,
			maxHeight: height,
			...(openUp
				? { bottom: window.innerHeight - rect.top + 4, top: 'auto' }
				: { top: rect.bottom + 4, bottom: 'auto' }),
		});
	};

	useLayoutEffect(() => {
		if (pendingCaret.current === null) {
			return;
		}
		const el = textareaRef.current;
		if (el) {
			const pos = pendingCaret.current;
			el.setSelectionRange(pos, pos);
			setCaret(pos);
		}
		pendingCaret.current = null;
	}, [field.formula]);

	useLayoutEffect(() => {
		if (!open) {
			return;
		}
		setPortalParent(resolvePortalParent(wrapRef.current));
		updateMenuPosition();
	}, [open, suggestions.length]);

	useEffect(() => {
		if (!open) {
			return;
		}
		const onReposition = () => updateMenuPosition();
		window.addEventListener('resize', onReposition);
		window.addEventListener('scroll', onReposition, true);
		return () => {
			window.removeEventListener('resize', onReposition);
			window.removeEventListener('scroll', onReposition, true);
		};
	}, [open]);

	useEffect(() => {
		setActiveIndex(0);
		if (brace?.query !== dismissedQuery) {
			setDismissedQuery(null);
		}
	}, [brace?.query]);

	const commit = (insert: string) => {
		if (!brace) {
			return;
		}
		const prefix = field.formula.slice(0, brace.start);
		const suffix = field.formula.slice(brace.end);
		const next = `${prefix}${insert}${brace.hasClose ? '' : '}'}${suffix}`;
		pendingCaret.current = brace.start + insert.length + 1;
		onUpdate({ formula: next });
	};

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (!open) {
			return;
		}
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex((index) => (index + 1) % suggestions.length);
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex(
				(index) => (index - 1 + suggestions.length) % suggestions.length,
			);
			return;
		}
		if (event.key === 'Enter' || event.key === 'Tab') {
			const item = suggestions[activeIndex];
			if (item) {
				event.preventDefault();
				commit(item.insert);
			}
			return;
		}
		if (event.key === 'Escape') {
			event.preventDefault();
			setDismissedQuery(brace?.query ?? null);
		}
	};

	const dropdown = open
		? createPortal(
				<div
					ref={dropdownRef}
					className="pk-property-picker-dropdown"
					role="listbox"
					style={menuStyle}
				>
					<div className="pk-property-picker-list">
						{suggestions.map((item, index) => (
							<button
								key={item.key}
								type="button"
								role="option"
								aria-selected={index === activeIndex}
								className={[
									'pk-property-picker-item',
									index === activeIndex ? 'is-active' : '',
								]
									.filter(Boolean)
									.join(' ')}
								onMouseEnter={() => setActiveIndex(index)}
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => commit(item.insert)}
							>
								<TypeIcon name={item.icon} />
								<span className="pk-property-picker-item-label">
									{item.label}
								</span>
							</button>
						))}
					</div>
				</div>,
				portalParent,
			)
		: null;

	return (
		<div ref={wrapRef} className="pk-formula-editor">
			<textarea
				ref={textareaRef}
				className="pk-formula-input"
				value={field.formula}
				placeholder={strings.displayField.formulaPlaceholder}
				aria-label={strings.displayField.formulaExpression}
				title={strings.displayField.formulaExpression}
				aria-autocomplete="list"
				aria-expanded={open}
				rows={3}
				spellCheck={false}
				onChange={(event) => {
					onUpdate({ formula: event.target.value });
					setCaret(event.target.selectionStart ?? event.target.value.length);
				}}
				onKeyUp={syncCaret}
				onClick={syncCaret}
				onSelect={syncCaret}
				onKeyDown={onKeyDown}
			/>
			{dropdown}
		</div>
	);
}

interface DisplayFieldRowProps {
	app: App;
	field: CardFieldDef;
	onUpdate: (patch: Partial<CardFieldDef>) => void;
	onDelete: () => void;
	showIfMissing?: boolean;
	siblingFields?: CardFieldDef[];
}

export function DisplayFieldRow({
	app,
	field,
	onUpdate,
	onDelete,
	showIfMissing = false,
	siblingFields = [],
}: DisplayFieldRowProps) {
	const [formulaOpen, setFormulaOpen] = useState(false);

	const openTypeMenu = (event: MouseEvent<HTMLButtonElement>) => {
		event.preventDefault();
		const menu = new Menu();
		for (const type of FIELD_TYPES) {
			menu.addItem((item) => {
				item.setTitle(typeLabel(type)).onClick(() => {
					if (type === field.type) {
						return;
					}
					onUpdate(patchForType(type));
					if (type !== 'formula') {
						setFormulaOpen(false);
					}
				});
				if (type === field.type) {
					item.setChecked(true);
				}
			});
		}
		menu.showAtMouseEvent(event.nativeEvent);
	};

	return (
		<div className="pk-field-block">
			<div className="pk-field-row">
				<button
					type="button"
					className="pk-type-toggle"
					aria-label={strings.displayField.fieldType}
					title={strings.displayField.fieldType}
					onClick={openTypeMenu}
				>
					{typeLabel(field.type)}
				</button>

				{field.type === 'property' ? (
					<PropertyPicker
						app={app}
						value={field.property}
						ariaLabel={strings.displayField.propertyName}
						placeholder={strings.displayField.propertyName}
						onChange={(property) => onUpdate({ property })}
					/>
				) : null}

				{field.type === 'paragraph' ? (
					<input
						className="pk-input pk-input-narrow"
						type="number"
						min={1}
						value={field.paragraph}
						placeholder={strings.displayField.paraPlaceholder}
						aria-label={strings.displayField.paragraphNumber}
						title={strings.displayField.paragraphNumberTitle}
						onChange={(event) =>
							onUpdate({
								paragraph: parseFieldNumber(event.target.value, 1) || 1,
							})
						}
					/>
				) : null}

				{field.type === 'namedParagraph' ? (
					<input
						className="pk-input"
						type="text"
						value={field.header}
						placeholder={strings.displayField.headerPlaceholder}
						aria-label={strings.displayField.headerText}
						title={strings.displayField.headerTextTitle}
						onChange={(event) => onUpdate({ header: event.target.value })}
					/>
				) : null}

				{field.type === 'paragraph' || field.type === 'namedParagraph' ? (
					<input
						className="pk-input pk-input-narrow"
						type="number"
						min={0}
						value={field.end}
						placeholder={strings.displayField.endPlaceholder}
						aria-label={strings.displayField.endCharacter}
						title={strings.displayField.endCharacterTitle}
						onChange={(event) =>
							onUpdate({ end: parseFieldNumber(event.target.value, 0) })
						}
					/>
				) : null}

				<input
					className="pk-input"
					type="text"
					value={field.label}
					placeholder={strings.displayField.displayName}
					aria-label={strings.displayField.displayName}
					onChange={(event) => onUpdate({ label: event.target.value })}
				/>

				{field.type === 'formula' ? (
					<button
						type="button"
						className={
							formulaOpen
								? 'pk-icon-button pk-icon-button-active'
								: 'pk-icon-button'
						}
						aria-expanded={formulaOpen}
						aria-label={strings.displayField.editFormula}
						title={strings.displayField.editFormula}
						onClick={() => setFormulaOpen((open) => !open)}
					>
						<FormulaIcon />
					</button>
				) : null}

				{showIfMissing ? (
					<label
						className="pk-toggle pk-toggle-icon"
						title={strings.displayField.displayNone}
					>
						<input
							type="checkbox"
							checked={field.showIfMissing}
							title={strings.displayField.displayNone}
							aria-label={strings.displayField.displayNone}
							onChange={(event) =>
								onUpdate({ showIfMissing: event.target.checked })
							}
						/>
					</label>
				) : null}

				<button
					type="button"
					className="pk-icon-button"
					aria-label={strings.displayField.deleteField}
					onClick={onDelete}
				>
					<TrashIcon />
				</button>
			</div>

			{field.type === 'formula' && formulaOpen ? (
				<FormulaInput
					app={app}
					field={field}
					siblingFields={siblingFields}
					onUpdate={onUpdate}
				/>
			) : null}
		</div>
	);
}
