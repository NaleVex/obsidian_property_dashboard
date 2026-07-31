import { App } from 'obsidian';
import {
	CardFieldDef,
	TableViewConfig,
	addTableValueToView,
	removeTableValueFromView,
} from '../board/schema';
import { strings } from '../i18n';
import { DisplayFieldRow } from './DisplayFieldRow';

interface TableValuesEditorProps {
	app: App;
	view: TableViewConfig;
	onUpdateView: (updater: (current: TableViewConfig) => TableViewConfig) => void;
}

export function TableValuesEditor({ app, view, onUpdateView }: TableValuesEditorProps) {
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
				<h3 className="pk-panel-title">{strings.tableValues.title}</h3>
			</div>
			<p className="pk-panel-hint">{strings.tableValues.hint}</p>

			<div className="pk-field-rows">
				{view.values.map((value) => (
					<DisplayFieldRow
						key={value.id}
						app={app}
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
