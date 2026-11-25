# Page content for each prompt: what it does, common pitfalls and how the prompt handles them, and its own feature switches.
# Shared switches live in build.py. Each feature: name, want (line added when you want it), dont (line added when you don't; optional).
META = {
"video-one-shot": dict(
 does="You fill in boxes for your characters, your setting, your style, and your story. Your AI asks what is missing, writes a logline and a shot list, then gives you one finished prompt for any AI video tool, with a list of things the tool must not show.",
 pitfalls=[
  ("AI video tools drift: a character changes face or clothes between shots.","Each character is described the same way, word for word, every time they appear."),
  ("Scenes wander outside the place you meant.","A decision rule treats any shot outside your setting as an error to fix."),
  ("Clips run longer than the tool can make, so the end is cut off.","Long ideas are split into numbered clips with matching first and last frames."),
 ],
 features=[
  dict(name="Crowds allowed", want="Background people and crowds are fine.", dont="No background people. Only my characters."),
  dict(name="Dialogue", want="Include spoken lines for my characters.", dont="No dialogue. Music and sound only."),
 ],
 fields=[
  dict(k="characters", label="Characters", ph="One per line: name, age, look, clothes, voice. For example: Mia, 8, red raincoat, curly hair, giggles a lot."),
  dict(k="setting", label="Setting", ph="Where and when it all happens. For example: a small harbor at sunrise, fishing boats, gulls, light fog.", guard="Everything happens in this setting. If you find yourself writing a shot outside it, that is an error: fix it or ask me."),
  dict(k="story", label="What happens", ph="The story from start to end, in your own words."),
  dict(k="style", label="Style, length, and tool", ph="For example: warm hand-drawn animation, 20 seconds, for Veo. Or: realistic, 8 seconds, any tool."),
 ]),
"personal-dashboard": dict(
 does="Paste it into a new chat on day one. Your AI makes you comfortable, checks what it can reach, sets up one tidy folder and a master notes file with your yes, then builds a one-page dashboard for your day: ranked to-dos, inbox with drafted replies, calendar, money, fun, and the people who matter.",
 pitfalls=[
  ("AI setups get scattered: a new chat makes a new file and the old one is lost.","One folder and one Read Me Master that every chat reads first."),
  ("The AI acts before you are ready, or sends something in your name.","Every send, buy, delete, or anything permanent needs your yes, every time."),
  ("Dashboards fill up with made-up sample data.","It shows \"not connected\" instead of inventing emails, events, or numbers."),
  ("You correct the same mistake again and again.","Corrections are written down, and a repeated mistake moves to the top in bold."),
 ],
 features=[
  dict(name="Automated setup", want="Use automated setup: do every step for me and ask yes or no on each choice.", dont="Use manual setup: let me pick every step myself."),
  dict(name="Money tab", want="Include the read-only Money tab if you can reach my spending.", dont="Leave out the Money tab entirely."),
  dict(name="Family question", want="Ask the optional family and generations question.", dont="Skip the family and generations question."),
 ]),
"operating-manual": dict(
 does="Your AI interviews you about 25 short questions, one at a time, then writes a one-page manual on how to work with you, plus a short version for tools with small instruction boxes, and tells you where to paste it.",
 pitfalls=[
  ("You write custom instructions once, from memory, and they miss what actually annoys you.","It interviews you area by area and plays back what it heard so you can correct it."),
  ("Instructions grow into a wall of text no AI follows well.","Each rule is one line, under 450 words in all, with a short version too."),
  ("The AI fills gaps with guesses about you.","If you skip a question, that part is left out. No guessing."),
 ],
 features=[
  dict(name="Shorter interview", want="Keep the interview to about 12 questions, the most important ones first.", dont="Do the full interview, about 25 questions."),
  dict(name="Work and home split", want="Write two versions: one for work tools and one for personal tools."),
 ]),
"leveled-tutor": dict(
 does="Your AI tests where you are, maps 10 to 20 small skills in order, then teaches each one with a real problem first, pointed questions, a plain explanation, and three checks. It will not move on until you get two right in a row.",
 pitfalls=[
  ("Lessons start too easy or too hard.","A short placement test sets your level first."),
  ("You read an explanation, nod, and forget it.","Every skill ends with checks, and earlier skills come back as quick quizzes."),
  ("The AI hands you the answer when you are stuck.","It gives a hint first and explains a different way before moving on."),
 ],
 features=[
  dict(name="Exam prep", want="I am studying for an exam. Use questions in the style of that exam and track my likely score."),
  dict(name="Kid friendly", want="I am teaching a child with this. Use short sentences, warm encouragement, and examples from a child's day."),
 ]),
"red-team-decision": dict(
 does="Your AI restates your decision, asks what would change its view, makes the strongest case for each option, runs a pre-mortem, checks what usually happens, scores the options against your goals, and gives a verdict with a safe first step.",
 pitfalls=[
  ("Asking an AI about a plan gets cheerful agreement.","It is told to be honest, not polite, and to disagree where the evidence does."),
  ("Only two options get compared.","It adds options you missed, such as waiting, a smaller version, or doing nothing."),
  ("Confident numbers that are made up.","It says how sure it is and never invents numbers."),
 ],
 features=[
  dict(name="Money focus", want="Weigh cost and cash flow heavily, and show the worst case in money terms."),
  dict(name="Ask before scoring", want="Wait for my answers to your questions before you score anything.", dont="Do not wait for my answers; give your best read with what you have, then ask."),
 ]),
"family-story": dict(
 does="Your AI prepares warm, specific questions, guides a recorded conversation with an older relative, and turns the transcript into a family story book with chapters and a simple family tree.",
 pitfalls=[
  ("Questions like \"tell me about your life\" get short answers.","It asks small, concrete questions about places, people, and objects that bring stories back."),
  ("Painful memories come up without warning.","It is gentle, lets the person skip anything, and never pushes."),
  ("The recording sits unused on a phone.","It turns the words into a book and a family tree the family can keep."),
 ],
 features=[
  dict(name="For grandkids", want="Write the story book so a child aged 8 to 12 can read it."),
  dict(name="Photo prompts", want="Ask the person to bring 5 old photos and build questions around each one."),
 ]),
"senior-helper": dict(
 does="Turns any AI into a patient helper for someone new to technology: large clear steps, no jargon, one step at a time, a call-family rule for anything risky, and scam awareness built in.",
 pitfalls=[
  ("Steps assume you know where buttons are.","It describes each step by what you see on screen, one at a time, and waits."),
  ("Scammers target new users.","Anything about money, passwords, or urgent messages triggers \"stop and call family\"."),
  ("Jargon makes people feel small.","Plain words, no blame, and patience with repeats."),
 ],
 features=[
  dict(name="Bigger text tips", want="Early on, offer to help make the text bigger on their phone or computer."),
  dict(name="Family contact", want="Name a family member to call: [NAME AND PHONE], and say it whenever something looks risky."),
 ]),
"scam-check": dict(
 does="Paste a suspicious text, email, or call script. Your AI checks it against known scam patterns, rates how risky it looks, explains why in plain words, and tells you the safe next step without clicking anything.",
 pitfalls=[
  ("People click the link to check if it is real.","It never asks you to click or reply, and tells you how to check through the official site or number you already have."),
  ("A confident \"this is safe\" when nobody can be sure.","It gives a risk level and says what it cannot know."),
  ("Advice too technical to act on.","Plain steps: what to do now and what to do if you already clicked."),
 ],
 features=[
  dict(name="I already clicked", want="I may have already clicked or replied. Start with what to do right now to protect myself."),
  dict(name="Teach the signs", want="After the check, teach me the 3 signs that gave it away so I spot the next one."),
 ]),
"paperwork-explainer": dict(
 does="Upload or paste a bill, lease, contract, policy, or official letter. Your AI explains it in plain English, lists every fee and deadline, flags anything unusual, and gives you the questions to ask before you sign or pay.",
 pitfalls=[
  ("A summary skips the one fee or deadline that matters.","It lists every amount and date it finds, separately."),
  ("Plain-English versions quietly change the meaning.","It quotes the exact words next to each explanation."),
  ("You need a lawyer's opinion and get a guess.","It says when something needs a professional and what to ask them."),
 ],
 features=[
  dict(name="Compare two versions", want="I will give you two versions. Show what changed between them, line by line."),
  dict(name="Draft a reply", want="After the explanation, draft a short, polite reply asking my questions."),
 ]),
"research-brief": dict(
 does="Your AI researches a question like a careful analyst: it grades each source, separates strong evidence from weak, shows where sources disagree, and says plainly what is still unknown.",
 pitfalls=[
  ("Made-up sources and quotes.","It must name real sources and say when it cannot check one."),
  ("All evidence treated as equal.","Each source gets a strength grade with a reason."),
  ("A neat answer that hides real disagreement.","Disagreements and unknowns get their own sections."),
 ],
 features=[
  dict(name="Recent only", want="Prefer sources from the last 2 years and say the date of each."),
  dict(name="One-page brief", want="Fit the final brief on one page.", dont="Give the full brief with every source."),
 ]),
"meeting-to-actions": dict(
 does="Paste a transcript or rough notes. Your AI pulls out the decisions, who owes what by when, the open questions, and drafts the follow-up messages ready to send.",
 pitfalls=[
  ("Notes record what was said, not what was decided.","Decisions get their own list, separate from discussion."),
  ("Action items with no owner or date.","Every item needs an owner and a date, or it is flagged as missing."),
  ("Follow-ups never get written.","Drafted messages come with it, ready for you to edit and send."),
 ],
 features=[
  dict(name="Email follow-ups", want="Draft the follow-ups as emails.", dont="Draft the follow-ups as short chat messages."),
  dict(name="Risks list", want="Add a short list of risks and blockers someone mentioned."),
 ]),
"build-website": dict(
 does="Your AI walks you from nothing to a live website on your own domain using free hosting, explaining each step, writing the pages from what you say, and checking it live at the end.",
 pitfalls=[
  ("Tutorials assume you know code.","It explains every step in plain words and writes the code for you."),
  ("Surprise costs.","It asks before anything costs money and tells you to check current prices."),
  ("The site works on a laptop but breaks on phones.","It checks the live site on a phone-sized screen before calling it done."),
 ],
 features=[
  dict(name="No domain yet", want="I do not own a domain yet. Help me pick one and compare first-year and renewal prices."),
  dict(name="Business site", want="It is a small business site. Include contact details, hours, and a simple way to get in touch."),
 ]),
"writing-voice": dict(
 does="Give your AI samples of your own writing. It builds a style profile (length, tone, greetings, sign-offs, habits) and drafts messages that sound like you.",
 pitfalls=[
  ("AI drafts sound like a robot.","It learns from your real messages, not a description of you."),
  ("It copies phrases from one email into everything.","It learns patterns, not sentences."),
  ("One style for every audience.","It notes how you write to different people."),
 ],
 features=[
  dict(name="Separate work voice", want="Build two profiles: one for work and one for family and friends."),
  dict(name="Keep my quirks", want="Keep my habits, even the imperfect ones.", dont="Polish my habits: fix run-on sentences and filler."),
 ]),
"weekly-review": dict(
 does="Your AI runs a calm 20 minute weekly check-in: what happened, what matters next week, what to drop, and one thing to look forward to.",
 pitfalls=[
  ("Weekly reviews turn into guilt about everything undone.","It asks what to drop, not just what to add."),
  ("Too many priorities.","It narrows next week to three."),
  ("The habit fades after two weeks.","Short, the same steps every week, and something to look forward to."),
 ],
 features=[
  dict(name="Health check", want="Include one question on sleep, movement, and energy."),
  dict(name="Family time", want="Include one question on time with the people who matter most."),
 ]),
"prompt-improver": dict(
 does="Paste a prompt you use. Your AI finds what is missing, interviews you to fill the gaps, rewrites it with a goal, context, steps, output shape, and rules, tests it once, and gives you the final version.",
 pitfalls=[
  ("Rewrites that only add fancy words.","It diagnoses gaps first and fixes those."),
  ("A prompt that looks good but fails in use.","It tests the new prompt on a real example."),
  ("Long prompts that are hard to reuse.","Placeholders in [BRACKETS] and a short version for quick use."),
 ],
 features=[
  dict(name="For claudebomb", want="Shape the final prompt for sharing on claudebomb.com: a title, a one-line summary, and common pitfalls it avoids."),
 ]),
}
