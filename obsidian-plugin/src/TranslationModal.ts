/**
 * TranslationModal - Language selection modal for AI translation
 */

import { App, Modal, Notice, Setting } from 'obsidian';
import type ObsidigramPlugin from '../main';
import type { TranslationLanguage } from './types';
import { TRANSLATION_LANGUAGES } from './types';
import type { AIPreset } from './AIService';

export class TranslationModal extends Modal {
	private plugin: ObsidigramPlugin;
	private textToTranslate: string;
	private onTranslate: (translatedText: string) => void;
	private selectedLanguage: TranslationLanguage;
	private selectedPreset: AIPreset;
	private isTranslating: boolean = false;
	private translateButton: HTMLButtonElement | null = null;
	
	constructor(
		app: App,
		plugin: ObsidigramPlugin,
		textToTranslate: string,
		onTranslate: (translatedText: string) => void
	) {
		super(app);
		this.plugin = plugin;
		this.textToTranslate = textToTranslate;
		this.onTranslate = onTranslate;
		this.selectedLanguage = plugin.settings.defaultTranslationLanguage;
		this.selectedPreset = plugin.aiService.getBestAvailablePreset() || 'fast';
	}
	
	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('obsidigram-translation-modal');
		
		// Title
		contentEl.createEl('h2', { text: '🌐 Translate Text' });
		
		// Preview of text to translate
		const previewContainer = contentEl.createDiv({ cls: 'obsidigram-translation-preview' });
		previewContainer.createEl('p', { 
			text: 'Text to translate:',
			cls: 'setting-item-description'
		});
		
		const previewText = this.textToTranslate.length > 200 
			? this.textToTranslate.slice(0, 200) + '...' 
			: this.textToTranslate;
		
		const previewEl = previewContainer.createEl('div', { 
			cls: 'obsidigram-translation-text-preview'
		});
		previewEl.createEl('code', { text: previewText });
		
		// Character count
		previewContainer.createEl('p', {
			text: `${this.textToTranslate.length} characters`,
			cls: 'obsidigram-translation-char-count'
		});
		
		// Language selection
		new Setting(contentEl)
			.setName('Target language')
			.setDesc('Select the language to translate to')
			.addDropdown(dropdown => {
				for (const [code, name] of Object.entries(TRANSLATION_LANGUAGES)) {
					dropdown.addOption(code, name);
				}
				dropdown.setValue(this.selectedLanguage);
				dropdown.onChange((value) => {
					this.selectedLanguage = value as TranslationLanguage;
				});
			});
		
		// AI Preset selection
		const availablePresets = this.plugin.aiService.getAvailablePresets();
		if (availablePresets.length > 1) {
			new Setting(contentEl)
				.setName('AI preset')
				.setDesc('Choose speed vs quality tradeoff')
				.addDropdown(dropdown => {
					if (availablePresets.includes('fast')) {
						dropdown.addOption('fast', '⚡ Fast (Groq) — recommended');
					}
					if (availablePresets.includes('context')) {
						dropdown.addOption('context', '📚 Context (Gemini)');
					}
					if (availablePresets.includes('mistral')) {
						dropdown.addOption('mistral', '🧠 Mistral (Proofread)');
					}
					dropdown.setValue(this.selectedPreset);
					dropdown.onChange((value) => {
						this.selectedPreset = value as AIPreset;
					});
				});
		}
		
		// Buttons
		const buttonContainer = contentEl.createDiv({ cls: 'obsidigram-translation-buttons' });
		
		// Cancel button
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.close();
		});
		
		// Translate button
		this.translateButton = buttonContainer.createEl('button', { 
			text: '🌐 Translate',
			cls: 'mod-cta'
		});
		this.translateButton.addEventListener('click', () => {
			this.performTranslation();
		});
	}
	
	private async performTranslation(): Promise<void> {
		if (this.isTranslating) return;
		
		this.isTranslating = true;
		
		if (this.translateButton) {
			this.translateButton.textContent = '⏳ Translating...';
			this.translateButton.disabled = true;
			this.translateButton.addClass('obsidigram-translating');
		}
		
		try {
			const translatedText = await this.plugin.aiService.translateText(
				this.textToTranslate,
				this.selectedLanguage,
				this.selectedPreset
			);
			
			this.plugin.settings.defaultTranslationLanguage = this.selectedLanguage;
			await this.plugin.saveSettings();
			
			this.close();
			this.onTranslate(translatedText);
			
			new Notice(`✅ Translated to ${TRANSLATION_LANGUAGES[this.selectedLanguage]}`);
		} catch (error) {
			console.error('[Obsidigram] Translation error:', error);
			new Notice(`❌ Translation failed: ${error instanceof Error ? error.message : String(error)}`);
			
			if (this.translateButton) {
				this.translateButton.textContent = '🌐 Translate';
				this.translateButton.disabled = false;
				this.translateButton.removeClass('obsidigram-translating');
			}
		} finally {
			this.isTranslating = false;
		}
	}
	
	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

