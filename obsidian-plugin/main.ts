/**
 * Obsidigram - Obsidian Telegram Scheduler Plugin
 * 
 * Turns Obsidian into a headless CMS for Telegram.
 * Monitors markdown files for readiness tags, triggers scheduling UI,
 * and dispatches content to a Telegram Bot API for queuing.
 */

import { Plugin, Notice, TFile, Editor } from 'obsidian';
import { FileWatcher } from './src/FileWatcher';
import { SchedulingModal } from './src/SchedulingModal';
import { ObsidigramSettingTab } from './src/SettingsTab';
import { ApiClient } from './src/ApiClient';
import { AIService } from './src/AIService';
import { TranslationModal } from './src/TranslationModal';
import type { ObsidigramSettings, FrontMatter, Platform, PlatformResult } from './src/types';
import { DEFAULT_SETTINGS, PLATFORM_TAG_PREFIXES } from './src/types';

export default class ObsidigramPlugin extends Plugin {
	settings: ObsidigramSettings;
	fileWatcher: FileWatcher;
	aiService: AIService;
	private currentModal: SchedulingModal | null = null;
	private syncIntervalId: number | null = null;

	async onload(): Promise<void> {
		console.log('[Obsidigram] Loading plugin...');

		// Load settings
		await this.loadSettings();

		// Initialize components
		this.fileWatcher = new FileWatcher(this);
		this.aiService = new AIService(this);

		// Add settings tab
		this.addSettingTab(new ObsidigramSettingTab(this.app, this));

		// Add commands
		this.addCommands();

		// Add ribbon icon for sync
		this.addRibbonIcon('refresh-cw', 'Sync Telegram Status', async () => {
			await this.syncPublishedPosts();
		});

		// Show welcome notice
		new Notice('Obsidigram loaded');
		console.log('[Obsidigram] Plugin loaded successfully');

		// Wait for Obsidian's vault to be fully indexed before starting watchers
		this.app.workspace.onLayoutReady(() => {
			console.log('[Obsidigram] Workspace ready, starting file watcher...');
			// Additional delay to ensure vault index is complete
			setTimeout(() => {
				this.fileWatcher.start();
				// Sync published posts after a short delay
				setTimeout(() => {
					this.syncPublishedPosts();
				}, 1000);
				// Start time-slot-based sync scheduler
				this.startSyncScheduler();
			}, 1000);
		});
	}

	onunload(): void {
		console.log('[Obsidigram] Unloading plugin...');
		// Stop the sync scheduler
		if (this.syncIntervalId !== null) {
			window.clearInterval(this.syncIntervalId);
			this.syncIntervalId = null;
		}
		// Cleanup is handled automatically by Obsidian
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	/**
	 * Add plugin commands
	 */
	private addCommands(): void {
		// View schedule command (read-only calendar)
		this.addCommand({
			id: 'view-schedule',
			name: 'View Schedule',
			callback: () => {
				this.openScheduleViewer();
			}
		});

		// Sync command
		this.addCommand({
			id: 'sync-telegram-status',
			name: 'Sync Telegram Status',
			callback: async () => {
				await this.syncPublishedPosts();
			}
		});

		// Open settings command
		this.addCommand({
			id: 'open-settings',
			name: 'Open Obsidigram Settings',
			callback: () => {
				// @ts-ignore - accessing private API
				this.app.setting.open();
				// @ts-ignore
				this.app.setting.openTabById('obsidigram');
			}
		});

		// Proofread command
		this.addCommand({
			id: 'proofread',
			name: 'Proofread Selection/Document',
			editorCallback: async (editor: Editor) => {
				await this.proofreadText(editor);
			}
		});

		// Translate selection or document
		this.addCommand({
			id: 'translate-text',
			name: 'Translate Selection/Document',
			editorCheckCallback: (checking: boolean, editor) => {
				if (!this.settings.enableAI || !this.settings.enableTranslation) {
					return false;
				}
				
				if (!checking) {
					this.showTranslationModal(editor);
				}
				
				return true;
			}
		});
		
		// Quick translate to English
		this.addCommand({
			id: 'translate-to-english',
			name: 'Translate to English',
			editorCheckCallback: (checking: boolean, editor) => {
				if (!this.settings.enableAI || !this.settings.enableTranslation) {
					return false;
				}
				
				if (!checking) {
					this.quickTranslate(editor, 'en');
				}
				
				return true;
			}
		});
		
		// Quick translate to Russian
		this.addCommand({
			id: 'translate-to-russian',
			name: 'Translate to Russian',
			editorCheckCallback: (checking: boolean, editor) => {
				if (!this.settings.enableAI || !this.settings.enableTranslation) {
					return false;
				}
				
				if (!checking) {
					this.quickTranslate(editor, 'ru');
				}
				
				return true;
			}
		});
		
		// Quick translate to Spanish
		this.addCommand({
			id: 'translate-to-spanish',
			name: 'Translate to Spanish',
			editorCheckCallback: (checking: boolean, editor) => {
				if (!this.settings.enableAI || !this.settings.enableTranslation) {
					return false;
				}
				
				if (!checking) {
					this.quickTranslate(editor, 'es');
				}
				
				return true;
			}
		});
	}

	/**
	 * Proofread selected text or the entire document
	 */
	private async proofreadText(editor: Editor): Promise<void> {
		if (!this.settings.mistralApiKey) {
			new Notice('❌ Mistral API key not configured. Please add it in Obsidigram settings.');
			return;
		}

		const selection = editor.getSelection();
		const textToProofread = selection || editor.getValue();

		if (!textToProofread.trim()) {
			new Notice('⚠️ No text to proofread.');
			return;
		}

		const notice = new Notice('⏳ Proofreading...', 0);
		
		try {
			const proofreadText = await this.aiService.proofread(textToProofread);

			if (selection) {
				editor.replaceSelection(proofreadText);
			} else {
				editor.setValue(proofreadText);
			}

			notice.hide();
			new Notice('✅ Proofreading complete!');
		} catch (error) {
			notice.hide();
			console.error('[Obsidigram] Proofreading failed:', error);
			new Notice(`❌ Proofreading failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Show translation modal with language selection
	 */
	private showTranslationModal(editor: any): void {
		const selection = editor.getSelection();
		const textToTranslate = selection || editor.getValue();
		
		if (!textToTranslate.trim()) {
			new Notice('No text to translate');
			return;
		}
		
		const isSelection = !!selection;
		
		new TranslationModal(
			this.app,
			this,
			textToTranslate,
			(translatedText: string) => {
				if (isSelection) {
					editor.replaceSelection(translatedText);
				} else {
					editor.setValue(translatedText);
				}
			}
		).open();
	}
	
	/**
	 * Quick translate without modal
	 */
	private async quickTranslate(editor: any, targetLanguage: 'en' | 'ru' | 'es'): Promise<void> {
		const selection = editor.getSelection();
		const textToTranslate = selection || editor.getValue();
		
		if (!textToTranslate.trim()) {
			new Notice('No text to translate');
			return;
		}
		
		const isSelection = !!selection;
		const languageNames = { en: 'English', ru: 'Russian', es: 'Spanish' };
		
		new Notice(`Translating to ${languageNames[targetLanguage]}...`);
		
		try {
			const translatedText = await this.aiService.translateText(
				textToTranslate,
				targetLanguage
			);
			
			if (isSelection) {
				editor.replaceSelection(translatedText);
			} else {
				editor.setValue(translatedText);
			}
			
			new Notice(`✅ Translated to ${languageNames[targetLanguage]}`);
		} catch (error) {
			console.error('[Obsidigram] Translation error:', error);
			new Notice(`❌ Translation failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Start the sync scheduler that triggers after each configured time slot
	 * This ensures files are updated shortly after the bot publishes posts
	 */
	private startSyncScheduler(): void {
		// Check every minute if we just passed a time slot
		let lastSyncedSlot: string | null = null;
		
		this.syncIntervalId = window.setInterval(() => {
			const now = new Date();
			const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
			
			// Check each time slot
			for (const slot of this.settings.timeSlots) {
				const [slotHour, slotMinute] = slot.split(':').map(Number);
				const slotDate = new Date(now);
				slotDate.setHours(slotHour, slotMinute, 0, 0);
				
				// Calculate minutes since the slot
				const minutesSinceSlot = (now.getTime() - slotDate.getTime()) / 60000;
				
				// Sync 1-2 minutes after each slot (bot publishes at :00, we sync at :01-:02)
				if (minutesSinceSlot >= 1 && minutesSinceSlot < 2) {
					const slotKey = `${now.toISOString().split('T')[0]}_${slot}`;
					
					// Only sync once per slot
					if (lastSyncedSlot !== slotKey) {
						lastSyncedSlot = slotKey;
						console.log(`[Obsidigram] Time slot ${slot} just passed, syncing published posts...`);
						this.syncPublishedPosts();
					}
				}
			}
		}, 60000); // Check every minute
		
		console.log(`[Obsidigram] Sync scheduler started for time slots: ${this.settings.timeSlots.join(', ')}`);
	}

	/**
	 * Open read-only schedule viewer
	 */
	openScheduleViewer(): void {
		// Check if modal is already open
		if (this.currentModal) {
			console.log('[Obsidigram] Modal already open, skipping');
			return;
		}

		// Create and track the modal in read-only mode (no file, no category)
		const modal = new SchedulingModal(this, null, '', true);
		this.currentModal = modal;
		
		// Clear tracking when modal closes
		modal.onCloseCallback = () => {
			this.currentModal = null;
		};
		
		modal.open();
	}

	/**
	 * Open scheduling modal for a file
	 * @param intendedPlatforms - Platforms detected from tags (e.g., tg_unpublished, fb_unpublished)
	 */
	openSchedulingModal(file: TFile, category: string, intendedPlatforms?: Platform[]): void {
		// Check if modal is already open
		if (this.currentModal) {
			console.log('[Obsidigram] Scheduling modal already open, skipping');
			return;
		}

		// Create and track the modal with intended platforms
		const modal = new SchedulingModal(this, file, category, false, intendedPlatforms);
		this.currentModal = modal;
		
		// Clear tracking when modal closes
		modal.onCloseCallback = () => {
			this.currentModal = null;
		};
		
		modal.open();
	}

	/**
	 * Update file tags after scheduling
	 * - Updates frontmatter: removes cms_unpublished/tg_unpublished, adds cms_scheduled
	 * - Adds per-platform scheduled tags (tg_scheduled, fb_scheduled, etc.)
	 * - Removes inline tags from body: #cms_ready, #tg_ready, #cms_unpublished, #tg_unpublished
	 */
	async updateFileTags(file: TFile, scheduledTime: string, platforms?: Platform[]): Promise<void> {
		try {
			// First, update frontmatter
			await this.app.fileManager.processFrontMatter(file, (frontmatter: FrontMatter) => {
				// Ensure tags array exists
				if (!Array.isArray(frontmatter.tags)) {
					frontmatter.tags = [];
				}

				// Remove workflow tags (both legacy and new)
				frontmatter.tags = frontmatter.tags.filter((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					const normalized = tagStr.replace(/^#/, '');
					return normalized !== 'tg_unpublished' && normalized !== 'cms_unpublished' &&
					       normalized !== 'fb_unpublished' && normalized !== 'thr_unpublished' &&
					       normalized !== 'tg_ready' && normalized !== 'cms_ready';
				});

				// Add cms_scheduled if not already present
				const hasScheduled = frontmatter.tags.some((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					const normalized = tagStr.replace(/^#/, '');
					return normalized === 'cms_scheduled';
				});

				if (!hasScheduled) {
					frontmatter.tags.push('cms_scheduled');
				}

				// Add per-platform scheduled tags
				if (platforms) {
					for (const platform of platforms) {
						const prefix = PLATFORM_TAG_PREFIXES[platform];
						const platformTag = `${prefix}_scheduled`;
						const hasPlatformTag = frontmatter.tags.some((tag) => {
							const tagStr = typeof tag === 'string' ? tag : String(tag);
							return tagStr.replace(/^#/, '') === platformTag;
						});
						if (!hasPlatformTag) {
							frontmatter.tags.push(platformTag);
						}
					}
				}

				// Add scheduled time
				frontmatter.cms_scheduled_time = scheduledTime;
			});

			// Then, remove inline tags from the file body
			const content = await this.app.vault.read(file);
			const updatedContent = content
				// Remove ready and unpublished inline tags (both legacy and new)
				.replace(/#(tg_|cms_|fb_|thr_)ready\s*/g, '')
				.replace(/#(tg_|cms_|fb_|thr_)unpublished\s*/g, '')
				// Clean up any resulting double newlines
				.replace(/\n{3,}/g, '\n\n')
				// Clean up leading whitespace after frontmatter
				.replace(/^(---\n[\s\S]*?\n---\n)\s+/, '$1');
			
			// Only write if content changed
			if (content !== updatedContent) {
				await this.app.vault.modify(file, updatedContent);
				console.log(`[Obsidigram] Removed inline tags from ${file.path}`);
			}

			console.log(`[Obsidigram] Updated tags for ${file.path}`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[Obsidigram] Failed to update file tags for ${file.path}:`, errorMessage);
			new Notice(`Failed to update file tags: ${errorMessage}`);
		}
	}

	/**
	 * Mark file as published (for immediate publish)
	 * - Updates frontmatter based on which platforms succeeded
	 * - Adds per-platform published tags (tg_published, fb_published, etc.)
	 * - Only adds cms_published if ALL platforms succeeded
	 * - Removes inline tags from body
	 */
	async markFileAsPublished(file: TFile, platformResults?: PlatformResult[]): Promise<void> {
		try {
			// Determine which platforms succeeded
			const successfulPlatforms = platformResults 
				? platformResults.filter(r => r.success).map(r => r.platform)
				: ['telegram'] as Platform[]; // Default to telegram for backwards compatibility
			
			const allSucceeded = !platformResults || platformResults.every(r => r.success);

			// Update frontmatter
			await this.app.fileManager.processFrontMatter(file, (frontmatter: FrontMatter) => {
				// Ensure tags array exists
				if (!Array.isArray(frontmatter.tags)) {
					frontmatter.tags = [];
				}

				// Remove workflow tags (both legacy and new)
				frontmatter.tags = frontmatter.tags.filter((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					const normalized = tagStr.replace(/^#/, '');
					return normalized !== 'tg_unpublished' && normalized !== 'cms_unpublished' &&
					       normalized !== 'fb_unpublished' && normalized !== 'thr_unpublished' &&
					       normalized !== 'tg_ready' && normalized !== 'cms_ready' &&
					       normalized !== 'tg_scheduled' && normalized !== 'cms_scheduled' &&
					       normalized !== 'fb_scheduled' && normalized !== 'thr_scheduled';
				});

				// Also remove per-platform scheduled tags for successful platforms
				frontmatter.tags = frontmatter.tags.filter((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					const normalized = tagStr.replace(/^#/, '');
					// Keep tags that aren't scheduled tags for successful platforms
					for (const platform of successfulPlatforms) {
						const prefix = PLATFORM_TAG_PREFIXES[platform];
						if (normalized === `${prefix}_scheduled`) {
							return false;
						}
					}
					return true;
				});

				// Add per-platform published tags for successful platforms
				for (const platform of successfulPlatforms) {
					const prefix = PLATFORM_TAG_PREFIXES[platform];
					const platformTag = `${prefix}_published`;
					const hasPlatformTag = frontmatter.tags.some((tag) => {
						const tagStr = typeof tag === 'string' ? tag : String(tag);
						return tagStr.replace(/^#/, '') === platformTag;
					});
					if (!hasPlatformTag) {
						frontmatter.tags.push(platformTag);
					}
				}

				// Add cms_published only if all platforms succeeded
				if (allSucceeded) {
					const hasPublished = frontmatter.tags.some((tag) => {
						const tagStr = typeof tag === 'string' ? tag : String(tag);
						return tagStr.replace(/^#/, '') === 'cms_published';
					});
					if (!hasPublished) {
						frontmatter.tags.push('cms_published');
					}
				}

				// Add published time
				frontmatter.cms_published_time = new Date().toISOString();
				
				// Remove scheduled time if present
				delete frontmatter.cms_scheduled_time;
				delete frontmatter.tg_scheduled_time;
			});

			// Remove inline tags from the file body
			const content = await this.app.vault.read(file);
			const updatedContent = content
				.replace(/#(tg_|cms_|fb_|thr_)ready\s*/g, '')
				.replace(/#(tg_|cms_|fb_|thr_)unpublished\s*/g, '')
				.replace(/\n{3,}/g, '\n\n')
				.replace(/^(---\n[\s\S]*?\n---\n)\s+/, '$1');
			
			if (content !== updatedContent) {
				await this.app.vault.modify(file, updatedContent);
				console.log(`[Obsidigram] Removed inline tags from ${file.path}`);
			}

			console.log(`[Obsidigram] Marked ${file.path} as published (platforms: ${successfulPlatforms.join(', ')})`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[Obsidigram] Failed to mark file as published ${file.path}:`, errorMessage);
			new Notice(`Failed to update file tags: ${errorMessage}`);
		}
	}

	/**
	 * Sync published posts from bot to local files
	 * Updates tags based on platform results from the bot
	 */
	async syncPublishedPosts(): Promise<void> {
		console.log('[Obsidigram] Syncing published posts...');
		
		const apiClient = new ApiClient(this.settings.botApiUrl, this.settings.apiKey || '');
		const response = await apiClient.getPublishedPosts();

		if (!response) {
			return; // Error already shown by ApiClient
		}

		if (response.posts.length === 0) {
			console.log('[Obsidigram] No published posts to sync');
			return;
		}

		let updatedCount = 0;
		let notFoundCount = 0;
		let errorCount = 0;

		for (const post of response.posts) {
			// Find file by file_id (path)
			let file = this.app.vault.getAbstractFileByPath(post.file_id);
			
			// If not found by full path, try to find by filename (for legacy data)
			if (!(file instanceof TFile)) {
				const filename = post.file_id.split('/').pop() || post.file_id;
				const allFiles = this.app.vault.getMarkdownFiles();
				const matchingFile = allFiles.find(f => f.name === filename);
				if (matchingFile) {
					file = matchingFile;
					console.log(`[Obsidigram] Found file by filename: ${filename} -> ${matchingFile.path}`);
				}
			}
			
			if (!(file instanceof TFile)) {
				notFoundCount++;
				console.log(`[Obsidigram] File not found: ${post.file_id}`);
				continue;
			}

			try {
				await this.app.fileManager.processFrontMatter(file, (frontmatter: FrontMatter) => {
					// Ensure tags array exists
					if (!Array.isArray(frontmatter.tags)) {
						frontmatter.tags = [];
					}

					// Remove scheduled tags (both legacy and new)
					frontmatter.tags = frontmatter.tags.filter((tag) => {
						const tagStr = typeof tag === 'string' ? tag : String(tag);
						const normalized = tagStr.replace(/^#/, '');
						return normalized !== 'tg_scheduled' && normalized !== 'cms_scheduled' &&
						       normalized !== 'fb_scheduled' && normalized !== 'thr_scheduled';
					});

					// Add tg_published for backwards compatibility (Telegram is always the primary)
					const hasTgPublished = frontmatter.tags.some((tag) => {
						const tagStr = typeof tag === 'string' ? tag : String(tag);
						return tagStr.replace(/^#/, '') === 'tg_published';
					});
					if (!hasTgPublished) {
						frontmatter.tags.push('tg_published');
					}

					// Add cms_published
					const hasCmsPublished = frontmatter.tags.some((tag) => {
						const tagStr = typeof tag === 'string' ? tag : String(tag);
						return tagStr.replace(/^#/, '') === 'cms_published';
					});
					if (!hasCmsPublished) {
						frontmatter.tags.push('cms_published');
					}

					// Update published time
					frontmatter.cms_published_time = post.published_at;
					frontmatter.tg_published_time = post.published_at; // Keep for backwards compat
					
					// Remove scheduled time if present
					delete frontmatter.cms_scheduled_time;
					delete frontmatter.tg_scheduled_time;
				});

				// Remove inline tags from the file body (scheduled, ready, unpublished)
				const content = await this.app.vault.read(file);
				const updatedContent = content
					// Remove all workflow tags (scheduled, ready, unpublished) from body
					.replace(/#(tg_|cms_|fb_|thr_)scheduled\s*/g, '')
					.replace(/#(tg_|cms_|fb_|thr_)ready\s*/g, '')
					.replace(/#(tg_|cms_|fb_|thr_)unpublished\s*/g, '')
					// Clean up any resulting double newlines
					.replace(/\n{3,}/g, '\n\n')
					// Clean up leading whitespace after frontmatter
					.replace(/^(---\n[\s\S]*?\n---\n)\s+/, '$1');
				
				// Only write if content changed
				if (content !== updatedContent) {
					await this.app.vault.modify(file, updatedContent);
					console.log(`[Obsidigram] Removed inline tags from ${file.path}`);
				}

				updatedCount++;
				console.log(`[Obsidigram] Updated ${file.path} to published`);
			} catch (error) {
				errorCount++;
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.error(`[Obsidigram] Failed to update file ${file.path}:`, errorMessage);
			}
		}

		// Show summary notice
		if (updatedCount > 0) {
			const summary = `Synced ${updatedCount} published post(s)${notFoundCount > 0 ? `, ${notFoundCount} not found` : ''}${errorCount > 0 ? `, ${errorCount} errors` : ''}`;
			new Notice(summary);
			console.log(`[Obsidigram] Sync complete: ${summary}`);
		} else if (notFoundCount > 0 || errorCount > 0) {
			new Notice(`Sync complete: ${notFoundCount} not found, ${errorCount} errors`);
		}
	}
}

