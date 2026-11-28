import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

execSync("npx tsx work/internet-empire/scripts/smoke-state.ts", {
  cwd: root,
  stdio: "inherit",
});
execSync("npx tsx work/internet-empire/scripts/smoke-2030.ts", {
  cwd: root,
  stdio: "inherit",
});