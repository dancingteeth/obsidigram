import { promises as fs } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

function getDataDir() { return process.env.DATA_DIR || './data'; }
function getUsersFile() { return join(getDataDir(), 'users.json'); }

const API_KEY_PREFIX = 'obdg_';
const API_KEY_RANDOM_BYTES = 24; // 32 chars base64url

export interface RegisteredUser {
	telegramUserId: number;
	username?: string;
	apiKey: string;
	chatId: string;
	chatTitle?: string;
	registeredAt: string;
	verified: boolean;
}

export class UserStorage {
	private users: Map<number, RegisteredUser> = new Map();
	private apiKeyToUser: Map<string, number> = new Map();
	private savePromise: Promise<void> | null = null;
	private pendingSave = false;

	async initialize(): Promise<void> {
		await fs.mkdir(getDataDir(), { recursive: true });
		try {
			const data = await fs.readFile(getUsersFile(), 'utf-8');
			const usersArray: RegisteredUser[] = JSON.parse(data);
			usersArray.forEach(u => {
				this.users.set(u.telegramUserId, u);
				this.apiKeyToUser.set(u.apiKey, u.telegramUserId);
			});
			console.log(`[UserStorage] Loaded ${this.users.size} registered users`);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				console.error('[UserStorage] Error loading users:', error instanceof Error ? error.message : String(error));
			}
		}
	}

	async save(): Promise<void> {
		if (this.savePromise) {
			this.pendingSave = true;
			return;
		}
		this.savePromise = this.doSave();
		try {
			await this.savePromise;
		} finally {
			this.savePromise = null;
			if (this.pendingSave) {
				this.pendingSave = false;
				await this.save();
			}
		}
	}

	private async doSave(): Promise<void> {
		try {
			await fs.mkdir(getDataDir(), { recursive: true });
			const usersArray = Array.from(this.users.values());
			const json = JSON.stringify(usersArray, null, 2);
			const usersFile = getUsersFile();
			const tempFile = usersFile + '.tmp';
			await fs.writeFile(tempFile, json, 'utf-8');
			await fs.rename(tempFile, usersFile);
		} catch (error) {
			console.error('[UserStorage] Error saving users:', error instanceof Error ? error.message : String(error));
		}
	}

	generateApiKey(): string {
		const raw = randomBytes(API_KEY_RANDOM_BYTES).toString('base64url').slice(0, 32);
		return API_KEY_PREFIX + raw;
	}

	getUserByTelegramId(telegramUserId: number): RegisteredUser | undefined {
		return this.users.get(telegramUserId);
	}

	getUserByApiKey(apiKey: string): RegisteredUser | undefined {
		const telegramUserId = this.apiKeyToUser.get(apiKey);
		return telegramUserId !== undefined ? this.users.get(telegramUserId) : undefined;
	}

	registerUser(telegramUserId: number, username: string | undefined, chatId: string, chatTitle?: string): RegisteredUser {
		const existing = this.users.get(telegramUserId);
		const now = new Date().toISOString();
		const user: RegisteredUser = {
			telegramUserId,
			username,
			apiKey: existing?.apiKey ?? this.generateApiKey(),
			chatId,
			chatTitle,
			registeredAt: existing?.registeredAt ?? now,
			verified: false,
		};
		if (existing) {
			this.apiKeyToUser.delete(existing.apiKey);
		}
		this.users.set(telegramUserId, user);
		this.apiKeyToUser.set(user.apiKey, telegramUserId);
		this.save().catch(console.error);
		return user;
	}

	verifyChannel(telegramUserId: number, chatTitle?: string): boolean {
		const user = this.users.get(telegramUserId);
		if (!user) return false;
		user.verified = true;
		if (chatTitle !== undefined) user.chatTitle = chatTitle;
		this.save().catch(console.error);
		return true;
	}

	regenerateApiKey(telegramUserId: number): string {
		const user = this.users.get(telegramUserId);
		if (!user) throw new Error('User not found');
		this.apiKeyToUser.delete(user.apiKey);
		user.apiKey = this.generateApiKey();
		this.apiKeyToUser.set(user.apiKey, telegramUserId);
		this.save().catch(console.error);
		return user.apiKey;
	}

	setPendingChatId(telegramUserId: number, chatId: string, chatTitle?: string): void {
		const user = this.users.get(telegramUserId);
		if (user) {
			user.chatId = chatId;
			user.chatTitle = chatTitle;
			user.verified = false;
			console.log(`[UserStorage] Updated pending chat for ${telegramUserId}: ${chatId}`);
		} else {
			const u = this.registerUser(telegramUserId, undefined, chatId, chatTitle);
			console.log(`[UserStorage] Registered user ${telegramUserId}, chatId=${chatId}, apiKey=${u.apiKey}`);
		}
		this.save().catch(console.error);
	}

	getAllUsers(): RegisteredUser[] {
		return Array.from(this.users.values());
	}
}
