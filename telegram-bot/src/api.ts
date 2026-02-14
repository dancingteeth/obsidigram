import express, { Request, Response, NextFunction } from 'express';
import { Storage } from './storage';
import type { Scheduler } from './scheduler';
import type { UserStorage } from './users';
import type { 
	ScheduleRequest, 
	ScheduleResponse, 
	BusySlot,
	Platform 
} from './types';

export interface AuthUser {
	chatId: string;
	telegramUserId: number;
	apiKey: string;
}

export interface AuthRequest extends Request {
	user?: AuthUser;
}

function authMiddleware(userStorage: UserStorage) {
	return (req: AuthRequest, res: Response, next: NextFunction) => {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			res.status(401).json({ error: 'Missing or invalid Authorization header' });
			return;
		}
		const apiKey = authHeader.slice(7).trim();
		const user = userStorage.getUserByApiKey(apiKey);
		if (!user || !user.verified) {
			res.status(401).json({ error: 'Invalid API key or channel not verified' });
			return;
		}
		req.user = {
			chatId: user.chatId,
			telegramUserId: user.telegramUserId,
			apiKey: user.apiKey,
		};
		next();
	};
}

export function createApiRouter(storage: Storage, userStorage: UserStorage, scheduler?: Scheduler) {
	const router = express.Router();
	router.use(authMiddleware(userStorage));

	// GET /api/platforms - Get configured platforms
	router.get('/platforms', async (req: AuthRequest, res: Response) => {
		try {
			if (!scheduler) {
				res.json({ 
					platforms: ['telegram'],
					verified: [{ platform: 'telegram', valid: true }]
				});
				return;
			}

			const platforms = scheduler.getConfiguredPlatforms();
			const verified = await scheduler.verifyPlatforms();

			res.json({ platforms, verified });
		} catch (error) {
			console.error('[API] Error getting platforms:', error);
			res.status(500).json({ 
				error: 'Internal server error',
				message: error instanceof Error ? error.message : String(error)
			});
		}
	});

	// GET /api/schedule - Get busy slots (scoped to authenticated user's channel)
	router.get('/schedule', (req: AuthRequest, res: Response) => {
		try {
			const chatId = req.user!.chatId;
			const scheduledPosts = storage.getScheduledPostsByChatId(chatId);
			
			// Get timezone offset from client (minutes, negative for UTC+)
			const tzOffsetParam = req.query.tzOffset as string | undefined;
			const tzOffset = tzOffsetParam ? parseInt(tzOffsetParam) : 0;
			
			console.log(`[API] Client timezone offset: ${tzOffset} minutes (UTC${tzOffset <= 0 ? '+' : '-'}${Math.abs(tzOffset / 60)})`);
			
			// Build map of busy slots with post info
			// Key: "YYYY-MM-DD_HH:mm", Value: post info
			interface SlotInfo {
				category: string;
				fileId: string;
				contentPreview: string;
			}
			const busySlotsMap = new Map<string, SlotInfo>();
			
			scheduledPosts.forEach(post => {
				const scheduledDateUTC = new Date(post.scheduled_time);
				// Convert to client's local time by subtracting the offset
				const scheduledDateLocal = new Date(scheduledDateUTC.getTime() - tzOffset * 60 * 1000);
				
				// Extract date components from the adjusted time (using UTC methods since we already applied offset)
				const year = scheduledDateLocal.getUTCFullYear();
				const month = String(scheduledDateLocal.getUTCMonth() + 1).padStart(2, '0');
				const day = String(scheduledDateLocal.getUTCDate()).padStart(2, '0');
				const date = `${year}-${month}-${day}`; // YYYY-MM-DD in client's local time
				const hours = scheduledDateLocal.getUTCHours().toString().padStart(2, '0');
				const minutes = scheduledDateLocal.getUTCMinutes().toString().padStart(2, '0');
				const time = `${hours}:${minutes}`; // HH:mm in client's local time
				const slotKey = `${date}_${time}`;
				
				// Strip HTML tags and get first ~100 chars for preview
				const plainText = post.content
					.replace(/<[^>]*>/g, '') // Remove HTML tags
					.replace(/\n+/g, ' ')    // Replace newlines with spaces
					.trim();
				const contentPreview = plainText.length > 100 
					? plainText.substring(0, 100) + '...' 
					: plainText;
				
				busySlotsMap.set(slotKey, {
					category: post.category,
					fileId: post.file_id,
					contentPreview,
				});
				console.log(`[API] Busy slot: ${slotKey} (category: ${post.category})`);
			});

			// Generate slots for next 7 days in client's local time
			const slots: BusySlot[] = [];
			
			// Use time slots from query param or default
			const timeSlotsParam = req.query.timeSlots as string | undefined;
			const timeSlots = timeSlotsParam 
				? timeSlotsParam.split(',').map(s => s.trim())
				: ['09:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
			
			// Get today in client's local time
			const nowUTC = new Date();
			const nowLocal = new Date(nowUTC.getTime() - tzOffset * 60 * 1000);
			// Extract date in client's local time (using UTC methods since we already applied offset)
			const todayYear = nowLocal.getUTCFullYear();
			const todayMonth = String(nowLocal.getUTCMonth() + 1).padStart(2, '0');
			const todayDay = String(nowLocal.getUTCDate()).padStart(2, '0');
			const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
			
			console.log(`[API] Client today: ${todayStr} (tzOffset: ${tzOffset}, server UTC: ${nowUTC.toISOString()})`);

			// Track which slots we've added (to avoid duplicates)
			const addedSlots = new Set<string>();
			
			for (let i = 0; i < 7; i++) {
				const date = new Date(todayStr + 'T12:00:00Z'); // Use noon to avoid DST issues
				date.setUTCDate(date.getUTCDate() + i);
				const dateYear = date.getUTCFullYear();
				const dateMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
				const dateDay = String(date.getUTCDate()).padStart(2, '0');
				const dateStr = `${dateYear}-${dateMonth}-${dateDay}`;

				timeSlots.forEach(time => {
					const slotKey = `${dateStr}_${time}`;
					const slotInfo = busySlotsMap.get(slotKey);
					const isBusy = !!slotInfo;
					
					slots.push({
						date: dateStr,
						time,
						isBusy,
						// Include post info if busy
						...(slotInfo && {
							category: slotInfo.category,
							fileId: slotInfo.fileId,
							contentPreview: slotInfo.contentPreview,
						}),
					});
					addedSlots.add(slotKey);
				});
			}
			
			// Also include any custom (non-standard) time slots that have scheduled posts
			// This allows the client to display today's custom-scheduled posts
			console.log(`[API] Checking for custom slots. addedSlots count: ${addedSlots.size}, busySlotsMap count: ${busySlotsMap.size}`);
			busySlotsMap.forEach((slotInfo, slotKey) => {
				const alreadyAdded = addedSlots.has(slotKey);
				console.log(`[API] Custom slot check: ${slotKey} - already added: ${alreadyAdded}`);
				if (!alreadyAdded) {
					const [date, time] = slotKey.split('_');
					console.log(`[API] Adding custom slot: ${slotKey}`);
					slots.push({
						date,
						time,
						isBusy: true,
						category: slotInfo.category,
						fileId: slotInfo.fileId,
						contentPreview: slotInfo.contentPreview,
					});
					addedSlots.add(slotKey);
				}
			});
			
			console.log(`[API] Busy slots in response: ${slots.filter(s => s.isBusy).map(s => `${s.date}_${s.time}`).join(', ') || 'none'}`);
			
			res.json({ slots });
		} catch (error) {
			console.error('[API] Error getting busy slots:', error);
			res.status(500).json({ 
				error: 'Internal server error',
				message: error instanceof Error ? error.message : String(error)
			});
		}
	});

	// POST /api/schedule - Schedule a post (chat_id from authenticated user)
	router.post('/schedule', async (req: AuthRequest, res: Response) => {
		try {
			const request: ScheduleRequest = req.body;
			const chatId = req.user!.chatId;

			// Validate request
			if (!request.file_id || !request.content || !request.scheduled_time || !request.category) {
				res.status(400).json({
					success: false,
					message: 'Missing required fields: file_id, content, scheduled_time, category',
				});
				return;
			}

			// Validate scheduled_time is in the future
			const scheduledDate = new Date(request.scheduled_time);
			if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
				res.status(400).json({
					success: false,
					message: 'scheduled_time must be a valid future date',
				});
				return;
			}

			// Idempotency: same file_id + same channel
			const existingPosts = storage.getScheduledPostsByChatId(chatId);
			const existingPost = existingPosts.find(p => p.file_id === request.file_id);
			
			if (existingPost) {
				// Update existing scheduled post
				console.log(`[API] Updating existing scheduled post for ${request.file_id}`);
				storage.updatePost(existingPost.id, {
					content: request.content,
					scheduled_time: request.scheduled_time,
					category: request.category,
					tags: request.tags || [],
					platforms: (request.platforms && request.platforms.length > 0) ? request.platforms : ['telegram'],
				});
				
				console.log('\n' + '─'.repeat(50));
				console.log(`📝 POST RESCHEDULED (was already scheduled)`);
				console.log('─'.repeat(50));
				console.log(`  🆔 ID: ${existingPost.id}`);
				console.log(`  📁 File: ${request.file_id}`);
				console.log(`  🏷️  Category: ${request.category}`);
				console.log(`  ⏰ New time: ${scheduledDate.toISOString()}`);
				console.log('─'.repeat(50) + '\n');

				res.json({
					success: true,
					message: 'Post rescheduled successfully (updated existing)',
					scheduled_id: existingPost.id,
				});
				return;
			}

			// Generate unique ID for new post
			const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Create scheduled post (chat_id from authenticated user)
			const post = {
				id,
				file_id: request.file_id,
				content: request.content,
				scheduled_time: request.scheduled_time,
				category: request.category,
				tags: request.tags || [],
				status: 'scheduled' as const,
				platforms: (request.platforms && request.platforms.length > 0) ? request.platforms : ['telegram'] as Platform[],
				chat_id: chatId,
			};

			storage.addPost(post);

			// Log the new scheduled post
			console.log('\n' + '─'.repeat(50));
			console.log(`📥 NEW POST SCHEDULED`);
			console.log('─'.repeat(50));
			console.log(`  🆔 ID: ${id}`);
			console.log(`  📁 File: ${request.file_id}`);
			console.log(`  🏷️  Category: ${request.category}`);
			console.log(`  ⏰ Scheduled for: ${scheduledDate.toISOString()}`);
			console.log(`  📝 Content preview: ${request.content.substring(0, 80).replace(/\n/g, ' ')}...`);
			console.log('─'.repeat(50) + '\n');

			const response: ScheduleResponse = {
				success: true,
				message: 'Post scheduled successfully',
				scheduled_id: id,
			};

			res.json(response);
		} catch (error) {
			console.error('[API] Error scheduling post:', error);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
				error: error instanceof Error ? error.message : String(error)
			});
		}
	});

	// GET /api/published - Get published posts (scoped to user's channel)
	router.get('/published', (req: AuthRequest, res: Response) => {
		try {
			const publishedPosts = storage.getPublishedPostsByChatId(req.user!.chatId);
			res.json({ posts: publishedPosts });
		} catch (error) {
			console.error('[API] Error getting published posts:', error);
			res.status(500).json({ 
				error: 'Internal server error',
				message: error instanceof Error ? error.message : String(error)
			});
		}
	});

	// POST /api/publish - Publish a post immediately (chat_id from authenticated user)
	router.post('/publish', async (req: AuthRequest, res: Response) => {
		try {
			if (!scheduler) {
				res.status(500).json({
					success: false,
					message: 'Scheduler not available',
				});
				return;
			}

			const request: ScheduleRequest = req.body;
			const chatId = req.user!.chatId;

			// Validate request
			if (!request.file_id || !request.content || !request.category) {
				res.status(400).json({
					success: false,
					message: 'Missing required fields: file_id, content, category',
				});
				return;
			}

			// Generate unique ID
			const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Create post object with user's chat_id
			const post = {
				id,
				file_id: request.file_id,
				content: request.content,
				scheduled_time: new Date().toISOString(),
				category: request.category,
				tags: request.tags || [],
				status: 'scheduled' as const,
				platforms: (request.platforms && request.platforms.length > 0) ? request.platforms : ['telegram'] as Platform[],
				chat_id: chatId,
			};

			// Add to storage temporarily
			storage.addPost(post);

			// Publish immediately
			const result = await scheduler.publishPostNow(post);

			// Check if any platform succeeded
			const anySuccess = result.platformResults?.some(r => r.success) ?? result.success;
			const allSuccess = result.success;

			if (anySuccess) {
				console.log('\n' + '─'.repeat(50));
				console.log(`📤 POST PUBLISHED IMMEDIATELY (via API)`);
				console.log('─'.repeat(50));
				console.log(`  🆔 ID: ${id}`);
				console.log(`  📁 File: ${request.file_id}`);
				console.log(`  🏷️  Category: ${request.category}`);
				console.log(`  💬 Message ID: ${result.messageId}`);
				console.log(`  📊 All succeeded: ${allSuccess}`);
				console.log('─'.repeat(50) + '\n');

				res.json({
					success: allSuccess,
					message: allSuccess ? 'Post published successfully' : 'Post partially published',
					message_id: result.messageId,
					platform_results: result.platformResults,
				});
			} else {
				// Remove from storage if ALL platforms failed
				storage.deletePost(id);
				res.status(500).json({
					success: false,
					message: result.error || 'Failed to publish post',
					platform_results: result.platformResults,
				});
			}
		} catch (error) {
			console.error('[API] Error publishing post:', error);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
				error: error instanceof Error ? error.message : String(error)
			});
		}
	});

	return router;
}

