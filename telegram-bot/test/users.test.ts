import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'path';
import { UserStorage } from '../src/users';
import { cleanTestData } from './setup';

// Same as vitest config - storage.test and users.test use different files (posts.json vs users.json)
const USERS_TEST_DIR = join(__dirname, 'test-data');

describe('UserStorage', () => {
	beforeEach(async () => {
		process.env.DATA_DIR = USERS_TEST_DIR;
		await cleanTestData();
	});

	it('generates API keys with obdg_ prefix', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		const key = storage.generateApiKey();
		expect(key).toMatch(/^obdg_[A-Za-z0-9_-]{32}$/);
	});

	it('registers user and retrieves by telegram ID', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		const user = storage.registerUser(123, 'alice', '-100111', 'My Channel');
		expect(user.telegramUserId).toBe(123);
		expect(user.chatId).toBe('-100111');
		expect(user.verified).toBe(false);
		expect(user.apiKey).toMatch(/^obdg_/);

		const found = storage.getUserByTelegramId(123);
		expect(found).toBeDefined();
		expect(found!.chatId).toBe('-100111');
	});

	it('retrieves user by API key', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		const user = storage.registerUser(456, 'bob', '-100222');
		const found = storage.getUserByApiKey(user.apiKey);
		expect(found).toBeDefined();
		expect(found!.telegramUserId).toBe(456);
	});

	it('returns undefined for unknown API key', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		expect(storage.getUserByApiKey('obdg_invalid')).toBeUndefined();
	});

	it('verifyChannel sets verified to true', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		storage.registerUser(789, 'charlie', '-100333');
		const ok = storage.verifyChannel(789, 'Verified Channel');
		expect(ok).toBe(true);
		const user = storage.getUserByTelegramId(789)!;
		expect(user.verified).toBe(true);
		expect(user.chatTitle).toBe('Verified Channel');
	});

	it('verifyChannel returns false for unknown user', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		expect(storage.verifyChannel(99999)).toBe(false);
	});

	it('regenerateApiKey returns new key', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		const user = storage.registerUser(111, 'dave', '-100444');
		const oldKey = user.apiKey;
		const newKey = storage.regenerateApiKey(111);
		expect(newKey).not.toBe(oldKey);
		expect(newKey).toMatch(/^obdg_/);
		expect(storage.getUserByApiKey(oldKey)).toBeUndefined();
		expect(storage.getUserByApiKey(newKey)?.telegramUserId).toBe(111);
	});

	it('setPendingChatId updates existing user', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		storage.registerUser(222, 'eve', '-100555');
		storage.verifyChannel(222);
		storage.setPendingChatId(222, '-100666', 'New Channel');
		const user = storage.getUserByTelegramId(222)!;
		expect(user.chatId).toBe('-100666');
		expect(user.chatTitle).toBe('New Channel');
		expect(user.verified).toBe(false);
	});

	it('setPendingChatId creates user if not exists', async () => {
		const storage = new UserStorage();
		await storage.initialize();
		storage.setPendingChatId(333, '-100777', 'Fresh Channel');
		const user = storage.getUserByTelegramId(333)!;
		expect(user.chatId).toBe('-100777');
		expect(user.chatTitle).toBe('Fresh Channel');
	});

566	it.skip('persists and loads users', async () => {
		const storage1 = new UserStorage();
		await storage1.initialize();
		storage1.registerUser(444, 'frank', '-100888');
		await storage1.save();
		storage1.verifyChannel(444);
		await storage1.save();

		const storage2 = new UserStorage();
		await storage2.initialize();
		const user = storage2.getUserByTelegramId(444);
		expect(user).toBeDefined();
		expect(user!.chatId).toBe('-100888');
		expect(user!.verified).toBe(true);
	});
});
