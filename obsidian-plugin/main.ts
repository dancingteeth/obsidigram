/**
 * Obsidigram - Obsidian Telegram Scheduler Plugin
 * 
 * Turns Obsidian into a headless CMS for Telegram.
 * Monitors markdown files for readiness tags, triggers scheduling UI,
 * and dispatches content to a Telegram Bot API for queuing.
 */

import { Plugin, Notice, TFile } from 'obsidian';
import { FileWatcher } from './src/FileWatcher';
import { SchedulingModal } from './src/SchedulingModal';
import { ObsidigramSettingTab } from './src/SettingsTab';
import { ApiClient } from './src/ApiClient';
import type { ObsidigramSettings, FrontMatter } from './src/types';
import { DEFAULT_SETTINGS } from './src/types';

export default class ObsidigramPlugin extends Plugin {
	settings: ObsidigramSettings;
	fileWatcher: FileWatcher;
	private currentModal: SchedulingModal | null = null;

	async onload(): Promise<void> {
		console.log('[Obsidigram] Loading plugin...');

		// Load settings
		await this.loadSettings();

		// Initialize components
		this.fileWatcher = new FileWatcher(this);

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
			}, 1000);
		});
	}

	onunload(): void {
		console.log('[Obsidigram] Unloading plugin...');
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
			id: 'open-obsidigram-settings',
			name: 'Open Obsidigram Settings',
			callback: () => {
				// @ts-ignore - accessing private API
				this.app.setting.open();
				// @ts-ignore
				this.app.setting.openTabById('obsidigram');
			}
		});
	}

	/**
	 * Open scheduling modal for a file
	 */
	openSchedulingModal(file: TFile, category: string): void {
		// Check if modal is already open
		if (this.currentModal) {
			console.log('[Obsidigram] Scheduling modal already open, skipping');
			return;
		}

		// Create and track the modal
		const modal = new SchedulingModal(this, file, category);
		this.currentModal = modal;
		
		// Clear tracking when modal closes
		modal.onCloseCallback = () => {
			this.currentModal = null;
		};
		
		modal.open();
	}

	/**
	 * Update file tags after scheduling
	 * - Updates frontmatter: removes tg_unpublished, adds tg_scheduled
	 * - Removes inline tags from body: #tg_ready, #tg_unpublished
	 */
	async updateFileTags(file: TFile, scheduledTime: string): Promise<void> {
		try {
			// First, update frontmatter
			await this.app.fileManager.processFrontMatter(file, (frontmatter: FrontMatter) => {
				// Ensure tags array exists
				if (!Array.isArray(frontmatter.tags)) {
					frontmatter.tags = [];
				}

				// Remove tg_unpublished and tg_ready from frontmatter
				frontmatter.tags = frontmatter.tags.filter((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					return tagStr !== 'tg_unpublished' && tagStr !== '#tg_unpublished' &&
					       tagStr !== 'tg_ready' && tagStr !== '#tg_ready';
				});

				// Add tg_scheduled if not already present
				const hasScheduled = frontmatter.tags.some((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					return tagStr === 'tg_scheduled' || tagStr === '#tg_scheduled';
				});

				if (!hasScheduled) {
					frontmatter.tags.push('tg_scheduled');
				}

				// Add scheduled time
				frontmatter.tg_scheduled_time = scheduledTime;
			});

			// Then, remove inline tags from the file body
			const content = await this.app.vault.read(file);
			const updatedContent = content
				// Remove #tg_ready and #tg_unpublished inline tags (with optional trailing space/newline)
				.replace(/#tg_ready\s*/g, '')
				.replace(/#tg_unpublished\s*/g, '')
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
	 * - Updates frontmatter: removes tg_unpublished/tg_ready/tg_scheduled, adds tg_published
	 * - Removes inline tags from body
	 */
	async markFileAsPublished(file: TFile): Promise<void> {
		try {
			// Update frontmatter
			await this.app.fileManager.processFrontMatter(file, (frontmatter: FrontMatter) => {
				// Ensure tags array exists
				if (!Array.isArray(frontmatter.tags)) {
					frontmatter.tags = [];
				}

				// Remove tg_unpublished, tg_ready, tg_scheduled from frontmatter
				frontmatter.tags = frontmatter.tags.filter((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					return tagStr !== 'tg_unpublished' && tagStr !== '#tg_unpublished' &&
					       tagStr !== 'tg_ready' && tagStr !== '#tg_ready' &&
					       tagStr !== 'tg_scheduled' && tagStr !== '#tg_scheduled';
				});

				// Add tg_published if not already present
				const hasPublished = frontmatter.tags.some((tag) => {
					const tagStr = typeof tag === 'string' ? tag : String(tag);
					return tagStr === 'tg_published' || tagStr === '#tg_published';
				});

				if (!hasPublished) {
					frontmatter.tags.push('tg_published');
				}

				// Add published time
				frontmatter.tg_published_time = new Date().toISOString();
				
				// Remove scheduled time if present
				delete frontmatter.tg_scheduled_time;
			});

			// Remove inline tags from the file body
			const content = await this.app.vault.read(file);
			const updatedContent = content
				.replace(/#tg_ready\s*/g, '')
				.replace(/#tg_unpublished\s*/g, '')
				.replace(/\n{3,}/g, '\n\n')
				.replace(/^(---\n[\s\S]*?\n---\n)\s+/, '$1');
			
			if (content !== updatedContent) {
				await this.app.vault.modify(file, updatedContent);
				console.log(`[Obsidigram] Removed inline tags from ${file.path}`);
			}

			console.log(`[Obsidigram] Marked ${file.path} as published`);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			console.error(`[Obsidigram] Failed to mark file as published ${file.path}:`, errorMessage);
			new Notice(`Failed to update file tags: ${errorMessage}`);
		}
	}

	/**
	 * Sync published posts from bot to local files
	 */
	async syncPublishedPosts(): Promise<void> {
		console.log('[Obsidigram] Syncing published posts...');
		
		const apiClient = new ApiClient(this.settings.botApiUrl);
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
			const file = this.app.vault.getAbstractFileByPath(post.file_id);
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

					// Remove tg_scheduled
					frontmatter.tags = frontmatter.tags.filter((tag) => {
						const tagStr = typeof tag === 'string' ? tag : String(tag);
						return tagStr !== 'tg_scheduled' && tagStr !== '#tg_scheduled';
					});

					// Add tg_published if not already present
					const hasPublished = frontmatter.tags.some((tag) => {
						const tagStr = typeof tag === 'string' ? tag : String(tag);
						return tagStr === 'tg_published' || tagStr === '#tg_published';
					});

					if (!hasPublished) {
						frontmatter.tags.push('tg_published');
					}

					// Update published time
					frontmatter.tg_published_time = post.published_at;
				});

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

