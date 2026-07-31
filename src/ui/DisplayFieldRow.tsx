import { App, setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';
import { CardFieldDef, CardFieldType } from '../board/schema';
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

function parseFieldNumber(raw: string, fallback: number): number {
	const value = Number(raw);
	if (!Number.isInteger(value) || value < 0) {
		return fallback;
	}
	return value;
}

interface DisplayFieldRowProps {
	app: App;
	field: CardFieldDef;
	onUpdate: (patch: Partial<CardFieldDef>) => void;
	onDelete: () => void;
	showIfMissing?: boolean;
}

export function DisplayFieldRow({
	app,
	field,
	onUpdate,
	onDelete,
	showIfMissing = false,
}: DisplayFieldRowProps) {
	const handleTypeChange = (type: CardFieldType) => {
		if (type === field.type) {
			return;
		}
		if (type === 'paragraph') {
			onUpdate({
				type: 'paragraph',
				property: '',
				paragraph: 1,
				end: 0,
			});
			return;
		}
		onUpdate({
			type: 'property',
			property: '',
		});
	};

	return (
		<div className="pk-field-row">
			<select
				className="pk-select"
				value={field.type}
				aria-label={strings.displayField.fieldType}
				onChange={(event) =>
					handleTypeChange(event.target.value as CardFieldType)
				}
			>
				<option value="property">{strings.common.property}</option>
				<option value="paragraph">{strings.common.paragraph}</option>
			</select>

			{field.type === 'property' ? (
				<PropertyPicker
					app={app}
					value={field.property}
					fullWidth
					ariaLabel={strings.displayField.propertyName}
					placeholder={strings.displayField.propertyName}
					onChange={(property) => onUpdate({ property })}
				/>
			) : (
				<>
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
				</>
			)}

			<input
				className="pk-input"
				type="text"
				value={field.label}
				placeholder={strings.displayField.displayName}
				aria-label={strings.displayField.displayName}
				onChange={(event) => onUpdate({ label: event.target.value })}
			/>

			{showIfMissing ? (
				<label className="pk-toggle pk-toggle-icon" title={strings.displayField.displayNone}>
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
	);
}
