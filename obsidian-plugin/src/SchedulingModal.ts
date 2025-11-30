import { Modal, Setting, Notice } from 'obsidian';
import { TFile } from 'obsidian';
import type ObsidigramPlugin from '../main';
import { ApiClient } from './ApiClient';
import { MarkdownConverter } from './MarkdownConverter';
import type { ScheduledSlot } from './types';

export class SchedulingModal extends Modal {
	private plugin: ObsidigramPlugin;
	private file: TFile;
	private category: string;
	private apiClient: ApiClient;
	private busySlots: Set<string> = new Set();
	private selectedDate: string | null = null;
	private selectedTime: string | null = null;
	private isLoading: boolean = true;
	public onCloseCallback?: () => void;
	private submitButton: HTMLButtonElement | null = null;

	constructor(plugin: ObsidigramPlugin, file: TFile, category: string) {
		super(plugin.app);
		this.plugin = plugin;
		this.file = file;
		this.category = category;
		this.apiClient = new ApiClient(plugin.settings.botApiUrl);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Schedule Telegram Post' });
		contentEl.createEl('p', { 
			text: `File: ${this.file.basename}\nCategory: ${this.category}` 
		});

		// Show loading state
		const loadingEl = contentEl.createEl('p', { text: 'Loading schedule...' });
		
		// Fetch busy slots with configured time slots
		const busySlotsResponse = await this.apiClient.getBusySlots(this.plugin.settings.timeSlots);
		this.isLoading = false;
		loadingEl.remove();

		if (busySlotsResponse) {
			// Build set of busy slots
			busySlotsResponse.slots.forEach(slot => {
				if (slot.isBusy) {
					this.busySlots.add(`${slot.date}_${slot.time}`);
				}
			});
		}

		// Render calendar grid
		this.renderCalendar(contentEl);
	}

	private renderCalendar(container: HTMLElement): void {
		const calendarContainer = container.createDiv('obsidigram-calendar');
		
		// Get next 7 days
		const days = this.getNext7Days();
		const timeSlots = this.plugin.settings.timeSlots;

		// Create header row
		const headerRow = calendarContainer.createDiv('obsidigram-calendar-header');
		headerRow.createDiv('obsidigram-time-label').setText('Time');
		days.forEach(day => {
			const dayEl = headerRow.createDiv('obsidigram-day-header');
			const date = new Date(day);
			dayEl.createEl('div', { text: date.toLocaleDateString('en-US', { weekday: 'short' }) });
			dayEl.createEl('div', { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
		});

		// Create time slot rows
		timeSlots.forEach(timeSlot => {
			const row = calendarContainer.createDiv('obsidigram-calendar-row');
			row.createDiv('obsidigram-time-label').setText(timeSlot);

			days.forEach(day => {
				const slotKey = `${day}_${timeSlot}`;
				const isBusy = this.busySlots.has(slotKey);
				const slotEl = row.createDiv(`obsidigram-slot ${isBusy ? 'obsidigram-slot-busy' : 'obsidigram-slot-available'}`);
				slotEl.setAttr('data-date', day);
				slotEl.setAttr('data-time', timeSlot);
				
				if (isBusy) {
					slotEl.setText('●');
					slotEl.setAttr('title', 'Busy');
				} else {
					slotEl.setText('○');
					slotEl.setAttr('title', 'Available');
					slotEl.addEventListener('click', () => {
						this.selectSlot(day, timeSlot);
					});
				}
			});
		});

		// Add buttons
		const buttonContainer = container.createDiv('obsidigram-button-container');
		
		// Create Publish Now button (always enabled)
		const publishNowButton = buttonContainer.createEl('button', {
			text: '⚡ Publish Now',
			cls: 'mod-warning'
		});
		publishNowButton.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('[Obsidigram] Publish Now button clicked!');
			await this.publishNow();
		});
		
		// Create Schedule button manually for better control
		this.submitButton = buttonContainer.createEl('button', {
			text: '📅 Schedule',
			cls: 'mod-cta'
		});
		this.submitButton.disabled = true;
		this.submitButton.addEventListener('click', async (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('[Obsidigram] Schedule button clicked!');
			if (this.selectedDate && this.selectedTime) {
				await this.submitSchedule();
			} else {
				console.log('[Obsidigram] No slot selected');
			}
		});
		
		// Create Cancel button
		const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	private getNext7Days(): string[] {
		const days: string[] = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		for (let i = 0; i < 7; i++) {
			const date = new Date(today);
			date.setDate(today.getDate() + i);
			days.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
		}

		return days;
	}

	private selectSlot(date: string, time: string): void {
		console.log(`[Obsidigram] selectSlot called: ${date} ${time}`);
		
		// Clear previous selection
		const prevSelected = this.contentEl.querySelectorAll('.obsidigram-slot-selected');
		prevSelected.forEach(el => el.classList.remove('obsidigram-slot-selected'));

		// Find and highlight new selection
		const slots = this.contentEl.querySelectorAll('.obsidigram-slot');
		slots.forEach(slot => {
			const slotDate = slot.getAttribute('data-date');
			const slotTime = slot.getAttribute('data-time');
			if (slotDate === date && slotTime === time) {
				slot.classList.add('obsidigram-slot-selected');
			}
		});

		this.selectedDate = date;
		this.selectedTime = time;

		// Enable submit button using stored reference
		if (this.submitButton) {
			this.submitButton.disabled = false;
			console.log(`[Obsidigram] Submit button enabled via stored reference`);
		} else {
			console.log(`[Obsidigram] WARNING: submitButton reference is null`);
		}
	}

	private async submitSchedule(): Promise<void> {
		console.log('[Obsidigram] submitSchedule called');
		
		if (!this.selectedDate || !this.selectedTime) {
			new Notice('Please select a time slot');
			return;
		}

		console.log(`[Obsidigram] Selected: ${this.selectedDate} ${this.selectedTime}`);

		// Build ISO datetime string
		const [hours, minutes] = this.selectedTime.split(':').map(Number);
		const scheduledDate = new Date(this.selectedDate);
		scheduledDate.setHours(hours, minutes, 0, 0);
		const scheduledTime = scheduledDate.toISOString();

		console.log(`[Obsidigram] Scheduled time ISO: ${scheduledTime}`);

		// Read file content
		const content = await this.plugin.app.vault.read(this.file);
		console.log(`[Obsidigram] File content length: ${content.length}`);
		
		// Convert markdown to Telegram HTML format
		let telegramContent = MarkdownConverter.convertToTelegramHTML(content);
		console.log(`[Obsidigram] Telegram content length: ${telegramContent.length}`);
		
		// Truncate if too long (Telegram limit is 4096 characters)
		telegramContent = MarkdownConverter.truncateForTelegram(telegramContent);

		// Get all tags
		const fileWatcher = this.plugin.fileWatcher;
		const allTags = fileWatcher.getAllTags(this.file);
		const contentTags = allTags.filter(t => 
			!t.startsWith('tg_') && !t.startsWith('#tg_')
		);
		console.log(`[Obsidigram] Content tags: ${JSON.stringify(contentTags)}`);

		// Send schedule request
		console.log(`[Obsidigram] Sending schedule request to API: ${this.plugin.settings.botApiUrl}`);
		try {
			const response = await this.apiClient.schedulePost({
				action: 'schedule',
				file_id: this.file.path,
				content: telegramContent,
				scheduled_time: scheduledTime,
				category: this.category,
				tags: contentTags
			});

			console.log(`[Obsidigram] API response:`, response);

			if (response && response.success) {
				// Update file tags
				await this.plugin.updateFileTags(this.file, scheduledTime);
				new Notice('Post scheduled successfully!');
				this.close();
			} else {
				console.error('[Obsidigram] Schedule failed, response:', response);
				new Notice('Failed to schedule post. Bot unreachable.');
			}
		} catch (error) {
			console.error('[Obsidigram] Error scheduling post:', error);
			new Notice(`Failed to schedule post: ${error}`);
		}
	}

	private async publishNow(): Promise<void> {
		console.log('[Obsidigram] publishNow called');

		// Read file content
		const content = await this.plugin.app.vault.read(this.file);
		console.log(`[Obsidigram] File content length: ${content.length}`);
		
		// Convert markdown to Telegram HTML format
		let telegramContent = MarkdownConverter.convertToTelegramHTML(content);
		console.log(`[Obsidigram] Telegram content length: ${telegramContent.length}`);
		
		// Truncate if too long (Telegram limit is 4096 characters)
		telegramContent = MarkdownConverter.truncateForTelegram(telegramContent);

		// Get all tags
		const fileWatcher = this.plugin.fileWatcher;
		const allTags = fileWatcher.getAllTags(this.file);
		const contentTags = allTags.filter(t => 
			!t.startsWith('tg_') && !t.startsWith('#tg_')
		);
		console.log(`[Obsidigram] Content tags: ${JSON.stringify(contentTags)}`);

		// Send publish request
		console.log(`[Obsidigram] Sending publish request to API: ${this.plugin.settings.botApiUrl}`);
		try {
			const response = await this.apiClient.publishNow({
				action: 'publish',
				file_id: this.file.path,
				content: telegramContent,
				category: this.category,
				tags: contentTags
			});

			console.log(`[Obsidigram] API response:`, response);

			if (response && response.success) {
				// Update file tags to mark as published
				await this.plugin.markFileAsPublished(this.file);
				new Notice('Post published successfully! 🎉');
				this.close();
			} else {
				console.error('[Obsidigram] Publish failed, response:', response);
				new Notice(`Failed to publish post: ${response?.message || 'Bot unreachable'}`);
			}
		} catch (error) {
			console.error('[Obsidigram] Error publishing post:', error);
			new Notice(`Failed to publish post: ${error}`);
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
		// Call the callback to clear tracking in the plugin
		if (this.onCloseCallback) {
			this.onCloseCallback();
		}
	}
}

