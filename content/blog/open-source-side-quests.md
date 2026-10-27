---
title: Open Source Side Quests — HVIT, Paxel, and Pong
slug: open-source-side-quests
date: 2026-10-20
description: Physics simulations, Cursor Cloud tooling, and patriotic Pong—projects that keep my engineering instincts sharp.
author: Austin Buhl
tags:
  - open-source
  - python
  - javascript
---

Not everything I build ships inside ClassQuip. Some repos exist because a question was interesting, a tool was missing, or I wanted a break from production dashboards without stopping coding entirely.

## hvit-engine

[hvit-engine](/work/hvit-engine/) is a particle-mesh framework for modeling relativistic stellar collisions near black holes—compressible plasma hydrodynamics, HVIT kinetic signatures, Python with AMUSE and CUDA when you need throughput. It’s far from edtech, and that’s the point: a different domain keeps me honest about abstractions and performance tradeoffs.

## Cursor Cloud → Paxel

The [Cursor Cloud to Paxel Converter](/work/cursor-cloud-to-paxel-converter/) is an unofficial bridge: export Cursor Cloud Agent transcripts, convert to Paxel’s format, upload for reflection. I built it because I wanted a paper trail of agent sessions that wasn’t locked inside one UI.

## AmericanPong

On the lighter side, [AmericanPong](https://github.com/buhlaustin/AmericanPong) and the [mobile TypeScript build](https://github.com/buhlaustin/AmericanPongMobile) are patriotic paddle Pong—CPU vs. player, touch controls, campaign modes. They’re reminders that **fun scope** is still scope: input latency, game feel, and shipping something complete matter even when nobody’s paying for seats.

## Why bother open-sourcing

Public repos are résumé, teaching tool, and bug report surface at once. They also feed this site’s **[Work](/work/)** section so visitors can read context before cloning.

If you use one of these tools or fork a repo, open an issue or PR. Side quests get better when someone else shows up with a weirder use case than mine.
