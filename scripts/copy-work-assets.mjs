import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicWork = join(root, "public", "work");

mkdirSync(publicWork, { recursive: true });

const projects = ["hos"];

for (const slug of projects) {
  const src = join(root, "work", slug);
  const dest = join(publicWork, slug);
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
}

console.log(`Copied ${projects.length} work project(s) to public/work/`);
