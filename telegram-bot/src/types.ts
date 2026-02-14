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
	// Target channel for this post (required for multi-tenant)
	chat_id: string;
	message_id?: number; // Telegram message ID after publish
}

export interface ScheduleRequest {
	action: 'schedule';
	file_id: string;
	content: string;
	scheduled_time: string;
	category: string;
	tags: string[];
	platforms?: Platform[];
	chat_id?: string; // Set by API from authenticated user; client must not override
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

