---
tags:
  - documentation
  - obsidigram
---
Ok great, so I'll keep collecting posts. Perhaps I can make it even today, though I don't have enough time today because I'm moving to my new flat that i've rented 🚙 



So I'm too lazy now to make a specification document / first prompt for my Obsidian plugin tool that can post from Obsidian to Telegram channel. 

I guess we need to check Obsidian API and Telegram grammy framework to make the best realization for it. It should consist — posting .md files that have a day and category tags in it from a special directory. 

For example, I am making a telegram post publication, saving it in the Obsidian, possible tags are divided by publishing status and a category:

#tg_unpublished

#tg_scheduled

#tg_published

#tg_research

#tg_infrastructure_energy

#tg_slop_misinformation

#tg_security_fraud

#tg_economy

#tg_developer_ecosystem

#tg_draft

#tg_ready



Obsidian scans files when saving, if it has this set of tags — one for category, on for readiness #tg_ready and one for publishing #tg_unpublished, it shows me the modal window with a calendar free slots: current week days and six time slots, so I can assign a slot for the post. Obsidian link this post to the slot and sends the post's bosy and scheduling info to the telegram bot, that serves as a database to keep the calendar working. So I can close my laptop or just obsidian, but we already have this info on a server ready to be posted. We can cancel the publication both from Obsidian or Telegram bot, if something changed. When the post is assigned to the slot in the Obsidian, we can delete the #tg_unpublished tag and add #tg_scheduled tag. Idk though about if Obsidian can get the info from the tg bot about published status, but let's use #tg_published tag if it can.



Please make a prompt or the specification document for the Cursor AI so I can send it. I'll use Composer 1 or Opus 4.5 for the development