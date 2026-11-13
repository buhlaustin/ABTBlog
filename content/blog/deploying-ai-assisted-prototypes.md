---
title: "Shipping prototypes you mostly built with AI help"
slug: deploying-ai-assisted-prototypes
date: 2026-11-13
description: How I get AI-sped browser prototypes onto a real URL without pretending they're production—one pipeline, one smoke test, and a deploy that matches what you actually changed.
author: Austin Buhl
tags:
  - engineering
  - devops
  - prototyping
---

Speed is the whole point of leaning on agents and autocomplete for a first cut. You can have a playable thing in a day. The part that still bites people is the gap between "runs on my laptop" and "someone else can open a link without you screen-sharing."

I'm not talking about enterprise platform engineering. I'm talking about the side project, the internal demo, the "we hacked this in Cursor and now the VP wants to click it" moment. The methods that work for me are boring on purpose.

## Treat the prototype as one artifact, not the whole repo

AI-assisted sessions love to touch five folders because you asked for "a small fix" and the model wandered. Before you deploy, decide what actually has to ship. For browser toys that's often a static tree or a single Next route plus copied assets, not every experiment in the monorepo.

I keep playable stuff under something like `work/` and copy only what the build needs into `public/` at build time. The deploy artifact is whatever `npm run build` emits, not your entire git history. That separation matters twice when AI has been editing both the game and the blog in the same branch.

## One path to production, no mystery branches

Prototypes die when the demo runs on "that machine" with hand-rolled `scp` and a forgot-to-document env var. Pick one pipeline early: push to main (or a named deploy branch), CI runs the same command every time, hosting syncs the output.

Here that's build, smoke, sync to object storage, invalidate the CDN. The prototype doesn't get a special snowflake script you'll never run again in three weeks. If deploying is one button or one merge, you'll actually do it while the idea still matters.

## Smoke tests that match user behavior, not file existence

Agents are great at adding files. They're mediocre at proving the happy path still works. I want a script that imports the modules, runs a few representative game states, and fails the build if something throws. Not a thousand assertions—enough that "CEO tab renders after IPO" or "launch schedule works in small office" can't regress silently.

Playwright on top is optional gravy for UI wiring. The headless import test is the guardrail that catches the ReferenceError you didn't see because you had hot reload open for six hours.

## Versioning for anything loaded as ES modules

This one burned me recently. We fixed a bug in a nested `Ceo.js`, merged, deployed, CloudFront invalidated—and people still hit the old file because only the entry script had a cache-busting query string. Nested imports didn't.

If your prototype is plain modules in the browser, version every relative import at build time or bundle the thing. "Hard refresh" is not a deployment strategy. AI won't remind you; the browser will.

## Environment and secrets stay out of the prototype

Don't let the agent paste API keys into client-side code because the demo "needs one fetch." Prototype deploy should work with public env only, or a tiny server route that holds the key server-side. If the prototype can't ship without a secret in the bundle, pause and split backend from frontend before you share the URL.

For narrative or LLM features I've used a Lambda behind API Gateway so the static site stays static. More moving parts, but you can hand someone a link without handing them your OpenAI bill.

## Staging is worth it when the audience isn't you

If only you will click it, production on every merge is fine. If a client or a teammate will poke at it while you're asleep, give them a stable staging host or a preview deploy per PR. The goal is to stop explaining which commit is live. AI churn makes that confusion worse, not better.

## Roll back in your head before you ship

Keep deploys reversible: previous build still in the bucket, or git tag on what went out, or "flip DNS back" documented in one sentence in the repo. Prototypes break in public constantly. The win isn't never breaking; it's fixing in ten minutes without panic.

## What I don't do

I don't run a full security audit on a weekend sim. I don't containerize a static site because it sounds grown-up. I don't leave seventeen feature flags for a prototype nobody has used yet.

I do make deploy boring, copy only what ships, and run one smoke test that would have embarrassed me if it failed on main. AI gets you to "it works here" faster than ever. The deploy method is still you deciding what "it" is and making sure the next person loads the same bytes you did.

---

Side projects that survive a real deploy end up under [Work](/work/). If one of yours is still localhost-only, the fix is usually narrower than you think: smaller artifact, one pipeline, one smoke test that would embarrass you on main.
