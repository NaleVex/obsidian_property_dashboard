import { App, Modal } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode, useState } from 'react';
import { BoardDocument, BoardSettings, LimitTo } from '../board/schema';
import { normalizeFolderPath } from '../data/limitTo';
import { FolderSuggestModal } from './FolderSuggestModal';

export interface BoardSettingsModalHost {
	app: App;
	getDocument: () => BoardDocument;
	updateDocument: (updater: (doc: BoardDocument) => BoardDocument) => void;
}

function BoardSettingsForm({
	host,
}: {
	host: BoardSettingsModalHost;
}) {
	const [, setTick] = useState(0);
	const [newValue, setNewValue] = useState('');
	const settings = host.getDocument().settings;

	const refresh = () => setTick((value) => value + 1);

	const patchSettings = (patch: Partial<BoardSettings>) => {
		host.updateDocument((doc) => ({
			...doc,
			settings: {
				...doc.settings,
				...patch,
			},
		}));
		refresh();
	};

	const setLimitTo = (limitTo: LimitTo) => {
		patchSettings({ limitTo });
	};

	const moveValue = (index: number, direction: -1 | 1) => {
		const next = index + direction;
		if (next < 0 || next >= settings.values.length) {
			return;
		}
		const values = [...settings.values];
		const current = values[index];
		const swap = values[next];
		if (current === undefined || swap === undefined) {
			return;
		}
		values[index] = swap;
		values[next] = current;
		patchSettings({ values });
	};

	const removeValue = (index: number) => {
		const removed = settings.values[index];
		const values = settings.values.filter((_, i) => i !== index);
		const columnColors = { ...settings.columnColors };
		if (removed) {
			delete columnColors[removed];
		}
		patchSettings({ values, columnColors });
	};

	const addValue = () => {
		const trimmed = newValue.trim();
		if (!trimmed || settings.values.includes(trimmed)) {
			return;
		}
		patchSettings({ values: [...settings.values, trimmed] });
		setNewValue('');
	};

	const openFolderPicker = () => {
		new FolderSuggestModal(host.app, (folder) => {
			const path = normalizeFolderPath(folder.path);
			setLimitTo({ mode: 'folder', path });
		}).open();
	};

	const folderLabel =
		settings.limitTo.mode === 'folder'
			? settings.limitTo.path || '(none selected)'
			: '';

	return (
		<div className="pk-settings pk-settings-modal">
			<label className="pk-field">
				<span className="pk-field-label">Trigger property</span>
				<input
					className="pk-input"
					type="text"
					value={settings.triggerProperty}
					onChange={(event) =>
						patchSettings({ triggerProperty: event.target.value })
					}
					placeholder="status"
				/>
			</label>

			<fieldset className="pk-fieldset">
				<legend className="pk-field-label">Limit to</legend>
				<label className="pk-radio">
					<input
						type="radio"
						name="limit-to"
						checked={settings.limitTo.mode === 'all'}
						onChange={() => setLimitTo({ mode: 'all' })}
					/>
					<span>All (entire vault)</span>
				</label>
				<label className="pk-radio">
					<input
						type="radio"
						name="limit-to"
						checked={settings.limitTo.mode === 'siblings'}
						onChange={() => setLimitTo({ mode: 'siblings' })}
					/>
					<span>Siblings (same folder as this board)</span>
				</label>
				<label className="pk-radio">
					<input
						type="radio"
						name="limit-to"
						checked={settings.limitTo.mode === 'folder'}
						onChange={() =>
							setLimitTo({
								mode: 'folder',
								path:
									settings.limitTo.mode === 'folder'
										? settings.limitTo.path
										: '',
							})
						}
					/>
					<span>Specific folder</span>
				</label>
				{settings.limitTo.mode === 'folder' && (
					<div className="pk-folder-picker">
						<span className="pk-folder-path">{folderLabel}</span>
						<button type="button" className="pk-button" onClick={openFolderPicker}>
							Choose folder
						</button>
					</div>
				)}
			</fieldset>

			<div className="pk-values">
				<span className="pk-field-label">Values</span>
				<ul className="pk-values-list">
					{settings.values.map((value, index) => (
						<li key={`${value}-${index}`} className="pk-values-item">
							<span className="pk-values-text">{value}</span>
							<div className="pk-values-actions">
								<button
									type="button"
									className="pk-icon-button"
									aria-label="Move up"
									disabled={index === 0}
									onClick={() => moveValue(index, -1)}
								>
									↑
								</button>
								<button
									type="button"
									className="pk-icon-button"
									aria-label="Move down"
									disabled={index === settings.values.length - 1}
									onClick={() => moveValue(index, 1)}
								>
									↓
								</button>
								<button
									type="button"
									className="pk-icon-button"
									aria-label="Remove value"
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
						placeholder="Add value…"
					/>
					<button type="button" className="pk-button" onClick={addValue}>
						Add
					</button>
				</div>
			</div>
		</div>
	);
}

export class BoardSettingsModal extends Modal {
	private root: Root | null = null;

	constructor(
		app: App,
		private host: BoardSettingsModalHost,
	) {
		super(app);
	}

	onOpen(): void {
		this.titleEl.setText('Board settings');
		this.modalEl.addClass('pk-board-settings-modal');
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<BoardSettingsForm host={this.host} />
			</StrictMode>,
		);
	}

	onClose(): void {
		this.root?.unmount();
		this.root = null;
		this.contentEl.empty();
	}
}
