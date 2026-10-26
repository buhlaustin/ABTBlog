import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicPlay = join(root, "public", "play");

mkdirSync(publicPlay, { recursive: true });

/** slug → source folder under work/ */
const projects = [{ slug: "hos", dir: "hos" }];

for (const { slug, dir } of projects) {
  const src = join(root, "work", dir);
  const dest = join(publicPlay, slug);
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
}

console.log(`Copied ${projects.length} playable project(s) to public/play/`);
