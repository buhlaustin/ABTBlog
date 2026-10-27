---
title: House of Strategy — Big Brother Rules in the Browser
slug: house-of-strategy-big-brother-browser
date: 2026-10-22
description: A text-based social strategy game with HOH, veto, jury, and Final 3—built for fun and for testing narrative systems.
author: Austin Buhl
tags:
  - games
  - hos
  - javascript
---

I’ve always liked competition shows where the game is social, not just reflexes. **House of Strategy** (HOS) is my take: a single-player, text-driven season inspired by **Big Brother**—alliances, nominations, Power of Veto, a jury of seven, and a three-part Final Head of Household chain before the jury picks a winner.

You can [play it in the browser](/play/hos/) or read the [project write-up](/work/hos/).

## Why a browser game?

Most of my day job is infrastructure: WebRTC, LMS integrations, reliability under load. HOS is deliberately the opposite—pure narrative and state machines in vanilla JavaScript, no build step in the game folder itself.

It’s a sandbox for:

- **Relationship graphs** — trust, grudges, promises kept or broken.
- **AI personas** — floaters, aggressors, loyalists voting differently under pressure.
- **Weekly rhythm** — social days, comp night, veto, live eviction, double eviction weeks when the house gets small.

## Big Brother rules, not Survivor

Recent seasons on this site use **16 houseguests** (you plus fifteen AI players), jury starting when the house hits nine, and optional **double eviction** once the cast is down to eight. The finale is a full **Final 3** comp chain—not a fire-making contrivance tacked on at the end.

If you get evicted, you can still **watch the feed** as a spectator, skip to eviction night, or simulate the rest of the season. If you make jury, you cast the vote that matters.

## Side project, serious craft

HOS started as a fork of an older 11-player prototype. The audit passes you don’t see in a blog post—save format versioning, spectator mode, jury edge cases—are the same discipline I apply to production edtech, just with more fake drama in the story log.

Try a season on [Normal](/play/hos/) difficulty, turn double eviction on, and see if you can win without burning every bridge. I’d love to hear how your jury vote went.
