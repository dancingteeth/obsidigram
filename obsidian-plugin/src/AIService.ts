/**
 * AIService - Multi-provider AI integration for AI-powered features
 * 
 * Supported Providers (BYOK - Bring Your Own Key):
 * - Gemini (Context preset) - Large context window
 * - Groq (Fast preset) - Extremely fast inference
 * - Mistral (Proofread preset) - Good for editing
 */

import { Notice } from 'obsidian';
import type ObsidigramPlugin from '../main';
import type { TranslationLanguage } from './types';
import { TRANSLATION_LANGUAGES } from './types';

// API Endpoints
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
const MISTRAL_API_BASE = 'https://api.mistral.ai/v1';

// Preset type
export type AIPreset = 'fast' | 'context' | 'mistral';

export class AIService {
	private plugin: ObsidigramPlugin;
	
	constructor(plugin: ObsidigramPlugin) {
		this.plugin = plugin;
	}
	
	/**
	 * Check if AI features are enabled and at least one provider configured
	 */
	isEnabled(): boolean {
		if (!this.plugin.settings.enableAI) return false;
		
		return !!(
			this.plugin.settings.geminiApiKey ||
			this.plugin.settings.groqApiKey ||
			this.plugin.settings.mistralApiKey
		);
	}
	
	/**
	 * Check if a specific preset is available (has API key)
	 */
	isPresetAvailable(preset: AIPreset): boolean {
		switch (preset) {
			case 'fast': return !!this.plugin.settings.groqApiKey;
			case 'context': return !!this.plugin.settings.geminiApiKey;
			case 'mistral': return !!this.plugin.settings.mistralApiKey;
			default: return false;
		}
	}
	
	/**
	 * Get available presets (those with API keys configured)
	 */
	getAvailablePresets(): AIPreset[] {
		const presets: AIPreset[] = [];
		if (this.plugin.settings.groqApiKey) presets.push('fast');
		if (this.plugin.settings.geminiApiKey) presets.push('context');
		if (this.plugin.settings.mistralApiKey) presets.push('mistral');
		return presets;
	}
	
	/**
	 * Get the best available preset (fallback logic)
	 */
	getBestAvailablePreset(): AIPreset | null {
		const defaultPreset = this.plugin.settings.defaultAIPreset;
		if (this.isPresetAvailable(defaultPreset)) return defaultPreset;
		
		// Fallback order: context > fast > mistral
		if (this.plugin.settings.geminiApiKey) return 'context';
		if (this.plugin.settings.groqApiKey) return 'fast';
		if (this.plugin.settings.mistralApiKey) return 'mistral';
		
		return null;
	}
	
	/**
	 * Make a request to the AI API using the specified preset
	 */
	async callAPI(prompt: string, maxTokens: number = 500, preset?: AIPreset): Promise<string> {
		const activePreset = preset || this.getBestAvailablePreset();
		
		if (!activePreset) {
			throw new Error('No AI provider configured. Add an API key in settings.');
		}
		
		console.log(`[Obsidigram AI] Using preset: ${activePreset}`);
		
		switch (activePreset) {
			case 'fast':
				return this.callGroqAPI(prompt, maxTokens);
			case 'mistral':
				return this.callMistralAPI(prompt, maxTokens);
			case 'context':
			default:
				return this.callGeminiAPI(prompt, maxTokens);
		}
	}
	
	/**
	 * Make a request to the Gemini API (Context preset)
	 */
	private async callGeminiAPI(prompt: string, maxTokens: number): Promise<string> {
		const apiKey = this.plugin.settings.geminiApiKey;
		if (!apiKey) throw new Error('Gemini API key not configured');
		
		const model = `models/${this.plugin.settings.geminiModel}`;
		const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;
		
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: {
					maxOutputTokens: maxTokens,
					temperature: 0.3,
				}
			})
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('[Obsidigram AI] Gemini Error:', errorText);
			throw new Error(`Gemini API error: ${response.status}`);
		}
		
		const data = await response.json();
		
		if (data.promptFeedback?.blockReason) {
			throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
		}
		
		if (!data.candidates || data.candidates.length === 0) {
			throw new Error('No candidates in Gemini response');
		}
		
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
		if (!text) throw new Error('No text in Gemini response');
		
		return text;
	}
	
	/**
	 * Make a request to the Groq API (Fast preset)
	 */
	private async callGroqAPI(prompt: string, maxTokens: number): Promise<string> {
		const apiKey = this.plugin.settings.groqApiKey;
		if (!apiKey) throw new Error('Groq API key not configured');
		
		const model = this.plugin.settings.groqModel;
		const url = `${GROQ_API_BASE}/chat/completions`;
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: model,
				messages: [{ role: 'user', content: prompt }],
				max_tokens: maxTokens,
				temperature: 0.3,
			})
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('[Obsidigram AI] Groq Error:', errorText);
			throw new Error(`Groq API error: ${response.status}`);
		}
		
		const data = await response.json();
		const text = data.choices?.[0]?.message?.content;
		if (!text) throw new Error('No text in Groq response');
		
		return text;
	}

	/**
	 * Make a request to the Mistral API (Mistral preset)
	 */
	private async callMistralAPI(prompt: string, maxTokens: number): Promise<string> {
		const apiKey = this.plugin.settings.mistralApiKey;
		if (!apiKey) throw new Error('Mistral API key not configured');
		
		const model = this.plugin.settings.mistralModel || 'mistral-medium-latest';
		const url = `${MISTRAL_API_BASE}/chat/completions`;
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: model,
				messages: [{ role: 'user', content: prompt }],
				max_tokens: maxTokens,
				temperature: 0.3,
			})
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('[Obsidigram AI] Mistral Error:', errorText);
			throw new Error(`Mistral API error: ${response.status}`);
		}
		
		const data = await response.json();
		const text = data.choices?.[0]?.message?.content;
		if (!text) throw new Error('No text in Mistral response');
		
		return text;
	}
	
	/**
	 * Translate text to a target language
	 */
	async translateText(text: string, targetLanguage: TranslationLanguage, preset?: AIPreset): Promise<string> {
		if (!this.isEnabled()) {
			throw new Error('AI features not enabled. Add an API key in settings.');
		}
		
		const activePreset = preset || this.getBestAvailablePreset();
		if (!activePreset) {
			throw new Error('No AI provider configured. Add an API key in settings.');
		}
		
		const languageName = TRANSLATION_LANGUAGES[targetLanguage];
		const estimatedTokens = Math.min(Math.max(text.length * 2, 500), 8000);
		
		const prompt = `You are a professional translator. Translate the following text to ${languageName}.

IMPORTANT RULES:
1. Preserve ALL markdown formatting (headers, bold, italic, links, code blocks, lists, etc.)
2. Preserve ALL YAML frontmatter exactly as-is (the --- section at the beginning)
3. Do NOT translate code blocks, URLs, or file paths
4. Do NOT translate tags (words starting with #)
5. Maintain the same tone and style as the original
6. If the text is already in ${languageName}, return it unchanged
7. Return ONLY the translated text, no explanations or notes

TEXT TO TRANSLATE:
---
${text}
---

TRANSLATED TEXT:`;

		try {
			return await this.callAPI(prompt, estimatedTokens, activePreset);
		} catch (error) {
			console.error('[Obsidigram AI] Translation failed:', error);
			throw new Error('Translation failed. Check console for details.');
		}
	}

	/**
	 * Proofread text for grammar and clarity
	 */
	async proofread(text: string): Promise<string> {
		const prompt = `You are a professional proofreader and editor. Your task is to proofread the provided text for grammar, punctuation, spelling, and clarity. Return ONLY the proofread text without any explanations or comments. Preserve the original formatting and style as much as possible.

TEXT:
${text}`;

		try {
			return await this.callAPI(prompt, Math.max(text.length * 2, 500), 'mistral');
		} catch (error) {
			console.error('[Obsidigram AI] Proofreading failed:', error);
			throw new Error('Proofreading failed. Check console for details.');
		}
	}
	
	/**
	 * Test API connection for a specific preset
	 */
	async testConnection(preset?: AIPreset): Promise<boolean> {
		try {
			const response = await this.callAPI('Say "Connection successful!" and nothing else.', 50, preset);
			return response.toLowerCase().includes('success');
		} catch (error) {
			console.error('[Obsidigram AI] Connection test failed:', error);
			return false;
		}
	}
}

