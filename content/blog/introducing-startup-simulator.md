---
title: "Introducing Startup Simulator"
slug: introducing-startup-simulator
date: 2026-11-04
description: A long look at the garage-to-IPO tycoon on this site—what you do each month, how fundraising and headlines work, and why I built it as plain browser modules next to HOS and Executive Email Roulette.
author: Austin Buhl
tags:
  - games
  - javascript
  - simulation
---

I shipped a new game on the site: [Startup Simulator](/work/startup-sim/).

If Executive Email Roulette is one bad inbox day, and House of Strategy is a whole season of social chess, this one is the spreadsheet fantasy a lot of us quietly have after reading too many founder threads. You name a company, pick a category, hire (eventually), close months, watch fake tech press write about you, and try not to run out of cash before the cap table gets weird. The win condition is not “feel like a genius.” It is hit the milestones that unlock the next chapter, and if you play long enough, file an IPO or cash out while the ticker still has a pulse.

This post is the tour I would give a friend over coffee: what the game is, how a month actually plays, and how it is wired underneath without turning into a README.

## Same house, different room

All three games live in the same building on austinbuhltech.com. HOS and EER are already there. Startup Simulator follows the same hosting pattern: the playable build is static HTML and JavaScript under `/play/startup-sim/`, and the `/work/startup-sim/` page is basically a frame that points at it. When I run `npm run dev` locally, Next serves the site; when I run a production build, a copy step drops the game into `public/play/` so CloudFront can serve it like any other asset.

That choice is intentional. I wanted another game I could iterate on without fighting a framework inside the game loop. The sim is ES modules, one `game.js` entry that delegates to smaller modules, JSON data for tasks and categories, and CSS that does not depend on React. The blog and work index stay in Next; the tycoon stays portable.

## What you are actually playing

Startup Simulator is single-player. There is no multiplayer market, no real-time tick, and no day-trading minigame inside the week. Time moves in months. Each month you get a finite number of desk tasks—things that cost money, might bring revenue, and move product level and buzz—plus a pile of actions that do not consume those slots: staffing drafts, fundraising buttons, office leases, social posts, board chores, and so on.

You lose in the boring way startups lose: cash goes negative and the run ends. You win in the glamorous way startups win on paper: cumulative revenue and valuation milestones unlock the next stage, and eventually you can go public and step down with a payout tied to your remaining founder shares.

Two modes matter at the start:

Career mode gives you $120,000 and standard friction. Sandbox mode gives you a much larger starting balance if you want it, optional tuning knobs (extra revenue multiplier, starting stage, a lower IPO gate for quick experiments), and softer penalties. Sandbox cash is not the same as revenue earned. Both modes track lifetime revenue from zero for gates like accelerator unlock, office tiers, and the IPO window. I kept that rule because otherwise a billion-dollar sandbox wallet would skip the entire middle of the game without trying.

At setup you also pick a category—B2B SaaS, marketplace, fintech, consumer social, and several others. Categories change labels and economics defaults (how harsh costs feel, what task themes show up). They are data-driven, not ten separate codebases.

## The month loop, in plain language

When a month begins, the game deals you tasks. In the garage you might only have four slots; later stages widen the desk. Recent versions make you choose your lineup from a wider offer pool each month—think of it as picking which fires you will actually fight before the month starts—then confirm the lineup before work counts.

You click tasks, pay costs, roll outcomes. Revenue from tasks lands immediately in cash. Product level and buzz creep up and quietly make future tasks pay better. When every counted task is done, you close the month.

Closing the month is where the tycoon happens:

Payroll and rent hit based on your last finalized headcount and your current workspace tier. The game snapshots monthly revenue into MRR and ARR-style numbers you will care about for office gates. Board sentiment moves based on how the month went. If you are public, the stock gets a monthly tick. Crises may appear. Then the calendar advances, new tasks arrive, and—important for vibe—the world reacts.

Headlines generate. Social feeds update with NPC posts. You read them in tabs, not as cutscenes.

Staffing is deliberately spreadsheet-y. You do not manage fifty named engineers. You adjust department counts in a draft table—engineering, product, sales, marketing, finance, support—and preview payroll against last month’s revenue before you commit. Executives are separate: C-suite hires sit outside the headcount cap and draw their own salary line.

## Garage loneliness and the first lease

You start in a garage. You can ship tasks, but you cannot hire employees until you lease real space. That sounds punitive; it is pacing. The first office unlock is tied to recurring revenue, not a one-off lucky task, so you feel the difference between cash in the bank and a business that repeats.

Workspace tiers are purchased, not automatically granted when revenue spikes. Small office, medium, large, and eventually a city hub each have ARR gates and prerequisites. Rent stacks into monthly burn. Headcount caps rise with the tier. A hub is endgame real estate: expensive, huge cap, and narratively “we made it” even before the IPO button lights up.

Sandbox can start you past the garage if you explicitly choose that in tuning. Career mode makes you earn the keys.

## People, executives, and the cap table fantasy

The People tab is where burn becomes real. Marketing heads increase how much your go-to-market tasks resonate. Sales heads help revenue multipliers. Engineering nudges product outcomes. None of this is a deep HR sim—there are no performance reviews for individual NPCs—but the departments matter arithmetically, which is the kind of abstraction I wanted.

Executives are the newer layer on top. Once you have office space, you can open C-suite seats. At a small office you might only have one; at a hub you can build a wide bench. You pick a title—COO, CFO, whatever you type in—and the game generates four candidates from large randomized name and “former company” pools so runs do not all hire the same person. Pick one; they join the org chart and add payroll.

Fundraising lives under Finance, not on the desk. The fictional accelerator (“XC”) unlocks at an ARR threshold, involves a short application scored by the narrative API when it is available, and on acceptance deposits a SAFE-style slug of cash and starts a residency arc. After batch, you choose a hub city with modifiers, close priced rounds, and watch the cap table rewrite itself with seed, Series A, and Series B templates. Down rounds hurt if timing and sentiment are bad.

The Finance panel also tracks lifetime revenue, lifetime expenses, lifetime profit, your starting cash as “initial investment,” and a paper founder stake at the current valuation times your remaining percentage. That last number is founder porn, but it anchors the fantasy: you are not only watching cash, you are watching dilution.

## Product, boardwork, and things that are not tasks

Product level and buzz are the quiet stats that reward consistency. Desk tasks still matter most, but the Product tab now also has paid campaigns—influencer spends, a hackathon, a publicity stunt—that trade cash for buzz (and sometimes product) outside the task deck. I added those because playtests showed months where players wanted to push narrative heat without burning a scarce task slot on marketing again.

The Board tab is three governance chores per month—legal review, audit prep, investor update, that sort of thing—implemented as its own small task list with costs and sentiment bumps. It is the “adult in the room” layer that keeps you from ignoring the board score when you chase growth.

Growth itself surfaces rival pressure, sentiment meters, and advisor chat. The advisor is a chief-of-staff tone bot: suggestive, not authoritative, grounded in a snapshot of your company when the API is live.

Crises interrupt months sometimes—binary choices with economic effects—so not every year is smooth exponential curves.

## News, social, and the fourth wall

This game wants to feel like you are living inside tech media and founder Twitter, without importing real trademarks or real people’s names into the fiction.

Each month-end, the client asks the shared narrative service for a batch of articles when production AI is enabled. Offline, it writes deterministic parody news. Either way, the design goal is the same: articles should read like they belong to the world—Macrohard, Financier Times, Chirp Business—not like they are describing game UI. A lot of engineering effort went into a separate narrative context object that strips sandbox mode, desk tasks, “level 1 product,” and other meta from what the model sees, plus layoff rules that do not treat two employees becoming one as “half the company is gone.” Social feeds get monthly NPC posts too, with their own API kind when deployed.

You can also post from the company account on ProNet (professional) and Chirp (short). Player posts can pick up AI reactions referencing recent headlines. It is flavor, but flavor you notice when it misfires, so I treat it like gameplay QA, not a garnish.

Personas, timeline seeds, and competitor names live in JSON beside the code. The competitor is a recurring rival in your category who can show up in headlines when the sim feels like piling on.

## Progression without a single ladder

There is still a stage variable—garage, office life, XC arc, post-XC scaling, public company—but progression is not “revenue crossed a line, congratulations, new wallpaper only.” Office quality is purchased. ARR gates XC, medium space, large space, and the hub. Lifetime revenue still gates the big story beats in career pacing, and sandbox can shorten the IPO distance if you configure it.

IPO itself is a finance milestone: enough lifetime revenue (by default a billion dollars earned, not cash on hand), sentiment and metrics checks, filing, lockup, monthly stock simulation, optional cash-out ending with a press line and a stats screen. Hall of fame on the title screen remembers good runs locally.

## How it is built (the part for the curious)

Source of truth for development is `work/startup-sim/`. Files are grouped by concern:

- `game.js` boots the app, wires click handlers, and owns session flow (new game, load save, end month).
- `modules/` holds domain logic: calendar, tasks, finance, staff, fundraising, news, social, IPO, crises, and so on.
- `data/` holds tasks, categories, hubs, board tasks, exec name pools, personas, crisis decks, and a seeded real-world-adjacent timeline for headline color.

State is one big JSON object in memory, versioned for saves (`SAVE_VERSION` increments when migrations are required). `localStorage` persistence autosaves as you play; continue on the title screen reloads and normalizes old saves so they do not brick when I add fields like executive rosters or lifetime expense tracking.

Tasks are the most heavily data-driven piece. There is a large `tasks.json` with stage- and category-aware pools. Smoke tests in CI count how many unique deals each stage/category combination can roll so I do not accidentally ship a month with one repeatable task. Wiring audit script grep-checks that every button id rendered in modules is handled in `game.js`, which sounds pedantic until you ship a “Finalize staffing” button that does nothing on mobile.

Randomness is mostly transparent rolls on task outcomes, not hidden AI for core math. AI is for language: news, social, advisor replies, XC interview scoring, IPO day press. The client calls the same Lambda URL as House of Strategy and Executive Email Roulette (`startup_news_month`, `startup_social_month`, `startup_social_reactions`, `startup_advisor_chat`, and friends). If the API is down, the game keeps running on offline templates. I prefer that to blocking month-end on a network call.

The site build runs smoke tests and asset validation before copy. Playwright walks a new game through completing a task, saving, reloading, and opening each tab so empty panels do not reach production silently. AI smoke against production is optional in CI because keys and origins are finicky, but the Lambda deploy workflow ships prompt changes when I adjust narrative behavior.

Visuals are staged backgrounds and icons (garage, office, skyline, hub cities) with a11y affordances—skip links, tab panels, keyboard shortcuts for power users. Nothing here is a AAA art budget; the clarity target is “you always know what month it is and why you cannot close it yet.”

## What I was optimizing for

I did not set out to simulate venture capital accurately. Real cap tables are stranger than my templates. I set out to make the emotional beats feel familiar: the first hire, the first lease, the accelerator acceptance message, the down round shame, the headline that misquotes your headcount, the month where payroll exceeds revenue and you stare at the runway line.

If you want a tight satire game, play Executive Email Roulette. If you want social strategy, play House of Strategy. If you want to name a fake SaaS company after your friend and see whether you can reach a hub tower before the cash runs out, this is the one.

**[Play Startup Simulator →](/work/startup-sim/)**

If you break it, find a save that will not load, or get a headline that mentions “sandbox mode” in the body text, tell me. That fourth wall stuff is a bug, not a feature—and the kind of detail I only catch when people play for real.
