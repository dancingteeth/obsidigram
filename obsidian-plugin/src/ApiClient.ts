import { Notice } from 'obsidian';
import type { 
	BusySlotsResponse, 
	ScheduleRequest, 
	ScheduleResponse, 
	PublishedResponse 
} from './types';

export class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
	}

	async getBusySlots(): Promise<BusySlotsResponse | null> {
		try {
			const response = await fetch(`${this.baseUrl}/api/schedule`, {
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
}

