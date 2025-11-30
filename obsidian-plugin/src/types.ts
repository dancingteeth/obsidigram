export interface ObsidigramSettings {
	botApiUrl: string;
	timeSlots: string[]; // e.g., ["09:00", "12:00", "15:00", "18:00", "21:00", "00:00"]
}

export const DEFAULT_SETTINGS: ObsidigramSettings = {
	botApiUrl: "http://localhost:3001",
	timeSlots: ["09:00", "12:00", "15:00", "18:00", "21:00", "00:00"]
};

export interface ScheduledSlot {
	date: string; // ISO date string (YYYY-MM-DD)
	time: string; // HH:mm format
	isBusy: boolean;
}

export interface ScheduleRequest {
	action: "schedule";
	file_id: string;
	content: string;
	scheduled_time: string; // ISO 8601
	category: string;
	tags: string[];
}

export interface ScheduleResponse {
	success: boolean;
	message?: string;
	scheduled_id?: string;
}

export interface BusySlotsResponse {
	slots: ScheduledSlot[];
}

export interface PublishedPost {
	file_id: string;
	published_at: string;
}

export interface PublishedResponse {
	posts: PublishedPost[];
}

// Frontmatter type for processFrontMatter callback
export interface FrontMatter {
	tags?: (string | { tag: string })[];
	tg_scheduled_time?: string;
	tg_published_time?: string;
	[key: string]: unknown;
}

