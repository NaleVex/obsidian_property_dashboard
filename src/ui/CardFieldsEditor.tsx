import { setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';
import {
	BoardViewConfig,
	CardFieldDef,
	addCardFieldToView,
	removeCardFieldFromView,
} from '../board/schema';

interface CardFieldsEditorProps {
	view: BoardViewConfig;
	onUpdateView: (updater: (current: BoardViewConfig) => BoardViewConfig) => void;
}

function TrashIcon() {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, 'trash');
		}
	}, []);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

export function CardFieldsEditor({ view, onUpdateView }: CardFieldsEditorProps) {
	const updateField = (fieldId: string, patch: Partial<CardFieldDef>) => {
		onUpdateView((current) => ({
			...current,
			cardFields: current.cardFields.map((field) =>
				field.id === fieldId ? { ...field, ...patch } : field,
			),
		}));
	};

	return (
		<div className="pk-panel pk-panel-flat">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">Fields on a card</h3>
			</div>
			<p className="pk-panel-hint">
				Properties retrieved from notes and available for card display.
			</p>

			<div className="pk-field-rows">
				{view.cardFields.map((field) => (
					<div key={field.id} className="pk-field-row">
						<select
							className="pk-select"
							value={field.type}
							aria-label="Field type"
							onChange={() => {
								/* only property for now */
							}}
						>
							<option value="property">property</option>
						</select>
						<input
							className="pk-input"
							type="text"
							value={field.property}
							placeholder="Property name"
							aria-label="Property name"
							onChange={(event) =>
								updateField(field.id, { property: event.target.value })
							}
						/>
						<input
							className="pk-input"
							type="text"
							value={field.label}
							placeholder="Display name"
							aria-label="Display name"
							onChange={(event) =>
								updateField(field.id, { label: event.target.value })
							}
						/>
						<label className="pk-toggle" title="display none">
							<input
								type="checkbox"
								checked={field.showIfMissing}
								onChange={(event) =>
									updateField(field.id, {
										showIfMissing: event.target.checked,
									})
								}
							/>
							<span>display none</span>
						</label>
						<button
							type="button"
							className="pk-icon-button"
							aria-label="Delete field"
							onClick={() =>
								onUpdateView((current) =>
									removeCardFieldFromView(current, field.id),
								)
							}
						>
							<TrashIcon />
						</button>
					</div>
				))}
			</div>

			<button
				type="button"
				className="pk-button"
				onClick={() => onUpdateView((current) => addCardFieldToView(current))}
			>
				+
			</button>
		</div>
	);
}
