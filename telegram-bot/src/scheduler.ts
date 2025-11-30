import cron from 'node-cron';
import { Bot } from 'grammy';
import { Storage } from './storage';
import type { ScheduledPost } from './types';

export class Scheduler {
	private bot: Bot;
	private storage: Storage;
	private cronJob: cron.ScheduledTask | null = null;

	constructor(bot: Bot, storage: Storage) {
		this.bot = bot;
		this.storage = storage;
	}

	start(): void {
		// Check for posts to publish every minute
		this.cronJob = cron.schedule('* * * * *', async () => {
			await this.checkAndPublish();
		});

		console.log('[Scheduler] Started checking for scheduled posts every minute');
	}

	stop(): void {
		if (this.cronJob) {
			this.cronJob.stop();
			this.cronJob = null;
		}
	}

	private async checkAndPublish(): Promise<void> {
		const now = new Date();
		const scheduledPosts = this.storage.getScheduledPosts();

		for (const post of scheduledPosts) {
			const scheduledTime = new Date(post.scheduled_time);
			
			// Check if it's time to publish (within the current minute)
			if (scheduledTime <= now && scheduledTime.getTime() > now.getTime() - 60000) {
				await this.publishPost(post);
			}
		}
	}

	private async publishPost(post: ScheduledPost): Promise<void> {
		try {
			// Get chat ID from environment or use a default
			// In production, you might want to store this per post or in config
			const chatId = process.env.TELEGRAM_CHAT_ID || post.chat_id;
			
			if (!chatId) {
				console.error(`[Scheduler] No chat ID configured for post ${post.id}`);
				this.storage.updatePost(post.id, { status: 'failed' });
				return;
			}

			// Send message to Telegram
			const message = await this.bot.api.sendMessage(chatId, post.content, {
				parse_mode: 'HTML',
			});

			// Update post status
			this.storage.updatePost(post.id, {
				status: 'published',
				published_at: new Date().toISOString(),
				chat_id: chatId,
				message_id: message.message_id,
			});

			console.log(`[Scheduler] Published post ${post.id} (${post.file_id})`);
		} catch (error) {
			console.error(`[Scheduler] Failed to publish post ${post.id}:`, error);
			this.storage.updatePost(post.id, { status: 'failed' });
		}
	}
}

