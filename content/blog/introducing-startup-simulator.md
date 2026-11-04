---
title: "Introducing Startup Simulator"
slug: introducing-startup-simulator
date: 2026-11-04
description: Garage to IPO in the browser—months, payroll, fake headlines, and the engineering choices behind a tycoon that runs on JSON and localStorage.
author: Austin Buhl
tags:
  - games
  - javascript
  - simulation
---

There is a [Startup Simulator](/work/startup-sim/) on the site now. You pick a company name, tell the game what kind of startup you are pretending to be, and live inside a calendar where the unit of time is a month. I built it because I wanted the feeling of those founder years—when cash and headcount and a headline you did not write all show up in the same week—without building a spreadsheet and lying to myself about churn.

You can play it in a browser tab. Saves stay in your machine. Nobody else is in your run.

## Founding

Setup asks for a category (B2B SaaS, marketplace, fintech, and the rest). That choice mostly changes the vocabulary on task cards and how punishing costs feel; it is not ten different games under the hood. One data file, many labels.

Career mode starts you with $120,000. Sandbox mode can start you with a silly amount of cash if you want to skip straight to experiments, and it exposes a few knobs—stronger task payouts, a higher starting stage, a lower IPO revenue gate—for people who are testing rather than climbing. Important detail: sandbox starting cash does not count as revenue earned. Milestones still look at lifetime revenue from zero, so you cannot buy your way to an IPO story with a dropdown.

You also enter your name as CEO. That name shows up on the org chart next to whatever executives you hire later. Small thing, but it makes the run feel owned.

## A month

Early on you work out of a garage. The game gives you a handful of desk slots each month—four at first—and a wider pool of possible tasks than you can take. You pick the lineup, confirm it, then work through cards: run a campaign, ship a feature, chase a partnership. Each card spends cash, rolls an outcome, maybe bumps product level and buzz. Revenue from a card hits your balance immediately, not at month-end.

Buzz and product level are quiet multipliers. They are easy to ignore until you notice the same marketing task paying better than it used to.

Plenty of work does not eat a desk slot. Drafting headcount, leasing office space, posting on the fake social networks, closing a funding round, doing board chores—these live in other tabs. The game tries to make the distinction obvious: desk slots are the scarce attention of the month; everything else is the infrastructure you maintain around that attention.

You cannot close the month until every desk task is done. Then payroll and rent land, the game rolls your recurring revenue numbers forward, sentiment shifts, and—if you are public—the stock gets its monthly wiggle. The calendar ticks. New tasks appear. Headlines and social posts populate. You read them like you would on a bad Tuesday, scrolling past commentary that only sort of matches what you think you did.

That rhythm is the whole game. There is no minute-by-minute market. There is no multiplayer. You win or lose on whether you can keep cash above zero long enough to unlock the next chapter, and whether you still want to keep playing once the cap table stops being yours alone.

## Space and headcount

The garage is lonely on purpose. You can grind tasks, but you cannot hire until you lease an office, and the first lease wants recurring revenue, not one lucky month. I wanted the moment where ARR matters to feel different from “we had a good task roll.”

Offices do not upgrade themselves when revenue spikes. You buy tiers—small, medium, large, eventually a city hub—when you clear ARR gates and prerequisites. Rent stacks into burn. Headcount caps rise with the footprint. At a hub you can grow a large team; in a small office you are capped at a handful of people across departments.

Staffing is a table, not a roster of named humans. Engineering, product, sales, marketing, finance, support: you set draft counts, see payroll against last month’s revenue, then finalize. Executives are separate hires with their own salaries and they do not count against the cap. When you open an exec search you pick a title and choose among four generated candidates so different runs do not all hire the same COO.

Layoffs are a finalize action, not a dramatic button. Cut headcount hard enough and the press may notice next month. I spent time on that pipeline because early builds produced absurd stories—two employees becoming one turned into “half the company gone,” repeated for a year. The game now sends the narrative layer in-world facts (actual counts, no sandbox vocabulary) and refuses to treat tiny teams like mass firings.

## Money beyond the bank balance

Finance is where fundraising lives. A fictional accelerator unlocks when your recurring revenue crosses its gate. You fill out a short application; when the narrative API is up, something scores your answers with game leniency, not YC realism. Acceptance drops a SAFE-shaped chunk of cash and starts a residency beat. After batch you pick a hub city with modifiers, then priced rounds rewrite the cap table with template economics—seed, Series A, Series B—with down rounds waiting if sentiment and timing are ugly.

The same panel tracks lifetime revenue, lifetime expenses, lifetime profit, the cash you started with, and a paper value for your founder stake at the last valuation times your remaining percentage. None of that replaces the moment-to-moment fear of runway, but it gives you the second graph founders stare at when cash is fine and ownership is not.

Product work is mostly desk tasks, but you can also pay for campaigns from the Product tab—influencer spend, a hackathon, a stunt—to push buzz without spending another scarce slot on marketing. Board tab gives you three governance tasks a month that cost money and buy board sentiment back when you have been ignoring the room. Crises sometimes drop a binary choice with economic teeth. A rival in your category can heat up. An advisor chat nudges when the API is live.

IPO is the long gate: enough lifetime revenue earned (a billion dollars by default in career), checks on sentiment and metrics, a filing, lockup, monthly stock ticks, and an optional cash-out ending that pays you founder shares times price and shows you the scorecard. Sandbox can lower that revenue bar if you configured it that way.

## Press and feeds

I care about the fiction layer more than I expected when I started. Parody outlets—Macrohard, Financier Times, Chirp Business—write about your company after month-end. You can post as the company on ProNet (long) and Chirp (short); NPCs react when generation works.

Core math is not AI. Outcomes on tasks are rolls you could explain in a design doc. AI is for language: monthly articles, monthly social chatter, advisor replies, interview scoring, IPO day copy. The client calls a narrative endpoint; if it fails, offline templates keep the month moving. I refuse to block “close month” on a network call.

Getting the press to stay in-world took engineering, not prompt wishful thinking. The model used to echo game UI—sandbox mode, product levels, desk tasks—because that is what we sent it. There is now a narrative context built for journalists inside the fiction: headcount, recurring revenue, city, funding stage, plain events. Player-facing logs that mention saves or task slots never go in. When headlines still leak meta, that is a bug I want reported.

Personas, a seeded timeline of fake world events, competitor names, task definitions, crisis cards, executive name pools—all of that lives in JSON next to the code under `work/startup-sim/`. The playable bundle is vanilla ES modules: `game.js` delegates to files for calendar, tasks, finance, staff, news, social, IPO, and the rest. State is one JSON blob in memory, versioned when saves need migration, persisted in localStorage as you play. The site build copies that folder to static hosting; the work page is an iframe entry point.

I am not pretending the architecture is exotic. It is the same discipline as the other browser games on the site: keep the loop in plain JavaScript, keep content in data, test the boring wiring. Smoke scripts count task variety so a category cannot roll the same month forever. A wiring audit greps button ids in the UI modules against handlers in `game.js` because I have shipped dead buttons before. Playwright opens a new game, finishes a task, reloads, walks tabs. None of that is interesting to read about unless you have also lost an afternoon to a “Finalize staffing” control that worked in desktop Chrome and nowhere else.

## Why bother

Real venture math is messier than my templates. The game is not a course. It is a compressed version of familiar beats: first lease, first hire, accelerator acceptance, the month payroll beats revenue, the article that gets your headcount wrong, the down round that feels personal even though it is numbers.

If that sounds like your kind of time sink, [play it here](/work/startup-sim/). If a headline mentions sandbox mode or game levels in the body, send me a screenshot—that means I still have work to do on the fiction layer, and I would rather hear it from you than discover it in a year-old save.
