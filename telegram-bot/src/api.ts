import express, { Request, Response } from 'express';
import { Storage } from './storage';
import type { 
	ScheduleRequest, 
	ScheduleResponse, 
	BusySlot,
	PublishedPost 
} from './types';

export function createApiRouter(storage: Storage) {
	const router = express.Router();

	// GET /api/schedule - Get busy slots
	// Accepts optional query param ?timeSlots=09:00,12:00,15:00 to customize slots
	router.get('/schedule', (req: Request, res: Response) => {
		try {
			const scheduledPosts = storage.getScheduledPosts();
			const busySlots = new Set<string>();

			// Build set of busy slots from all scheduled posts
			scheduledPosts.forEach(post => {
				const scheduledDate = new Date(post.scheduled_time);
				const date = scheduledDate.toISOString().split('T')[0]; // YYYY-MM-DD
				const time = scheduledDate.toTimeString().slice(0, 5); // HH:mm
				busySlots.add(`${date}_${time}`);
			});

			// Generate slots for next 7 days
			const slots: BusySlot[] = [];
			
			// Use time slots from query param or default
			const timeSlotsParam = req.query.timeSlots as string | undefined;
			const timeSlots = timeSlotsParam 
				? timeSlotsParam.split(',').map(s => s.trim())
				: ['09:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
			
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			for (let i = 0; i < 7; i++) {
				const date = new Date(today);
				date.setDate(today.getDate() + i);
				const dateStr = date.toISOString().split('T')[0];

				timeSlots.forEach(time => {
					const slotKey = `${dateStr}_${time}`;
					slots.push({
						date: dateStr,
						time,
						isBusy: busySlots.has(slotKey),
					});
				});
			}

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

	return router;
}

