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

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
	}

	async getBusySlots(timeSlots?: string[]): Promise<BusySlotsResponse | null> {
		try {
			let url = `${this.baseUrl}/api/schedule`;
			const params = new URLSearchParams();
			
			if (timeSlots && timeSlots.length > 0) {
				params.set('timeSlots', timeSlots.join(','));
			}
			
			// Send timezone offset so server can convert UTC times to local for comparison
			const timezoneOffset = new Date().getTimezoneOffset(); // minutes, negative for UTC+
			params.set('tzOffset', timezoneOffset.toString());
			
			if (params.toString()) {
				url += `?${params.toString()}`;
			}
			
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('[Obsidigram] Failed to fetch busy slots:', error);
			new Notice('Bot unreachable: Could not fetch schedule');
			return null;
		}
	}

	async schedulePost(request: ScheduleRequest): Promise<ScheduleResponse | null> {
		try {
			const response = await fetch(`${this.baseUrl}/api/schedule`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(request),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('[Obsidigram] Failed to schedule post:', error);
			new Notice(`Bot unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}

	async getPublishedPosts(): Promise<PublishedResponse | null> {
		try {
			const response = await fetch(`${this.baseUrl}/api/published`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('[Obsidigram] Failed to fetch published posts:', error);
			new Notice('Bot unreachable: Could not fetch published posts');
			return null;
		}
	}

	async publishNow(request: PublishRequest): Promise<PublishResponse | null> {
		try {
			const response = await fetch(`${this.baseUrl}/api/publish`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(request),
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`HTTP ${response.status}: ${errorText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('[Obsidigram] Failed to publish post:', error);
			new Notice(`Bot unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}

	async getPlatforms(): Promise<PlatformsResponse | null> {
		try {
			const response = await fetch(`${this.baseUrl}/api/platforms`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return await response.json();
		} catch (error) {
			console.error('[Obsidigram] Failed to fetch platforms:', error);
			// Don't show notice - this is optional
			return null;
		}
	}
}

