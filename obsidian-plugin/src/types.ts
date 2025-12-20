// Publishing platforms
export type Platform = 'telegram' | 'facebook' | 'threads';

// Platform tag prefixes
export const PLATFORM_TAG_PREFIXES: Record<Platform, string> = {
	telegram: 'tg',
	facebook: 'fb',
	threads: 'thr',
};

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
	defaultPlatforms: Platform[]; // Default platforms for new posts
	// Tag settings (for migration support)
	useLegacyTags?: boolean; // If true, use tg_ prefix for workflow tags; if false, use cms_
	mistralApiKey?: string; // Mistral API key for proofreading
	
	// ============================================
	// Advanced Features (BYOK AI)
	// ============================================
	
	/** Enable AI-powered features (requires API key) */
	enableAI: boolean;
	
	/** Gemini API key for AI features (BYOK) - Context preset */
	geminiApiKey: string;
	
	/** Gemini model to use */
	geminiModel: 'gemini-2.0-flash' | 'gemini-1.5-flash' | 'gemini-1.5-pro';
	
	/** Mistral model to use */
	mistralModel: 'mistral-large-latest' | 'mistral-medium-latest' | 'mistral-small-latest' | 'codestral-latest' | 'ministral-3b-latest' | 'ministral-8b-latest' | 'magistral-medium-latest';
	
	/** Groq API key for fast inference - Fast preset */
	groqApiKey: string;
	
	/** Groq model to use */
	groqModel: 'llama-3.3-70b-versatile' | 'llama-3.1-8b-instant';
	
	/** Default AI preset */
	defaultAIPreset: 'fast' | 'context' | 'mistral';
	
	// ============================================
	// Translation Settings
	// ============================================
	
	/** Enable translation feature */
	enableTranslation: boolean;
	
	/** Default target language for translation */
	defaultTranslationLanguage: TranslationLanguage;
}

/** Supported translation languages */
export type TranslationLanguage = 'en' | 'ru' | 'es';

/** Translation language display names */
export const TRANSLATION_LANGUAGES: Record<TranslationLanguage, string> = {
	'en': 'English',
	'ru': 'Русский (Russian)',
	'es': 'Español (Spanish)'
};

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
	defaultPlatforms: ['telegram'],
	mistralApiKey: "",
	
	// Advanced features (disabled by default)
	enableAI: false,
	
	// Gemini (Context preset)
	geminiApiKey: '',
	geminiModel: 'gemini-2.0-flash',
	
	// Mistral (Proofread preset)
	mistralModel: 'mistral-medium-latest',
	
	// Groq (Fast preset)
	groqApiKey: '',
	groqModel: 'llama-3.3-70b-versatile',
	
	// Default preset
	defaultAIPreset: 'fast',
	
	// Translation
	enableTranslation: true,
	defaultTranslationLanguage: 'en'
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
	platforms?: Platform[]; // Target platforms
}

export interface PublishRequest {
	action: "publish";
	file_id: string;
	content: string;
	category: string;
	tags: string[];
	platforms?: Platform[]; // Target platforms
}

export interface ScheduleResponse {
	success: boolean;
	message?: string;
	scheduled_id?: string;
	platforms?: Platform[]; // Platforms the post was scheduled for
}

// Per-platform result
export interface PlatformResult {
	platform: Platform;
	success: boolean;
	messageId?: number;
	postId?: string;
	error?: string;
}

export interface PublishResponse {
	success: boolean;
	message?: string;
	message_id?: number;
	platform_results?: PlatformResult[]; // Results per platform
}

// Platform verification response
export interface PlatformVerification {
	platform: Platform;
	valid: boolean;
	info?: string;
	error?: string;
}

export interface PlatformsResponse {
	platforms: Platform[];
	verified: PlatformVerification[];
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
	cms_scheduled_time?: string;
	cms_published_time?: string;
	[key: string]: unknown;
}

