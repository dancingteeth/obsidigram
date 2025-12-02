import { App, PluginSettingTab, Setting, Notice, TextComponent, ButtonComponent } from 'obsidian';
import type ObsidigramPlugin from '../main';
import { DEFAULT_CATEGORIES, type CategoryConfig } from './types';

export class ObsidigramSettingTab extends PluginSettingTab {
	plugin: ObsidigramPlugin;

	constructor(app: App, plugin: ObsidigramPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h1', { text: 'Obsidigram Settings' });
		containerEl.createEl('p', {
			text: 'Configure your Telegram bot API connection and scheduling preferences.',
			cls: 'setting-item-description'
		});

		// ============================================
		// Bot Configuration Section
		// ============================================
		containerEl.createEl('h2', { text: 'Bot Configuration' });

		new Setting(containerEl)
			.setName('Bot API URL')
			.setDesc('The base URL of your Telegram bot API server (e.g., http://localhost:3001 or http://149.102.148.156:3001)')
			.addText((text: TextComponent) => {
				text.setPlaceholder('http://localhost:3001');
				text.setValue(this.plugin.settings.botApiUrl);
				text.inputEl.style.width = '300px';
				text.onChange(async (value: string) => {
					this.plugin.settings.botApiUrl = value.trim();
					await this.plugin.saveSettings();
				});
			})
			.addButton((button: ButtonComponent) => {
				button.setButtonText('Test Connection');
				button.onClick(async () => {
					button.setButtonText('Testing...');
					button.setDisabled(true);
					try {
						const { ApiClient } = await import('./ApiClient');
						const apiClient = new ApiClient(this.plugin.settings.botApiUrl);
						const response = await apiClient.getBusySlots();
						if (response) {
							new Notice('✅ Connection successful!');
						} else {
							new Notice('❌ Connection failed. Check your URL and ensure the bot is running.');
						}
					} catch (error) {
						new Notice('❌ Connection failed. Check your URL and ensure the bot is running.');
					}
					button.setButtonText('Test Connection');
					button.setDisabled(false);
				});
			});

		// ============================================
		// Scheduling Settings Section
		// ============================================
		containerEl.createEl('h2', { text: 'Scheduling Settings' });

		containerEl.createEl('h3', { text: 'Time Slots' });
		containerEl.createEl('p', { 
			text: 'Configure the time slots available for scheduling (format: HH:mm, one per line)',
			cls: 'setting-item-description'
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
				.map((line: string) => line.trim())
				.filter((line: string) => line.length > 0 && /^\d{2}:\d{2}$/.test(line));
			
			this.plugin.settings.timeSlots = lines.length > 0 ? lines : ['09:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
			await this.plugin.saveSettings();
		});

		// ============================================
		// Categories Section
		// ============================================
		containerEl.createEl('h3', { text: 'Categories' });
		containerEl.createEl('p', { 
			text: 'Configure category tags with their display letters and colors. Format: name,letter,color (one per line)',
			cls: 'setting-item-description'
		});

		const categoriesContainer = containerEl.createDiv();
		const categoriesTextArea = categoriesContainer.createEl('textarea', {
			attr: {
				style: 'width: 100%; min-height: 150px; font-family: monospace;',
				placeholder: 'research,R,#e74c3c\ninfrastructure_energy,I,#f39c12\nslop_misinformation,S,#9b59b6'
			}
		});
		
		// Convert categories to text format
		const categoriesToText = (cats: CategoryConfig[]): string => {
			return cats.map(c => `${c.name},${c.letter},${c.color}`).join('\n');
		};
		
		categoriesTextArea.value = categoriesToText(this.plugin.settings.categories || DEFAULT_CATEGORIES);

		categoriesTextArea.addEventListener('change', async () => {
			const lines = categoriesTextArea.value
				.split('\n')
				.map((line: string) => line.trim())
				.filter((line: string) => line.length > 0);
			
			const categories: CategoryConfig[] = [];
			for (const line of lines) {
				const parts = line.split(',').map(p => p.trim());
				if (parts.length >= 3) {
					categories.push({
						name: parts[0],
						letter: parts[1].charAt(0).toUpperCase(),
						color: parts[2].startsWith('#') ? parts[2] : `#${parts[2]}`,
					});
				}
			}
			
			this.plugin.settings.categories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
			await this.plugin.saveSettings();
		});

		// Category preview
		const previewContainer = containerEl.createDiv({ cls: 'obsidigram-category-preview' });
		previewContainer.style.marginTop = '10px';
		previewContainer.style.display = 'flex';
		previewContainer.style.flexWrap = 'wrap';
		previewContainer.style.gap = '8px';
		
		const updatePreview = () => {
			previewContainer.empty();
			const cats = this.plugin.settings.categories || DEFAULT_CATEGORIES;
			for (const cat of cats) {
				const badge = previewContainer.createEl('span', {
					text: cat.letter,
					attr: {
						title: `#tg_${cat.name}`,
						style: `
							display: inline-flex;
							align-items: center;
							justify-content: center;
							width: 24px;
							height: 24px;
							border-radius: 4px;
							background-color: ${cat.color};
							color: white;
							font-weight: bold;
							font-size: 12px;
						`
					}
				});
			}
		};
		updatePreview();
		
		categoriesTextArea.addEventListener('change', updatePreview);

		// ============================================
		// About Section
		// ============================================
		containerEl.createEl('h2', { text: 'About' });
		containerEl.createEl('p', {
			text: 'Obsidigram turns your Obsidian vault into a headless CMS for Telegram. ' +
				'Tag your notes with #tg_ready and #tg_unpublished to schedule them for posting.',
			cls: 'setting-item-description'
		});
		
		containerEl.createEl('h3', { text: 'Usage' });
		containerEl.createEl('ul', { cls: 'setting-item-description' }).innerHTML = `
			<li>Add <code>#tg_ready</code> and <code>#tg_unpublished</code> tags to your note</li>
			<li>Add a category tag: <code>#tg_research</code>, <code>#tg_infrastructure_energy</code>, etc.</li>
			<li>Save the file - the scheduling modal will open automatically</li>
			<li>Select a time slot and schedule your post</li>
		`;
	}
}

