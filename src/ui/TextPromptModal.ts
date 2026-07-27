import { App, Modal, Setting } from 'obsidian';
import { strings } from '../i18n';

interface TextPromptModalOptions {
	title: string;
	label?: string;
	defaultValue?: string;
	placeholder?: string;
	submitLabel?: string;
	allowEmpty?: boolean;
}

export class TextPromptModal extends Modal {
	private value: string;
	private resolved = false;

	constructor(
		app: App,
		private options: TextPromptModalOptions,
		private onSubmit: (value: string | null) => void,
	) {
		super(app);
		this.value = options.defaultValue ?? '';
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl('h2', { text: this.options.title });

		new Setting(contentEl)
			.setName(this.options.label ?? strings.common.name)
			.addText((text) => {
				text
					.setPlaceholder(this.options.placeholder ?? '')
					.setValue(this.value)
					.onChange((value) => {
						this.value = value;
					});
				text.inputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						this.submit();
					}
				});
				window.setTimeout(() => text.inputEl.select());
			});

		new Setting(contentEl)
			.addButton((button) => {
				button.setButtonText(strings.common.cancel).onClick(() => {
					this.cancel();
				});
			})
			.addButton((button) => {
				button
					.setButtonText(this.options.submitLabel ?? strings.common.save)
					.setCta()
					.onClick(() => {
						this.submit();
					});
			});
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.resolved) {
			this.resolved = true;
			this.onSubmit(null);
		}
	}

	private submit(): void {
		const trimmed = this.value.trim();
		if (!trimmed && !this.options.allowEmpty) {
			return;
		}
		this.resolved = true;
		this.close();
		this.onSubmit(trimmed);
	}

	private cancel(): void {
		this.resolved = true;
		this.close();
		this.onSubmit(null);
	}
}

export function promptForText(
	app: App,
	options: TextPromptModalOptions,
): Promise<string | null> {
	return new Promise((resolve) => {
		new TextPromptModal(app, options, resolve).open();
	});
}
