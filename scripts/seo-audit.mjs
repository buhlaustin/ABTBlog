/**
 * Fails the build if marketing copy embeds the bare domain where a human title belongs.
 * Canonical URLs in site config, sitemap, RSS links, and infra are allowed.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scanRoots = [
  join(root, "src"),
  join(root, "content", "blog"),
];

const allowPathFragments = [
  "/lib/site.ts",
  "/lib/seo.ts",
  "/app/sitemap.ts",
  "/app/robots.ts",
  "site-config.mjs",
];

const bannedInTitles =
  /title:\s*["'`][^"'`]*austinbuhltech\.com|defaultTitle.*austinbuhltech|<title>[^<]*austinbuhltech|channelDescription.*austinbuhltech\.com|Personal site — writing and work at/i;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx?|md|mjs)$/.test(name)) files.push(p);
  }
  return files;
}

const violations = [];
for (const base of scanRoots) {
  for (const file of walk(base)) {
    if (allowPathFragments.some((frag) => file.includes(frag))) continue;
    const text = readFileSync(file, "utf8");
    if (bannedInTitles.test(text)) {
      violations.push(file.replace(root + "/", ""));
    }
  }
}

if (violations.length) {
  console.error("SEO audit failed — domain appears in user-facing title/description copy:");
  for (const v of violations) console.error("  -", v);
  process.exit(1);
}

console.log("SEO audit OK");
