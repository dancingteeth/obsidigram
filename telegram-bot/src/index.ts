import 'dotenv/config';
import { Bot } from 'grammy';
import express from 'express';
import cors from 'cors';
import { Storage } from './storage';
import { Scheduler } from './scheduler';
import { UserStorage } from './users';
import { createApiRouter } from './api';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
	console.error('[Obsidigram Bot] ERROR: BOT_TOKEN environment variable is required');
	process.exit(1);
}
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

async function main() {
	console.log('[Obsidigram Bot] Starting...');

	const storage = new Storage();
	await storage.initialize();

	const userStorage = new UserStorage();
	await userStorage.initialize();

	// Seed migration: if TELEGRAM_CHAT_ID is set, ensure a system user exists for it (legacy single-tenant)
	const legacyChatId = process.env.TELEGRAM_CHAT_ID;
	if (legacyChatId && userStorage.getAllUsers().length === 0) {
		const legacyUser = userStorage.registerUser(0, 'legacy', legacyChatId, 'Legacy channel');
		userStorage.verifyChannel(0, 'Legacy channel');
		console.log('[Obsidigram Bot] Seeded legacy user for TELEGRAM_CHAT_ID. API key:', legacyUser.apiKey);
	}

	const bot = new Bot(BOT_TOKEN as string);
	const scheduler = new Scheduler(bot, storage);

	const isPrivateChat = (ctx: { chat?: { type?: string } }): boolean => {
		return ctx.chat?.type === 'private';
	};

	// ----- /start: onboarding or show status + API key -----
	bot.command('start', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const from = ctx.from;
		if (!from) return;
		const telegramUserId = from.id;
		const username = from.username;
		const user = userStorage.getUserByTelegramId(telegramUserId);

		if (user && user.verified) {
			await ctx.reply(
				'👋 <b>You\'re all set!</b>\n\n' +
				`📢 Channel: ${user.chatTitle || user.chatId}\n` +
				`🔑 API key: <code>${user.apiKey}</code>\n\n` +
				'Paste this API key in Obsidian → Settings → Obsidigram.\n\n' +
				'<b>Commands:</b>\n' +
				'/schedule – Your scheduled posts\n' +
				'/status – Your stats\n' +
				'/post – Publish a post now\n' +
				'/cancel – Cancel a post\n' +
				'/clear – Clear all scheduled\n' +
				'/apikey – Show or reset API key',
				{ parse_mode: 'HTML' }
			);
			return;
		}

		await ctx.reply(
			'👋 <b>Welcome to Obsidigram</b>\n\n' +
			'To link your channel:\n\n' +
			'1️⃣ <b>Forward a message</b> from your Telegram channel to this chat\n' +
			'   — or send your channel ID (e.g. <code>-1001234567890</code>)\n\n' +
			'2️⃣ Add me as an <b>admin</b> to your channel (with permission to post)\n\n' +
			'3️⃣ Send /verify here\n\n' +
			'4️⃣ Copy your API key into Obsidian plugin settings',
			{ parse_mode: 'HTML' }
		);
	});

	// ----- Forwarded message from channel: extract chat_id -----
	bot.on('message:forward_origin', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const from = ctx.from;
		if (!from) return;
		const origin = ctx.message.forward_origin;
		// forward_origin can be channel, chat, or hidden - we need channel
		const chat = (origin as { type?: string; chat?: { id: number; title?: string } }).chat;
		if (!chat || (origin as { type?: string }).type !== 'channel') {
			await ctx.reply('Please forward a message from a <b>channel</b> (not a group or user).', { parse_mode: 'HTML' });
			return;
		}
		const chatId = String(chat.id);
		const chatTitle = (chat as { title?: string }).title;
		userStorage.setPendingChatId(from.id, chatId, chatTitle);
		await ctx.reply(
			`✅ Channel detected: <b>${chatTitle || chatId}</b>\n\n` +
			'Next: add me as an <b>admin</b> to this channel (with permission to post messages), then send /verify here.',
			{ parse_mode: 'HTML' }
		);
	});

	// ----- Plain text that looks like channel ID -----
	bot.on('message:text', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const from = ctx.from;
		if (!from) return;
		const text = ctx.message.text?.trim() ?? '';
		// Skip commands
		if (text.startsWith('/')) return;
		// Channel IDs are typically -100xxxxxxxxxx
		if (/^-100\d{10,}$/.test(text)) {
			userStorage.setPendingChatId(from.id, text);
			await ctx.reply(
				'✅ Channel ID saved.\n\n' +
				'Next: add me as an <b>admin</b> to your channel (with permission to post), then send /verify here.',
				{ parse_mode: 'HTML' }
			);
		}
	});

	// ----- /verify: check admin and issue API key -----
	bot.command('verify', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const from = ctx.from;
		if (!from) return;
		const user = userStorage.getUserByTelegramId(from.id);
		if (!user) {
			await ctx.reply('First forward a message from your channel or send your channel ID, then try /verify.');
			return;
		}
		await ctx.reply('🔍 Checking channel access...');
		try {
			const chat = await bot.api.getChat(user.chatId);
			const chatTitle = chat.title ?? user.chatId;
			const me = await bot.api.getMe();
			const member = await bot.api.getChatMember(user.chatId, me.id);
			const canPost = member.status === 'administrator' || member.status === 'creator';
			if (!canPost) {
				await ctx.reply(
					`❌ I'm not an admin in "${chatTitle}".\n\n` +
					'Add me as an administrator with permission to post messages, then send /verify again.'
				);
				return;
			}
			userStorage.verifyChannel(from.id, chatTitle);
			const u = userStorage.getUserByTelegramId(from.id)!;
			await ctx.reply(
				'✅ <b>Channel verified!</b>\n\n' +
				`Your API key:\n<code>${u.apiKey}</code>\n\n` +
				'Paste it in Obsidian → Settings → Obsidigram → API Key, then click Test Connection.',
				{ parse_mode: 'HTML' }
			);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			await ctx.reply(`❌ Could not access channel: ${msg}\n\nMake sure I'm added as admin and try /verify again.`);
		}
	});

	// ----- /apikey -----
	bot.command('apikey', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const from = ctx.from;
		if (!from) return;
		const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
		const user = userStorage.getUserByTelegramId(from.id);
		if (!user || !user.verified) {
			await ctx.reply('Please run /start and complete setup first.');
			return;
		}
		if (args[0] === 'reset') {
			const newKey = userStorage.regenerateApiKey(from.id);
			await ctx.reply(`🔑 New API key:\n<code>${newKey}</code>\n\nUpdate it in Obsidian settings.`, { parse_mode: 'HTML' });
			return;
		}
		await ctx.reply(`🔑 Your API key:\n<code>${user.apiKey}</code>`, { parse_mode: 'HTML' });
	});

	// ----- Scoped commands: require registered user -----
	const getScopedUser = (ctx: { from?: { id: number } }) => {
		if (!ctx.from) return null;
		const user = userStorage.getUserByTelegramId(ctx.from.id);
		return user && user.verified ? user : null;
	};

	bot.command('schedule', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const user = getScopedUser(ctx);
		if (!user) {
			await ctx.reply('Please run /start first and complete channel setup.');
			return;
		}
		const schedule = scheduler.getScheduleForTelegram(user.chatId);
		await ctx.reply(schedule.header, { parse_mode: 'HTML' });
		for (const post of schedule.posts) {
			await new Promise(r => setTimeout(r, 500));
			await ctx.reply(post.time, { parse_mode: 'HTML' });
			await new Promise(r => setTimeout(r, 300));
			try {
				await ctx.reply(post.content, { parse_mode: 'HTML' });
			} catch (err: unknown) {
				const plain = post.content.replace(/<[^>]+>/g, '');
				await ctx.reply(`⚠️ Plain text:\n\n${plain}`, { parse_mode: 'HTML' });
			}
		}
	});

	bot.command('status', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const user = getScopedUser(ctx);
		if (!user) {
			await ctx.reply('Please run /start first.');
			return;
		}
		const scheduled = storage.getScheduledPostsByChatId(user.chatId).length;
		const published = storage.getPublishedPostsByChatId(user.chatId).length;
		await ctx.reply(
			`📊 <b>Your channel</b>\n\n` +
			`📬 Scheduled: ${scheduled}\n` +
			`✅ Published: ${published}`,
			{ parse_mode: 'HTML' }
		);
	});

	bot.command('clear', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const user = getScopedUser(ctx);
		if (!user) {
			await ctx.reply('Please run /start first.');
			return;
		}
		const scheduledPosts = storage.getScheduledPostsByChatId(user.chatId);
		const count = scheduledPosts.length;
		if (count === 0) {
			await ctx.reply('📭 No scheduled posts to clear.');
			return;
		}
		for (const post of scheduledPosts) {
			storage.deletePost(post.id);
		}
		await ctx.reply(`🗑️ Cleared ${count} scheduled post(s).`, { parse_mode: 'HTML' });
	});

	bot.command('cancel', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const user = getScopedUser(ctx);
		if (!user) {
			await ctx.reply('Please run /start first.');
			return;
		}
		const scheduledPosts = storage.getScheduledPostsByChatId(user.chatId);
		if (scheduledPosts.length === 0) {
			await ctx.reply('📭 No scheduled posts to cancel.');
			return;
		}
		const sortedPosts = [...scheduledPosts].sort((a, b) =>
			new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
		);
		const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
		const postNumber = parseInt(args[0]);
		if (!postNumber || isNaN(postNumber) || postNumber < 1 || postNumber > sortedPosts.length) {
			let msg = '📋 <b>Select a post to cancel:</b>\n\n';
			sortedPosts.forEach((post, i) => {
				const t = new Date(post.scheduled_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
				msg += `<b>${i + 1}.</b> ${post.file_id}\n    ⏰ ${t}\n\n`;
			});
			msg += 'Use /cancel [number] to cancel.';
			await ctx.reply(msg, { parse_mode: 'HTML' });
			return;
		}
		const post = sortedPosts[postNumber - 1];
		storage.deletePost(post.id);
		await ctx.reply(`✅ Post cancelled: ${post.file_id}`, { parse_mode: 'HTML' });
	});

	bot.command('post', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const user = getScopedUser(ctx);
		if (!user) {
			await ctx.reply('Please run /start first.');
			return;
		}
		const scheduledPosts = storage.getScheduledPostsByChatId(user.chatId);
		if (scheduledPosts.length === 0) {
			await ctx.reply('📭 No scheduled posts to publish.');
			return;
		}
		const sortedPosts = [...scheduledPosts].sort((a, b) =>
			new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
		);
		const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
		const postNumber = parseInt(args[0]);
		if (!postNumber || isNaN(postNumber) || postNumber < 1 || postNumber > sortedPosts.length) {
			let msg = '📤 <b>Select a post to publish now:</b>\n\n';
			sortedPosts.forEach((post, i) => {
				const t = new Date(post.scheduled_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
				const preview = post.content.replace(/<[^>]+>/g, '').substring(0, 50).replace(/\n/g, ' ');
				msg += `<b>${i + 1}.</b> ${post.file_id}\n    ⏰ ${t}\n    📝 ${preview}...\n\n`;
			});
			msg += 'Use /post [number] to publish now.';
			await ctx.reply(msg, { parse_mode: 'HTML' });
			return;
		}
		const post = sortedPosts[postNumber - 1];
		await ctx.reply(`⏳ Publishing #${postNumber}...`);
		const result = await scheduler.publishPostNow(post);
		if (result.success) {
			await ctx.reply(`✅ Published: ${post.file_id}`, { parse_mode: 'HTML' });
		} else {
			await ctx.reply(`❌ Failed: ${result.error}`, { parse_mode: 'HTML' });
		}
	});

	bot.command('platforms', async (ctx) => {
		if (!isPrivateChat(ctx)) return;
		const user = getScopedUser(ctx);
		if (!user) {
			await ctx.reply('Please run /start first.');
			return;
		}
		await ctx.reply('🔍 Checking platforms...');
		const results = await scheduler.verifyPlatforms();
		let msg = '📡 <b>Publishing platforms</b>\n\n';
		for (const r of results) {
			const icon = r.valid ? '✅' : '❌';
			msg += `${icon} ${r.platform}${r.info ? ` – ${r.info}` : ''}${r.error ? `\n   ${r.error}` : ''}\n`;
		}
		await ctx.reply(msg, { parse_mode: 'HTML' });
	});

	bot.catch((err) => {
		console.error('[Bot] Error:', err);
	});

	bot.start({
		onStart: (info) => {
			console.log(`[Bot] Started as @${info.username}`);
		},
	});

	scheduler.start();

	const app = express();
	app.use(cors({
		origin: true,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
		preflightContinue: false,
		optionsSuccessStatus: 204
	}));
	app.use(express.json());
	app.use('/api', createApiRouter(storage, userStorage, scheduler));

	app.get('/health', (req, res) => {
		res.json({ status: 'ok', timestamp: new Date().toISOString() });
	});

	app.listen(PORT, () => {
		console.log(`[API] Server running on http://localhost:${PORT}`);
		console.log(`[API] Endpoints (require Authorization: Bearer <API key>`);
		console.log(`  GET  /api/schedule  POST /api/schedule  GET /api/published  POST /api/publish`);
	});

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
