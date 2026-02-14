/**
 * Multi-platform publisher
 * Coordinates publishing to Telegram, Facebook, and Threads
 */

import { Bot } from 'grammy';
import { FacebookPublisher } from './facebook';
import type { FacebookPostResult } from './facebook';
import { ThreadsPublisher } from './threads';
import type { ThreadsPostResult } from './threads';

export type Platform = 'telegram' | 'facebook' | 'threads';

export interface PublishResult {
	platform: Platform;
	success: boolean;
	postId?: string;
	messageId?: number;
	error?: string;
}

export interface MultiPublishResult {
	results: PublishResult[];
	allSuccessful: boolean;
}

export class MultiPlatformPublisher {
	private telegramBot: Bot;
	private telegramChatId: string;
	private facebookPublisher: FacebookPublisher | null;
	private threadsPublisher: ThreadsPublisher | null;

	constructor(telegramBot: Bot, telegramChatId: string) {
		this.telegramBot = telegramBot;
		this.telegramChatId = telegramChatId;
		this.facebookPublisher = FacebookPublisher.fromEnv();
		this.threadsPublisher = ThreadsPublisher.fromEnv();
	}

	/**
	 * Get list of configured platforms
	 */
	getConfiguredPlatforms(): Platform[] {
		const platforms: Platform[] = ['telegram']; // Always available
		
		if (this.facebookPublisher) {
			platforms.push('facebook');
		}
		if (this.threadsPublisher) {
			platforms.push('threads');
		}
		
		return platforms;
	}

	/**
	 * Publish to Telegram (uses chatIdOverride if provided, else constructor chatId)
	 */
	private async publishToTelegram(content: string, chatIdOverride?: string): Promise<PublishResult> {
		const chatId = chatIdOverride ?? this.telegramChatId;
		if (!chatId) {
			return { platform: 'telegram', success: false, error: 'No Telegram chat ID' };
		}
		try {
			const message = await this.telegramBot.api.sendMessage(chatId, content, {
				parse_mode: 'HTML',
			});

			return {
				platform: 'telegram',
				success: true,
				messageId: message.message_id,
			};
		} catch (error) {
			console.error('[MultiPublisher] Telegram error:', error);
			return {
				platform: 'telegram',
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	/**
	 * Publish to a single platform (telegramChatId override for multi-tenant)
	 */
	async publishTo(platform: Platform, content: string, telegramChatIdOverride?: string): Promise<PublishResult> {
		switch (platform) {
			case 'telegram':
				return this.publishToTelegram(content, telegramChatIdOverride);
			
			case 'facebook':
				if (!this.facebookPublisher) {
					return {
						platform: 'facebook',
						success: false,
						error: 'Facebook not configured',
					};
				}
				const fbResult = await this.facebookPublisher.publish(content);
				return {
					platform: 'facebook',
					success: fbResult.success,
					postId: fbResult.postId,
					error: fbResult.error,
				};
			
			case 'threads':
				if (!this.threadsPublisher) {
					return {
						platform: 'threads',
						success: false,
						error: 'Threads not configured',
					};
				}
				const threadsResult = await this.threadsPublisher.publish(content);
				return {
					platform: 'threads',
					success: threadsResult.success,
					postId: threadsResult.postId,
					error: threadsResult.error,
				};
			
			default:
				return {
					platform,
					success: false,
					error: `Unknown platform: ${platform}`,
				};
		}
	}

	/**
	 * Publish to multiple platforms (telegramChatId override for per-post channel)
	 */
	async publishToMultiple(platforms: Platform[], content: string, telegramChatIdOverride?: string): Promise<MultiPublishResult> {
		const results = await Promise.all(
			platforms.map(platform => this.publishTo(platform, content, telegramChatIdOverride))
		);

		return {
			results,
			allSuccessful: results.every(r => r.success),
		};
	}

	/**
	 * Publish to all configured platforms
	 */
	async publishToAll(content: string): Promise<MultiPublishResult> {
		const platforms = this.getConfiguredPlatforms();
		return this.publishToMultiple(platforms, content);
	}

	/**
	 * Verify all configured tokens
	 */
	async verifyAllTokens(): Promise<{ platform: Platform; valid: boolean; info?: string; error?: string }[]> {
		const results: { platform: Platform; valid: boolean; info?: string; error?: string }[] = [];

		// Telegram - just check if bot can get me
		try {
			const me = await this.telegramBot.api.getMe();
			results.push({
				platform: 'telegram',
				valid: true,
				info: `@${me.username}`,
			});
		} catch (error) {
			results.push({
				platform: 'telegram',
				valid: false,
				error: error instanceof Error ? error.message : String(error),
			});
		}

		// Facebook
		if (this.facebookPublisher) {
			const fbResult = await this.facebookPublisher.verifyToken();
			results.push({
				platform: 'facebook',
				valid: fbResult.valid,
				info: fbResult.pageName,
				error: fbResult.error,
			});
		}

		// Threads
		if (this.threadsPublisher) {
			const threadsResult = await this.threadsPublisher.verifyToken();
			results.push({
				platform: 'threads',
				valid: threadsResult.valid,
				info: threadsResult.username,
				error: threadsResult.error,
			});
		}

		return results;
	}
}
