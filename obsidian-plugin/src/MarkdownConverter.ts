/**
 * Markdown to Telegram HTML Converter
 * 
 * Converts Markdown to Telegram's HTML format.
 * Telegram HTML supports: <b>, <i>, <u>, <s>, <code>, <pre>, <a href="...">
 * 
 * Important: Must escape HTML entities: &, <, >
 */

export class MarkdownConverter {
	/**
	 * Converts Markdown to Telegram HTML format
	 */
	static convertToTelegramHTML(markdown: string): string {
		let content = markdown;

		// Remove YAML frontmatter
		content = content.replace(/^---\n[\s\S]*?\n---\n/, '');

		// Remove internal workflow tags (all prefixes: tg_, cms_, fb_, thr_)
		// These are scheduling/publishing workflow tags, not content tags
		content = content.replace(/#(tg|cms|fb|thr)_\w+\s*/g, '');

		// Clean up empty lines at the start
		content = content.replace(/^\s*\n+/, '');

		// Escape HTML entities first (but preserve our tags)
		// We'll escape &, <, > that are not part of our tags
		content = this.escapeHTML(content);

		// Convert code blocks (must be done before other formatting)
		content = this.convertCodeBlocks(content);

		// Convert inline code (must be done before other formatting)
		content = this.convertInlineCode(content);

		// Convert headers
		content = this.convertHeaders(content);

		// Convert blockquotes
		content = this.convertBlockquotes(content);

		// Convert lists (ordered and unordered)
		content = this.convertLists(content);

		// Convert horizontal rules
		content = content.replace(/^---+\s*$/gm, '━━━━━━━━━━');

		// Convert bold (**text** or __text__)
		content = content.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
		// Double underscore bold - only match when surrounded by whitespace or punctuation
		content = content.replace(/(?<=^|[\s\p{P}])__([^_]+)__(?=$|[\s\p{P}])/gu, '<b>$1</b>');

		// Convert italic (*text* or _text_)
		// Be careful not to match bold markers or underscores in hashtags/words
		content = content.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<i>$1</i>');
		// Single underscore italic - only match when surrounded by whitespace or punctuation
		// This prevents matching underscores in hashtags like #tg_ready
		content = content.replace(/(?<=^|[\s\p{P}])_([^_]+)_(?=$|[\s\p{P}])/gu, '<i>$1</i>');

		// Convert strikethrough
		content = content.replace(/~~([^~]+)~~/g, '<s>$1</s>');

		// Convert links [text](url) or [text](url "title") - ignore the title
		content = content.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g, '<a href="$2">$1</a>');

		// Convert line breaks (double newline = paragraph break)
		content = content.replace(/\n\n+/g, '\n\n');

		// Clean up extra whitespace
		content = content.trim();

		return content;
	}

	/**
	 * Escapes HTML entities (&, <, >) but preserves our Telegram HTML tags
	 */
	private static escapeHTML(text: string): string {
		// First, temporarily replace our Telegram tags with placeholders
		const placeholders: { [key: string]: string } = {};
		let placeholderIndex = 0;

		// Protect existing HTML tags (Telegram format)
		text = text.replace(/<(\/?)(b|i|u|s|code|pre|a\s+href="[^"]*")[^>]*>/gi, (match) => {
			const key = `__PLACEHOLDER_${placeholderIndex}__`;
			placeholders[key] = match;
			placeholderIndex++;
			return key;
		});

		// Now escape HTML entities
		text = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Restore our Telegram tags
		Object.keys(placeholders).forEach(key => {
			text = text.replace(key, placeholders[key]);
		});

		return text;
	}

	/**
	 * Converts code blocks (```language\ncode\n```)
	 */
	private static convertCodeBlocks(text: string): string {
		return text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, lang, code) => {
			// Escape HTML in code
			const escapedCode = code
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
			return `<pre><code>${escapedCode.trim()}</code></pre>`;
		});
	}

	/**
	 * Converts inline code (`code`)
	 */
	private static convertInlineCode(text: string): string {
		// Match inline code but not code blocks
		return text.replace(/(?<!`)`([^`\n]+)`(?!`)/g, (match, code) => {
			// Escape HTML in code
			const escapedCode = code
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
			return `<code>${escapedCode}</code>`;
		});
	}

	/**
	 * Converts headers (# Header, ## Header, ### Header)
	 */
	private static convertHeaders(text: string): string {
		// H1
		text = text.replace(/^# (.+)$/gm, '<b>$1</b>');
		// H2
		text = text.replace(/^## (.+)$/gm, '<b>$1</b>');
		// H3
		text = text.replace(/^### (.+)$/gm, '<b>$1</b>');
		// H4-H6 (also bold)
		text = text.replace(/^####+ (.+)$/gm, '<b>$1</b>');
		return text;
	}

	/**
	 * Converts blockquotes (> quote)
	 */
	private static convertBlockquotes(text: string): string {
		// Convert blockquotes to italic text with quote marker
		return text.replace(/^> (.+)$/gm, '<i>💬 $1</i>');
	}

	/**
	 * Converts lists (ordered and unordered)
	 */
	private static convertLists(text: string): string {
		const lines = text.split('\n');
		const result: string[] = [];
		let inList = false;
		let listType: 'ul' | 'ol' | null = null;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const ulMatch = line.match(/^[\*\-\+]\s+(.+)$/);
			const olMatch = line.match(/^\d+\.\s+(.+)$/);

			if (ulMatch) {
				if (!inList || listType !== 'ul') {
					if (inList) result.push(''); // Close previous list
					inList = true;
					listType = 'ul';
				}
				result.push(`• ${ulMatch[1]}`);
			} else if (olMatch) {
				if (!inList || listType !== 'ol') {
					if (inList) result.push(''); // Close previous list
					inList = true;
					listType = 'ol';
				}
				// Extract number and content
				const num = olMatch[0].match(/^\d+/)?.[0] || '1';
				result.push(`${num}. ${olMatch[1]}`);
			} else {
				if (inList) {
					inList = false;
					listType = null;
					result.push(''); // Add spacing after list
				}
				result.push(line);
			}
		}

		return result.join('\n');
	}

	/**
	 * Truncates content to Telegram's message length limit (4096 characters)
	 */
	static truncateForTelegram(content: string, maxLength: number = 4096): string {
		if (content.length <= maxLength) {
			return content;
		}

		// Try to truncate at a sentence boundary
		const truncated = content.substring(0, maxLength - 20);
		const lastPeriod = truncated.lastIndexOf('.');
		const lastNewline = truncated.lastIndexOf('\n');

		const cutPoint = Math.max(lastPeriod, lastNewline);
		if (cutPoint > maxLength * 0.8) {
			return content.substring(0, cutPoint + 1) + '\n\n[Message truncated...]';
		}

		return content.substring(0, maxLength - 20) + '\n\n[Message truncated...]';
	}
}

