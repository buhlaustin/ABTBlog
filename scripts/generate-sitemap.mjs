import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { readFileSync, readdirSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = "https://austinbuhltech.com";

const staticPaths = ["/", "/about/", "/blog/", "/work/"];

const blogDir = join(root, "content", "blog");
const blogSlugs = readdirSync(blogDir)
  .filter((f) => f.endsWith(".md"))
  .map((filename) => {
    const raw = readFileSync(join(blogDir, filename), "utf8");
    const { data } = matter(raw);
    return data.slug ?? filename.replace(/\.md$/, "");
  });

/** Keep in sync with `slug` entries in src/lib/work-registry.ts */
const registrySrc = readFileSync(join(root, "src/lib/work-registry.ts"), "utf8");
const workSlugs = [...registrySrc.matchAll(/^\s*slug:\s*"([^"]+)"/gm)].map((m) => m[1]);
if (workSlugs.length < 3) {
  throw new Error("Could not parse work slugs from work-registry.ts for sitemap");
}

const urls = [
  ...staticPaths,
  ...blogSlugs.map((s) => `/blog/${s}/`),
  ...workSlugs.map((s) => `/work/${s}/`),
];

const body = urls
  .map(
    (path) => `  <url>
    <loc>${siteUrl}${path}</loc>
  </url>`,
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(join(root, "public", "sitemap.xml"), xml);
console.log("Generated public/sitemap.xml");
