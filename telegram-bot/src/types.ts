export interface ScheduledPost {
	id: string;
	file_id: string;
	content: string;
	scheduled_time: string; // ISO 8601
	category: string;
	tags: string[];
	status: 'scheduled' | 'published' | 'failed';
	published_at?: string;
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
}

export interface PublishedPost {
	file_id: string;
	published_at: string;
}

