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

		// Add submit button
		const buttonContainer = container.createDiv('obsidigram-button-container');
		new Setting(buttonContainer)
			.addButton(btn => btn
				.setButtonText('Schedule')
				.setCta()
				.setDisabled(!this.selectedDate || !this.selectedTime)
				.onClick(() => {
					if (this.selectedDate && this.selectedTime) {
						this.submitSchedule();
					}
				}))
			.addButton(btn => btn
				.setButtonText('Cancel')
				.onClick(() => {
					this.close();
				}));
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
		// Clear previous selection
		const prevSelected = this.contentEl.querySelectorAll('.obsidigram-slot-selected');
		prevSelected.forEach(el => el.classList.remove('obsidigram-slot-selected'));

		// Find and highlight new selection
		const slotKey = `${date}_${time}`;
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

		// Enable submit button
		const submitBtn = this.contentEl.querySelector('.mod-cta') as HTMLButtonElement;
		if (submitBtn) {
			submitBtn.disabled = false;
		}
	}

	private async submitSchedule(): Promise<void> {
		if (!this.selectedDate || !this.selectedTime) {
			new Notice('Please select a time slot');
			return;
		}

		// Build ISO datetime string
		const [hours, minutes] = this.selectedTime.split(':').map(Number);
		const scheduledDate = new Date(this.selectedDate);
		scheduledDate.setHours(hours, minutes, 0, 0);
		const scheduledTime = scheduledDate.toISOString();

		// Read file content
		const content = await this.plugin.app.vault.read(this.file);
		
		// Convert markdown to Telegram HTML format
		let telegramContent = MarkdownConverter.convertToTelegramHTML(content);
		
		// Truncate if too long (Telegram limit is 4096 characters)
		telegramContent = MarkdownConverter.truncateForTelegram(telegramContent);

		// Get all tags
		const fileWatcher = this.plugin.fileWatcher;
		const allTags = fileWatcher.getAllTags(this.file);
		const contentTags = allTags.filter(t => 
			!t.startsWith('tg_') && !t.startsWith('#tg_')
		);

		// Send schedule request
		const response = await this.apiClient.schedulePost({
			action: 'schedule',
			file_id: this.file.path,
			content: telegramContent,
			scheduled_time: scheduledTime,
			category: this.category,
			tags: contentTags
		});

		if (response && response.success) {
			// Update file tags
			await this.plugin.updateFileTags(this.file, scheduledTime);
			new Notice('Post scheduled successfully!');
			this.close();
		} else {
			new Notice('Failed to schedule post. Bot unreachable.');
		}
	}


	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}

