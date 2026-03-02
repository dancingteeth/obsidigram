import { Notice } from 'obsidian';
import type { 
	BusySlotsResponse, 
	ScheduleRequest, 
	ScheduleResponse, 
	PublishedResponse,
	PublishRequest,
	PublishResponse,
	PlatformsResponse
} from './types';

export class ApiClient {
	private baseUrl: string;
	private apiKey: string;

	constructor(baseUrl: string, apiKey: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.apiKey = apiKey || '';
	}

	private headers(): Record<string, string> {
		const h: Record<string, string> = { 'Content-Type': 'application/json' };
		if (this.apiKey) {
			h['Authorization'] = `Bearer ${this.apiKey}`;
		}
		return h;
	}

	private requireApiKey(): boolean {
		if (!this.apiKey) {
			new Notice('Obsidigram: Set your API key in Settings → Obsidigram (get it from @obsidigram_cms_bot)');
			return false;
		}
		return true;
	}

	private async handleResponse<T>(response: Response, parse: () => Promise<T>): Promise<T | null> {
		if (response.status === 401) {
			new Notice('Obsidigram: Invalid API key. Get one from @obsidigram_cms_bot and set it in Settings.');
			return null;
		}
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}
		return await parse();
	}

	async getBusySlots(timeSlots?: string[]): Promise<BusySlotsResponse | null> {
		if (!this.requireApiKey()) return null;
		try {
			let url = `${this.baseUrl}/api/schedule`;
			const params = new URLSearchParams();
			if (timeSlots && timeSlots.length > 0) {
				params.set('timeSlots', timeSlots.join(','));
			}
			const timezoneOffset = new Date().getTimezoneOffset();
			params.set('tzOffset', timezoneOffset.toString());
			if (params.toString()) {
				url += `?${params.toString()}`;
			}
			const response = await fetch(url, {
				method: 'GET',
				headers: this.headers(),
			});
			const data = await this.handleResponse(response, () => response.json());
			if (data === null) return null;
			return data as BusySlotsResponse;
		} catch (error) {
			console.error('[Obsidigram] Failed to fetch busy slots:', error);
			new Notice('Bot unreachable: Could not fetch schedule');
			return null;
		}
	}

	async schedulePost(request: ScheduleRequest): Promise<ScheduleResponse | null> {
		if (!this.requireApiKey()) return null;
		try {
			const response = await fetch(`${this.baseUrl}/api/schedule`, {
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(request),
			});
			const data = await this.handleResponse(response, () => response.json());
			if (data === null) return null;
			return data as ScheduleResponse;
		} catch (error) {
			console.error('[Obsidigram] Failed to schedule post:', error);
			new Notice(`Bot unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}

	async getPublishedPosts(): Promise<PublishedResponse | null> {
		if (!this.requireApiKey()) return null;
		try {
			const response = await fetch(`${this.baseUrl}/api/published`, {
				method: 'GET',
				headers: this.headers(),
			});
			const data = await this.handleResponse(response, () => response.json());
			if (data === null) return null;
			return data as PublishedResponse;
		} catch (error) {
			console.error('[Obsidigram] Failed to fetch published posts:', error);
			new Notice('Bot unreachable: Could not fetch published posts');
			return null;
		}
	}

	async publishNow(request: PublishRequest): Promise<PublishResponse | null> {
		if (!this.requireApiKey()) return null;
		try {
			const response = await fetch(`${this.baseUrl}/api/publish`, {
				method: 'POST',
				headers: this.headers(),
				body: JSON.stringify(request),
			});
			const data = await this.handleResponse(response, () => response.json());
			if (data === null) return null;
			return data as PublishResponse;
		} catch (error) {
			console.error('[Obsidigram] Failed to publish post:', error);
			new Notice(`Bot unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}

	async getPlatforms(): Promise<PlatformsResponse | null> {
		if (!this.requireApiKey()) return null;
		try {
			const response = await fetch(`${this.baseUrl}/api/platforms`, {
				method: 'GET',
				headers: this.headers(),
			});
			const data = await this.handleResponse(response, () => response.json());
			return data as PlatformsResponse | null;
		} catch (error) {
			console.error('[Obsidigram] Failed to fetch platforms:', error);
			return null;
		}
	}
}

