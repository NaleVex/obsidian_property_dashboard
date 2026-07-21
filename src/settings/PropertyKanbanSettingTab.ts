import { App, PluginSettingTab, Setting } from 'obsidian';
import { PropertyKanbanPlugin } from '../plugin-types';

export class PropertyKanbanSettingTab extends PluginSettingTab {
	plugin: PropertyKanbanPlugin;

	constructor(app: App, plugin: PropertyKanbanPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Property Kanban Settings' });

		new Setting(containerEl)
			.setName('Trigger property')
			.setDesc('Frontmatter property that drives column grouping (e.g. status).')
			.addText((text) =>
				text
					.setPlaceholder('status')
					.setValue(this.plugin.settings.triggerProperty)
					.onChange(async (value) => {
						this.plugin.settings.triggerProperty = value.trim() || 'status';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Folder filter')
			.setDesc('Optional folder prefix to limit which notes appear on the board.')
			.addText((text) =>
				text
					.setPlaceholder('Projects/')
					.setValue(this.plugin.settings.folderFilter)
					.onChange(async (value) => {
						this.plugin.settings.folderFilter = value.trim();
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Show uncategorized column')
			.setDesc('Display notes with missing or unknown status values.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showUncategorizedColumn)
					.onChange(async (value) => {
						this.plugin.settings.showUncategorizedColumn = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Include files without property')
			.setDesc('Include notes that lack the trigger property in the uncategorized column.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeFilesWithoutProperty)
					.onChange(async (value) => {
						this.plugin.settings.includeFilesWithoutProperty = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Case-sensitive status matching')
			.setDesc('Match status values using exact letter casing.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.caseSensitiveStatus)
					.onChange(async (value) => {
						this.plugin.settings.caseSensitiveStatus = value;
						await this.plugin.saveSettings();
					}),
			);

		containerEl.createEl('h3', { text: 'Statuses (columns)' });

		this.plugin.settings.statuses.forEach((status: string, index: number) => {
			new Setting(containerEl)
				.setName(`Column ${index + 1}`)
				.addText((text) =>
					text.setValue(status).onChange(async (value) => {
						this.plugin.settings.statuses[index] = value.trim();
						await this.plugin.saveSettings();
					}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('arrow-up')
						.setTooltip('Move up')
						.onClick(async () => {
							if (index === 0) {
								return;
							}
							const statuses = this.plugin.settings.statuses;
							[statuses[index - 1], statuses[index]] = [
								statuses[index]!,
								statuses[index - 1]!,
							];
							await this.plugin.saveSettings();
							this.display();
						}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('arrow-down')
						.setTooltip('Move down')
						.onClick(async () => {
							const statuses = this.plugin.settings.statuses;
							if (index >= statuses.length - 1) {
								return;
							}
							[statuses[index + 1], statuses[index]] = [
								statuses[index]!,
								statuses[index + 1]!,
							];
							await this.plugin.saveSettings();
							this.display();
						}),
				)
				.addExtraButton((button) =>
					button
						.setIcon('cross')
						.setTooltip('Remove')
						.onClick(async () => {
							this.plugin.settings.statuses.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						}),
				);
		});

		new Setting(containerEl).addButton((button) =>
			button
				.setButtonText('Add status')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.statuses.push('new-status');
					await this.plugin.saveSettings();
					this.display();
				}),
		);
	}
}
