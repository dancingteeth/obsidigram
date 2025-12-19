/**
 * Facebook Page Publisher
 * 
 * Uses Facebook Graph API to post to a Facebook Page
 * Docs: https://developers.facebook.com/docs/pages-api
 */

export interface FacebookConfig {
	pageId: string;
	pageAccessToken: string;
}

export interface FacebookPostResult {
	success: boolean;
	postId?: string;
	error?: string;
}

export class FacebookPublisher {
	private config: FacebookConfig;
	private apiVersion = 'v21.0';

	constructor(config: FacebookConfig) {
		this.config = config;
	}

	/**
	 * Check if Facebook publishing is configured
	 */
	static isConfigured(): boolean {
		return !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN);
	}

	/**
	 * Create a FacebookPublisher from environment variables
	 */
	static fromEnv(): FacebookPublisher | null {
		if (!this.isConfigured()) {
			return null;
		}
		return new FacebookPublisher({
			pageId: process.env.FB_PAGE_ID!,
			pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN!,
		});
	}

	/**
	 * Convert Telegram HTML to Facebook-compatible text
	 * Facebook doesn't support HTML in posts, so we strip tags
	 */
	private convertToFacebookFormat(htmlContent: string): string {
		let text = htmlContent;

		// Convert HTML tags to plain text equivalents
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

		return text.trim();
	}

	/**
	 * Publish a text post to Facebook Page
	 */
	async publish(content: string): Promise<FacebookPostResult> {
		const plainText = this.convertToFacebookFormat(content);

		try {
			const url = `https://graph.facebook.com/${this.apiVersion}/${this.config.pageId}/feed`;
			
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					message: plainText,
					access_token: this.config.pageAccessToken,
				}),
			});

			const data = await response.json() as any;

			if (!response.ok) {
				console.error('[Facebook] API error:', data);
				return {
					success: false,
					error: data.error?.message || `HTTP ${response.status}`,
				};
			}

			console.log('[Facebook] Post published:', data.id);
			return {
				success: true,
				postId: data.id,
			};
		} catch (error) {
			console.error('[Facebook] Publish error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Publish a link post to Facebook Page
	 */
	async publishLink(link: string, message?: string): Promise<FacebookPostResult> {
		try {
			const url = `https://graph.facebook.com/${this.apiVersion}/${this.config.pageId}/feed`;
			
			const body: any = {
				link,
				access_token: this.config.pageAccessToken,
			};

			if (message) {
				body.message = this.convertToFacebookFormat(message);
			}

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			const data = await response.json() as any;

			if (!response.ok) {
				console.error('[Facebook] API error:', data);
				return {
					success: false,
					error: data.error?.message || `HTTP ${response.status}`,
				};
			}

			console.log('[Facebook] Link post published:', data.id);
			return {
				success: true,
				postId: data.id,
			};
		} catch (error) {
			console.error('[Facebook] Publish error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Verify the Page Access Token is valid
	 */
	async verifyToken(): Promise<{ valid: boolean; pageName?: string; error?: string }> {
		try {
			const url = `https://graph.facebook.com/${this.apiVersion}/${this.config.pageId}?fields=name,access_token&access_token=${this.config.pageAccessToken}`;
			
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
				pageName: data.name,
			};
		} catch (error) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}

