import { App, PluginSettingTab, Setting } from 'obsidian';
import type ObsidigramPlugin from '../main';

export class ObsidigramSettingTab extends PluginSettingTab {
	plugin: ObsidigramPlugin;

	constructor(app: App, plugin: ObsidigramPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'Obsidigram Settings' });

		new Setting(containerEl)
			.setName('Bot API URL')
			.setDesc('The base URL of your Telegram bot API server (e.g., http://localhost:3001)')
			.addText(text => text
				.setPlaceholder('http://localhost:3001')
				.setValue(this.plugin.settings.botApiUrl)
				.onChange(async (value) => {
					this.plugin.settings.botApiUrl = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl('h3', { text: 'Time Slots' });
		containerEl.createEl('p', { 
			text: 'Configure the time slots available for scheduling (format: HH:mm, one per line)' 
		});

		const timeSlotsContainer = containerEl.createDiv();
		const timeSlotsTextArea = timeSlotsContainer.createEl('textarea', {
			attr: {
				style: 'width: 100%; min-height: 100px; font-family: monospace;',
				placeholder: '09:00\n12:00\n15:00\n18:00\n21:00\n00:00'
			}
		});
		timeSlotsTextArea.value = this.plugin.settings.timeSlots.join('\n');

		timeSlotsTextArea.addEventListener('change', async () => {
			const lines = timeSlotsTextArea.value
				.split('\n')
				.map(line => line.trim())
				.filter(line => line.length > 0 && /^\d{2}:\d{2}$/.test(line));
			
			this.plugin.settings.timeSlots = lines.length > 0 ? lines : ['09:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
			await this.plugin.saveSettings();
		});

		containerEl.createEl('h3', { text: 'About' });
		containerEl.createEl('p', {
			text: 'Obsidigram turns your Obsidian vault into a headless CMS for Telegram. ' +
				'Tag your notes with #tg_ready and #tg_unpublished to schedule them for posting.'
		});
	}
}

