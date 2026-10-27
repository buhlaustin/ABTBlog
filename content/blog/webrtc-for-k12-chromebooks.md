---
title: Why I Built a WebRTC Stack for K–12 Chromebooks
slug: webrtc-for-k12-chromebooks
date: 2026-10-18
description: Seven years in edtech ops showed me where video platforms break—and what we built at ClassQuip instead.
author: Austin Buhl
tags:
  - classquip
  - edtech
  - webrtc
---

Before ClassQuip, I spent more than seven years in K–12 platform operations at Stride (K12). Most of that time wasn’t glamorous architecture reviews—it was watching live classes fail on the hardware and networks schools actually have.

Budget Chromebooks. Shared home Wi‑Fi. Thirty students joining at once because attendance rules said they had to. The big-box video products weren’t designed for that world. They assumed stable bandwidth, modern laptops, and IT teams with time to babysit every session.

## What kept breaking

Three patterns showed up again and again:

1. **Client weight** — Heavy web clients or plugins that choked low-spec devices.
2. **Cost** — Per-seat pricing that made districts treat live video as a luxury instead of a default.
3. **Compliance friction** — When video drops, someone in the district office still has to prove the kid was “present.”

I didn’t set out to become a media engineer. I set out to remove those failure modes.

## What we built instead

At [ClassQuip](https://www.classquip.com) I architected a custom AWS WebRTC media path tuned for K–12: lighter on the client, aggressive about reconnects, and priced closer to **$0.50 per seat** than enterprise conferencing tiers.

That meant owning the pipeline—signaling, TURN/STUN strategy, simulcast decisions, and the boring ops work of making “it works on a five-year-old Chromebook” a requirement instead of a nice-to-have.

We also wired the product into how schools already work: **LTI 1.3** and **OneRoster** so live sessions aren’t a sidecar app teachers forget to open.

## Why I’m writing about it here

This site is where I put the experiments that don’t belong in a SOC2 packet—games, simulations, open source. But the through-line is the same: **build software that survives real rooms, real kids, and real budgets.**

If you’re wrestling with the same problems—drop rates, seat math, or attendance tied to live video—I’m always happy to compare notes. Find me on [LinkedIn](https://www.linkedin.com/in/austinbuhl20) or [GitHub](https://github.com/buhlaustin).
