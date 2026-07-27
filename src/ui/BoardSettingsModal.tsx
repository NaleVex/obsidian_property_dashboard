import { App, Modal } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { StrictMode, useState } from 'react';
import { BoardDocument, BoardSettings, LimitTo } from '../board/schema';
import { normalizeFolderPath } from '../data/limitTo';
import { strings } from '../i18n';
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

	const openFolderPicker = () => {
		new FolderSuggestModal(host.app, (folder) => {
			const path = normalizeFolderPath(folder.path);
			setLimitTo({ mode: 'folder', path });
		}).open();
	};

	const folderLabel =
		settings.limitTo.mode === 'folder'
			? settings.limitTo.path || strings.boardSettings.noneSelected
			: '';

	return (
		<div className="pk-settings pk-settings-modal">
			<fieldset className="pk-fieldset">
				<legend className="pk-field-label">{strings.boardSettings.limitTo}</legend>
				<label className="pk-radio">
					<input
						type="radio"
						name="limit-to"
						checked={settings.limitTo.mode === 'all'}
						onChange={() => setLimitTo({ mode: 'all' })}
					/>
					<span>{strings.boardSettings.limitAll}</span>
				</label>
				<label className="pk-radio">
					<input
						type="radio"
						name="limit-to"
						checked={settings.limitTo.mode === 'siblings'}
						onChange={() => setLimitTo({ mode: 'siblings' })}
					/>
					<span>{strings.boardSettings.limitSiblings}</span>
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
					<span>{strings.boardSettings.limitFolder}</span>
				</label>
				{settings.limitTo.mode === 'folder' && (
					<div className="pk-folder-picker">
						<span className="pk-folder-path">{folderLabel}</span>
						<button type="button" className="pk-button" onClick={openFolderPicker}>
							{strings.boardSettings.chooseFolder}
						</button>
					</div>
				)}
			</fieldset>
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
		this.titleEl.setText(strings.boardSettings.title);
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
