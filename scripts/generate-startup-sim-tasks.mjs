/**
 * One-off generator: append tier-scoped post-XC / public tasks to tasks.json.
 * Run: node scripts/generate-startup-sim-tasks.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'work/startup-sim/data/tasks.json');
const data = JSON.parse(readFileSync(path, 'utf8'));
const existing = new Set(data.tasks.map((t) => t.id));

const templates = [
  { tierMin: 1, tierMax: 2, stages: ['post_xc'], cost: [800, 2500], rev: [8000, 45000], types: ['sales'] },
  { tierMin: 2, tierMax: 3, stages: ['post_xc'], cost: [4000, 12000], rev: [25000, 140000], types: ['sales'] },
  { tierMin: 3, tierMax: 4, stages: ['post_xc'], cost: [15000, 45000], rev: [120000, 650000], types: ['sales'] },
  { tierMin: 4, tierMax: 5, stages: ['post_xc'], cost: [40000, 120000], rev: [450000, 2200000], types: ['sales'] },
  { tierMin: 5, tierMax: 6, stages: ['post_xc'], cost: [80000, 250000], rev: [1200000, 6500000], types: ['sales'] },
  { tierMin: 6, tierMax: 7, stages: ['post_xc', 'public'], cost: [200000, 600000], rev: [4000000, 22000000], types: ['sales'] },
  { tierMin: 3, tierMax: 5, stages: ['post_xc'], cost: [8000, 28000], rev: [60000, 380000], types: ['marketing'] },
  { tierMin: 5, tierMax: 7, stages: ['post_xc', 'public'], cost: [50000, 180000], rev: [800000, 4800000], types: ['marketing'] },
  { tierMin: 2, tierMax: 4, stages: ['post_xc'], cost: [3000, 15000], rev: [18000, 95000], types: ['product'] },
  { tierMin: 4, tierMax: 6, stages: ['post_xc'], cost: [25000, 90000], rev: [200000, 1100000], types: ['product'] },
  { tierMin: 7, tierMax: 7, stages: ['public'], cost: [100000, 400000], rev: [5000000, 28000000], types: ['sales'] }
];

const titles = {
  sales: [
    'Global account pursuit',
    'Seven-figure renewal push',
    'Channel partner summit',
    'Government RFP sprint',
    'Fortune 500 pilot close',
    'Multi-year platform deal',
    'International reseller launch',
    'Strategic alliance signing',
    'Usage-based upsell wave',
    'Enterprise security review win'
  ],
  marketing: [
    'Brand refresh campaign',
    'Analyst briefing tour',
    'Customer conference keynote',
    'Category creation push',
    'Demand gen quarter blitz',
    'Partner co-marketing fund',
    'Executive LinkedIn takeover',
    'Vertical landing page fleet'
  ],
  product: [
    'Enterprise feature gate',
    'Platform API vNext',
    'Reliability quarter push',
    'AI copilot GA',
    'Mobile parity release',
    'Integration marketplace launch'
  ]
};

let added = 0;
for (const tpl of templates) {
  for (const type of tpl.types) {
    for (let i = 0; i < 6; i += 1) {
      const titlePool = titles[type] ?? titles.sales;
      const title = titlePool[(added + i) % titlePool.length];
      const id = `gen-${type}-t${tpl.tierMin}-${added}-${i}`;
      if (existing.has(id)) continue;
      const cost =
        tpl.cost[0] + Math.floor(((added + i) * 997) % (tpl.cost[1] - tpl.cost[0] + 1));
      const rMin = tpl.rev[0];
      const rMax = tpl.rev[1];
      data.tasks.push({
        id,
        title: `${title} (${tpl.tierMin}+)`,
        description: 'Scale-era work sized for your funding stage and HQ footprint.',
        types: [type],
        stages: tpl.stages,
        tierMin: tpl.tierMin,
        tierMax: tpl.tierMax,
        cost,
        revenue: [rMin, rMax],
        product: type === 'product' ? 2 : 0,
        buzz: type === 'marketing' ? 3 : 1
      });
      existing.add(id);
      added += 1;
    }
  }
}

data.version = 2;
writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Added ${added} tasks; total ${data.tasks.length}`);
