import { promises as fs } from 'fs';
import { join } from 'path';
import type { ScheduledPost } from './types';

const DATA_DIR = process.env.DATA_DIR || './data';
const POSTS_FILE = join(DATA_DIR, 'posts.json');

export class Storage {
	private posts: Map<string, ScheduledPost> = new Map();

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
				console.error('[Storage] Error loading posts:', error);
			}
		}
	}

	async save(): Promise<void> {
		try {
			const postsArray = Array.from(this.posts.values());
			await fs.writeFile(POSTS_FILE, JSON.stringify(postsArray, null, 2), 'utf-8');
		} catch (error) {
			console.error('[Storage] Error saving posts:', error);
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

