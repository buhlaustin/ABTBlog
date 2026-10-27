---
title: "Hello World: Building Real-Time Systems, Tackling EdTech Friction, and Engineering in the Open"
slug: hello
date: 2026-10-27
description: A decade in K–12 edtech ops and real-time software—and why I built ClassQuip and write about the work in public.
author: Austin Buhl
tags:
  - intro
---

I've spent the better part of a decade inside the mechanics of real-time software and K–12 education technology. Most of that time wasn't spent in an ivory tower looking at high-level abstractions—it was spent on the ground level. I've sat on support calls with IT directors at 7:00 AM, listened to virtual teachers navigate mid-lesson software crashes, and watched media streams choke on strict district firewalls and bargain-bin student Chromebooks.

When you spend years supporting educators, administrators, and students through the daily friction of remote and hybrid learning, you stop seeing software as a collection of feature checkboxes. You start seeing it for what it actually is in a classroom: an environment. And in a live instructional setting, if that environment lags, crashes, or forces a teacher to click through three nested menus just to launch a poll, instruction stops. The human connection disappears, replaced by tech support triage.

This blog is where I document what I'm building, how I engineer real-time systems, and the technical lessons learned along the way—from low-level WebRTC pipeline optimizations to interactive browser simulations and open-source tools.

## The Reality of K–12 Tech: High Constraints, High Stakes

It's easy to build software that runs smoothly on a maxed-out M-series MacBook connected to gigabit fiber. It's an entirely different discipline to engineer real-time video, interactive canvas rendering, and automated compliance tracking for a 4GB dual-core Celeron Chromebook running on a congested 3Mbps home Wi-Fi connection.

Yet, that second scenario is the baseline reality for millions of students across the country.

Early in my career supporting platforms like Engageli and Newrow within massive virtual learning operations, the systemic flaws of off-the-shelf virtual classroom architectures became impossible to ignore:

**CPU throttling and hardware bottlenecks:** Traditional web-conferencing platforms rely heavily on client-side canvas manipulation, unoptimized WebGL calls, and heavy JavaScript frameworks. Put 30 video tiles on a budget Chromebook, and the CPU spikes to 100%. The fan spins up, the audio begins to robotize, and the browser tab freezes.

**Strict firewalls and network constraints:** K–12 network environments are notoriously lock-down heavy. UDP traffic is frequently throttled or blocked outright by aggressive district web filters (e.g., Securly, GoGuardian, Lightspeed), forcing fallback to TCP/TLS TURN servers that introduce massive latency.

**Teacher cognitive overload:** The average virtual educator is expected to manage a video feed, chat moderation, screen sharing, external slide decks, attendance tracking, LMS gradebook syncing, and student engagement tools simultaneously. When every tool lives in a separate browser tab or iframe, teachers spend more time managing windows than teaching kids.

**Administrative and compliance friction:** In state-funded virtual schools, attendance isn't just about marking "present." It requires audit-ready time-in-room logging, active participation verification, and seamless synchronization back to Student Information Systems (SIS) via standards like OneRoster and LTI 1.3. When platforms fail to automate this, teachers end up spending hours after school manually compiling attendance spreadsheets.

## Why I Built ClassQuip

Seeing these friction points over and over was the direct catalyst for founding [ClassQuip](https://www.classquip.com). Instead of attempting to layer more features on top of existing, heavy third-party video SDKs, I took a step back and asked a fundamental engineering question: What would a real-time classroom engine look like if it were built from scratch specifically for the strict hardware and network constraints of K–12?

That led to building ClassQuip from the ground up—not as a general video meeting tool with a few education plugins, but as an action-first, unified classroom engine.

### Architectural priorities

**Custom low-bandwidth AWS WebRTC stack:** Rather than routing streams through generic third-party video APIs that add heavy client overhead, we built a custom WebRTC media engine on AWS. By optimizing selective forwarding unit (SFU) architecture, dynamic bitrate adaptation, and packet loss concealment (PLC), we keep latency low on degraded connections while staying lean on budget hardware.

**The single-deck model:** To solve teacher cognitive overload, ClassQuip unifies presentation slides, interactive whiteboards, live AI-driven polls, and exit tickets into a single, cohesive presentation deck. Teachers don't manage five open applications; they advance through a single unified interface that drives the student experience in real time.

**Native AI workflow tools:** Lesson preparation is one of the biggest drivers of teacher burnout. We integrated AI engines directly into the platform flow, allowing educators to generate aligned lesson plans, dynamic comprehension polls, and end-of-class exit tickets on the fly without leaving the browser tab.

**Automated compliance logging:** Attendance is tracked passively and continuously using cryptographic, audit-ready time-in-room logging. District administrators get the compliance data required for state funding automatically pushed straight through OneRoster/LTI connections, completely removing manual logging from the teacher's plate.

## Engineering Beyond the Day Job

While ClassQuip is my core focus, I'm a builder at heart. When I'm not actively working on scalable edtech infrastructure or tuning media pipelines, I'm usually pursuing whatever technical idea won't leave me alone until I build it.

I believe the best engineers are relentless hobbyists—people who build prototypes simply to see how far a browser API can be pushed, or how clean an algorithm can be structured. For me, that manifests in a few key areas:

### 1. Real-time systems and media pipelines

WebRTC is one of the most fascinating and complex ecosystems in modern web development. Dealing with NAT traversal (STUN/TURN), SDP negotiation, congestion control, and audio/video codec hardware acceleration (AV1, VP9, H.264) provides an endless stream of deep engineering challenges. I frequently write about low-level real-time networking, socket architectures, and media pipeline performance.

### 2. Interactive simulations and browser physics

The modern web platform is capable of incredible graphics and physics performance if you treat the DOM and Canvas with respect. I regularly prototype 2D and 3D browser-based simulations, custom rendering loops, and physics engines. Building interactive simulations is one of the purest ways to explore mathematical modeling and real-time state management.

### 3. Open-source tools and prototypes

If I build a utility or developer package that solves a recurring friction point in my own workflow, I release it. Whether it's light WebRTC wrappers, canvas abstraction libraries, or developer productivity scripts, I believe in publishing raw, working code that others can inspect, fork, and learn from.

## What to Expect From This Blog

This isn't a polished corporate PR outlet or a high-level marketing funnel. It's an active workbench—a place to document experiments, share technical breakdowns, and publish raw notes on software craftsmanship.

Moving forward, you can expect long-form posts focused on:

- **Deep dives into WebRTC and infrastructure:** Technical write-ups on low-latency streaming, SFU architecture, and optimizing web performance on memory-constrained devices.
- **EdTech system design:** Analysis of LMS standards (LTI 1.3, OneRoster, SAML/OAuth SSO), data privacy frameworks (FERPA, COPPA), and building compliant software at scale.
- **Browser game engine and simulation experiments:** Case studies and post-mortems on personal game prototypes, custom physics implementations, and WebGL experiments.
- **Product strategy and bootstrapping:** Thoughts on building real software that solves unglamorous, high-friction operational problems for real institutions.

Whether you're a fellow real-time systems engineer, an edtech founder, a district administrator, or just someone who enjoys tinkering with code, I'm glad you're here.

Let's build something that lasts.
