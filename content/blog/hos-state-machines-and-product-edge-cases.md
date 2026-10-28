---
title: "I Shipped Big Brother Rules in the Browser—What State Machines Taught Me About Real Products"
slug: hos-state-machines-and-product-edge-cases
date: 2026-10-28
description: House of Strategy’s finale chain, jury timing, and spectator mode are a case study in boring wiring—and why that wiring is the product.
author: Austin Buhl
tags:
  - games
  - hos
  - engineering
---

[House of Strategy](/play/hos/) looks like a text game about alliances and eviction nights. Under the hood it’s a season-long state machine with more edge cases than most MVPs ever survive in production—and building it reminded me why “unglamorous” logic is where real software lives.

## The rules are the contract

When we moved HOS from an eleven-player Survivor-style loop to **sixteen houseguests** and **Big Brother** mechanics, the product spec wasn’t art or copy. It was a contract:

- Jury seating when the house hits defined thresholds—not “when it feels dramatic.”
- **Double eviction** at most once per season, only when the cast is small enough that pacing still works.
- **Final 3** as a multi-part Head of Household chain, then a jury vote—not a single comp and a coin flip.
- Saves that must load mid-season without corrupting finale state.

Every one of those rules is a branch in code. Miss a branch and players don’t get a cool glitch—they get a **soft-lock** or a season that ends with no winner. That’s the same failure mode as a live class that loses roster context mid-period: the user doesn’t care about your architecture; they care that the session can finish.

## Phase machines beat “if week then…”

The weekly loop is familiar: social days → HOH comp → nominations → veto → eviction → week boundary. That’s easy to demo once. It’s hard to maintain after ten features.

We kept an explicit **phase** on game state and drove the UI from it—what buttons exist, whether the player can act, whether AI runs unattended. The lesson generalizes: in edtech, “mode” might be teacher-present vs. student-breakout vs. async review; if you encode mode implicitly in scattered booleans, you will ship a bug where attendance still logs while video thinks everyone left.

Finale mode got its own sub-phase enum: round-one comp, round-two comp, head-to-head, final eviction pick, jury vote, complete. Mixing that into the weekly `switch` was tempting and wrong. **Nested state machines** (season phase × finale phase) mirror how districts think: school year structure with exam windows that override the normal bell schedule.

## Edge cases are the feature

The work that took the longest wasn’t flavor text—it was:

**Evicted player, season continues.** Do you fast-forward silently or let someone watch the feed? We chose spectator flow with optional simulate-to-end—because the human story matters even when you’re out. Product parallel: alumni observers, subs, co-teachers who aren’t “in roster” but need read-only truth.

**Player on the jury at finale.** The vote must count; simulating the rest of the season must not discard it. One missing parameter on `runJuryVote` and your “automation” lies about the outcome.

**Double eviction nights.** Two HOH cycles in one in-game week resets flags in an order that’s easy to get wrong—second eviction pending, veto state, comp winners. This is the game version of “we extended the period block but the SIS still thinks period two ended.”

**Save format versioning.** Old eleven-player saves can’t load into sixteen-player jury rules. Failing loudly beats silently seating the wrong jury.

None of that shows up in a trailer. All of it shows up in trust.

## AI is cheap; invariants are expensive

HOS has AI houseguests with personalities and vote logic. That code gets attention because it’s fun. The **invariants** are what kept me up:

- Active count before eviction determines jury eligibility.
- Final 3 requires exactly three actives before finale start.
- HOH doesn’t vote on eviction; ties break via HOH choice.
- Finale pick must advance phase to jury vote or abort with a resolved winner.

In ClassQuip, the analogues are roster-driven presence, role-aware permissions, and “this session cannot close until compliance record is written.” Fancy models and codecs don’t matter if invariants fail.

## What I’d do again

1. **Name phases and document transitions** before adding UI polish.
2. **Write the nasty scenarios first**—evicted juror, mid-finale load, simulate-rest— not as afterthought QA scripts.
3. **Keep player-visible state aligned with internal state** (week/day labels during finale caused real confusion until we synced labels).

If you play a season and hit a weird week, [open an issue](https://github.com/buhlaustin/ABTBlog)—but also notice how often the fix is a state transition, not a new button.

Games are a low-stakes place to practice the discipline production systems demand: the rules are arbitrary, but they must be **total**—every state has a next state, and no user should need a refresh to finish the story.
