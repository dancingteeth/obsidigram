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
		// API Configuration
		// ============================================
		containerEl.createEl('h2', { text: 'API Configuration' });
		const apiKeyDesc = containerEl.createEl('p', { cls: 'setting-item-description' });
		apiKeyDesc.appendText('Get your API key from ');
		apiKeyDesc.createEl('a', { text: '@obsidigram_cms_bot', href: 'https://t.me/obsidigram_cms_bot' });
		apiKeyDesc.appendText(' on Telegram. Forward a message from your channel, add the bot as admin, then /verify.');

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Paste the API key from the bot (obdg_...)')
			.addText((text: TextComponent) => {
				text.setPlaceholder('obdg_...');
				text.setValue(this.plugin.settings.apiKey || '');
				text.inputEl.style.width = '300px';
				text.inputEl.type = 'password';
				text.onChange(async (value: string) => {
					this.plugin.settings.apiKey = value.trim();
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName('Test Connection')
			.setDesc('Verify API server and API key')
			.addButton((button: ButtonComponent) => {
				button.setButtonText('Test Connection');
				button.onClick(async () => {
					button.setButtonText('Testing...');
					button.setDisabled(true);
					try {
						const { ApiClient } = await import('./ApiClient');
						const apiClient = new ApiClient(this.plugin.settings.botApiUrl, this.plugin.settings.apiKey || '');
						const scheduleResponse = await apiClient.getBusySlots();
						if (!scheduleResponse) {
							new Notice('❌ Connection failed. Check API URL and API key.');
							return;
						}
						new Notice('✅ Connection successful!');
					} catch (error) {
						new Notice('❌ Connection failed. Check settings and network.');
					} finally {
						button.setButtonText('Test Connection');
						button.setDisabled(false);
					}
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
			const mistralSetting = new Setting(containerEl)
				.setName('Mistral API Key');
			
			mistralSetting.descEl.createSpan({ text: 'API key for proofreading and grammar checking. Get your free key at the ' });
			mistralSetting.descEl.createEl('a', {
				text: 'Mistral Console →',
				href: 'https://console.mistral.ai/home?workspace_dialog=apiKeys'
			});

			mistralSetting.addText((text: TextComponent) => {
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
			const groqSetting = new Setting(containerEl)
				.setName('Groq API Key');
			
			groqSetting.descEl.createSpan({ text: 'Extremely fast inference (300+ tokens/sec). ' });
			groqSetting.descEl.createEl('a', {
				text: 'Get free API key →',
				href: 'https://console.groq.com/keys'
			});

			groqSetting.addText((text: TextComponent) => {
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
			const geminiSetting = new Setting(containerEl)
				.setName('Gemini API Key');
			
			geminiSetting.descEl.createSpan({ text: 'Massive context window. ' });
			geminiSetting.descEl.createEl('a', {
				text: 'Get free API key →',
				href: 'https://aistudio.google.com/app/apikey'
			});

			geminiSetting.addText((text: TextComponent) => {
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

			containerEl.createEl('h3', { text: 'Default AI Behaviors' });

			new Setting(containerEl)
				.setName('Default Translation Preset')
				.setDesc('Which AI service to use for translation by default')
				.addDropdown(dropdown => {
					dropdown.addOption('fast', 'Fast Preset (Groq)');
					dropdown.addOption('context', 'Context Preset (Gemini)');
					dropdown.addOption('mistral', 'Mistral Preset');
					dropdown.setValue(this.plugin.settings.defaultAIPreset);
					dropdown.onChange(async (value) => {
						this.plugin.settings.defaultAIPreset = value as any;
						await this.plugin.saveSettings();
					});
				});

			new Setting(containerEl)
				.setName('Default Proofread Preset')
				.setDesc('Which AI service to use for the Proofread command')
				.addDropdown(dropdown => {
					dropdown.addOption('mistral', 'Mistral Preset');
					dropdown.addOption('fast', 'Fast Preset (Groq)');
					dropdown.addOption('context', 'Context Preset (Gemini)');
					dropdown.setValue(this.plugin.settings.defaultProofreadPreset);
					dropdown.onChange(async (value) => {
						this.plugin.settings.defaultProofreadPreset = value as any;
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
			// TODO: debug and re-enable
			// { id: 'facebook', name: 'Facebook', icon: '📘' },
			// { id: 'threads', name: 'Threads', icon: '🧵' },
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
		const supportP = containerEl.createEl('p', { cls: 'setting-item-description' });
		supportP.appendText('Enjoying the plugin? ');
		supportP.createEl('a', { text: 'Support me!', href: 'https://ko-fi.com/dancingteeth' });
		
		containerEl.createEl('h3', { text: 'Usage' });
		const usageList = containerEl.createEl('ul', { cls: 'setting-item-description' });
		const li1 = usageList.createEl('li');
		li1.appendText('Add ');
		li1.createEl('code', { text: '#tg_ready' });
		li1.appendText(' and ');
		li1.createEl('code', { text: '#tg_unpublished' });
		li1.appendText(' tags to your note');
		const li2 = usageList.createEl('li');
		li2.appendText('Add a category tag: ');
		li2.createEl('code', { text: '#tg_research' });
		li2.appendText(', ');
		li2.createEl('code', { text: '#tg_infrastructure_energy' });
		li2.appendText(', etc.');
		usageList.createEl('li', { text: 'Save the file - the scheduling modal will open automatically' });
		usageList.createEl('li', { text: 'Select a time slot and schedule your post' });
	}
}

