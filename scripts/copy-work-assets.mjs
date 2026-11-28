import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicPlay = join(root, "public", "play");

mkdirSync(publicPlay, { recursive: true });

/** slug → source folder under work/ */
const projects = [
  { slug: "hos", dir: "hos" },
  { slug: "eer", dir: "eer" },
  { slug: "startup-sim", dir: "startup-sim" },
  { slug: "white-house-2028", dir: "white-house-2028" },
  { slug: "greenhouse-tick", dir: "greenhouse-tick" },
  { slug: "internet-empire", dir: "internet-empire", distOnly: true },
];

function resolveBuildId() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return String(Math.floor(Date.now() / 1000));
  }
}

/** Append ?v= to relative ESM imports so deploys bust browser module cache (not just game.js). */
function stampRelativeEsmImports(dir, buildId, touched = new Set()) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      stampRelativeEsmImports(path, buildId, touched);
      continue;
    }
    if (!name.endsWith(".js")) continue;
    let text = readFileSync(path, "utf8");
    const next = text.replace(
      /from\s+(["'])(\.\.?\/[^"']+\.js)(\?[^"']*)?\1/g,
      (match, quote, rel, query) => {
        if (query) return `from ${quote}${rel}${query}${quote}`;
        return `from ${quote}${rel}?v=${buildId}${quote}`;
      }
    );
    if (next !== text) {
      writeFileSync(path, next);
      touched.add(path);
    }
  }
  return touched;
}

const buildId = resolveBuildId();

let copied = 0;
for (const { slug, dir, distOnly } of projects) {
  const src = join(root, "work", dir);
  if (distOnly) {
    const dist = join(src, "dist");
    if (!existsSync(dist)) {
      console.warn(
        `Skip ${slug}: work/${dir}/dist missing (run npm run build:internet-empire before copy-work)`
      );
      continue;
    }
  } else if (!existsSync(src)) {
    console.warn(`Skip ${slug}: work/${dir} missing`);
    continue;
  }
  const dest = join(publicPlay, slug);
  rmSync(dest, { recursive: true, force: true });
  if (distOnly) {
    cpSync(join(src, "dist"), dest, { recursive: true });
  } else {
    cpSync(src, dest, { recursive: true });
  }
  copied += 1;
  if (slug === "startup-sim") {
    const indexPath = join(dest, "index.html");
    let html = readFileSync(indexPath, "utf8");
    html = html.replace(
      /\/play\/startup-sim\/game\.js(\?[^"']*)?/,
      `/play/startup-sim/game.js?v=${buildId}`
    );
    writeFileSync(indexPath, html);
    const stamped = stampRelativeEsmImports(dest, buildId);
    writeFileSync(
      join(dest, "build-id.txt"),
      `${buildId}\n${new Date().toISOString()}\n`
    );
    const gameJs = readFileSync(join(dest, "game.js"), "utf8");
    if (!gameJs.includes(`?v=${buildId}`)) {
      console.error("startup-sim: game.js missing build id on module imports");
      process.exit(1);
    }
    console.log(`Startup Simulator cache bust: ${buildId} (${stamped.size} module files stamped)`);
  }
}

console.log(`Copied ${copied}/${projects.length} playable project(s) to public/play/`);
