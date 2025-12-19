import { TFile, MetadataCache, CachedMetadata } from 'obsidian';
import type ObsidigramPlugin from '../main';
import type { Platform } from './types';

export interface FileValidationResult {
	isValid: boolean;
	category?: string;
	hasScheduled?: boolean;
	intendedPlatforms?: Platform[]; // Platforms user indicated via tags (e.g., tg_unpublished, fb_unpublished)
}

export class FileWatcher {
	private plugin: ObsidigramPlugin;
	private debounceTimer: number | null = null;
	private readonly DEBOUNCE_MS = 500;

	constructor(plugin: ObsidigramPlugin) {
		this.plugin = plugin;
	}

	start(): void {
		console.log('[Obsidigram] FileWatcher starting...');
		
		// Watch for file modifications
		this.plugin.registerEvent(
			this.plugin.app.vault.on('modify', (file) => {
				console.log(`[Obsidigram] vault.modify event: ${file.path}`);
				if (file instanceof TFile && file.extension === 'md') {
					this.debouncedCheck(file);
				}
			})
		);

		// Watch for metadata changes (tags in frontmatter)
		this.plugin.registerEvent(
			this.plugin.app.metadataCache.on('changed', (file) => {
				console.log(`[Obsidigram] metadataCache.changed event: ${file.path}`);
				if (file instanceof TFile && file.extension === 'md') {
					this.debouncedCheck(file);
				}
			})
		);
		
		console.log('[Obsidigram] FileWatcher started, listening for vault.modify and metadataCache.changed events');
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
		
		console.log(`[Obsidigram] checkFile validation result: isValid=${validation.isValid}, hasScheduled=${validation.hasScheduled}, category=${validation.category}, intendedPlatforms=${validation.intendedPlatforms?.join(',')}`);
		
		if (validation.isValid && !validation.hasScheduled) {
			// File is ready to be scheduled
			const cache = this.plugin.app.metadataCache.getFileCache(file);
			console.log(`[Obsidigram] File is valid and not scheduled, cache exists: ${!!cache}`);
			if (cache) {
				// Open scheduling modal with intended platforms
				console.log(`[Obsidigram] Opening scheduling modal for: ${file.path}, category: ${validation.category}, intendedPlatforms: ${validation.intendedPlatforms?.join(',') || 'default'}`);
				this.plugin.openSchedulingModal(file, validation.category!, validation.intendedPlatforms);
			}
		} else if (validation.hasScheduled) {
			console.log(`[Obsidigram] File already scheduled, skipping modal`);
			// File is already scheduled - check if user wants to reschedule
			// This will be handled by the modal when user tries to edit
		} else {
			console.log(`[Obsidigram] File not valid for scheduling`);
		}
	}

	validateFile(file: TFile): FileValidationResult {
		const cache = this.plugin.app.metadataCache.getFileCache(file);
		if (!cache) {
			console.log(`[Obsidigram] No cache for file: ${file.path}`);
			return { isValid: false };
		}

		// Check tags in frontmatter (YAML properties)
		const frontmatterTags = cache.frontmatter?.tags || [];
		const frontmatterTagStrings = Array.isArray(frontmatterTags) 
			? frontmatterTags.map(t => typeof t === 'string' ? t : t.tag || String(t))
			: [];

		// Check tags in body (inline #tags from cache.tags)
		const bodyTags = cache.tags?.map(t => t.tag) || [];
		
		// Combine all tags and normalize (remove # prefix for consistent comparison)
		const allTags = [...frontmatterTagStrings, ...bodyTags];
		const normalizedTags = allTags.map(t => t.replace(/^#/, ''));
		
		console.log(`[Obsidigram] File: ${file.path}`);
		console.log(`[Obsidigram] Frontmatter tags: ${JSON.stringify(frontmatterTagStrings)}`);
		console.log(`[Obsidigram] Body tags: ${JSON.stringify(bodyTags)}`);
		console.log(`[Obsidigram] Normalized tags: ${JSON.stringify(normalizedTags)}`);

		// Check for required status tags - support both legacy (tg_) and new (cms_) prefixes
		// New tags: cms_ready, cms_unpublished
		// Legacy tags: tg_ready, tg_unpublished
		// Platform-specific: tg_unpublished, fb_unpublished, thr_unpublished
		const hasCmsUnpublished = normalizedTags.includes('cms_unpublished');
		const hasTgUnpublished = normalizedTags.includes('tg_unpublished');
		const hasFbUnpublished = normalizedTags.includes('fb_unpublished');
		const hasThrUnpublished = normalizedTags.includes('thr_unpublished');
		
		const hasUnpublished = hasCmsUnpublished || hasTgUnpublished || hasFbUnpublished || hasThrUnpublished;
		const hasReady = normalizedTags.some(t => t === 'cms_ready' || t === 'tg_ready');
		
		// Detect intended platforms from platform-specific unpublished tags
		const intendedPlatforms: Platform[] = [];
		if (hasTgUnpublished) intendedPlatforms.push('telegram');
		if (hasFbUnpublished) intendedPlatforms.push('facebook');
		if (hasThrUnpublished) intendedPlatforms.push('threads');
		// If only cms_unpublished is used (no platform-specific), don't pre-select (use defaults)
		
		// Check if already scheduled or published (on any platform)
		// cms_scheduled/cms_published are general workflow tags
		// tg_scheduled, fb_scheduled, thr_scheduled are platform-specific
		const hasScheduled = normalizedTags.some(t => 
			t === 'cms_scheduled' || t === 'tg_scheduled' || t === 'fb_scheduled' || t === 'thr_scheduled'
		);
		const hasPublished = normalizedTags.some(t => 
			t === 'cms_published' || t === 'tg_published' || t === 'fb_published' || t === 'thr_published'
		);

		// Must have both unpublished AND ready
		if (!hasUnpublished || !hasReady) {
			return { isValid: false };
		}

		// If already scheduled or published, don't trigger modal
		if (hasScheduled || hasPublished) {
			return { isValid: false, hasScheduled: true };
		}

		// Check for category tag - support both tg_ and cms_ prefixes
		const categoryNames = [
			'research',
			'infrastructure_energy',
			'slop_misinformation',
			'security_fraud',
			'economy',
			'developer_ecosystem'
		];

		// Look for category with either prefix
		let category: string | undefined;
		for (const catName of categoryNames) {
			if (normalizedTags.includes(`tg_${catName}`) || normalizedTags.includes(`cms_${catName}`)) {
				category = catName;
				break;
			}
		}
		
		console.log(`[Obsidigram] hasReady: ${hasReady}, hasUnpublished: ${hasUnpublished}, hasScheduled: ${hasScheduled}, category: ${category}`);

		if (!category) {
			console.log(`[Obsidigram] No category tag found in: ${JSON.stringify(normalizedTags)}`);
			return { isValid: false };
		}

		return {
			isValid: true,
			category,
			hasScheduled: false,
			intendedPlatforms: intendedPlatforms.length > 0 ? intendedPlatforms : undefined,
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

