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
import type { ObsidigramSettings } from './src/types';
import { DEFAULT_SETTINGS } from './src/types';

export default class ObsidigramPlugin extends Plugin {
	settings: ObsidigramSettings;
	fileWatcher: FileWatcher;

	async onload(): Promise<void> {
		console.log('[Obsidigram] Loading plugin...');

		await this.loadSettings();

		// Initialize file watcher
		this.fileWatcher = new FileWatcher(this);
		this.fileWatcher.start();

		// Add settings tab
		this.addSettingTab(new ObsidigramSettingTab(this.app, this));

		// Add ribbon icon for sync
		this.addRibbonIcon('refresh-cw', 'Sync Telegram Status', async () => {
			await this.syncPublishedPosts();
		});

		// Add command for manual sync
		this.addCommand({
			id: 'sync-telegram-status',
			name: 'Sync Telegram Status',
			callback: async () => {
				await this.syncPublishedPosts();
			}
		});

		// Sync on startup
		this.app.workspace.onLayoutReady(() => {
			// Delay sync to avoid blocking startup
			setTimeout(() => {
				this.syncPublishedPosts();
			}, 2000);
		});

		console.log('[Obsidigram] Plugin loaded');
	}

	onunload(): void {
		console.log('[Obsidigram] Plugin unloaded');
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	openSchedulingModal(file: TFile, category: string): void {
		// Check if modal is already open for this file
		const existingModal = (this.app as any).workspace.getModal();
		if (existingModal instanceof SchedulingModal) {
			// Don't open duplicate modals
			return;
		}

		new SchedulingModal(this, file, category).open();
	}

	async updateFileTags(file: TFile, scheduledTime: string): Promise<void> {
		try {
			await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
				// Remove tg_unpublished
				if (Array.isArray(frontmatter.tags)) {
					frontmatter.tags = frontmatter.tags.filter((tag: string) => 
						tag !== 'tg_unpublished' && tag !== '#tg_unpublished'
					);
				}

				// Add tg_scheduled
				if (!Array.isArray(frontmatter.tags)) {
					frontmatter.tags = [];
				}
				
				if (!frontmatter.tags.includes('tg_scheduled') && !frontmatter.tags.includes('#tg_scheduled')) {
					frontmatter.tags.push('tg_scheduled');
				}

				// Add scheduled time
				frontmatter.tg_scheduled_time = scheduledTime;
			});
		} catch (error) {
			console.error('[Obsidigram] Failed to update file tags:', error);
			new Notice('Failed to update file tags');
		}
	}

	async syncPublishedPosts(): Promise<void> {
		const apiClient = new ApiClient(this.settings.botApiUrl);
		const response = await apiClient.getPublishedPosts();

		if (!response) {
			return; // Error already shown by ApiClient
		}

		let updatedCount = 0;

		for (const post of response.posts) {
			// Find file by file_id (path)
			const file = this.app.vault.getAbstractFileByPath(post.file_id);
			if (file instanceof TFile) {
				try {
					await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
						// Remove tg_scheduled
						if (Array.isArray(frontmatter.tags)) {
							frontmatter.tags = frontmatter.tags.filter((tag: string) => 
								tag !== 'tg_scheduled' && tag !== '#tg_scheduled'
							);
						}

						// Add tg_published
						if (!Array.isArray(frontmatter.tags)) {
							frontmatter.tags = [];
						}
						
						if (!frontmatter.tags.includes('tg_published') && !frontmatter.tags.includes('#tg_published')) {
							frontmatter.tags.push('tg_published');
						}

						// Update published time
						frontmatter.tg_published_time = post.published_at;
					});

					updatedCount++;
				} catch (error) {
					console.error(`[Obsidigram] Failed to update file ${file.path}:`, error);
				}
			}
		}

		if (updatedCount > 0) {
			new Notice(`Synced ${updatedCount} published post(s)`);
		}
	}
}

