/**
 * Threads Publisher
 * 
 * Uses Threads API (via Meta Graph API) to post to Threads
 * Docs: https://developers.facebook.com/docs/threads/
 * 
 * Note: Threads API requires a two-step process:
 * 1. Create a media container
 * 2. Publish the container
 */

export interface ThreadsConfig {
	userId: string;
	accessToken: string;
}

export interface ThreadsPostResult {
	success: boolean;
	postId?: string;
	error?: string;
}

export class ThreadsPublisher {
	private config: ThreadsConfig;
	private apiVersion = 'v21.0';

	constructor(config: ThreadsConfig) {
		this.config = config;
	}

	/**
	 * Check if Threads publishing is configured
	 */
	static isConfigured(): boolean {
		return !!(process.env.THREADS_USER_ID && process.env.THREADS_ACCESS_TOKEN);
	}

	/**
	 * Create a ThreadsPublisher from environment variables
	 */
	static fromEnv(): ThreadsPublisher | null {
		if (!this.isConfigured()) {
			return null;
		}
		return new ThreadsPublisher({
			userId: process.env.THREADS_USER_ID!,
			accessToken: process.env.THREADS_ACCESS_TOKEN!,
		});
	}

	/**
	 * Convert Telegram HTML to Threads-compatible text
	 * Threads supports limited formatting
	 */
	private convertToThreadsFormat(htmlContent: string): string {
		let text = htmlContent;

		// Threads doesn't support HTML, convert to plain text
		text = text.replace(/<b>(.*?)<\/b>/g, '$1');
		text = text.replace(/<i>(.*?)<\/i>/g, '$1');
		text = text.replace(/<u>(.*?)<\/u>/g, '$1');
		text = text.replace(/<s>(.*?)<\/s>/g, '$1');
		text = text.replace(/<code>(.*?)<\/code>/g, '`$1`');
		text = text.replace(/<pre>(.*?)<\/pre>/gs, '```\n$1\n```');
		text = text.replace(/<a href="(.*?)">(.*?)<\/a>/g, '$2 ($1)');
		text = text.replace(/<blockquote>(.*?)<\/blockquote>/gs, '> $1');

		// Decode HTML entities
		text = text.replace(/&lt;/g, '<');
		text = text.replace(/&gt;/g, '>');
		text = text.replace(/&amp;/g, '&');
		text = text.replace(/&quot;/g, '"');

		// Threads has a 500 character limit
		if (text.length > 500) {
			text = text.substring(0, 497) + '...';
		}

		return text.trim();
	}

	/**
	 * Step 1: Create a media container for a text post
	 */
	private async createTextContainer(text: string): Promise<{ success: boolean; containerId?: string; error?: string }> {
		try {
			const url = `https://graph.threads.net/${this.apiVersion}/${this.config.userId}/threads`;
			
			const params = new URLSearchParams({
				media_type: 'TEXT',
				text: text,
				access_token: this.config.accessToken,
			});

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: params.toString(),
			});

			const data = await response.json() as any;

			if (!response.ok) {
				console.error('[Threads] Create container error:', data);
				return {
					success: false,
					error: data.error?.message || `HTTP ${response.status}`,
				};
			}

			return {
				success: true,
				containerId: data.id,
			};
		} catch (error) {
			console.error('[Threads] Create container error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Step 2: Publish the media container
	 */
	private async publishContainer(containerId: string): Promise<ThreadsPostResult> {
		try {
			const url = `https://graph.threads.net/${this.apiVersion}/${this.config.userId}/threads_publish`;
			
			const params = new URLSearchParams({
				creation_id: containerId,
				access_token: this.config.accessToken,
			});

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: params.toString(),
			});

			const data = await response.json() as any;

			if (!response.ok) {
				console.error('[Threads] Publish error:', data);
				return {
					success: false,
					error: data.error?.message || `HTTP ${response.status}`,
				};
			}

			console.log('[Threads] Post published:', data.id);
			return {
				success: true,
				postId: data.id,
			};
		} catch (error) {
			console.error('[Threads] Publish error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Publish a text post to Threads (two-step process)
	 */
	async publish(content: string): Promise<ThreadsPostResult> {
		const text = this.convertToThreadsFormat(content);

		// Step 1: Create container
		const containerResult = await this.createTextContainer(text);
		if (!containerResult.success) {
			return {
				success: false,
				error: containerResult.error,
			};
		}

		// Small delay to ensure container is ready
		await new Promise(resolve => setTimeout(resolve, 1000));

		// Step 2: Publish container
		return this.publishContainer(containerResult.containerId!);
	}

	/**
	 * Verify the Threads Access Token is valid
	 */
	async verifyToken(): Promise<{ valid: boolean; username?: string; error?: string }> {
		try {
			const url = `https://graph.threads.net/${this.apiVersion}/${this.config.userId}?fields=username,threads_profile_picture_url&access_token=${this.config.accessToken}`;
			
			const response = await fetch(url);
			const data = await response.json() as any;

			if (!response.ok) {
				return {
					valid: false,
					error: data.error?.message || `HTTP ${response.status}`,
				};
			}

			return {
				valid: true,
				username: data.username,
			};
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}

