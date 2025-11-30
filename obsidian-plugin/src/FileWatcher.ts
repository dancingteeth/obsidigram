import { TFile, MetadataCache, CachedMetadata } from 'obsidian';
import type ObsidigramPlugin from '../main';

export interface FileValidationResult {
	isValid: boolean;
	category?: string;
	hasScheduled?: boolean;
}

export class FileWatcher {
	private plugin: ObsidigramPlugin;
	private debounceTimer: number | null = null;
	private readonly DEBOUNCE_MS = 500;

	constructor(plugin: ObsidigramPlugin) {
		this.plugin = plugin;
	}

	start(): void {
		// Watch for file modifications
		this.plugin.registerEvent(
			this.plugin.app.vault.on('modify', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.debouncedCheck(file);
				}
			})
		);

		// Watch for metadata changes (tags in frontmatter)
		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on('changed', (file) => {
				if (file instanceof TFile && file.extension === 'md') {
					this.debouncedCheck(file);
				}
			})
		);
	}

	private debouncedCheck(file: TFile): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		this.debounceTimer = window.setTimeout(() => {
			this.checkFile(file);
		}, this.DEBOUNCE_MS);
	}

	private async checkFile(file: TFile): Promise<void> {
		const validation = this.validateFile(file);
		
		if (validation.isValid && !validation.hasScheduled) {
			// File is ready to be scheduled
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			if (cache) {
				// Open scheduling modal
				this.plugin.openSchedulingModal(file, validation.category!);
			}
		} else if (validation.hasScheduled) {
			// File is already scheduled - check if user wants to reschedule
			// This will be handled by the modal when user tries to edit
		}
	}

	validateFile(file: TFile): FileValidationResult {
		const cache = this.plugin.app.metadataCache.getFileCache(file);
		if (!cache) {
			return { isValid: false };
		}

		// Check tags in frontmatter
		const frontmatterTags = cache.frontmatter?.tags || [];
		const frontmatterTagStrings = Array.isArray(frontmatterTags) 
			? frontmatterTags.map(t => typeof t === 'string' ? t : t.tag || String(t))
			: [];

		// Check tags in body (from cache.tags)
		const bodyTags = cache.tags?.map(t => t.tag) || [];
		
		// Combine all tags
		const allTags = [...frontmatterTagStrings, ...bodyTags];

		// Check for required status tags
		const hasUnpublished = allTags.some(t => t === 'tg_unpublished' || t === '#tg_unpublished');
		const hasReady = allTags.some(t => t === 'tg_ready' || t === '#tg_ready');
		const hasScheduled = allTags.some(t => t === 'tg_scheduled' || t === '#tg_scheduled');
		const hasPublished = allTags.some(t => t === 'tg_published' || t === '#tg_published');

		// Must have both #tg_unpublished AND #tg_ready
		if (!hasUnpublished || !hasReady) {
			return { isValid: false };
		}

		// If already scheduled or published, don't trigger modal
		if (hasScheduled || hasPublished) {
			return { isValid: false, hasScheduled: true };
		}

		// Check for category tag
		const categoryTags = [
			'tg_research',
			'tg_infrastructure_energy',
			'tg_slop_misinformation',
			'tg_security_fraud',
			'tg_economy',
			'tg_developer_ecosystem'
		];

		const categoryTag = allTags.find(t => {
			const cleanTag = t.replace(/^#/, ''); // Remove leading #
			return categoryTags.includes(cleanTag);
		});

		if (!categoryTag) {
			return { isValid: false };
		}

		// Extract category name (remove #tg_ prefix)
		const category = categoryTag.replace(/^#?tg_/, '');

		return {
			isValid: true,
			category,
			hasScheduled: false
		};
	}

	getAllTags(file: TFile): string[] {
		const cache = this.plugin.app.metadataCache.getFileCache(file);
		if (!cache) return [];

		const frontmatterTags = cache.frontmatter?.tags || [];
		const frontmatterTagStrings = Array.isArray(frontmatterTags)
			? frontmatterTags.map(t => typeof t === 'string' ? t : t.tag || String(t))
			: [];

		const bodyTags = cache.tags?.map(t => t.tag) || [];
		
		return [...frontmatterTagStrings, ...bodyTags];
	}
}

