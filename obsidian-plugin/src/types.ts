// Category configuration with letter and color
export interface CategoryConfig {
	name: string;      // e.g., "research"
	letter: string;    // e.g., "R"
	color: string;     // e.g., "#e74c3c"
}

export interface ObsidigramSettings {
	botApiUrl: string;
	timeSlots: string[]; // e.g., ["09:00", "12:00", "15:00", "18:00", "21:00", "00:00"]
	categories: CategoryConfig[]; // Category configurations
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
	{ name: "research", letter: "R", color: "#e74c3c" },              // Red
	{ name: "infrastructure_energy", letter: "I", color: "#f39c12" }, // Orange
	{ name: "slop_misinformation", letter: "S", color: "#9b59b6" },   // Purple
	{ name: "security_fraud", letter: "F", color: "#3498db" },        // Blue
	{ name: "economy", letter: "E", color: "#2ecc71" },               // Green
	{ name: "developer_ecosystem", letter: "D", color: "#1abc9c" },   // Teal
];

export const DEFAULT_SETTINGS: ObsidigramSettings = {
	botApiUrl: "http://localhost:3001",
	timeSlots: ["09:00", "12:00", "15:00", "18:00", "21:00", "00:00"],
	categories: DEFAULT_CATEGORIES,
};

export interface ScheduledSlot {
	date: string; // ISO date string (YYYY-MM-DD)
	time: string; // HH:mm format
	isBusy: boolean;
	// Info about the scheduled post (only if busy)
	category?: string;
	fileId?: string;
	contentPreview?: string; // First ~100 chars of content
}

export interface ScheduleRequest {
	action: "schedule";
	file_id: string;
	content: string;
	scheduled_time: string; // ISO 8601
	category: string;
	tags: string[];
}

export interface PublishRequest {
	action: "publish";
	file_id: string;
	content: string;
	category: string;
	tags: string[];
}

export interface ScheduleResponse {
	success: boolean;
	message?: string;
	scheduled_id?: string;
}

export interface PublishResponse {
	success: boolean;
	message?: string;
	message_id?: number;
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

