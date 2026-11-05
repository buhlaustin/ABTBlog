/**
 * Generates work/startup-sim/data/tasks-public-late-game.json (100 public-company whale tasks).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outPath = join(dirname(fileURLToPath(import.meta.url)), '../data/tasks-public-late-game.json');

const typeSets = [
  ['sales'],
  ['sales', 'marketing'],
  ['product', 'sales'],
  ['marketing'],
  ['sales', 'product']
];

const tasks = [];
for (let i = 1; i <= 100; i += 1) {
  const n = String(i).padStart(3, '0');
  const revMin = 1_500_000_000 + (i % 40) * 125_000_000;
  const revMax = revMin + 2_500_000_000 + (i % 17) * 180_000_000;
  tasks.push({
    id: `public-whale-${n}`,
    title: `Public whale desk #${i}: ${revMin >= 5_000_000_000 ? 'mega' : 'giga'} enterprise close`,
    description: `Tier-7 public motion — IR, corp dev, and sales leadership want this in the 10-K narrative.`,
    types: typeSets[i % typeSets.length],
    stages: ['public'],
    tierMin: 7,
    tierMax: 7,
    cost: 250_000 + (i % 12) * 40_000,
    revenue: [revMin, revMax],
    product: i % 3 === 0 ? 1 : 0,
    buzz: 1 + (i % 4),
    whale: true,
    stockPct: Number((0.008 + (i % 5) * 0.004).toFixed(3))
  });
}

writeFileSync(outPath, `${JSON.stringify({ tasks }, null, 2)}\n`, 'utf8');
console.log(`Wrote ${tasks.length} tasks to ${outPath}`);
