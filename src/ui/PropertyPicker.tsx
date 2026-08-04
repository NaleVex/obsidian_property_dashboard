import { App, setIcon } from 'obsidian';
import {
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { SORT_HEADER_NAME_ID } from '../board/schema';
import {
	listVaultProperties,
	propertyDisplayLabel,
	type VaultPropertyOption,
} from '../data/vaultProperties';
import { format, strings } from '../i18n';

function PropertyTypeIcon({ name }: { name: string }) {
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

export interface PropertyPickerProps {
	app: App;
	value: string;
	onChange: (property: string) => void;
	/** When set, only these options are listed (e.g. view-configured properties). */
	options?: VaultPropertyOption[];
	includeHeaderName?: boolean;
	frontmatterOnly?: boolean;
	/** Allow committing a typed name that is not in the list. Default: true when options unset. */
	allowCreate?: boolean;
	ariaLabel?: string;
	placeholder?: string;
	className?: string;
	fullWidth?: boolean;
}

function displayValue(
	app: App,
	property: string,
	options: VaultPropertyOption[] | undefined,
): string {
	if (!property.trim()) {
		return '';
	}
	if (property === SORT_HEADER_NAME_ID) {
		return strings.sort.headerName;
	}
	const fromOptions = options?.find(
		(item) =>
			item.property === property ||
			item.property.toLowerCase() === property.toLowerCase(),
	);
	if (fromOptions) {
		return fromOptions.label;
	}
	return propertyDisplayLabel(app, property);
}

function filterOptions(
	options: VaultPropertyOption[],
	query: string,
): VaultPropertyOption[] {
	const q = query.trim().toLowerCase();
	if (!q) {
		return options;
	}
	return options.filter(
		(option) =>
			option.label.toLowerCase().includes(q) ||
			option.property.toLowerCase().includes(q),
	);
}

function resolvePortalParent(anchor: HTMLElement | null): HTMLElement {
	const modal = anchor?.closest('.modal');
	if (modal instanceof HTMLElement) {
		return modal;
	}
	return window.document.body;
}

export function PropertyPicker({
	app,
	value,
	onChange,
	options: optionsProp,
	includeHeaderName = false,
	frontmatterOnly = false,
	allowCreate,
	ariaLabel,
	placeholder,
	className,
	fullWidth = false,
}: PropertyPickerProps) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const searchRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [activeIndex, setActiveIndex] = useState(0);
	const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
	const [portalParent, setPortalParent] = useState<HTMLElement>(
		() => window.document.body,
	);

	const canCreate = allowCreate ?? optionsProp === undefined;

	const options = useMemo(() => {
		if (optionsProp) {
			return optionsProp;
		}
		return listVaultProperties(app, {
			includeHeaderName,
			frontmatterOnly,
		});
	}, [app, includeHeaderName, frontmatterOnly, optionsProp, open]);

	const filtered = useMemo(
		() => filterOptions(options, query),
		[options, query],
	);

	const exactMatch = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return true;
		}
		return options.some(
			(option) =>
				option.property.toLowerCase() === q ||
				option.label.toLowerCase() === q,
		);
	}, [options, query]);

	const createLabel =
		canCreate && query.trim() && !exactMatch
			? format(strings.propertyPicker.create, { query: query.trim() })
			: null;

	const selectableCount = filtered.length + (createLabel ? 1 : 0);

	const updateMenuPosition = () => {
		const anchor = wrapRef.current;
		if (!anchor) {
			return;
		}
		const rect = anchor.getBoundingClientRect();
		const gutter = 8;
		const maxHeight = Math.min(280, window.innerHeight - gutter * 2);
		const spaceBelow = window.innerHeight - rect.bottom - gutter;
		const spaceAbove = rect.top - gutter;
		const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
		const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);

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

	const openPicker = () => {
		setPortalParent(resolvePortalParent(wrapRef.current));
		setOpen(true);
	};

	useLayoutEffect(() => {
		if (!open) {
			return;
		}
		setQuery('');
		setActiveIndex(0);
		updateMenuPosition();
		const id = window.setTimeout(() => searchRef.current?.focus(), 0);
		return () => window.clearTimeout(id);
	}, [open]);

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
		if (!open) {
			return;
		}
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) {
				return;
			}
			if (wrapRef.current?.contains(target)) {
				return;
			}
			if (dropdownRef.current?.contains(target)) {
				return;
			}
			setOpen(false);
		};
		const onKeyDown = (event: WindowEventMap['keydown']) => {
			if (event.key === 'Escape') {
				setOpen(false);
			}
		};
		window.document.addEventListener('pointerdown', onPointerDown, true);
		window.document.addEventListener('keydown', onKeyDown);
		return () => {
			window.document.removeEventListener('pointerdown', onPointerDown, true);
			window.document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	useEffect(() => {
		setActiveIndex(0);
	}, [query]);

	const commit = (property: string) => {
		onChange(property);
		setOpen(false);
	};

	const commitCreate = () => {
		const trimmed = query.trim();
		if (!trimmed || !canCreate) {
			return;
		}
		if (trimmed === strings.sort.headerName && includeHeaderName) {
			commit(SORT_HEADER_NAME_ID);
			return;
		}
		commit(trimmed);
	};

	const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveIndex((index) =>
				selectableCount === 0 ? 0 : (index + 1) % selectableCount,
			);
			return;
		}
		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveIndex((index) =>
				selectableCount === 0
					? 0
					: (index - 1 + selectableCount) % selectableCount,
			);
			return;
		}
		if (event.key === 'Enter') {
			event.preventDefault();
			if (activeIndex < filtered.length) {
				const option = filtered[activeIndex];
				if (option) {
					commit(option.property);
				}
				return;
			}
			if (createLabel) {
				commitCreate();
			}
		}
	};

	const onTriggerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			openPicker();
		}
	};

	const shown = displayValue(app, value, optionsProp ?? options);

	const preventBlur = (event: { preventDefault: () => void }) => {
		event.preventDefault();
	};

	const dropdown = open
		? createPortal(
				<div
					ref={dropdownRef}
					className="pk-property-picker-dropdown"
					role="listbox"
					style={menuStyle}
				>
					<input
						ref={searchRef}
						className="pk-input pk-property-picker-search"
						type="text"
						placeholder={strings.propertyPicker.placeholder}
						aria-label={strings.propertyPicker.placeholder}
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={onSearchKeyDown}
					/>
					<div className="pk-property-picker-list">
						{filtered.map((option, index) => (
							<button
								key={`${option.kind}:${option.property}`}
								type="button"
								role="option"
								aria-selected={value === option.property}
								className={[
									'pk-property-picker-item',
									value === option.property ? 'is-selected' : '',
									index === activeIndex ? 'is-active' : '',
								]
									.filter(Boolean)
									.join(' ')}
								onMouseEnter={() => setActiveIndex(index)}
								onMouseDown={preventBlur}
								onClick={() => commit(option.property)}
							>
								<PropertyTypeIcon name={option.icon} />
								<span className="pk-property-picker-item-label">
									{option.label}
								</span>
							</button>
						))}
						{createLabel ? (
							<button
								type="button"
								className={[
									'pk-property-picker-create',
									activeIndex === filtered.length ? 'is-active' : '',
								]
									.filter(Boolean)
									.join(' ')}
								onMouseEnter={() => setActiveIndex(filtered.length)}
								onMouseDown={preventBlur}
								onClick={commitCreate}
							>
								{createLabel}
							</button>
						) : null}
						{filtered.length === 0 && !createLabel ? (
							<div className="pk-property-picker-empty">
								{strings.propertyPicker.empty}
							</div>
						) : null}
					</div>
				</div>,
				portalParent,
			)
		: null;

	return (
		<div
			ref={wrapRef}
			className={[
				'pk-property-picker',
				fullWidth ? 'is-full-width' : '',
				className ?? '',
			]
				.filter(Boolean)
				.join(' ')}
		>
			<input
				className="pk-input pk-property-picker-input"
				type="text"
				aria-label={ariaLabel ?? strings.propertyPicker.pickProperty}
				placeholder={placeholder ?? strings.propertyPicker.placeholder}
				value={shown}
				readOnly
				aria-expanded={open}
				aria-haspopup="listbox"
				onClick={openPicker}
				onKeyDown={onTriggerKeyDown}
			/>
			{dropdown}
		</div>
	);
}
