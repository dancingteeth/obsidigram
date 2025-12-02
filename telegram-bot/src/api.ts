import express, { Request, Response } from 'express';
import { Storage } from './storage.js';
import type { Scheduler } from './scheduler.js';
import type { 
	ScheduleRequest, 
	ScheduleResponse, 
	BusySlot,
	PublishedPost 
} from './types.js';

export function createApiRouter(storage: Storage, scheduler?: Scheduler) {
	const router = express.Router();

	// GET /api/schedule - Get busy slots
	// Accepts optional query params:
	// - timeSlots: comma-separated list of times (e.g., "09:00,12:00,15:00")
	// - tzOffset: client timezone offset in minutes (e.g., -240 for UTC+4)
	router.get('/schedule', (req: Request, res: Response) => {
		try {
			const scheduledPosts = storage.getScheduledPosts();
			
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
				
				const date = scheduledDateLocal.toISOString().split('T')[0]; // YYYY-MM-DD
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
			const todayStr = nowLocal.toISOString().split('T')[0];

			for (let i = 0; i < 7; i++) {
				const date = new Date(todayStr);
				date.setUTCDate(date.getUTCDate() + i);
				const dateStr = date.toISOString().split('T')[0];

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
				});
			}
			
			console.log(`[API] Busy slots in response: ${slots.filter(s => s.isBusy).map(s => `${s.date}_${s.time}`).join(', ') || 'none'}`);
			
			res.json({ slots });
		} catch (error) {
			console.error('[API] Error getting busy slots:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	});

	// POST /api/schedule - Schedule a post
	router.post('/schedule', async (req: Request, res: Response) => {
		try {
			const request: ScheduleRequest = req.body;

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

			// Generate unique ID
			const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

			// Create scheduled post
			const post = {
				id,
				file_id: request.file_id,
				content: request.content,
				scheduled_time: request.scheduled_time,
				category: request.category,
				tags: request.tags || [],
				status: 'scheduled' as const,
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
			});
		}
	});

	// GET /api/published - Get published posts
	router.get('/published', (req: Request, res: Response) => {
		try {
			const publishedPosts = storage.getPublishedPosts();
			res.json({ posts: publishedPosts });
		} catch (error) {
			console.error('[API] Error getting published posts:', error);
			res.status(500).json({ error: 'Internal server error' });
		}
	});

	// POST /api/publish - Publish a post immediately (no scheduling)
	router.post('/publish', async (req: Request, res: Response) => {
		try {
			if (!scheduler) {
				res.status(500).json({
					success: false,
					message: 'Scheduler not available',
				});
				return;
			}

			const request: ScheduleRequest = req.body;

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

			// Create post object (with current time as scheduled_time for record keeping)
			const post = {
				id,
				file_id: request.file_id,
				content: request.content,
				scheduled_time: new Date().toISOString(),
				category: request.category,
				tags: request.tags || [],
				status: 'scheduled' as const,
			};

			// Add to storage temporarily
			storage.addPost(post);

			// Publish immediately
			const result = await scheduler.publishPostNow(post);

			if (result.success) {
				console.log('\n' + '─'.repeat(50));
				console.log(`📤 POST PUBLISHED IMMEDIATELY (via API)`);
				console.log('─'.repeat(50));
				console.log(`  🆔 ID: ${id}`);
				console.log(`  📁 File: ${request.file_id}`);
				console.log(`  🏷️  Category: ${request.category}`);
				console.log(`  💬 Message ID: ${result.messageId}`);
				console.log('─'.repeat(50) + '\n');

				res.json({
					success: true,
					message: 'Post published successfully',
					message_id: result.messageId,
				});
			} else {
				// Remove from storage if publish failed
				storage.deletePost(id);
				res.status(500).json({
					success: false,
					message: result.error || 'Failed to publish post',
				});
			}
		} catch (error) {
			console.error('[API] Error publishing post:', error);
			res.status(500).json({
				success: false,
				message: 'Internal server error',
			});
		}
	});

	return router;
}

