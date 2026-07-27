import { setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';
import { CardFieldDef, CardFieldType } from '../board/schema';

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
	field: CardFieldDef;
	onUpdate: (patch: Partial<CardFieldDef>) => void;
	onDelete: () => void;
	showIfMissing?: boolean;
}

export function DisplayFieldRow({
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
				aria-label="Field type"
				onChange={(event) =>
					handleTypeChange(event.target.value as CardFieldType)
				}
			>
				<option value="property">property</option>
				<option value="paragraph">paragraph</option>
			</select>

			{field.type === 'property' ? (
				<input
					className="pk-input"
					type="text"
					value={field.property}
					placeholder="Property name"
					aria-label="Property name"
					onChange={(event) => onUpdate({ property: event.target.value })}
				/>
			) : (
				<>
					<input
						className="pk-input pk-input-narrow"
						type="number"
						min={1}
						value={field.paragraph}
						placeholder="Para #"
						aria-label="Paragraph number"
						title="Paragraph number (1-based)"
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
						placeholder="End"
						aria-label="End character"
						title="End character (1-based; 0 = through end of paragraph)"
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
				placeholder="Display name"
				aria-label="Display name"
				onChange={(event) => onUpdate({ label: event.target.value })}
			/>

			{showIfMissing ? (
				<label className="pk-toggle pk-toggle-icon" title="display none">
					<input
						type="checkbox"
						checked={field.showIfMissing}
						title="display none"
						aria-label="display none"
						onChange={(event) =>
							onUpdate({ showIfMissing: event.target.checked })
						}
					/>
				</label>
			) : null}

			<button
				type="button"
				className="pk-icon-button"
				aria-label="Delete field"
				onClick={onDelete}
			>
				<TrashIcon />
			</button>
		</div>
	);
}
