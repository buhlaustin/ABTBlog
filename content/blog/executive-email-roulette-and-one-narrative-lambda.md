---
title: "Executive Email Roulette: Reigns in Your Inbox, One Lambda for the Drama"
slug: executive-email-roulette-and-one-narrative-lambda
date: 2026-11-02
description: A new hosted micro-game, a shared OpenAI proxy on static S3 + CloudFront, and the bugs that only show up when CORS and Host headers collide.
author: Austin Buhl
tags:
  - games
  - eer
  - hos
  - engineering
  - aws
---

I shipped **[Executive Email Roulette](/work/eer/)** this week—a Reigns-style game where you’re the interim CEO, five urgent emails land every day, and each one offers two brutal reply buttons. Keep **stock**, **board approval**, **morale**, and **cash** out of the danger zone (0% or 100% on any meter and the board ousts you). It lives on the same static site as [House of Strategy](/work/hos/): no app server, just S3, CloudFront, and a little JavaScript.

The interesting part wasn’t the meters. It was **how to make AI-generated inboxes real** when the whole site is a static export.

## Same monolith, new `/work` slot

EER follows the pattern we use for HOS:

- Source under `work/eer/`, copied to `public/play/eer/` at build time.
- A **Work** card and a full-screen iframe at `/work/eer/`.
- Local content so the game always boots (curated corporate disasters in `EmailDeck.js`).
- Optional **OpenAI** when the narrative API is reachable.

No second repo, no separate deploy pipeline—just another folder in the monolith and one more entry in the work registry.

## One Lambda, two games

Both HOS and EER call the same **Lambda Function URL** behind `HOS_NARRATIVE_API_URL`. The handler branches on `kind`:

- HOS: short host lines and week recaps (`host_line`, `daily_beat`, `week_recap`).
- EER: **`eer_daily_inbox`** returns structured JSON—five emails, two choices each, meter deltas—plus **`eer_ouster_line`** when you finally tank a metric.

The key stays in the existing **ClassQuip** Secrets Manager bundle; GitHub only stores the Function URL for inject at build time. Static site, dynamic copy.

## What broke in production (and why “local fallback” wasn’t the fix)

The first live version looked fine in the menu and then **did nothing** after “AI generation is on.” Three separate failures stacked:

1. **Stale Lambda code** — production still ran an older bundle that didn’t understand `eer_daily_inbox`, so the model returned HOS-flavored prose instead of JSON emails.
2. **Double CORS** — the handler *and* Function URL CORS both set `Access-Control-Allow-Origin`. Browsers reject duplicate values; `fetch` threw and the game never reached the inbox UI.
3. **CloudFront → Lambda Host** — the `/play/hos/narrate` proxy forwarded the viewer’s `Host: austinbuhltech.com`. Lambda Function URLs expect their own hostname and answered **403**, which CloudFront surfaced as your generic S3 404 page.

Fixing it meant deploying fresh Lambda code, dropping ACAO from the handler (let Function URL CORS win), teaching the client to **try the Function URL first** with retries, and adding **Managed-AllViewerExceptHostHeader** on the narrate cache behavior so origin requests get the right Host. Uncaught promise rejections were the reason the UI froze; hardening `fetch` and `loadDayInbox` was non-negotiable even after the API was healthy.

## Lesson for static + AI

If your product is “static front end + one shared AI endpoint,” your real checklist is:

- **Version the Lambda** like any other API—games will add new `kind` values.
- **Treat CORS as a single owner** (Function URL config *or* manual headers, not both).
- **Never let a failed `fetch` abort the game loop**—but also don’t pretend fallback is success; fix the path players are supposed to use.
- **CloudFront in front of Lambda** is a Host-header puzzle; until the proxy is boringly reliable, a direct Function URL with correct CORS is a valid production path.

EER is deliberately small: five emails, four meters, one ouster screen. But it’s the same class of problem as bigger systems—**contracts** (JSON shape, meter bounds), **boring wiring** (phase, inbox index, save format), and **one place** for secrets and AI spend.

If you want to play: **[Executive Email Roulette](/work/eer/)**. If you want the older season-long machine: **[House of Strategy](/work/hos/)**. More hosted experiments will land under **Work** as they graduate from “idea in a folder” to “something you can open in a tab.”
