---
title: Rebuilding austinbuhltech.com as One Static Site
slug: personal-site-static-monolith
date: 2026-10-26
description: Next.js, Tailwind, markdown blog, and playable work—all exported to S3 and CloudFront without a runtime server.
author: Austin Buhl
tags:
  - site
  - nextjs
  - aws
---

This domain is my home on the web: **about**, **blog**, **work**, and playable projects like [House of Strategy](/play/hos/)—all one codebase, all static HTML at deploy time.

## What I wanted

- **Fast and cheap** — No always-on Node server for a personal site.
- **Honest content** — Real bio, real repos, no filler “AI slop” copy.
- **Playable work** — Games and tools under `/play/` copied in at build time from `work/`.
- **Simple publishing** — Markdown posts in `content/blog/`, RSS and sitemap generated in CI.

## Stack

- **Next.js** (App Router) with `output: "export"` for a fully static export.
- **Tailwind** for layout and typography—light theme that matches how I actually read long posts.
- **gray-matter + react-markdown** for blog posts (this one included).
- **GitHub Actions** → S3 + CloudFront for hosting.

The monolith is intentional. I don’t need a headless CMS for a handful of essays a year. I need git, preview builds, and deploy hooks.

## What lives here

- **[About](/about/)** — Background, quick facts, resume timeline from my public GitHub profile.
- **[Work](/work/)** — ClassQuip-adjacent open source, HOS, hvit-engine, Cursor tooling.
- **Blog** — Notes like this one: edtech, games, and whatever I’m shipping next.

If you landed from RSS, thanks for subscribing. Everything on the feed is written by me—no guest posts, no content farm.

More projects will show up under **Work** as they graduate from private repos. The bar is “something you can click or run,” not a portfolio wallpaper.
