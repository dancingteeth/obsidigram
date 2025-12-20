import { App, PluginSettingTab, Setting, Notice, TextComponent, ButtonComponent } from 'obsidian';
import type ObsidigramPlugin from '../main';
import { DEFAULT_CATEGORIES, type CategoryConfig, type Platform, TRANSLATION_LANGUAGES, type TranslationLanguage } from './types';

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
		// AI Services Section
		// ============================================
		containerEl.createEl('h2', { text: '🤖 AI Features (BYOK)' });
		containerEl.createEl('p', {
			text: 'Configure multiple AI providers. Use your own API keys (Bring Your Own Key).',
			cls: 'setting-item-description'
		});

		new Setting(containerEl)
			.setName('Enable AI features')
			.setDesc('Enable AI-powered translation and proofreading')
			.addToggle(toggle => {
				toggle.setValue(this.plugin.settings.enableAI);
				toggle.onChange(async (value) => {
					this.plugin.settings.enableAI = value;
					await this.plugin.saveSettings();
					this.display();
				});
			});

		if (this.plugin.settings.enableAI) {
			// Mistral
			containerEl.createEl('h3', { text: '🧠 Mistral Preset' });
			new Setting(containerEl)
				.setName('Mistral API Key')
				.setDesc('API key for proofreading and grammar checking')
				.addText((text: TextComponent) => {
					text.setPlaceholder('Mistral API Key');
					text.setValue(this.plugin.settings.mistralApiKey || '');
					text.inputEl.style.width = '300px';
					text.inputEl.type = 'password';
					text.onChange(async (value: string) => {
						this.plugin.settings.mistralApiKey = value.trim();
						await this.plugin.saveSettings();
					});
				})
				.addButton(button => {
					button.setButtonText('Test');
					button.onClick(async () => {
						button.setButtonText('Testing...');
						button.setDisabled(true);
						const success = await this.plugin.aiService?.testConnection('mistral');
						new Notice(success ? '✅ Mistral connection successful!' : '❌ Mistral connection failed');
						button.setButtonText('Test');
						button.setDisabled(false);
					});
				});

			new Setting(containerEl)
				.setName('Mistral Model')
				.addDropdown(dropdown => {
					dropdown.addOption('mistral-large-latest', 'Mistral Large 3 (Best quality)');
					dropdown.addOption('mistral-medium-latest', 'Mistral Medium 3.1 (Balanced)');
					dropdown.addOption('mistral-small-latest', 'Mistral Small 3.2 (Fastest)');
					dropdown.addOption('ministral-3b-latest', 'Ministral 3B (Edge/Lite)');
					dropdown.addOption('ministral-8b-latest', 'Ministral 8B (Edge/Smart)');
					dropdown.addOption('magistral-medium-latest', 'Magistral Medium (Reasoning)');
					dropdown.setValue(this.plugin.settings.mistralModel);
					dropdown.onChange(async (value) => {
						this.plugin.settings.mistralModel = value as any;
						await this.plugin.saveSettings();
					});
				});

			// Groq
			containerEl.createEl('h3', { text: '⚡ Fast Preset (Groq)' });
			new Setting(containerEl)
				.setName('Groq API Key')
				.setDesc('Extremely fast inference (300+ tokens/sec). Get key at console.groq.com')
				.addText((text: TextComponent) => {
					text.setPlaceholder('gsk_...');
					text.setValue(this.plugin.settings.groqApiKey || '');
					text.inputEl.style.width = '300px';
					text.inputEl.type = 'password';
					text.onChange(async (value: string) => {
						this.plugin.settings.groqApiKey = value.trim();
						await this.plugin.saveSettings();
					});
				})
				.addButton(button => {
					button.setButtonText('Test');
					button.onClick(async () => {
						button.setButtonText('Testing...');
						button.setDisabled(true);
						const success = await this.plugin.aiService?.testConnection('fast');
						new Notice(success ? '✅ Groq connection successful!' : '❌ Groq connection failed');
						button.setButtonText('Test');
						button.setDisabled(false);
					});
				});

			new Setting(containerEl)
				.setName('Groq Model')
				.addDropdown(dropdown => {
					dropdown.addOption('llama-3.3-70b-versatile', 'Llama 3.3 70B (best quality)');
					dropdown.addOption('llama-3.1-8b-instant', 'Llama 3.1 8B (fastest)');
					dropdown.setValue(this.plugin.settings.groqModel);
					dropdown.onChange(async (value) => {
						this.plugin.settings.groqModel = value as any;
						await this.plugin.saveSettings();
					});
				});

			// Gemini
			containerEl.createEl('h3', { text: '📚 Context Preset (Gemini)' });
			new Setting(containerEl)
				.setName('Gemini API Key')
				.setDesc('Massive context window. Get key at aistudio.google.com')
				.addText((text: TextComponent) => {
					text.setPlaceholder('AIza...');
					text.setValue(this.plugin.settings.geminiApiKey || '');
					text.inputEl.style.width = '300px';
					text.inputEl.type = 'password';
					text.onChange(async (value: string) => {
						this.plugin.settings.geminiApiKey = value.trim();
						await this.plugin.saveSettings();
					});
				})
				.addButton(button => {
					button.setButtonText('Test');
					button.onClick(async () => {
						button.setButtonText('Testing...');
						button.setDisabled(true);
						const success = await this.plugin.aiService?.testConnection('context');
						new Notice(success ? '✅ Gemini connection successful!' : '❌ Gemini connection failed');
						button.setButtonText('Test');
						button.setDisabled(false);
					});
				});

			new Setting(containerEl)
				.setName('Gemini Model')
				.addDropdown(dropdown => {
					dropdown.addOption('gemini-2.0-flash', 'Gemini 2.0 Flash (fastest)');
					dropdown.addOption('gemini-1.5-flash', 'Gemini 1.5 Flash');
					dropdown.addOption('gemini-1.5-pro', 'Gemini 1.5 Pro (most capable)');
					dropdown.setValue(this.plugin.settings.geminiModel);
					dropdown.onChange(async (value) => {
						this.plugin.settings.geminiModel = value as any;
						await this.plugin.saveSettings();
					});
				});

			// Translation Section
			containerEl.createEl('h2', { text: '🌐 Translation' });
			
			new Setting(containerEl)
				.setName('Enable Translation')
				.setDesc('Translate selected text or entire documents using AI')
				.addToggle(toggle => {
					toggle.setValue(this.plugin.settings.enableTranslation);
					toggle.onChange(async (value) => {
						this.plugin.settings.enableTranslation = value;
						await this.plugin.saveSettings();
					});
				});
			
			new Setting(containerEl)
				.setName('Default Target Language')
				.setDesc('Language to use when opening the translation modal')
				.addDropdown(dropdown => {
					for (const [code, name] of Object.entries(TRANSLATION_LANGUAGES)) {
						dropdown.addOption(code, name);
					}
					dropdown.setValue(this.plugin.settings.defaultTranslationLanguage);
					dropdown.onChange(async (value) => {
						this.plugin.settings.defaultTranslationLanguage = value as TranslationLanguage;
						await this.plugin.saveSettings();
					});
				});
		}

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
		// Default Platforms Section
		// ============================================
		containerEl.createEl('h3', { text: 'Default Platforms' });
		containerEl.createEl('p', { 
			text: 'Select which platforms to publish to by default. You can change this per-post in the scheduling modal.',
			cls: 'setting-item-description'
		});

		const platformsContainer = containerEl.createDiv({ cls: 'obsidigram-default-platforms' });
		platformsContainer.style.display = 'flex';
		platformsContainer.style.flexWrap = 'wrap';
		platformsContainer.style.gap = '15px';
		platformsContainer.style.marginBottom = '20px';

		const allPlatforms: { id: Platform; name: string; icon: string }[] = [
			{ id: 'telegram', name: 'Telegram', icon: '✈️' },
			{ id: 'facebook', name: 'Facebook', icon: '📘' },
			{ id: 'threads', name: 'Threads', icon: '🧵' },
		];

		const defaultPlatforms = new Set(this.plugin.settings.defaultPlatforms || ['telegram']);

		allPlatforms.forEach(platform => {
			const label = platformsContainer.createEl('label', {
				cls: 'obsidigram-platform-setting-label'
			});
			label.style.display = 'flex';
			label.style.alignItems = 'center';
			label.style.gap = '5px';
			label.style.cursor = 'pointer';
			label.style.padding = '8px 12px';
			label.style.borderRadius = '4px';
			label.style.backgroundColor = 'var(--background-secondary)';

			const checkbox = label.createEl('input', {
				type: 'checkbox'
			});
			checkbox.checked = defaultPlatforms.has(platform.id);
			
			checkbox.addEventListener('change', async () => {
				if (checkbox.checked) {
					defaultPlatforms.add(platform.id);
				} else {
					if (defaultPlatforms.size > 1) {
						defaultPlatforms.delete(platform.id);
					} else {
						checkbox.checked = true;
						new Notice('At least one platform must be selected');
						return;
					}
				}
				this.plugin.settings.defaultPlatforms = Array.from(defaultPlatforms) as Platform[];
				await this.plugin.saveSettings();
			});

			label.createSpan({ text: `${platform.icon} ${platform.name}` });
		});

		// ============================================
		// About Section
		// ============================================
		containerEl.createEl('h2', { text: 'About' });
		containerEl.createEl('p', {
			text: 'Obsidigram turns your Obsidian vault into a headless CMS for multiple platforms. ' +
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

