---
title: "Live Class Attendance Is a Clock Problem (Not a Checkbox)"
slug: live-class-attendance-is-a-clock-problem
date: 2026-11-09
description: Why K–12 compliance wants "time in room" but your stack only tracks logins—and the reconciliation pattern that keeps audits, teachers, and WebRTC sessions from disagreeing.
author: Austin Buhl
tags:
  - edtech
  - classroom
  - webrtc
  - compliance
  - engineering
---

District administrators rarely ask, “Did the student click Join?” They ask whether the student was **instructionally present for the required duration**—often with language tied to state funding, truancy rules, or virtual-school charter language. Teachers hear that as a checkbox at the end of period. Engineers hear it as a timestamp column. Neither group is wrong. **They're measuring different clocks.**

This post is about the gap between those clocks: why passive attendance breaks in production, what auditors actually look for, and how to model “time in room” so it survives Chromebooks, firewall-induced reconnects, and roster sync that lags behind the LMS.

If you already live in LTI launches and OneRoster enrollments, pair this with [OneRoster and LTI 1.3 in Plain English](/blog/oneroster-lti-plain-english/)—that article covers *who* is allowed in the room; this one covers *how long the room thinks they stayed*.

## Three clocks that never agree

In a live virtual class, at least three independent time sources are running:

1. **The LMS session** — browser tab open, launch JWT issued at *T₀*, refresh tokens on their own cadence.
2. **The media session** — WebRTC peer connection up/down, ICE restarts, mute/video state, SFU participant events.
3. **The compliance record** — district rules: minimum minutes, participation signals, excused absences, manual overrides from the front office.

Each clock can drift:

- A student **joins on time** but their **UDP path dies** at minute twelve; they reconnect at minute fifteen on TCP. Did they leave for three minutes or were they “present” with a frozen tile?
- A teacher **keeps the meeting open** while students work async in breakout tabs. Is the class “in session” or is attendance done at first poll?
- The **SIS export** says enrollment ended yesterday; **LTI still launches** them today because the course shell wasn’t republished.

Checkbox attendance treats all of that as one boolean at period end. Audit-ready logging needs **intervals with evidence**, not vibes.

## What “time in room” means in an audit

Requirements vary by state and program, but auditors consistently ask variations of:

- **Continuous presence** vs. **aggregate minutes** within a window (e.g., “90% of synchronous block”).
- **Participation** vs. **connection**—was audio/video used, was chat active, did they submit an in-class artifact?
- **Who attested**—teacher mark, system-derived, or hybrid with dispute workflow.
- **Immutability**—can a row be edited after funding claims are filed?

Engineering mistake #1: storing `joined_at` and `left_at` from the client’s `Date.now()` and calling it compliance. Client clocks skew. Tabs sleep. Students share devices. **Server-authoritative intervals** with reconciled join/leave events are table stakes.

Engineering mistake #2: conflating **authentication** with **presence**. An LTI launch proves identity at a moment; it does not prove the student remained in the instructional context for the whole period unless you bind presence to **context id** and **session generation** (not just user id).

Engineering mistake #3: ignoring **partial attendance**—arriving ten minutes late or leaving for nurse’s office is normal. Your model needs **segments**, not one row per day.

## Presence is an event stream, not a row

Treat attendance like metrics: append-only events, derived intervals, explicit rules.

Minimal event vocabulary that has survived real fire drills:

| Event | Emitted by | Why it matters |
|-------|------------|----------------|
| `context.launch` | LTI/OIDC | Identity + course binding at *T₀* |
| `media.connected` | SFU / client ack | Instructional channel actually up |
| `media.disconnected` | SFU / heartbeat timeout | Honest gap start |
| `media.reconnected` | SFU | Gap end (new segment or merge rule) |
| `participation.signal` | App (poll answer, hand raise, chat) | “Engaged” vs. “connected” |
| `teacher.override` | Teacher UI | Human attestation with reason code |
| `roster.inactive` | OneRoster sync | Stop accruing even if tab still open |

**Derive** `presence_segments` from that stream with a policy function:

```text
segment_start = max(launch_time, roster_active_from)
segment_end   = min(left_time, roster_active_to, period_end)
billable      = sum(connected ∩ [segment_start, segment_end]) per district rules
```

The policy function is product, not plumbing—but the stream is what lets you **replay** a disputed day when a parent emails the superintendent.

## WebRTC makes gaps honest (and painful)

Low-latency class video on **budget Chromebooks** spends a lot of time in degraded mode: CPU throttling, tab discarding, TURN-only paths when UDP is filtered. From an attendance engine, that looks like **chatter**:

- Rapid connect/disconnect pairs inside one minute.
- Long gaps with no disconnect event because the tab was frozen, not closed.
- Duplicate participants if the student opens a second device “because the first one froze.”

Design choices that help:

**Server-side liveness.** Heartbeats from the SFU or your signaling layer, not “last packet seen” inferred only on the client. If the client can’t speak, the server should still know the participant slot went stale.

**Grace windows.** Merge gaps shorter than *N* seconds when ICE restarts are expected; split gaps longer than *M* minutes when policy says the student left instructionally.

**Device deduplication.** Same user id + same context + overlapping intervals → flag for teacher review instead of double-counting minutes.

**Explicit “still here” participation.** Optional lightweight signals (button tap, poll) during long silent work blocks so “connected but muted for 45 minutes” doesn’t become a compliance fight.

These patterns show up in [how we think about the live classroom stack](https://www.classquip.com) because the failure mode isn’t “video looked bad”—it’s “funding record says absent, parent has a screenshot of the canvas.”

## The bell schedule is part of your schema

School time is not UTC midnight to midnight. **Period boundaries**, early release, assemblies, and snow-day schedule swaps change when a segment counts.

If your attendance logic only knows “calendar date,” you will:

- Accrue minutes **after** the bell that ended 4th period.
- Apply **Friday minimum** rules on the wrong Friday when block schedules rotate.
- Ship **daylight-saving bugs** once a year in districts that still run local wall clocks.

Model **instructional_day_id** + **period_id** (or block id) on every derived interval. Tie period end to the district’s bell table, not the teacher clicking “End class” five minutes early because the bus hallway was loud.

That sounds bureaucratic. It’s the difference between “our app works in demos” and “our app works when the assistant principal runs the truancy report.”

## Reconciling with roster truth

[Roster drift](/blog/oneroster-lti-plain-english/) doesn’t stop at launch. A student can be **in the LMS roster** but **inactive in your OneRoster copy**, or the reverse.

Attendance policy needs a precedence rule, documented and testable:

1. Stop accrual when roster says inactive, even if media still connected? (Common for funding safety.)
2. Allow accrual from launch only, trusting LMS ahead of batch roster? (Common for same-day adds.)
3. Hold minutes in **pending** until the next sync confirms enrollment?

There is no universal right answer—only **consistent** answers your audit export can explain in one sentence.

## What to hand administrators (and what to hand teachers)

**Administrators** want exportable intervals tied to `sourcedId`, section ids, and policy version (“we used rule set 2025-virtual-GA v3”). They want replay.

**Teachers** want a **single screen** that says “these three students need a human decision” with suggested reasons: late join, long gap, dual device, roster inactive. They do not want twenty columns of ICE states.

Split the UX. One pipeline, two projections.

## Checklist for engineers shipping “automatic attendance”

- [ ] Server-authoritative timestamps on all presence events.
- [ ] Segments, not one boolean per day; late arrival and early dismissal as first-class cases.
- [ ] LTI context (and deployment) bound on every segment, not just user id.
- [ ] Media connect/disconnect distinct from login; grace rules for ICE restart.
- [ ] Participation signals optional but defined when funding language requires “engagement.”
- [ ] Teacher override with reason code and audit trail.
- [ ] Period/bell schedule ids on derived minutes.
- [ ] Roster inactive stops or holds accrual per documented precedence.
- [ ] Export schema versioned; replay job can rebuild a disputed day from the event log.

## Closing thought

Live class attendance feels like paperwork until it isn’t—until it’s the record a district stakes funding on, or the data a parent uses to prove their kid was in class when the client said they weren’t.

The checkbox is the UI. Underneath, it’s **clock synchronization across LMS, media, roster, and bell schedule**—a boring distributed systems problem with very un-boring consequences.

If you’re wiring similar systems, [say hello](mailto:abuhl@classquip.com) or browse more [engineering notes](/blog/) on edtech and real-time stacks. And if you’re debugging launches and roster drift first, start with the [OneRoster/LTI plain-English guide](/blog/oneroster-lti-plain-english/)—then come back here when the question turns from “who got in?” to “how long were they actually there?”
