---
title: "From Prototype to Production in the Browser"
slug: prototype-to-production-in-the-browser
date: 2026-11-16
description: A lean workflow for shipping browser games and simulations—vanilla state, one render loop, tactile UI, and static hosting without drowning in framework overhead.
author: Austin Buhl
tags:
  - engineering
  - games
  - prototyping
---

The best part about building browser-based games and simulations is removing the friction between an idea and a player. There is no App Store review queue, no Steam build pipeline, and no 2GB download. A user clicks a link, and within seconds, they are managing a cap table in [Startup Simulator](/work/startup-sim/) or surviving an inbox crisis in [Executive Email Roulette](/work/eer/).

Shipping fast in the browser, however, requires resisting the urge to over-engineer. When you reach for enterprise web tooling to build a weekend prototype, you end up spending your Saturday configuring bundlers instead of tuning game feel.

Over the past few years of shipping playable simulations—from political campaigns in [2028: Win the White House](/work/white-house-2028/) to social strategy engines in [House of Strategy](/work/hos/)—I’ve settled into a lean, pragmatic workflow that takes a simulation from a blank file to a polished, production-ready web app.

## 1. Know when to skip the heavy frameworks

Modern frontend frameworks like React or Next.js are phenomenal for data-driven dashboards, SaaS apps, and complex routing. For a self-contained simulation or turn-based game, they can often get in the way.

- The virtual DOM overhead: If your simulation updates dozens of counters, probability bars, or map nodes every tick, fighting component re-render cycles and stale closures slows down iteration.
- The build step tax: When you want to tweak a balance formula or test a new event card, waiting for a heavy toolchain or managing dozens of node_modules dependencies kills momentum.

What to do instead: Start with vanilla JavaScript (or TypeScript with a zero-config bundler like Vite if you want type safety) and clean, modular ES modules. For UI-heavy sims—like card games, tycoons, and political maps—standard HTML, CSS Grid, and targeted DOM updates (`textContent`, CSS custom properties, and `data-*` attributes) are blazingly fast and trivial to debug. Save Canvas or WebGL for continuous 60fps physics and spatial rendering.

## 2. Centralize state as a pure data object

The fastest way to ruin a simulation prototype is scattering game state across DOM elements, event listeners, and UI components. If your game logic needs to query the DOM to find out how much cash the player has, you will hit a wall the moment you try to add a save/load system or an AI opponent.

Treat your entire game as a single, serializable JavaScript object:

```javascript
const initialState = {
  turn: 1,
  cash: 50000,
  morale: 85,
  flags: {
    hasRaisedSeed: false,
    boardAngry: false,
  },
  history: []
};
```

Keeping state decoupled from rendering gives you three immediate superpowers:

1. Instant save/load: Serializing a save file is literally `localStorage.setItem('save', JSON.stringify(state))`.
2. Deterministic testing and AI: In a multi-agent sim like House of Strategy, rival AI logic can evaluate hypothetical moves by cloning the state object and running the exact same turn-resolution functions you use for the human player.
3. One-way render loops: Every player action mutates the state, runs validation/consequence rules, and calls a single `render(state)` function. You never have to wonder why the UI is out of sync with the underlying math.

## 3. UI polish that makes a prototype feel like a product

Players judge a browser game within three seconds of the page loading. You do not need custom 3D assets or complex animations to make a web prototype feel cohesive and intentional—you just need strong typography, clear hierarchy, and tactile feedback.

- Constraint your palette: Pick a crisp background, a high-contrast surface color for cards/panels, one primary accent color, and semantic colors for positive/negative deltas (green for cash gained, red for morale lost).
- Use tabular numbers: In any simulation where numbers tick up or down rapidly, add `font-variant-numeric: tabular-nums;` to your CSS. It prevents numbers from jittering horizontally as digits change width.
- Micro-interactions over heavy animations: A 120ms `transform: translateY(-2px)` on button hover, subtle border transitions, and a quick toast notification or floating +10 indicator when a stat changes do 90% of the heavy lifting for game feel.
- Design for mobile viewports early: Half of the people clicking your link from social media or a newsletter will be on their phones. Using CSS Grid with `minmax()` and avoiding hover-only tooltips ensures your sim is playable on a bus ride without a separate mobile build.

## 4. Shipping and zero-friction hosting

A prototype isn't real until someone else can play it via a URL. Because a framework-light simulation compiles down to static HTML, CSS, and JS, deployment is completely free and instantaneous.

- Bundle assets inline where possible: Keep external network requests to a minimum so the game loads immediately, even on spotty connections.
- Host on static edge networks: Platforms like GitHub Pages, Cloudflare Pages, or Vercel let you push to main and have a live, globally cached URL in under 30 seconds.
- Add basic telemetry (without being creepy): You don't need invasive tracking, just lightweight, privacy-friendly analytics to see if players are actually making it past Turn 5 or bouncing on the tutorial screen.

## Start smaller than you think

The biggest trap in solo game and simulation development is building an engine instead of a game. Build the core loop first—get a single button mutating a state object and updating a number on screen within your first twenty minutes. Once the math is fun in plain text, layer on the CSS polish, package it up, and ship the link.

[Browse playable sims on Work →](/work/)