import 'dotenv/config';
import { Bot } from 'grammy';
import express from 'express';
import cors from 'cors';
import { Storage } from './storage';
import { Scheduler } from './scheduler';
import { createApiRouter } from './api';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	console.error('[Obsidigram Bot] ERROR: BOT_TOKEN environment variable is required');
	process.exit(1);
}
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || undefined;

async function main() {
	console.log('[Obsidigram Bot] Starting...');

	// Initialize storage
	const storage = new Storage();
	await storage.initialize();

	// Initialize bot (BOT_TOKEN is guaranteed to be defined after the check above)
	const bot = new Bot(BOT_TOKEN as string);

	// Initialize scheduler early so we can use it in commands
	const scheduler = new Scheduler(bot, storage);

	// Helper to check if command is from private chat (not channel/group)
	const isPrivateChat = (ctx: any): boolean => {
		return ctx.chat?.type === 'private';
	};

	// Basic bot commands (only respond in private chats to avoid channel spam)
	bot.command('start', async (ctx) => {
		if (!isPrivateChat(ctx)) return; // Ignore commands from channels/groups
		await ctx.reply(
			'👋 Hello! I am the <b>Obsidigram</b> bot.\n\n' +
			'I receive scheduled posts from your Obsidian plugin and publish them to configured platforms.\n\n' +
			'<b>Commands:</b>\n' +
			'/schedule - View current schedule with post previews\n' +
			'/post - Publish a post immediately\n' +
			'/cancel - Cancel a specific scheduled post\n' +
			'/status - View bot stats\n' +
			'/platforms - Check configured publishing platforms\n' +
			'/clear - Delete all scheduled posts',
			{ parse_mode: 'HTML' }
		);
	});

	bot.command('platforms', async (ctx) => {
		if (!isPrivateChat(ctx)) return; // Ignore commands from channels/groups
		await ctx.reply('🔍 Checking configured platforms...');
		
		const results = await scheduler.verifyPlatforms();
		
		let message = '📡 <b>Publishing Platforms</b>\n\n';
		
		for (const result of results) {
			const icon = result.valid ? '✅' : '❌';
			const platformName = result.platform.charAt(0).toUpperCase() + result.platform.slice(1);
			message += `${icon} <b>${platformName}</b>`;
			if (result.info) {
				message += ` - ${result.info}`;
			}
			if (!result.valid && result.error) {
				message += `\n   ⚠️ ${result.error}`;
			}
			message += '\n';
		}
		
		const configuredCount = results.filter(r => r.valid).length;
		message += `\n📊 ${configuredCount}/${results.length} platforms ready`;
		
		await ctx.reply(message, { parse_mode: 'HTML' });
	});

	bot.command('schedule', async (ctx) => {
		if (!isPrivateChat(ctx)) return; // Ignore commands from channels/groups
		const schedule = scheduler.getScheduleForTelegram();
		
		// Send header first
		await ctx.reply(schedule.header, { parse_mode: 'HTML' });
		
		// Send each post as a separate message showing exactly how it will look
		for (const post of schedule.posts) {
			// Small delay to prevent rate limiting
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Send the time header
			await ctx.reply(post.time, { parse_mode: 'HTML' });
			
			// Small delay
			await new Promise(resolve => setTimeout(resolve, 300));
			
			// Try to send the actual post content with HTML formatting
			// If HTML parsing fails, send as plain text with error note
			try {
				await ctx.reply(post.content, { parse_mode: 'HTML' });
			} catch (error: any) {
				// HTML parsing failed - send as plain text
				const plainContent = post.content.replace(/<[^>]+>/g, '');
				await ctx.reply(
					`⚠️ <b>HTML parsing error</b> - showing plain text:\n\n${plainContent}\n\n` +
					`<i>Error: ${error?.message || 'Unknown error'}</i>`,
					{ parse_mode: 'HTML' }
				);
			}
		}
	});

	bot.command('status', async (ctx) => {
		if (!isPrivateChat(ctx)) return; // Ignore commands from channels/groups
		const scheduled = storage.getScheduledPosts().length;
		const published = storage.getPublishedPosts().length;
		await ctx.reply(
			`📊 <b>Bot Status</b>\n\n` +
			`📬 Scheduled posts: ${scheduled}\n` +
			`✅ Published posts: ${published}`,
			{ parse_mode: 'HTML' }
		);
	});

	// Clear all scheduled posts
	bot.command('clear', async (ctx) => {
		if (!isPrivateChat(ctx)) return; // Ignore commands from channels/groups
		const scheduledPosts = storage.getScheduledPosts();
		const count = scheduledPosts.length;
		
		if (count === 0) {
			await ctx.reply('📭 No scheduled posts to clear.');
			return;
		}

		// Delete all scheduled posts
		for (const post of scheduledPosts) {
			storage.deletePost(post.id);
		}

		await ctx.reply(
			`🗑️ <b>Cleared ${count} scheduled post(s)</b>\n\n` +
			`You can now reschedule from Obsidian.`,
			{ parse_mode: 'HTML' }
		);
	});

	// Cancel a specific post by number (from /schedule list)
	bot.command('cancel', async (ctx) => {
		if (!isPrivateChat(ctx)) return; // Ignore commands from channels/groups
		const scheduledPosts = storage.getScheduledPosts();
		
		if (scheduledPosts.length === 0) {
			await ctx.reply('📭 No scheduled posts to cancel.');
			return;
		}

		// Sort by scheduled time (same order as /schedule)
		const sortedPosts = [...scheduledPosts].sort((a, b) => 
			new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
		);

		// Get the number from command argument
		const args = ctx.message?.text?.split(' ').slice(1) || [];
		const postNumber = parseInt(args[0]);

		if (!postNumber || isNaN(postNumber) || postNumber < 1 || postNumber > sortedPosts.length) {
			// Show list of posts with numbers
			let message = '📋 <b>Select a post to cancel:</b>\n\n';
			sortedPosts.forEach((post, index) => {
				const scheduledTime = new Date(post.scheduled_time);
				const timeStr = scheduledTime.toLocaleString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				});
				message += `<b>${index + 1}.</b> ${post.file_id}\n    ⏰ ${timeStr}\n\n`;
			});
			message += `\nUse <code>/cancel [number]</code> to cancel a post.\nExample: <code>/cancel 1</code>`;
			
			await ctx.reply(message, { parse_mode: 'HTML' });
			return;
		}

		// Cancel the selected post
		const postToCancel = sortedPosts[postNumber - 1];
		storage.deletePost(postToCancel.id);

		const scheduledTime = new Date(postToCancel.scheduled_time);
		const timeStr = scheduledTime.toLocaleString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});

		await ctx.reply(
			`✅ <b>Post cancelled</b>\n\n` +
			`📁 ${postToCancel.file_id}\n` +
			`⏰ Was scheduled for: ${timeStr}\n\n` +
			`The time slot is now free for new posts.`,
			{ parse_mode: 'HTML' }
		);

		console.log(`[Bot] Post cancelled: ${postToCancel.id} (${postToCancel.file_id})`);
	});

	// Publish a post immediately
	bot.command('post', async (ctx) => {
		if (!isPrivateChat(ctx)) return; // Ignore commands from channels/groups
		const scheduledPosts = storage.getScheduledPosts();
		
		if (scheduledPosts.length === 0) {
			await ctx.reply('📭 No scheduled posts to publish.');
			return;
		}

		// Sort by scheduled time (same order as /schedule)
		const sortedPosts = [...scheduledPosts].sort((a, b) => 
			new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
		);

		// Get the number from command argument
		const args = ctx.message?.text?.split(' ').slice(1) || [];
		const postNumber = parseInt(args[0]);

		if (!postNumber || isNaN(postNumber) || postNumber < 1 || postNumber > sortedPosts.length) {
			// Show list of posts with numbers
			let message = '📤 <b>Select a post to publish now:</b>\n\n';
			sortedPosts.forEach((post, index) => {
				const scheduledTime = new Date(post.scheduled_time);
				const timeStr = scheduledTime.toLocaleString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				});
				// Clean preview
				const preview = post.content.replace(/<[^>]+>/g, '').substring(0, 50).replace(/\n/g, ' ');
				message += `<b>${index + 1}.</b> ${post.file_id}\n    ⏰ ${timeStr}\n    📝 ${preview}...\n\n`;
			});
			message += `\nUse <code>/post [number]</code> to publish immediately.\nExample: <code>/post 1</code>`;
			
			await ctx.reply(message, { parse_mode: 'HTML' });
			return;
		}

		// Publish the selected post immediately
		const postToPublish = sortedPosts[postNumber - 1];
		
		await ctx.reply(`⏳ Publishing post #${postNumber}...`);

		const result = await scheduler.publishPostNow(postToPublish);

		if (result.success) {
			const scheduledTime = new Date(postToPublish.scheduled_time);
			const timeStr = scheduledTime.toLocaleString('en-US', {
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});

			await ctx.reply(
				`✅ <b>Post published successfully!</b>\n\n` +
				`📁 ${postToPublish.file_id}\n` +
				`⏰ Was scheduled for: ${timeStr}\n` +
				`💬 Message ID: ${result.messageId}\n\n` +
				`The time slot is now free for new posts.`,
				{ parse_mode: 'HTML' }
			);
		} else {
			await ctx.reply(
				`❌ <b>Failed to publish post</b>\n\n` +
				`Error: ${result.error}`,
				{ parse_mode: 'HTML' }
			);
		}
	});

	// Error handling
	bot.catch((err) => {
		console.error('[Bot] Error:', err);
	});

	// Start bot (using long polling for now)
	// In production, you might want to use webhooks
	bot.start({
		onStart: (info) => {
			console.log(`[Bot] Started as @${info.username}`);
		},
	});

	// Start the scheduler (already initialized above for commands)
	scheduler.start();

	// Create Express app for API
	const app = express();
	
	// Enable CORS for Obsidian plugin (Electron app)
	// Allow all origins for Electron apps (they use custom protocols)
	app.use(cors({
		origin: true, // Allow all origins (safe for Electron apps)
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		preflightContinue: false,
		optionsSuccessStatus: 204
	}));
	
	app.use(express.json());
	app.use('/api', createApiRouter(storage, scheduler));

	// Health check endpoint
	app.get('/health', (req, res) => {
		res.json({ status: 'ok', timestamp: new Date().toISOString() });
	});

	// Start HTTP server
	app.listen(PORT, () => {
		console.log(`[API] Server running on http://localhost:${PORT}`);
		console.log(`[API] Endpoints:`);
		console.log(`  GET  /api/schedule - Get busy slots`);
		console.log(`  POST /api/schedule - Schedule a post`);
		console.log(`  GET  /api/published - Get published posts`);
	});

	// Graceful shutdown
	process.on('SIGINT', () => {
		console.log('\n[Obsidigram Bot] Shutting down...');
		scheduler.stop();
		bot.stop();
		process.exit(0);
	});

	process.on('SIGTERM', () => {
		console.log('\n[Obsidigram Bot] Shutting down...');
		scheduler.stop();
		bot.stop();
		process.exit(0);
	});
}

main().catch((error) => {
	console.error('[Obsidigram Bot] Fatal error:', error);
	process.exit(1);
});

