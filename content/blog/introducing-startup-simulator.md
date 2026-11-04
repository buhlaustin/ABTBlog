---
title: "Introducing Startup Simulator"
slug: introducing-startup-simulator
date: 2026-11-04
description: A turn-based browser tycoon—monthly desk tasks, runway, fundraising, fake tech press, and client-side saves.
author: Austin Buhl
tags:
  - games
  - javascript
  - simulation
---

I just pushed a new browser game to the site: [Startup Simulator](/work/startup-sim/).

It’s a classic turn-based tycoon game. Time moves in months. You pick a name, choose a business model (SaaS, marketplace, consumer app), and try to scale without running out of runway. There’s a standard Career mode with realistic constraints, plus a Sandbox mode if you just want to toy with the levers and start with a massive bank balance.

The core loop happens at your desk:

Every month, you draw a hand of task cards—shipping features, running ad experiments, fixing bugs.

You only have a few execution slots, so you have to pick what gets prioritized.

Once your desk is clear, you end the turn.

Payroll runs, rent clears, burn hits your balance sheet, and the calendar flips forward.

Everything else supports that monthly cadence. Hiring isn't an avatar simulator; it’s a headcount spreadsheet. You can't hire anyone while you're still working out of a garage, and landlords won't approve your first commercial lease off one good month—they want recurring revenue. Later on, you recruit executives, manage burn across teams, and handle the administrative drag that comes with scale.

Fundraising lives in its own lane under Finance. You can apply to accelerators, negotiate priced rounds, manage dilution on the cap table, or take a brutal down-round if you mismanage your cash buffer. If you survive long enough, the late game pushes into IPO territory with public stock pricing and liquidity events.

The most fun feature to build turned out to be the press cycle.

At the end of every month, fictional tech blogs and parody social feeds react to whatever you just did. We use an LLM pipeline to generate contextual coverage alongside static fallback templates. Getting it to feel authentic was tricky—early builds were hilarious because letting go of one contractor at a three-person outfit would trigger national front-page layoff panic, or the model would accidentally leak game mechanics into the article copy. We locked down the prompting so the press only sees in-universe context. If you spot a headline that sounds like a developer patch note rather than TechCrunch, let me know.

Under the hood, it’s intentionally lightweight: pure client-side JavaScript, structured static data, local browser saves, and automated tests to make sure buttons don't break between updates. Fast to load, no account required.

It’s not designed to be an MBA masterclass. The cap table mechanics and financial models are streamlined so the pacing stays brisk. The goal was simply to bottle up the familiar beats anyone around startups recognizes: the dead-quiet early days, the high of your first office, the terror of month-end payroll, the tech press getting your story completely wrong, and the round that dilutes you twice as much as the pitch deck suggested.

[Play Startup Simulator →](/work/startup-sim/)
