import {
	CardFieldDef,
	TableViewConfig,
	addTableValueToView,
	removeTableValueFromView,
} from '../board/schema';
import { DisplayFieldRow } from './DisplayFieldRow';

interface TableValuesEditorProps {
	view: TableViewConfig;
	onUpdateView: (updater: (current: TableViewConfig) => TableViewConfig) => void;
}

export function TableValuesEditor({ view, onUpdateView }: TableValuesEditorProps) {
	const updateValue = (valueId: string, patch: Partial<CardFieldDef>) => {
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
				Properties from frontmatter or paragraph slices from note body, used as
				table columns.
			</p>

			<div className="pk-field-rows">
				{view.values.map((value) => (
					<DisplayFieldRow
						key={value.id}
						field={value}
						onUpdate={(patch) => updateValue(value.id, patch)}
						onDelete={() =>
							onUpdateView((current) =>
								removeTableValueFromView(current, value.id),
							)
						}
					/>
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
