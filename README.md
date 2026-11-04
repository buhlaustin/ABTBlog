# austinbuhltech.com

Personal website for [Austin Buhl](https://github.com/buhlaustin): about, blog, and hosted projects under `/work`.

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
4. Register the slug in `src/lib/work-registry.ts` (sitemap is generated from the registry at build time via `src/app/sitemap.ts`).
5. Add a Next route under `src/app/work/<slug>/page.tsx` using `workPageMetadata()` from `src/lib/work-seo.ts`.

## House of Strategy (HOS)

Game source is in `work/hos/`. Play at `/work/hos/`. Upstream history lives in [buhlaustin/HOS](https://github.com/buhlaustin/HOS).

## Blog

Posts are Markdown files in `content/blog/` with frontmatter (`title`, `date`, `description`, optional `slug`, `tags`).

## SEO

- Site-wide defaults live in `src/lib/site.ts`; per-page metadata uses `pageMetadata()` in `src/lib/seo.ts`.
- `npm run audit:seo` fails the build if the bare domain appears in marketing titles/descriptions.
- `robots.txt` and `sitemap.xml` are emitted by Next at build time (`src/app/robots.ts`, `src/app/sitemap.ts`).
