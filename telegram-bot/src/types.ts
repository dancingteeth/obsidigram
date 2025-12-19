export type Platform = 'telegram' | 'facebook' | 'threads';

export interface PlatformPublishResult {
	platform: Platform;
	success: boolean;
	postId?: string;
	messageId?: number;
	error?: string;
}

export interface ScheduledPost {
	id: string;
	file_id: string;
	content: string;
	scheduled_time: string; // ISO 8601
	category: string;
	tags: string[];
	status: 'scheduled' | 'published' | 'failed' | 'partial'; // partial = some platforms failed
	published_at?: string;
	// Target platforms for this post (defaults to ['telegram'] for backwards compatibility)
	platforms?: Platform[];
	// Results per platform
	platform_results?: PlatformPublishResult[];
	// Legacy Telegram-specific fields (kept for backwards compatibility)
	chat_id?: string; // Telegram chat ID where it was posted
	message_id?: number; // Telegram message ID
}

export interface ScheduleRequest {
	action: 'schedule';
	file_id: string;
	content: string;
	scheduled_time: string;
	category: string;
	tags: string[];
	platforms?: Platform[]; // Target platforms (defaults to ['telegram'])
}

export interface ScheduleResponse {
	success: boolean;
	message?: string;
	scheduled_id?: string;
}

export interface BusySlot {
	date: string; // YYYY-MM-DD
	time: string; // HH:mm
	isBusy: boolean;
	// Info about the scheduled post (only if busy)
	category?: string;
	fileId?: string;
	contentPreview?: string; // First ~100 chars of content
}

export interface PublishedPost {
	file_id: string;
	published_at: string;
}

