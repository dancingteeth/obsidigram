/**
 * X/Twitter Publisher
 *
 * Uses Twitter API v2 (OAuth1.0a) to post tweets.
 * Credentials: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 * (Bearer token is not needed for posting on behalf of a user)
 */

import { TwitterApi } from 'twitter-api-v2';
import type { TwitterCredentials } from '../types.js';

export type TwitterConfig = TwitterCredentials;

export interface TwitterPostResult {
	success: boolean;
	postId?: string;
	error?: string;
}

export class TwitterPublisher {
	private client: TwitterApi;

	constructor(config: TwitterConfig) {
		this.client = new TwitterApi({
			appKey: config.apiKey,
			appSecret: config.apiSecret,
			accessToken: config.accessToken,
			accessSecret: config.accessTokenSecret,
		});
	}

	static isConfigured(): boolean {
		return !!(
			process.env.X_API_KEY &&
			process.env.X_API_SECRET &&
			process.env.X_ACCESS_TOKEN &&
			process.env.X_ACCESS_TOKEN_SECRET
		);
	}

	static fromEnv(): TwitterPublisher | null {
		if (!this.isConfigured()) {
			return null;
		}
		return new TwitterPublisher({
			apiKey: process.env.X_API_KEY!,
			apiSecret: process.env.X_API_SECRET!,
			accessToken: process.env.X_ACCESS_TOKEN!,
			accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET!,
		});
	}

	/** Create a publisher from per-request user credentials (BYOK). */
	static fromCredentials(creds: TwitterCredentials): TwitterPublisher {
		return new TwitterPublisher(creds);
	}

	/** Character limits per X subscription plan */
	static readonly CHAR_LIMITS: Record<string, number> = {
		None: 280,
		Basic: 280,
		Premium: 25000,
		PremiumPlus: 25000,
	};

	static charLimitForPlan(subscriptionType: string | undefined): number {
		return TwitterPublisher.CHAR_LIMITS[subscriptionType ?? 'None'] ?? 280;
	}

	/**
	 * Strip HTML tags and decode entities; truncate to charLimit.
	 * Twitter does not support any HTML formatting.
	 * charLimit defaults to 280 (Free/Basic plan).
	 */
	static htmlToPlainText(htmlContent: string): string {
		let text = htmlContent;
		text = text.replace(/<b>(.*?)<\/b>/g, '$1');
		text = text.replace(/<i>(.*?)<\/i>/g, '$1');
		text = text.replace(/<u>(.*?)<\/u>/g, '$1');
		text = text.replace(/<s>(.*?)<\/s>/g, '$1');
		text = text.replace(/<code>(.*?)<\/code>/g, '`$1`');
		text = text.replace(/<pre>(.*?)<\/pre>/gs, '```\n$1\n```');
		text = text.replace(/<a href="(.*?)">(.*?)<\/a>/g, '$2 $1');
		text = text.replace(/<blockquote>(.*?)<\/blockquote>/gs, '> $1');
		text = text.replace(/<[^>]+>/g, '');
		text = text.replace(/&lt;/g, '<');
		text = text.replace(/&gt;/g, '>');
		text = text.replace(/&amp;/g, '&');
		text = text.replace(/&quot;/g, '"');
		return text.trim();
	}

	private convertToTwitterFormat(htmlContent: string, charLimit = 280): string {
		const text = TwitterPublisher.htmlToPlainText(htmlContent);
		if (text.length > charLimit) {
			// Safety net only — the plugin should have blocked this before scheduling.
			// We truncate here rather than let the Twitter API return a 400.
			console.warn(`[Twitter] Content (${text.length} chars) exceeds plan limit (${charLimit}). Truncating as last resort.`);
			return text.substring(0, charLimit - 3) + '…';
		}
		return text;
	}

	async publish(content: string, charLimit = 280): Promise<TwitterPostResult> {
		const text = this.convertToTwitterFormat(content, charLimit);
		try {
			const tweet = await this.client.v2.tweet(text);
			console.log('[Twitter] Tweet posted:', tweet.data.id);
			return { success: true, postId: tweet.data.id };
		} catch (error: unknown) {
			console.error('[Twitter] Post error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async verifyToken(): Promise<{
		valid: boolean;
		username?: string;
		subscriptionType?: string;
		charLimit?: number;
		error?: string;
	}> {
		try {
			// Request subscription_type to determine character limit
			const me = await this.client.v2.me({
				'user.fields': ['subscription_type'] as any,
			});
			const subscriptionType = ((me.data as any).subscription_type as string | undefined) ?? 'None';
			const charLimit = TwitterPublisher.charLimitForPlan(subscriptionType);
			console.log(`[Twitter] Account plan: ${subscriptionType}, char limit: ${charLimit}`);
			return { valid: true, username: me.data.username, subscriptionType, charLimit };
		} catch (error: unknown) {
			return {
				valid: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
}
