---
title: "Introducing Startup Simulator"
slug: introducing-startup-simulator
date: 2026-11-04
description: A browser tycoon about months, payroll, and fake tech press—and how I built it without putting React inside the game loop.
author: Austin Buhl
tags:
  - games
  - javascript
  - simulation
---

I added a new game to the site: [Startup Simulator](/work/startup-sim/).

It is a tycoon. Time is measured in months. You name a company, pick a category so the task cards say the right kind of thing (SaaS vs marketplace vs whatever), and try to grow without running out of cash. Career mode gives you a normal starting bank balance. Sandbox mode is there if you want to mess around with bigger starting cash and some tuning knobs; it does not skip the revenue milestones that unlock the story beats.

Most of what you do each month fits on a desk. The game deals you more possible tasks than you have slots for, you choose the lineup, then you click through them. They cost money, they might bring money back, they nudge product and buzz along the way. When the desk is clear, you close the month. Payroll and rent hit. The calendar moves. Fake news and fake social posts show up for you to skim.

That is the loop. Everything else hangs off it.

Hiring is a spreadsheet, not The Sims. You set department counts, preview burn, finalize when you are ready. You cannot hire anyone while you are still in the garage; the first office lease wants recurring revenue, not one great task. Offices do not auto-upgrade when you have a good quarter. You buy the next tier when you have earned the gate. Executives are their own thing: separate salaries, separate hires, pick a title and choose someone from a short list of generated candidates so every run is not the same COO.

Fundraising, cap table stuff, accelerator application, priced rounds, down rounds if you time it badly: that lives under Finance. It is deliberately not mixed into the desk slots. Same for leasing space, posting on ProNet and Chirp, board tasks, the occasional crisis card. I wanted month-end to feel like admin catching up with the work you already did.

If you play long enough in career mode, the endgame is IPO territory: hit a billion dollars of ARR (annualized from your recurring revenue, not lifetime cash collected), file, and you are public. The stock ticks once per month after that. You can cash out when you are ready to stop. Sandbox mode can lower the ARR bar if you are testing, not grinding.

The part I did not expect to care about was the press.

After you close a month, parody outlets write about your company. You can post as the company too. When the narrative API is live, a model writes a lot of this; when it is not, offline templates fill in. The numbers that matter for winning and losing are not AI. They are the same rolls and ledgers either way.

Getting the articles to read like articles took longer than I thought it would. Early versions would cheerfully mention sandbox mode or product levels in the body copy because the prompt saw game state, not a company. Worse: playtests with two employees where you let one go would spawn layoff panic headlines every month after, as if you were Meta. I rewired what we send the model (in-world facts only), tightened when layoffs even qualify as news, and added a hard scrub for obvious meta words. It still breaks sometimes. If you see a headline that sounds like a patch note, tell me.

Under the hood it is boring on purpose. The source lives in `work/startup-sim/`: plain ES modules, big JSON files for tasks and categories, one state object in memory, saves in localStorage with a version number when I change the shape. The site copies that folder to static hosting at build time. CI runs a headless smoke pass on task pools and a Playwright script that starts a game, finishes a task, reloads, and clicks through tabs so I do not ship dead buttons again.

I am not trying to teach anyone venture capital. The cap table math is simplified so the game can move. What I wanted was the sequence people recognize if they have been anywhere near a startup: lonely early months, first lease, first hires, accelerator acceptance if you grind the metrics, the month where payroll wins, the article that gets your headcount wrong, the round that dilutes you more than the slide deck implied.

[Play Startup Simulator →](/work/startup-sim/)
