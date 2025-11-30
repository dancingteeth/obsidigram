import 'dotenv/config';
import { Bot } from 'grammy';
import express from 'express';
import { Storage } from './storage.js';
import { Scheduler } from './scheduler.js';
import { createApiRouter } from './api.js';

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

	// Basic bot commands
	bot.command('start', async (ctx) => {
		await ctx.reply('Hello! I am the Obsidigram bot. I receive scheduled posts from your Obsidian plugin.');
	});

	bot.command('status', async (ctx) => {
		const scheduled = storage.getScheduledPosts().length;
		const published = storage.getPublishedPosts().length;
		await ctx.reply(
			`📊 Bot Status:\n\n` +
			`Scheduled posts: ${scheduled}\n` +
			`Published posts: ${published}`
		);
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

	// Initialize scheduler
	const scheduler = new Scheduler(bot, storage);
	scheduler.start();

	// Create Express app for API
	const app = express();
	app.use(express.json());
	app.use('/api', createApiRouter(storage));

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

