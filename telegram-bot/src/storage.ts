import { promises as fs } from 'fs';
import { join } from 'path';
import type { ScheduledPost } from './types';

const DATA_DIR = process.env.DATA_DIR || './data';
const POSTS_FILE = join(DATA_DIR, 'posts.json');

export class Storage {
	private posts: Map<string, ScheduledPost> = new Map();
	private savePromise: Promise<void> | null = null;
	private pendingSave = false;

	async initialize(): Promise<void> {
		// Ensure data directory exists
		await fs.mkdir(DATA_DIR, { recursive: true });

		// Load existing posts
		try {
			const data = await fs.readFile(POSTS_FILE, 'utf-8');
			const postsArray: ScheduledPost[] = JSON.parse(data);
			postsArray.forEach(post => {
				this.posts.set(post.id, post);
			});
			console.log(`[Storage] Loaded ${this.posts.size} scheduled posts`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				console.error('[Storage] Error loading posts:', error instanceof Error ? error.message : String(error));
			}
		}
	}

	async save(): Promise<void> {
		// If a save is already in progress, mark that we need another save
		if (this.savePromise) {
			this.pendingSave = true;
			return;
		}

		this.savePromise = this.doSave();
		
		try {
			await this.savePromise;
		} finally {
			this.savePromise = null;
			
			// If there was a pending save request, do it now
			if (this.pendingSave) {
				this.pendingSave = false;
				await this.save();
			}
		}
	}

	private async doSave(): Promise<void> {
		try {
			const postsArray = Array.from(this.posts.values());
			const json = JSON.stringify(postsArray, null, 2);
			
			// Write to temp file first, then rename (atomic operation)
			const tempFile = POSTS_FILE + '.tmp';
			await fs.writeFile(tempFile, json, 'utf-8');
			await fs.rename(tempFile, POSTS_FILE);
		} catch (error) {
			console.error('[Storage] Error saving posts:', error instanceof Error ? error.message : String(error));
		}
	}

	addPost(post: ScheduledPost): void {
		this.posts.set(post.id, post);
		this.save().catch(console.error);
	}

	getPost(id: string): ScheduledPost | undefined {
		return this.posts.get(id);
	}

	getPostByFileId(fileId: string): ScheduledPost | undefined {
		return Array.from(this.posts.values()).find(p => p.file_id === fileId);
	}

	getAllPosts(): ScheduledPost[] {
		return Array.from(this.posts.values());
	}

	getScheduledPosts(): ScheduledPost[] {
		return Array.from(this.posts.values()).filter(p => p.status === 'scheduled');
	}

	getPublishedPosts(): { file_id: string; published_at: string }[] {
		return Array.from(this.posts.values())
			.filter(p => p.status === 'published' && p.published_at)
			.map(p => ({
				file_id: p.file_id,
				published_at: p.published_at!
			}));
	}

	updatePost(id: string, updates: Partial<ScheduledPost>): void {
		const post = this.posts.get(id);
		if (post) {
			Object.assign(post, updates);
			this.save().catch(console.error);
		}
	}

	deletePost(id: string): void {
		this.posts.delete(id);
		this.save().catch(console.error);
	}
}

