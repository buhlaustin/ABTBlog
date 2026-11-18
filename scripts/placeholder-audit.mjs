/**
 * Fails the build if unresolved placeholder tokens remain in marketing copy.
 * Set ALLOW_PLACEHOLDERS=1 to skip (local verification builds).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.ALLOW_PLACEHOLDERS === "1") {
  console.log("Placeholder audit skipped (ALLOW_PLACEHOLDERS=1)");
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scanRoots = [join(root, "src"), join(root, "content")];

const skipFiles = new Set([
  join(root, "content", "case-studies", "_template.md"),
]);

const tokenRe =
  /\[(PRICE|BOOKING_URL|CLIENT_NAME|METRIC[^\]]*|TESTIMONIAL|LMS_LIST|HOURS_OR_DAYS|RESPONSE_TIME|START_WINDOW|ADD_OTHERS|confirm)\]/g;

function walk(dir, files = []) {
  if (!statSync(dir).isDirectory()) return files;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (skipFiles.has(p)) continue;
    if (statSync(p).isDirectory()) walk(p, files);
    else if (/\.(tsx?|md|mjs)$/.test(name)) files.push(p);
  }
  return files;
}

const hits = [];
for (const base of scanRoots) {
  if (!statSync(base, { throwIfNoEntry: false })?.isDirectory()) continue;
  for (const file of walk(base)) {
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      tokenRe.lastIndex = 0;
      if (tokenRe.test(lines[i])) {
        hits.push(`${relative(root, file)}:${i + 1}`);
      }
    }
  }
}

if (hits.length) {
  console.error("Placeholder audit failed — resolve or allow placeholders:");
  for (const h of hits) console.error("  ", h);
  process.exit(1);
}

console.log("Placeholder audit OK");