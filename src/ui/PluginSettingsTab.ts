import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import {
	applyLocale,
	strings,
	type PluginLanguage,
} from '../i18n';
import type PropertyBoardPlugin from '../main';

export class PluginSettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: PropertyBoardPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(strings.pluginSettings.language)
			.setDesc(strings.pluginSettings.languageDesc)
			.addDropdown((dropdown) => {
				dropdown
					.addOption('auto', strings.pluginSettings.languageAuto)
					.addOption('en', strings.pluginSettings.languageEn)
					.addOption('ru', strings.pluginSettings.languageRu)
					.addOption('de', strings.pluginSettings.languageDe)
					.setValue(this.plugin.settings.language)
					.onChange((value) => {
						void this.onLanguageChange(value as PluginLanguage);
					});
			});
	}

	private async onLanguageChange(language: PluginLanguage): Promise<void> {
		if (language === this.plugin.settings.language) {
			return;
		}

		this.plugin.settings.language = language;
		await this.plugin.saveSettings();
		applyLocale(language);

		new Notice(strings.pluginSettings.reloadNotice);
		const plugins = (
			this.app as App & {
				plugins: {
					disablePlugin: (id: string) => Promise<void>;
					enablePlugin: (id: string) => Promise<void>;
				};
			}
		).plugins;
		await plugins.disablePlugin(this.plugin.manifest.id);
		await plugins.enablePlugin(this.plugin.manifest.id);
	}
}
