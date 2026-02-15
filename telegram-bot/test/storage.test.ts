import { describe, it, expect, beforeEach } from 'vitest';
import { Storage } from '../src/storage';
import type { ScheduledPost } from '../src/types';
import { cleanTestData } from './setup';

function makePost(overrides: Partial<ScheduledPost> & { id: string; file_id: string; chat_id: string }): ScheduledPost {
	return {
		id: overrides.id,
		file_id: overrides.file_id,
		content: '<p>Test</p>',
		scheduled_time: new Date(Date.now() + 3600000).toISOString(),
		category: 'research',
		tags: [],
		status: 'scheduled',
		chat_id: overrides.chat_id,
		...overrides,
	};
}

describe('Storage', () => {
	beforeEach(async () => {
		await cleanTestData();
	});

	it('adds and retrieves posts', async () => {
		const storage = new Storage();
		await storage.initialize();
		const post = makePost({ id: '1', file_id: 'a.md', chat_id: '-100111' });
		storage.addPost(post);
		await new Promise((r) => setTimeout(r, 50));

		expect(storage.getPost('1')).toBeDefined();
		expect(storage.getPost('1')!.file_id).toBe('a.md');
	});

	it('getScheduledPostsByChatId filters by chat_id', async () => {
		const storage = new Storage();
		await storage.initialize();
		storage.addPost(makePost({ id: '1', file_id: 'a.md', chat_id: '-100111' }));
		storage.addPost(makePost({ id: '2', file_id: 'b.md', chat_id: '-100222' }));
		storage.addPost(makePost({ id: '3', file_id: 'c.md', chat_id: '-100111' }));
		await new Promise((r) => setTimeout(r, 50));

		const user1 = storage.getScheduledPostsByChatId('-100111');
		expect(user1).toHaveLength(2);
		expect(user1.map((p) => p.file_id).sort()).toEqual(['a.md', 'c.md']);

		const user2 = storage.getScheduledPostsByChatId('-100222');
		expect(user2).toHaveLength(1);
		expect(user2[0].file_id).toBe('b.md');
	});

	it('getScheduledPostsByChatId excludes published posts', async () => {
		const storage = new Storage();
		await storage.initialize();
		const post = makePost({ id: '1', file_id: 'a.md', chat_id: '-100111' });
		storage.addPost(post);
		storage.updatePost('1', { status: 'published', published_at: new Date().toISOString() });
		await new Promise((r) => setTimeout(r, 50));

		const scheduled = storage.getScheduledPostsByChatId('-100111');
		expect(scheduled).toHaveLength(0);
	});

	it('getPublishedPostsByChatId filters by chat_id', async () => {
		const storage = new Storage();
		await storage.initialize();
		storage.addPost(makePost({ id: '1', file_id: 'a.md', chat_id: '-100111', status: 'published', published_at: '2025-01-01T12:00:00Z' }));
		storage.addPost(makePost({ id: '2', file_id: 'b.md', chat_id: '-100222', status: 'published', published_at: '2025-01-01T13:00:00Z' }));
		storage.addPost(makePost({ id: '3', file_id: 'c.md', chat_id: '-100111', status: 'published', published_at: '2025-01-01T14:00:00Z' }));
		await new Promise((r) => setTimeout(r, 50));

		const user1 = storage.getPublishedPostsByChatId('-100111');
		expect(user1).toHaveLength(2);
		expect(user1.map((p) => p.file_id).sort()).toEqual(['a.md', 'c.md']);

		const user2 = storage.getPublishedPostsByChatId('-100222');
		expect(user2).toHaveLength(1);
	});

	it('deletePost removes post', async () => {
		const storage = new Storage();
		await storage.initialize();
		storage.addPost(makePost({ id: '1', file_id: 'a.md', chat_id: '-100111' }));
		await new Promise((r) => setTimeout(r, 50));
		storage.deletePost('1');
		await new Promise((r) => setTimeout(r, 50));

		expect(storage.getPost('1')).toBeUndefined();
	});
});
