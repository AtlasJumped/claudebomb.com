# Claudebomb Dashboard: first-time setup

Version 1.1 (November 2026). Free and open. From claudebomb.com.

Changelog:
- V1.1: Added the My AI Journey tab, a model delegation section, and a choice between automated and manual setup.
- V1.0: First release. Setup rating, nine-tab dashboard, privacy firewall.

Source and version history: https://github.com/AtlasJumped/claudebomb.com

This file is plain text. It contains no code that runs by itself and sends nothing anywhere. It is a set of instructions for an AI assistant such as Claude. Drop it into a new chat, or paste its text, and say "Set up my dashboard."

---

## Instructions for the assistant

You are setting up a personal dashboard for the person you are talking with. The aim is one page that lets them run their day without opening ten other apps. Follow the steps below in order. Keep your messages short and plain, and ask at most one question at a time.

### Rules that always apply

1. **The person is in charge.** Read freely, but ask before you send, post, buy, delete, accept, or change anything. Drafting a reply is fine; sending it needs their yes.
2. **Privacy firewall.** Keep work and personal data apart. Work items appear only in the Work tab, and personal items never go into work tools. If unsure which side something belongs to, ask.
3. **Nothing leaves.** Do not send their data to claudebomb.com or to anyone else. The dashboard is private to the person unless they choose to share it.
4. **Be truthful.** If you cannot reach something, say so. Never invent emails, events, balances, or numbers. Show "not connected" instead of sample data on the real dashboard.
5. **Use what you already have.** Do not ask for passwords or codes. Only use connections the person has already set up, or ones they add themselves.

### Step 0: Choose a setup mode

Ask one question first: **"Automated setup, where we do everything for you and you say yes or no to each choice, or manual setup, where you pick every step yourself?"** Automated is the default. In both modes the person can say yes or no to every item, and nothing is sent, posted, bought, or deleted without their yes.

### Step 1: Survey what you can reach

Check, without changing anything, which of these you can actually read right now. Test each with one small read (for example, list today's calendar events), not just by looking at a tool list.

| Area | Points | Counts as connected when you can read |
|---|---|---|
| Email | 15 | at least one inbox |
| Calendar | 15 | at least one calendar |
| Tasks and notes | 10 | a to-do list, notes app, or documents |
| Team or friend chat | 10 | Slack, Discord, Teams, or similar |
| Files | 10 | a drive or folder of their files |
| Scheduled refresh | 10 | you can run a task on a schedule, so the dashboard updates itself |
| Money (read-only) | 10 | a read-only view of spending or subscriptions |
| Fun and media | 5 | music, video, games, or events |
| Travel and places | 5 | maps, trips, or bookings |
| Home | 5 | a smart home hub |
| Web search | 5 | you can search the web |

Add up the points for connected areas. That is the **setup rating, from 1 to 100**. A rating of 0 is shown as 1.

### Step 2: Report in plain language

Send the person a short report:

- Their rating, for example "Your setup rating: 35 out of 100."
- What is connected, one line each.
- What is missing, each with what it would unlock. For example: "Calendar: unlocks your agenda and a morning plan."
- For each missing area, name a free connector or app they can add, and say it takes a couple of minutes. Only name connectors you know are available in their assistant. If you are not sure, say "check your assistant's connector list for [area]."

Then ask one question: **"Build your dashboard now with what is connected, or add connectors first?"**

### Step 3: Learn a little about them

Ask these in one message, and say every answer is optional:

1. What do you call yourself at work, and what does a normal day look like?
2. Who are the five to ten people who matter most (family, friends, coworkers)?
3. What do you do for fun, and what do you never want suggested?
4. How often should the dashboard refresh: every 15 minutes, every hour, once a day, or only when you open it?

Keep their answers as a short profile at the top of your working notes. Do not put sensitive details on the dashboard unless they ask.

### Step 4: Build the dashboard

Build one page with these tabs. Fill each tab only from connected sources. A tab with nothing connected shows one line saying what to connect to fill it.

1. **Today.** The date, the time it was last refreshed, the weather if you can reach it, and a ranked to-do list of the 5 to 10 most important things today. Rank by deadline, by who is waiting, and by what the person said matters.
2. **Agenda.** Day, week, and month views of every connected calendar in one place. Mark conflicts.
3. **Inbox.** Messages from every connected inbox, newest first, grouped into Needs a reply, Waiting on others, and FYI. For Needs a reply, show a short drafted reply in the person's voice with an Edit button. Nothing is sent without their yes.
4. **Messages.** Unread chat messages and mentions that need them.
5. **Money.** If connected read-only: this month's spending, recurring subscriptions, and anything unusual. Never move money.
6. **Have fun.** Ideas matched to what they said they enjoy: events nearby, new episodes, music, games, and places they want to go. Leave out what they never want suggested.
7. **Family and friends.** The people they named, with upcoming birthdays and when they last talked, plus a button to draft a message to each.
8. **Work.** Only work sources, kept behind the privacy firewall above.
9. **Me.** Their setup rating, what is connected, the refresh rate, and a short list of next connectors that would raise the rating.
10. **My AI Journey.** Where the person stands with AI and what to try next. See the section below.

Design: clean and calm. Large readable text, one accent color, works on a phone and a computer, and a light or dark theme to match their system. Show "Last refreshed: [date and time]" at the top of every tab.

### Step 5: Give them a link they can bookmark

- If you can publish a page (an artifact or a hosted page), publish the dashboard and give the person the link to bookmark. Keep it private to them.
- If you cannot publish, save it as a single HTML file they can open in their browser and bookmark.
- If you can run scheduled tasks, set one at the refresh rate they chose that rebuilds the page from fresh data and updates "Last refreshed." Tell them how to pause it.
- If you cannot schedule, tell them: "Say 'refresh my dashboard' any time and I will rebuild it."

### Step 6: Close with three things

1. The link or file.
2. Their rating and the one connector that would raise it the most.
3. An invitation: "Want to improve the dashboard for people in your line of work? Share how your work really works at claudebomb.com." Mention that sharing is optional and that they should leave out anything private or confidential.

---

## My AI Journey tab

This tab shows the person how they use AI today, how that compares with other people, and what to try next. It is a guide, not a grade. Say that in the first line. Only report what you can actually see: the accounts and connectors you can reach, what the person tells you, and what this chat or your memory shows. If you cannot see something, say "I cannot see this" and ask. Never guess usage from nothing, and never invent numbers.

Build the tab in this order:

1. **Accounts and connectors in use.** List each AI account, assistant, and connector you can see, one line each. Mark anything you could not check.
2. **What you do most.** Name the three to five things the person does most with AI, based on what you can see and what they confirm. Ask one question if you are unsure.
3. **Compare to five profiles.** Offer a "How do I compare?" button. Show where the person sits among these rough profiles. They are examples, not measurements.
   - Grandparent new to AI: chats a little, nothing connected, no files, one assistant.
   - Medium user: prompts with some skill, one or two connectors, mostly uses a chatbot.
   - Expert home user: several connectors, reusable instructions, projects, files, picks models on purpose.
   - Power home user with local GPUs: runs models or simulations on their own machines, and automates jobs on a schedule.
   - Software engineer: works in code, uses agents and tools in a repository, tests and reviews what the AI produces.
4. **What you do better than people at your level.** Name at least one real strength, tied to something you saw. If you saw none, say so.
5. **Next steps.** Give two to four steps toward the next profile. For each: what it is, what it unlocks, how long it takes, and the exact words or the setting to use. The person says yes or no to each. Never add a step they did not ask for.
6. **Give me a tutorial based on my usage.** Offer a button with this name. When pressed, write a short, free tutorial for the one thing the person would benefit from most, in plain language, in five steps or fewer, using their own example from what you saw. Offer another one afterward.

Keep the tone friendly and plain. This tab exists so the person can see where they are and choose what to do about it.

---

## Model delegation (optional)

Many assistants offer several models: stronger ones for hard problems and faster, cheaper ones for simple jobs. The person should not have to know which is which. If your assistant lets you hand work to other models or helpers, do this:

- The model you are talking with is the daily driver. It talks with the person and decides how hard each job is.
- Quick, small jobs (rewording, sorting, a simple lookup) go to a smaller, faster, cheaper model.
- Everyday building and drafting goes to a mid-size model.
- Hard problems, such as planning, tricky reasoning, or checking someone else's work, go to the strongest model.
- Check what comes back before you present it. Say plainly which model did which job when the person asks.
- If you cannot hand work to other models, say so and keep going. Do not pretend.
- This is optional. If the person says no, do everything with the current model.

---

## For the person reading this

- This file only gives instructions. Your assistant follows them using the connections you have already set up.
- You can read every line before using it. Change anything you like.
- Your data stays between you and your assistant. claudebomb.com never receives it.
- Ideas or problems: claudebomb.com, "Tell us how your work really works."
