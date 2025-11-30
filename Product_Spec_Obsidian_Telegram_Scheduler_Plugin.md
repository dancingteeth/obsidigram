# **Product Spec: Obsidian Telegram Scheduler Plugin**

## **1\. Overview**

A plugin that turns Obsidian into a headless CMS for Telegram. It monitors markdown files for specific "readiness" tags, triggers a scheduling UI, and dispatches content to a Telegram Bot API for queuing.

## **2\. Core Workflow**

1. **Trigger:** User saves a markdown file (or file is modified).  
2. **Validation:** Plugin checks for specific tags in YAML frontmatter or body:  
   * Must have: \#tg\_unpublished AND \#tg\_ready  
   * Must have one Category tag: \#tg\_research, \#tg\_infrastructure, etc.  
3. **Action:** If validation passes, open a **Scheduling Modal**.  
4. **Scheduling UI:**  
   * Display a grid: Columns \= Next 7 Days, Rows \= 6 customizable time slots per day.  
   * Fetch existing "busy" slots from the Bot API to prevent conflicts.  
5. **Submission:**  
   * User clicks a slot.  
   * Plugin sends JSON payload to Bot (Content \+ Date/Time \+ Category).  
   * **File Update:** Plugin removes \#tg\_unpublished, adds \#tg\_scheduled and tg\_scheduled\_time: \[ISO String\].  
6. **Sync:** On startup, plugin queries Bot for status=published posts and updates local files from \#tg\_scheduled to \#tg\_published.

## **3\. Technical Architecture**

### **Stack**

* **Frontend:** Obsidian API (TypeScript), React (for the Modal).  
* **Backend (Bot):** Node.js/Grammy (assumed running externally, this plugin just hits the endpoint).  
* **Communication:** HTTP POST to Bot Webhook.

### **Tag System (Configurable)**

* **Status:** \#tg\_draft, \#tg\_ready, \#tg\_unpublished, \#tg\_scheduled, \#tg\_published  
* **Categories:** \#tg\_research, \#tg\_infrastructure\_energy, \#tg\_slop\_misinformation, \#tg\_security\_fraud, \#tg\_economy, \#tg\_developer\_ecosystem

### **API Payload Structure**

{  
  "action": "schedule",  
  "file\_id": "unique\_vault\_id\_or\_path",  
  "content": "Markdown content parsed to HTML/Telegram format",  
  "scheduled\_time": "2025-12-05T10:00:00Z",  
  "category": "research",  
  "tags": \["\#ai", "\#tech"\]  
}

## **4\. Implementation Steps (Cursor Agent Instructions)**

### **Phase 1: The Watcher**

* Implement this.app.workspace.on('editor-change') or vault.on('modify') with a debounce.  
* Create a parser that efficiently checks for the intersection of \#tg\_ready and \#tg\_unpublished.  
* Ignore files that already have \#tg\_scheduled.

### **Phase 2: The UI (Calendar Modal)**

* Create a SchedulingModal class extending Modal.  
* Fetch "Busy Slots" from GET /api/schedule (mock this for now).  
* Render a simple CSS Grid for the week.  
* Handle click events to trigger the API call.

### **Phase 3: File Mutation**

* Use app.fileManager.processFrontMatter to safely update tags without breaking formatting.  
* Ensure atomic operations: Don't update the tag unless the API returns 200 OK.

### **Phase 4: The "Sync" Command**

* Add a Ribbon Icon "Sync Telegram Status".  
* Fetch published posts from GET /api/published.  
* iterate through vault files with \#tg\_scheduled and update them to \#tg\_published if they match the ID.

## **5\. Edge Cases**

* **Offline Mode:** If API fails, show error "Bot unreachable" and do not change tags.  
* **Re-scheduling:** If a user edits a \#tg\_scheduled file, ask if they want to "Update Schedule" or "Cancel Post."