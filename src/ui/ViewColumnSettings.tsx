import { App } from 'obsidian';
import { useState } from 'react';
import { KanbanViewConfig } from '../board/schema';
import { strings } from '../i18n';
import { PropertyPicker } from './PropertyPicker';

interface ViewColumnSettingsProps {
	app: App;
	view: KanbanViewConfig;
	onUpdateView: (updater: (current: KanbanViewConfig) => KanbanViewConfig) => void;
}

export function ViewColumnSettings({
	app,
	view,
	onUpdateView,
}: ViewColumnSettingsProps) {
	const [newValue, setNewValue] = useState('');

	const moveValue = (index: number, direction: -1 | 1) => {
		const next = index + direction;
		if (next < 0 || next >= view.values.length) {
			return;
		}
		onUpdateView((current) => {
			const values = [...current.values];
			const item = values[index];
			const swap = values[next];
			if (item === undefined || swap === undefined) {
				return current;
			}
			values[index] = swap;
			values[next] = item;
			return { ...current, values };
		});
	};

	const removeValue = (index: number) => {
		onUpdateView((current) => {
			const removed = current.values[index];
			const values = current.values.filter((_, i) => i !== index);
			const columnColors = { ...current.columnColors };
			if (removed) {
				delete columnColors[removed];
			}
			return { ...current, values, columnColors };
		});
	};

	const addValue = () => {
		const trimmed = newValue.trim();
		if (!trimmed || view.values.includes(trimmed)) {
			return;
		}
		onUpdateView((current) => ({
			...current,
			values: [...current.values, trimmed],
		}));
		setNewValue('');
	};

	return (
		<>
			<label className="pk-field">
				<span className="pk-field-label">{strings.viewSettings.triggerProperty}</span>
				<PropertyPicker
					app={app}
					value={view.triggerProperty}
					frontmatterOnly
					fullWidth
					ariaLabel={strings.viewSettings.triggerProperty}
					placeholder={strings.viewSettings.triggerPlaceholder}
					onChange={(triggerProperty) =>
						onUpdateView((current) => ({
							...current,
							triggerProperty,
						}))
					}
				/>
			</label>

			<div className="pk-values">
				<span className="pk-field-label">{strings.viewSettings.values}</span>
				<ul className="pk-values-list">
					{view.values.map((value, index) => (
						<li key={`${value}-${index}`} className="pk-values-item">
							<span className="pk-values-text">{value}</span>
							<div className="pk-values-actions">
								<button
									type="button"
									className="pk-icon-button"
									aria-label={strings.viewSettings.moveUp}
									disabled={index === 0}
									onClick={() => moveValue(index, -1)}
								>
									↑
								</button>
								<button
									type="button"
									className="pk-icon-button"
									aria-label={strings.viewSettings.moveDown}
									disabled={index === view.values.length - 1}
									onClick={() => moveValue(index, 1)}
								>
									↓
								</button>
								<button
									type="button"
									className="pk-icon-button"
									aria-label={strings.viewSettings.removeValue}
									onClick={() => removeValue(index)}
								>
									×
								</button>
							</div>
						</li>
					))}
				</ul>
				<div className="pk-values-add">
					<input
						className="pk-input"
						type="text"
						value={newValue}
						onChange={(event) => setNewValue(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								addValue();
							}
						}}
						placeholder={strings.viewSettings.addValuePlaceholder}
					/>
					<button type="button" className="pk-button" onClick={addValue}>
						{strings.common.add}
					</button>
				</div>
			</div>
		</>
	);
}
