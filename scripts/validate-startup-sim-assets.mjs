import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gameRoot = join(root, 'work', 'startup-sim');
const manifestPath = join(gameRoot, 'assets', 'manifest.json');

if (!existsSync(manifestPath)) {
  console.error('startup-sim: missing assets/manifest.json');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (err) {
  console.error('startup-sim: invalid manifest JSON', err.message);
  process.exit(1);
}

const assets = manifest.assets ?? [];
if (!Array.isArray(assets) || assets.length < 1) {
  console.error('startup-sim: manifest must list at least one shipped asset');
  process.exit(1);
}

let failed = false;
for (const entry of assets) {
  if (!entry.path || !entry.license) {
    console.error('startup-sim: asset missing path or license', entry);
    failed = true;
    continue;
  }
  const file = join(gameRoot, entry.path);
  if (!existsSync(file)) {
    console.error('startup-sim: manifest path not found:', entry.path);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`startup-sim: validated ${assets.length} manifest asset(s)`);
