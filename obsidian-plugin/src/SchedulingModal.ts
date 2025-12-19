import { Modal, Setting, Notice } from 'obsidian';
import { TFile } from 'obsidian';
import type ObsidigramPlugin from '../main';
import { ApiClient } from './ApiClient';
import { MarkdownConverter } from './MarkdownConverter';
import type { ScheduledSlot, CategoryConfig, Platform, PlatformVerification } from './types';
import { DEFAULT_CATEGORIES } from './types';

// Info about a busy slot
interface BusySlotInfo {
	category: string;
	fileId: string;
	contentPreview: string;
}

// Info about a custom (non-standard) scheduled slot for today
interface CustomSlotInfo {
	time: string; // HH:MM
	category: string;
	fileId: string;
	contentPreview: string;
}

export class SchedulingModal extends Modal {
	private plugin: ObsidigramPlugin;
	private file: TFile | null;
	private category: string;
	private apiClient: ApiClient;
	// Map of slot key to slot info (only for busy slots)
	private busySlots: Map<string, BusySlotInfo> = new Map();
	// Custom (non-standard) slots for today
	private todayCustomSlots: CustomSlotInfo[] = [];
	private selectedDate: string | null = null;
	private selectedTime: string | null = null;
	private isLoading: boolean = true;
	public onCloseCallback?: () => void;
	private submitButton: HTMLButtonElement | null = null;
	private readOnly: boolean = false;
	// Platform selection
	private availablePlatforms: Platform[] = ['telegram'];
	private platformVerification: PlatformVerification[] = [];
	private selectedPlatforms: Set<Platform> = new Set(['telegram']);
	// Platforms intended by user via tags (e.g., tg_unpublished, fb_unpublished)
	private intendedPlatforms?: Platform[];
	// Quick timer input reference
	private timerMinutesInput: HTMLInputElement | null = null;

	constructor(plugin: ObsidigramPlugin, file: TFile | null, category: string, readOnly: boolean = false, intendedPlatforms?: Platform[]) {
		super(plugin.app);
		this.plugin = plugin;
		this.file = file;
		this.category = category;
		this.readOnly = readOnly;
		this.intendedPlatforms = intendedPlatforms;
		this.apiClient = new ApiClient(plugin.settings.botApiUrl);
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();

		// Different title for read-only mode
		if (this.readOnly) {
			contentEl.createEl('h2', { text: '📅 Schedule Overview' });
			contentEl.createEl('p', { 
				text: 'View your scheduled posts and available time slots',
				cls: 'obsidigram-subtitle'
			});
		} else {
			contentEl.createEl('h2', { text: 'Schedule Post' });
			contentEl.createEl('p', { 
				text: `File: ${this.file?.basename || 'Unknown'}\nCategory: ${this.category}` 
			});
		}

		// Show loading state
		const loadingEl = contentEl.createEl('p', { text: 'Loading schedule...' });
		
		// Fetch busy slots and available platforms in parallel
		const [busySlotsResponse, platformsResponse] = await Promise.all([
			this.apiClient.getBusySlots(this.plugin.settings.timeSlots),
			this.apiClient.getPlatforms()
		]);
		
		this.isLoading = false;
		loadingEl.remove();

		if (busySlotsResponse) {
			// Get today's date in LOCAL timezone (not UTC)
			const now = new Date();
			const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
			const standardTimeSlots = new Set(this.plugin.settings.timeSlots);
			
			// Build map of busy slots with their info
			busySlotsResponse.slots.forEach(slot => {
				if (slot.isBusy) {
					const key = `${slot.date}_${slot.time}`;
					this.busySlots.set(key, {
						category: slot.category || 'unknown',
						fileId: slot.fileId || 'unknown',
						contentPreview: slot.contentPreview || '',
					});
					
					// Track custom (non-standard) slots for today
					if (slot.date === today && !standardTimeSlots.has(slot.time)) {
						this.todayCustomSlots.push({
							time: slot.time,
							category: slot.category || 'unknown',
							fileId: slot.fileId || 'unknown',
							contentPreview: slot.contentPreview || '',
						});
					}
				}
			});
			
			// Sort custom slots by time
			this.todayCustomSlots.sort((a, b) => a.time.localeCompare(b.time));
		}

		// Set up available platforms
		if (platformsResponse) {
			this.availablePlatforms = platformsResponse.platforms;
			this.platformVerification = platformsResponse.verified;
			
			// Determine which platforms to pre-select:
			// 1. If user specified platforms via tags (tg_unpublished, fb_unpublished, etc.), use those
			// 2. Otherwise, use default platforms from settings
			let platformsToSelect: Platform[];
			
			if (this.intendedPlatforms && this.intendedPlatforms.length > 0) {
				// User specified platforms via tags - use their intent
				platformsToSelect = this.intendedPlatforms.filter(p => this.availablePlatforms.includes(p));
				console.log(`[Obsidigram] Using intended platforms from tags: ${platformsToSelect.join(', ')}`);
			} else {
				// No specific intent - use defaults
				platformsToSelect = this.plugin.settings.defaultPlatforms || ['telegram'];
				console.log(`[Obsidigram] Using default platforms: ${platformsToSelect.join(', ')}`);
			}
			
			this.selectedPlatforms = new Set(
				platformsToSelect.filter(p => this.availablePlatforms.includes(p))
			);
			
			// Ensure at least telegram is selected
			if (this.selectedPlatforms.size === 0) {
				this.selectedPlatforms.add('telegram');
			}
		}

		// Render platform selection (only in non-read-only mode)
		if (!this.readOnly && this.availablePlatforms.length > 1) {
			this.renderPlatformSelection(contentEl);
		}

		// Render calendar grid
		this.renderCalendar(contentEl);
	}

	private renderPlatformSelection(container: HTMLElement): void {
		const platformContainer = container.createDiv('obsidigram-platforms');
		platformContainer.createEl('h3', { text: '📡 Publish to:' });
		
		const checkboxContainer = platformContainer.createDiv('obsidigram-platform-checkboxes');
		
		const platformIcons: Record<Platform, string> = {
			telegram: '✈️',
			facebook: '📘',
			threads: '🧵'
		};
		
		const platformNames: Record<Platform, string> = {
			telegram: 'Telegram',
			facebook: 'Facebook',
			threads: 'Threads'
		};
		
		this.availablePlatforms.forEach(platform => {
			const verification = this.platformVerification.find(v => v.platform === platform);
			const isValid = verification?.valid ?? true;
			
			const platformRow = checkboxContainer.createDiv('obsidigram-platform-row');
			
			const label = platformRow.createEl('label', {
				cls: `obsidigram-platform-label ${!isValid ? 'obsidigram-platform-invalid' : ''}`
			});
			
			const checkbox = label.createEl('input', {
				type: 'checkbox',
				cls: 'obsidigram-platform-checkbox'
			});
			checkbox.checked = this.selectedPlatforms.has(platform) && isValid;
			checkbox.disabled = !isValid;
			
			// If invalid, remove from selected platforms
			if (!isValid) {
				this.selectedPlatforms.delete(platform);
			}
			
			checkbox.addEventListener('change', () => {
				if (checkbox.checked) {
					this.selectedPlatforms.add(platform);
				} else {
					// Don't allow deselecting all platforms
					if (this.selectedPlatforms.size > 1) {
						this.selectedPlatforms.delete(platform);
					} else {
						checkbox.checked = true;
						new Notice('At least one platform must be selected');
					}
				}
			});
			
			const icon = platformIcons[platform] || '📱';
			const name = platformNames[platform] || platform;
			label.createSpan({ text: ` ${icon} ${name}` });
			
			if (!isValid) {
				// Show error message inline
				const errorSpan = label.createSpan({ 
					text: ' ⚠️',
					cls: 'obsidigram-platform-warning'
				});
				// Create error details below the checkbox
				const errorDetail = platformRow.createDiv('obsidigram-platform-error');
				const errorText = this.formatPlatformError(verification?.error || 'Not configured');
				errorDetail.setText(errorText);
			} else if (verification?.info) {
				label.createSpan({ 
					text: ` (${verification.info})`,
					cls: 'obsidigram-platform-info'
				});
			}
		});
	}

	private formatPlatformError(error: string): string {
		// Shorten common error messages
		if (error.includes('Session has expired')) {
			return '❌ Token expired - regenerate in Facebook Developer Portal';
		}
		if (error.includes('pages_read_engagement') || error.includes('pages_manage_posts')) {
			return '❌ Missing permissions - regenerate token with pages_read_engagement & pages_manage_posts';
		}
		if (error.includes('Invalid access token')) {
			return '❌ Invalid token - check configuration';
		}
		if (error.includes('Not configured')) {
			return '⚙️ Not configured';
		}
		// Truncate long errors
		if (error.length > 80) {
			return '❌ ' + error.substring(0, 77) + '...';
		}
		return '❌ ' + error;
	}

	private renderCalendar(container: HTMLElement): void {
		// Create a wrapper for calendar + quick timer panel
		const mainWrapper = container.createDiv('obsidigram-main-wrapper');
		
		const calendarContainer = mainWrapper.createDiv('obsidigram-calendar');
		
		// Get next 7 days
		const days = this.getNext7Days();
		const timeSlots = this.plugin.settings.timeSlots;
		
		// Sort time slots so 00:00 appears at the top (it's midnight of the displayed day)
		const sortedTimeSlots = [...timeSlots].sort((a, b) => {
			// 00:00 should come first (it's the start of the day)
			if (a === '00:00') return -1;
			if (b === '00:00') return 1;
			return a.localeCompare(b);
		});

		// Create header row
		const headerRow = calendarContainer.createDiv('obsidigram-calendar-header');
		headerRow.createDiv('obsidigram-time-label').setText('Time');
		days.forEach(day => {
			const dayEl = headerRow.createDiv('obsidigram-day-header');
			const date = new Date(day + 'T12:00:00'); // Use noon to avoid timezone issues in display
			dayEl.createEl('div', { text: date.toLocaleDateString('en-US', { weekday: 'short' }) });
			dayEl.createEl('div', { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
		});

		// Create time slot rows
		sortedTimeSlots.forEach(timeSlot => {
			const row = calendarContainer.createDiv('obsidigram-calendar-row');
			row.createDiv('obsidigram-time-label').setText(timeSlot);

			days.forEach(day => {
				const slotKey = `${day}_${timeSlot}`;
				const slotInfo = this.busySlots.get(slotKey);
				const isBusy = !!slotInfo;
				
				// Check if this slot is in the past
				const [year, month, dayNum] = day.split('-').map(Number);
				const [hours, minutes] = timeSlot.split(':').map(Number);
				const slotDate = new Date(year, month - 1, dayNum, hours, minutes);
				const isPast = slotDate <= new Date();
				
				const slotEl = row.createDiv(`obsidigram-slot ${isBusy ? 'obsidigram-slot-busy' : isPast ? 'obsidigram-slot-past' : 'obsidigram-slot-available'}`);
				slotEl.setAttr('data-date', day);
				slotEl.setAttr('data-time', timeSlot);
				
				if (isBusy && slotInfo) {
					// Get category config for letter and color
					const categoryConfig = this.getCategoryConfig(slotInfo.category);
					slotEl.setText(categoryConfig.letter);
					slotEl.style.backgroundColor = categoryConfig.color;
					slotEl.style.color = 'white';
					slotEl.style.fontWeight = 'bold';
					// Build rich tooltip with category and content preview
					const tooltip = `#tg_${slotInfo.category}\n\n${slotInfo.contentPreview}`;
					slotEl.setAttr('title', tooltip);
				} else if (isPast) {
					slotEl.setText('·');
					slotEl.setAttr('title', 'Past');
				} else {
					slotEl.setText('○');
					slotEl.setAttr('title', 'Available');
					slotEl.addEventListener('click', () => {
						this.selectSlot(day, timeSlot);
					});
				}
			});
		});

		// Render quick timer panel (only in non-read-only mode)
		if (!this.readOnly) {
			this.renderQuickTimerPanel(mainWrapper);
		} else if (this.todayCustomSlots.length > 0) {
			// In read-only mode, just show today's custom slots if any
			this.renderTodayCustomSlots(mainWrapper);
		}

		// Add buttons
		const buttonContainer = container.createDiv('obsidigram-button-container');
		
		if (this.readOnly) {
			// Read-only mode: only show Close button
			const closeButton = buttonContainer.createEl('button', { 
				text: 'Close',
				cls: 'mod-cta'
			});
			closeButton.addEventListener('click', () => {
				this.close();
			});
		} else {
			// Full mode: show all action buttons
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
	}

	private getCategoryConfig(categoryName: string): CategoryConfig {
		const categories = this.plugin.settings.categories || DEFAULT_CATEGORIES;
		const found = categories.find(c => c.name === categoryName);
		if (found) return found;
		// Fallback: generate letter from first char, use default color
		return {
			name: categoryName,
			letter: categoryName.charAt(0).toUpperCase(),
			color: '#888888', // Gray fallback
		};
	}

	private renderQuickTimerPanel(container: HTMLElement): void {
		const panel = container.createDiv('obsidigram-quick-timer-panel');
		
		// Header
		panel.createEl('h3', { text: '⏱️ Post in' });
		
		// Timer input row
		const inputRow = panel.createDiv('obsidigram-timer-input-row');
		
		this.timerMinutesInput = inputRow.createEl('input', {
			type: 'number',
			placeholder: '15',
			cls: 'obsidigram-timer-input'
		});
		this.timerMinutesInput.min = '1';
		this.timerMinutesInput.max = '1440'; // Max 24 hours
		this.timerMinutesInput.value = '15';
		
		inputRow.createSpan({ text: 'min', cls: 'obsidigram-timer-unit' });
		
		const timerButton = inputRow.createEl('button', {
			text: '📤 Go',
			cls: 'obsidigram-timer-button'
		});
		timerButton.setAttr('title', 'Schedule for this time');
		timerButton.addEventListener('click', async () => {
			await this.scheduleWithTimer();
		});
		
		// Quick preset buttons
		const presetsRow = panel.createDiv('obsidigram-timer-presets');
		const presets = [5, 10, 15, 30, 60];
		presets.forEach(mins => {
			const presetBtn = presetsRow.createEl('button', {
				text: mins < 60 ? `${mins}` : `${mins / 60}h`,
				cls: 'obsidigram-preset-button'
			});
			presetBtn.addEventListener('click', () => {
				if (this.timerMinutesInput) {
					this.timerMinutesInput.value = String(mins);
				}
			});
		});
		
		// Today's custom slots section (only if there are custom slots)
		if (this.todayCustomSlots.length > 0) {
			this.renderTodayCustomSlots(panel);
		}
	}

	private renderTodayCustomSlots(container: HTMLElement): void {
		if (this.todayCustomSlots.length === 0) {
			return; // Nothing to show
		}
		
		const section = container.createDiv('obsidigram-custom-slots-section');
		section.createEl('h4', { text: "Custom:" });
		
		const slotsList = section.createDiv('obsidigram-custom-slots-list');
		
		const now = new Date();
		const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
		
		// Show only upcoming custom slots (max 4 to save space)
		const upcomingSlots = this.todayCustomSlots
			.filter(slot => slot.time >= currentTime)
			.slice(0, 4);
		
		upcomingSlots.forEach(slot => {
			const slotEl = slotsList.createDiv('obsidigram-custom-slot');
			
			// Time badge
			slotEl.createSpan({ 
				text: slot.time,
				cls: 'obsidigram-custom-slot-time'
			});
			
			// Category badge
			const categoryConfig = this.getCategoryConfig(slot.category);
			const categoryBadge = slotEl.createSpan({
				text: categoryConfig.letter,
				cls: 'obsidigram-custom-slot-category'
			});
			categoryBadge.style.backgroundColor = categoryConfig.color;
			
			slotEl.setAttr('title', `${slot.time} - #tg_${slot.category}\n${slot.contentPreview}`);
		});
	}

	private async scheduleWithTimer(): Promise<void> {
		if (!this.timerMinutesInput) return;
		
		const minutes = parseInt(this.timerMinutesInput.value, 10);
		if (isNaN(minutes) || minutes < 1) {
			new Notice('Please enter a valid number of minutes');
			return;
		}
		
		// Calculate scheduled time
		const scheduledDate = new Date();
		scheduledDate.setMinutes(scheduledDate.getMinutes() + minutes);
		
		// Format date in LOCAL timezone (YYYY-MM-DD)
		const year = scheduledDate.getFullYear();
		const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
		const day = String(scheduledDate.getDate()).padStart(2, '0');
		const dateStr = `${year}-${month}-${day}`;
		
		// Format time in LOCAL timezone (HH:MM)
		const hours = String(scheduledDate.getHours()).padStart(2, '0');
		const mins = String(scheduledDate.getMinutes()).padStart(2, '0');
		const timeStr = `${hours}:${mins}`;
		
		// Set selected date/time and submit
		this.selectedDate = dateStr;
		this.selectedTime = timeStr;
		
		console.log(`[Obsidigram] Scheduling with timer: ${minutes} minutes -> ${this.selectedDate} ${this.selectedTime}`);
		
		await this.submitSchedule();
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
		
		if (!this.file) {
			new Notice('No file selected');
			return;
		}

		if (!this.selectedDate || !this.selectedTime) {
			new Notice('Please select a time slot');
			return;
		}

		console.log(`[Obsidigram] Selected: ${this.selectedDate} ${this.selectedTime}`);

		// Build ISO datetime string - parse date parts manually to avoid timezone issues
		const [year, month, day] = this.selectedDate.split('-').map(Number);
		const [hours, minutes] = this.selectedTime.split(':').map(Number);
		// Create date in local timezone by using individual components
		const scheduledDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
		const scheduledTime = scheduledDate.toISOString();

		console.log(`[Obsidigram] Scheduled time ISO: ${scheduledTime}`);

		// Read file content
		const file = this.file; // Store reference for type narrowing
		const content = await this.plugin.app.vault.read(file);
		console.log(`[Obsidigram] File content length: ${content.length}`);
		
		// Convert markdown to Telegram HTML format
		let telegramContent = MarkdownConverter.convertToTelegramHTML(content);
		console.log(`[Obsidigram] Telegram content length: ${telegramContent.length}`);
		
		// Truncate if too long (Telegram limit is 4096 characters)
		telegramContent = MarkdownConverter.truncateForTelegram(telegramContent);

		// Get all tags
		const fileWatcher = this.plugin.fileWatcher;
		const allTags = fileWatcher.getAllTags(file);
		const contentTags = allTags.filter(t => 
			!t.startsWith('tg_') && !t.startsWith('#tg_') &&
			!t.startsWith('fb_') && !t.startsWith('#fb_') &&
			!t.startsWith('thr_') && !t.startsWith('#thr_') &&
			!t.startsWith('cms_') && !t.startsWith('#cms_')
		);
		console.log(`[Obsidigram] Content tags: ${JSON.stringify(contentTags)}`);

		// Send schedule request
		const platforms = Array.from(this.selectedPlatforms) as Platform[];
		
		if (platforms.length === 0) {
			new Notice('❌ No valid platforms selected. Please check your configuration.');
			return;
		}

		console.log(`[Obsidigram] Sending schedule request to API: ${this.plugin.settings.botApiUrl}`);
		console.log(`[Obsidigram] Target platforms: ${platforms.join(', ')}`);
		try {
			const response = await this.apiClient.schedulePost({
				action: 'schedule',
				file_id: file.path,
				content: telegramContent,
				scheduled_time: scheduledTime,
				category: this.category,
				tags: contentTags,
				platforms: platforms
			});

			console.log(`[Obsidigram] API response:`, response);

			if (response && response.success) {
				// Update file tags with platforms
				await this.plugin.updateFileTags(file, scheduledTime, platforms);
				new Notice('Post scheduled successfully!');
				this.close();
			} else {
				console.error('[Obsidigram] Schedule failed, response:', response);
				new Notice('Failed to schedule post. Bot unreachable.');
			}
		} catch (error) {
			console.error('[Obsidigram] Error scheduling post:', error);
			new Notice(`Failed to schedule post: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async publishNow(): Promise<void> {
		console.log('[Obsidigram] publishNow called');

		if (!this.file) {
			new Notice('No file selected');
			return;
		}

		const file = this.file; // Store reference for type narrowing

		// Read file content
		const content = await this.plugin.app.vault.read(file);
		console.log(`[Obsidigram] File content length: ${content.length}`);
		
		// Convert markdown to Telegram HTML format
		let telegramContent = MarkdownConverter.convertToTelegramHTML(content);
		console.log(`[Obsidigram] Telegram content length: ${telegramContent.length}`);
		
		// Truncate if too long (Telegram limit is 4096 characters)
		telegramContent = MarkdownConverter.truncateForTelegram(telegramContent);

		// Get all tags
		const fileWatcher = this.plugin.fileWatcher;
		const allTags = fileWatcher.getAllTags(file);
		const contentTags = allTags.filter(t => 
			!t.startsWith('tg_') && !t.startsWith('#tg_') &&
			!t.startsWith('fb_') && !t.startsWith('#fb_') &&
			!t.startsWith('thr_') && !t.startsWith('#thr_') &&
			!t.startsWith('cms_') && !t.startsWith('#cms_')
		);
		console.log(`[Obsidigram] Content tags: ${JSON.stringify(contentTags)}`);

		// Send publish request
		const platforms = Array.from(this.selectedPlatforms) as Platform[];

		if (platforms.length === 0) {
			new Notice('❌ No valid platforms selected. Please check your configuration.');
			return;
		}

		console.log(`[Obsidigram] Sending publish request to API: ${this.plugin.settings.botApiUrl}`);
		console.log(`[Obsidigram] Target platforms: ${platforms.join(', ')}`);
		try {
			const response = await this.apiClient.publishNow({
				action: 'publish',
				file_id: file.path,
				content: telegramContent,
				category: this.category,
				tags: contentTags,
				platforms: platforms
			});

			console.log(`[Obsidigram] API response:`, response);

			if (response && response.success) {
				// Update file tags to mark as published, passing platform results
				await this.plugin.markFileAsPublished(file, response.platform_results);
				new Notice('Post published successfully! 🎉');
				this.close();
			} else if (response && response.platform_results) {
				// Partial success - some platforms worked
				const successCount = response.platform_results.filter(r => r.success).length;
				const failCount = response.platform_results.filter(r => !r.success).length;
				
				if (successCount > 0) {
					// Update tags for successful platforms
					await this.plugin.markFileAsPublished(file, response.platform_results);
					new Notice(`Published to ${successCount} platform(s), ${failCount} failed`);
					this.close();
				} else {
					console.error('[Obsidigram] All platforms failed:', response);
					const errors = response.platform_results.map(r => `${r.platform}: ${r.error}`).join('\n');
					new Notice(`Failed to publish:\n${errors}`);
				}
			} else {
				console.error('[Obsidigram] Publish failed, response:', response);
				new Notice(`Failed to publish post: ${response?.message || 'Bot unreachable'}`);
			}
		} catch (error) {
			console.error('[Obsidigram] Error publishing post:', error);
			new Notice(`Failed to publish post: ${error instanceof Error ? error.message : String(error)}`);
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

