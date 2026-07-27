import { setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';
import {
	TableViewConfig,
	TableValueDef,
	addTableValueToView,
	removeTableValueFromView,
} from '../board/schema';

interface TableValuesEditorProps {
	view: TableViewConfig;
	onUpdateView: (updater: (current: TableViewConfig) => TableViewConfig) => void;
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

export function TableValuesEditor({ view, onUpdateView }: TableValuesEditorProps) {
	const updateValue = (valueId: string, patch: Partial<TableValueDef>) => {
		onUpdateView((current) => ({
			...current,
			values: current.values.map((value) =>
				value.id === valueId ? { ...value, ...patch } : value,
			),
		}));
	};

	return (
		<div className="pk-panel pk-panel-flat">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">Values</h3>
			</div>
			<p className="pk-panel-hint">
				Properties retrieved from notes and used as table columns.
			</p>

			<div className="pk-field-rows">
				{view.values.map((value) => (
					<div key={value.id} className="pk-field-row">
						<select
							className="pk-select"
							value={value.type}
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
							value={value.property}
							placeholder="Property name"
							aria-label="Property name"
							onChange={(event) =>
								updateValue(value.id, { property: event.target.value })
							}
						/>
						<input
							className="pk-input"
							type="text"
							value={value.label}
							placeholder="Display name"
							aria-label="Display name"
							onChange={(event) =>
								updateValue(value.id, { label: event.target.value })
							}
						/>
						<button
							type="button"
							className="pk-icon-button"
							aria-label="Delete value"
							onClick={() =>
								onUpdateView((current) =>
									removeTableValueFromView(current, value.id),
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
				onClick={() => onUpdateView((current) => addTableValueToView(current))}
			>
				+
			</button>
		</div>
	);
}
