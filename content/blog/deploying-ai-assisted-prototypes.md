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

I've been living in that gap lately. Half-finished dashboards, wizard flows, and clickable mocks that went from idea to demo because a model wrote the boring glue while I argued about product details. Deploying them taught me the same lesson production software always teaches, just faster: the hard part isn't writing code anymore. It's proving the right bytes left your machine and arrived intact on someone else's.

This isn't a platform maturity guide. It's what I do when the audience is a friend, a teammate, or Future Me three weeks from now who forgot which branch was "the real one."

## The failure mode is now "merged but not lived"

Before agents, prototypes often died of neglect: nobody deployed because setup took an afternoon. Now prototypes die of false confidence. You fixed the bug. CI went green. You merged. You told someone to refresh. They still see the old behavior and assume you lied.

That specific sting happened to me on a secondary settings panel in a client-heavy SPA. The source fix was obvious once you read it: a variable used in a template before it existed in that function. Tests passed on main. The deploy workflow finished green. I still got the same stack trace in the console, line number and everything, as if the merge never happened.

The live site was running new `app.js` and stale `modules/SettingsPanel.js`. The entry file had a cache-busting query param from an earlier manual edit. Every nested `import './modules/Whatever.js'` did not. Browsers treat those as different cache keys. AI didn't cause that bug; AI-speed development made me ship the fix and move on without noticing that my hosting story and my module graph disagreed.

That's the prototype deploy problem in one sentence: you can outrun your own release mechanism.

## Decide what "shipping" means before the agent rewrites half the tree

Assistants are context-hungry. Ask for a deploy fix and you might get a blog draft, a workflow tweak, and a refactor in a JSON loader because they looked related. None of that is wrong. It's just not all one artifact.

I split "source of truth for tinkering" from "what the build copies into the thing the host actually serves."

Throwaway experiments live in a source tree you do not serve directly—something like `work/invoice-wizard/` in a monorepo, or `packages/demo-ui/` if you split packages. A build step copies only that folder into whatever directory your host uploads (`public/…`, `dist/…`, an asset prefix inside a Next app). The deployable unit is the build output, not the whole repo and not the raw source folder.

That boundary does two jobs:

- Deploy size stays predictable.
- You have a place to say no when a session starts editing files that aren't part of the prototype's public surface.

Agents don't naturally respect product boundaries; directories do.

If your prototype is a single Next route plus static assets, same idea: one folder or one route group owns the demo. The pipeline publishes that slice. Everything else can be broken on `main` without taking down the link you sent your coworker.

## One pipeline, no heroic scripts

The prototypes I actually share are the ones where deploy is merge (or push) and wait. Not "SSH in and remember the rsync flags."

My personal site flow is deliberately dull:

- Install deps, run lint-ish checks, run a domain-specific smoke script.
- Copy assets, build whatever the host expects, upload or let CI publish that output.
- If the host caches aggressively, purge or bust caches in the same step—not as a separate ritual you forget.

The prototype doesn't earn a second deploy path. If the only way to ship is a script in your notes app, you won't ship when you're tired.

Dull has a side benefit when AI is in the loop. The model can propose workflow YAML or a new npm script, but the human rule is simple: every change to how the thing runs must pass through the same front door. Otherwise you can't tell whether main is broken or your laptop-only shortcut is broken.

Major eng orgs preach the same thing under different names. Stripe talks about making the default path the safe path. Cloudflare engineers write postmortems around automation gaps, not around "Dave ran a command once." For a weekend spike, the scale is smaller; the psychology isn't.

## CI is the contract, not the badge

Green CI on a prototype repo is not virtue signaling. It's a contract with tomorrow-you.

I run a headless smoke script before the site build copies demo assets. It imports modules the way the browser will, exercises a few flows that used to break production, and exits non-zero on any throw. That test added maybe twenty minutes the first time I wrote it. It has since paid for itself in incidents that never reached a user because merge was blocked.

Playwright against a local static server is the next layer if you have UI affordances that only exist after click wiring (tabs, modals, canvas). I don't skip straight to browser tests. Import-level smoke is cheaper and catches the dumb ReferenceErrors agents leave behind when they split a function and forget half the destructuring.

The mistake I see in AI-assisted teams is treating CI as "typecheck and vibes." For prototypes, pick three user stories that must not regress. Encode them as data in the smoke script, not as a markdown checklist in the PR description nobody rereads.

## Cache is part of your API surface

If you ship native ES modules without a bundler, you have two audiences: the JavaScript engine and every cache layer between you and the user. Those audiences do not negotiate.

Entry-point cache busting alone is a trap. The user downloads fresh `app.js`, which statically imports `modules/SettingsPanel.js` with a bare URL. That nested file can sit in disk cache for days. Your invalidation pattern might not even name it if you only version the HTML shell.

Fixes that actually stick, in order of preference:

- Bundle to one file when the prototype is small enough that build time doesn't hurt. One hashable artifact; caches become simple.
- If you stay unbundled, stamp a build id on every relative import at copy or build time. Same id on the script tag in `index.html`. Write the id somewhere public (`build-id.txt`) so a confused user can paste what they loaded without opening devtools rituals.
- If you must ship quick without tooling, accept that you're debugging cache until you add stamping. Don't argue with people about hard refresh. They're telling you your deploy isn't complete.

After we stamped imports with the git short SHA in the copy step, the broken settings panel vanished for anyone who actually loaded a new build. Not because users became more diligent. Because the dependency graph carried the version.

## Secrets, LLM calls, and the static-site fiction

Agents love to inline API keys into client components because that's the fastest route to a working demo. For a prototype you'll show in a Zoom, that's tempting. For a prototype you'll email as a URL, it's a bill and a bot magnet.

My split: static HTML/JS for anything that doesn't need custody of secrets. A tiny HTTP endpoint for anything that does—a route on your app server, a serverless function, an edge worker, whatever your stack already has. The static files stay public; the key stays server-side. The front end calls your route; the route calls the model API; nothing sensitive ships in the bundle.

If you're not there yet, ship without the LLM feature. A prototype with the AI button greyed out beats a prototype that leaks a key in `NEXT_PUBLIC_` and invites abuse.

Environment variables in serverful Next routes follow the same rule: server-only names, no symmetry with client bundle env. Agents will conflate them unless you grep for `NEXT_PUBLIC` before merge.

## Staging, previews, and the "which commit is live" problem

When only you click the link, deploying `main` on every merge is fine. When someone else tests while you sleep, you need a story they can understand without a Slack thread archaeology degree.

Options, from light to heavier:

- Same host, path prefix for staging (`/preview/…` or a subdomain). Build artifact from `main` vs from a named branch. Document which URL is canonical in the README one-liner agents can't delete if it's in the repo root.
- Preview deploy per PR if your host supports it. Vercel, Netlify, and similar platforms made that normal for frontends. Rolling your own static host works too; you just pay in YAML and DNS until pain justifies the wiring.
- When you only have production, ask people to read `build-id.txt`—the small file next to the demo's `index.html`. Support emails get easier when they paste that instead of guessing which build they loaded.

AI increases branch churn. More PRs, more half-finished ideas. Previews matter because "try main" is no longer obvious when main moved four times since lunch.

## Rollback without theater

Prototypes will break in public. The goal is ten-minute recovery, not zero incidents.

What works at small scale:

- Keep the previous build artifact for one version if your host allows it, or redeploy the last known good commit from git. Pick one and write it in six words in the deploy doc.
- Tag releases when you show something important. `git tag demo-nov-13` costs nothing.
- Don't migrate production databases for a prototype that doesn't have production users. If you need persistence in the browser, version client-side state and fail loudly on mismatch instead of silent corruption.

Rollback is a product feature for demos. If a stakeholder can click the broken build, being able to say "revert landed, give it ninety seconds" beats debugging under pressure while they watch.

## What agents get wrong about deploy (so you check for it)

Models are strong at local reasoning and weak at distributed consequences unless you spell them out. Before merge, I skim for:

- New static imports without a corresponding copy step or public path.
- Client bundles touching secrets.
- Fixes that only work with `next dev` (middleware assumptions, server-only imports in client components).
- Assumptions that a cache purge at the edge refreshes every nested module URL the browser might still have locally.
- Missing migration for client state when the stored JSON shape changed.
- Feature flags nobody will turn off because the prototype only has one environment.

None of that requires a security team. It requires a human diff habit: deploy-shaped questions, not syntax questions.

## Observability for things that aren't worth Datadog

Full observability stacks are overkill for a browser prototype. Minimum viable truth:

- Public build id.
- Client-side errors you can reproduce (keep `console.error` on render failures; swallowing errors makes remote debug impossible).
- One health check if you have a backend (even `GET /health` returning ok).
- Optional: a single analytics event on "app booted" so you know anyone loaded the thing after deploy.

That's enough to answer "is anyone on the new build" without paying for a dashboard.

## When to stop calling it a prototype

Graduation isn't a bigger platform. It's when the cost of being wrong exceeds the cost of structure.

Signals I use:

- Real users with data they care about → schema migrations, backward compatibility, changelog discipline.
- Money or compliance → separate staging, secret rotation, access logs.
- More than one person deploying → kill laptop scripts, enforce code review on workflow files.
- Repeated cache or config incidents → invest in bundling or infrastructure as code, whichever actually fixes the class of bug.

Until then, a boring static deploy, one smoke test, stamped imports, and a rollback sentence are enough. Fancy infrastructure won't fix a panel that still loads last week's JavaScript.

## What I still don't do

- Containerize a static export because it sounds professional.
- Add feature flags for every half-baked idea; I branch in git instead.
- Block deploy on a hundred eslint rules when five behavioral tests catch what users would notice.
- Pretend AI output is reviewed because I "vibed" with it in the editor. Review is checking deploy shape: artifacts, caches, secrets, smoke paths.

## Close

AI gets you to "it works here" faster than any toolchain I've used before. Deploy is still the act of deciding what "it" is and making strangers load the same graph of files you tested, through the same caches, with the same build id.

If your prototype only runs on localhost, the fix is usually smaller than a rewrite:

- Narrow the artifact.
- Wire one pipeline.
- Write one smoke test that would embarrass you if it failed on main.
- Version every module URL if you're not bundling.

The prototypes that graduate are the ones someone else could open without you in the room. The ones that don't aren't failures; they're notes you didn't have to pretend were products.

If you're debugging a similar "merged but not fixed" ghost, start in the network tab, not the model. The code on main is often already right. The caches are just telling an older story.
