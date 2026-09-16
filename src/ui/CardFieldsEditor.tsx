import { App } from 'obsidian';
import {
	CardDisplayView,
	CardFieldDef,
	addCardFieldToView,
	removeCardFieldFromView,
} from '../board/schema';
import { strings } from '../i18n';
import { DisplayFieldRow } from './DisplayFieldRow';

interface CardFieldsEditorProps<T extends CardDisplayView> {
	app: App;
	view: T;
	onUpdateView: (updater: (current: T) => T) => void;
}

export function CardFieldsEditor<T extends CardDisplayView>({
	app,
	view,
	onUpdateView,
}: CardFieldsEditorProps<T>) {
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
				<h3 className="pk-panel-title">{strings.cardFields.title}</h3>
			</div>
			<p className="pk-panel-hint">{strings.cardFields.hint}</p>

			<div className="pk-field-rows">
				{view.cardFields.map((field) => (
					<DisplayFieldRow
						key={field.id}
						app={app}
						field={field}
						siblingFields={view.cardFields}
						showIfMissing
						onUpdate={(patch) => updateField(field.id, patch)}
						onDelete={() =>
							onUpdateView((current) =>
								removeCardFieldFromView(current, field.id),
							)
						}
					/>
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
