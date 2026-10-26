# austinbuhltech.com

Personal site monolith for [Austin Buhl](https://github.com/buhlaustin): marketing pages, blog, and hosted projects under `/work`.

- **Production URL:** [austinbuhltech.com](https://austinbuhltech.com)
- **Stack:** Next.js (static export), Tailwind CSS, Markdown blog
- **Deploy:** S3 + CloudFront — see [docs/deploy-aws.md](docs/deploy-aws.md)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Hosted project assets live in `work/` (source of truth). `npm run prebuild` copies them to `public/play/` (e.g. `/play/hos/index.html`) so they do not collide with Next routes under `/work/[slug]/`.

## Adding hosted work

1. Create `work/<slug>/` with your app (static entry HTML or assets).
2. Register the project in `src/lib/work-registry.ts` (`kind: "hosted"`, `hostedEntry`).
3. Add the slug to `scripts/copy-work-assets.mjs` `projects` array.
4. Add a route entry in `scripts/generate-sitemap.mjs` or extend it to read the registry.

## House of Strategy (HOS)

Game source is in `work/hos/`. Canonical development happens in **this repo**; the [original HOS repository](https://github.com/buhlaustin/HOS) is no longer the source of truth for the hosted version.

Play at `/work/hos/`.

## Blog

Posts are Markdown files in `content/blog/` with frontmatter (`title`, `date`, `description`, optional `slug`, `tags`).
