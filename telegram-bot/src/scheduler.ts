import cron from 'node-cron';
import { Bot } from 'grammy';
import { Storage } from './storage.js';
import type { ScheduledPost } from './types.js';

export class Scheduler {
	private bot: Bot;
	private storage: Storage;
	private cronJob: cron.ScheduledTask | null = null;

	constructor(bot: Bot, storage: Storage) {
		this.bot = bot;
		this.storage = storage;
	}

	start(): void {
		// Log current schedule on startup
		this.logScheduleStatus();

		// Check for posts to publish every minute
		this.cronJob = cron.schedule('* * * * *', async () => {
			await this.checkAndPublish();
		});

		console.log('[Scheduler] Started checking for scheduled posts every minute');
	}

	/**
	 * Logs the current schedule status with all pending posts
	 */
	logScheduleStatus(): void {
		const now = new Date();
		const scheduledPosts = this.storage.getScheduledPosts();
		const publishedPosts = this.storage.getPublishedPosts();

		console.log('\n' + '═'.repeat(60));
		console.log(`📅 SCHEDULE STATUS - ${now.toISOString()}`);
		console.log('═'.repeat(60));
		
		if (scheduledPosts.length === 0) {
			console.log('📭 No posts currently scheduled');
		} else {
			console.log(`📬 ${scheduledPosts.length} post(s) scheduled:\n`);
			
			// Sort by scheduled time
			const sortedPosts = [...scheduledPosts].sort((a, b) => 
				new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
			);

			sortedPosts.forEach((post, index) => {
				const scheduledTime = new Date(post.scheduled_time);
				const timeUntil = this.formatTimeUntil(scheduledTime, now);
				const contentPreview = post.content.substring(0, 100).replace(/\n/g, ' ');
				
				console.log(`  ${index + 1}. [${post.id}]`);
				console.log(`     📁 File: ${post.file_id}`);
				console.log(`     🏷️  Category: ${post.category}`);
				console.log(`     ⏰ Scheduled: ${scheduledTime.toISOString()}`);
				console.log(`     ⏳ Time until: ${timeUntil}`);
				console.log(`     📝 Preview: ${contentPreview}...`);
				console.log('');
			});
		}

		console.log(`📊 Stats: ${scheduledPosts.length} scheduled, ${publishedPosts.length} published`);
		console.log('═'.repeat(60) + '\n');
	}

	/**
	 * Formats the time until a scheduled post
	 */
	private formatTimeUntil(scheduledTime: Date, now: Date): string {
		const diff = scheduledTime.getTime() - now.getTime();
		
		if (diff < 0) {
			return 'OVERDUE - will publish on next check';
		}

		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days}d ${hours % 24}h ${minutes % 60}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes % 60}m`;
		} else {
			return `${minutes}m`;
		}
	}

	/**
	 * Returns scheduled posts for Telegram - each post as a separate message
	 * Returns an array of messages to send
	 */
	getScheduleForTelegram(): { header: string; posts: { time: string; content: string }[] } {
		const now = new Date();
		const scheduledPosts = this.storage.getScheduledPosts();
		const publishedPosts = this.storage.getPublishedPosts();

		if (scheduledPosts.length === 0) {
			return {
				header: '📭 <b>No posts currently scheduled</b>\n\n' +
					`📊 Stats: 0 scheduled, ${publishedPosts.length} published`,
				posts: []
			};
		}

		// Sort by scheduled time
		const sortedPosts = [...scheduledPosts].sort((a, b) => 
			new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
		);

		const header = `📅 <b>${scheduledPosts.length} post(s) scheduled</b>\n` +
			`📊 Stats: ${scheduledPosts.length} scheduled, ${publishedPosts.length} published`;

		const posts = sortedPosts.map(post => {
			const scheduledTime = new Date(post.scheduled_time);
			const timeUntil = this.formatTimeUntil(scheduledTime, now);
			
			// Format the time nicely
			const timeStr = scheduledTime.toLocaleString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});

			return {
				time: `⏰ <b>Scheduled for ${timeStr}</b> (in ${timeUntil})`,
				content: post.content
			};
		});

		return { header, posts };
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
		await this.publishPostNow(post);
	}

	/**
	 * Publish a post immediately (can be called from bot commands)
	 * Returns true if successful, false otherwise
	 */
	async publishPostNow(post: ScheduledPost): Promise<{ success: boolean; messageId?: number; error?: string }> {
		try {
			// Get chat ID from environment or use a default
			// In production, you might want to store this per post or in config
			const chatId = process.env.TELEGRAM_CHAT_ID || post.chat_id;
			
			if (!chatId) {
				console.error(`[Scheduler] No chat ID configured for post ${post.id}`);
				this.storage.updatePost(post.id, { status: 'failed' });
				return { success: false, error: 'No chat ID configured' };
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

			console.log('\n' + '🎉'.repeat(25));
			console.log(`✅ POST PUBLISHED SUCCESSFULLY`);
			console.log('─'.repeat(50));
			console.log(`  🆔 ID: ${post.id}`);
			console.log(`  📁 File: ${post.file_id}`);
			console.log(`  🏷️  Category: ${post.category}`);
			console.log(`  💬 Message ID: ${message.message_id}`);
			console.log(`  📺 Chat ID: ${chatId}`);
			console.log('─'.repeat(50));
			console.log('🎉'.repeat(25) + '\n');

			return { success: true, messageId: message.message_id };
		} catch (error: any) {
			console.error(`[Scheduler] Failed to publish post ${post.id}:`, error);
			this.storage.updatePost(post.id, { status: 'failed' });
			return { success: false, error: error?.message || 'Unknown error' };
		}
	}
}

