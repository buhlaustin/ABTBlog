/**
 * Build acquisition-targets.json — 99 acquire-able companies (11 category rivals + 88 targets).
 * Run: node scripts/generate-acquisition-catalog.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'work/startup-sim/data/acquisition-targets.json');

const RIVALS = {
  'b2b-saas': 'CloudLedger',
  'consumer-social': 'VibeCircle',
  marketplace: 'GigRabbit',
  delivery: 'DashDrop',
  fintech: 'NeonBank',
  'ai-tools': 'Promptly AI',
  hardware: 'BrickWorks',
  healthtech: 'MediMesh',
  edtech: 'LessonLoop',
  climate: 'GreenStack',
  'gaming-media': 'LootLoop'
};

const SMALL_PREFIX = [
  'Pixel',
  'North',
  'Harbor',
  'Swift',
  'Lumen',
  'Atlas',
  'Cedar',
  'Nova',
  'Drift',
  'Echo',
  'Forge',
  'Hatch',
  'Kite',
  'Mosaic',
  'Parallel',
  'Quartz',
  'Relay',
  'Signal',
  'Tangent',
  'Uplink'
];

const MID_SUFFIX = [
  'Systems',
  'Works',
  'Cloud',
  'Labs',
  'Dynamics',
  'Analytics',
  'Platform',
  'Network',
  'Holdings',
  'Group'
];

const ENTERPRISE_SUFFIX = [
  'Global',
  'International',
  'Consolidated',
  'Industries',
  'Enterprises',
  'Corporation',
  'Partners',
  'Capital'
];

const NICHES = [
  'payroll APIs',
  'niche CRM',
  'vertical SaaS',
  'data pipeline',
  'customer support',
  'inventory sync',
  'loyalty program',
  'field service',
  'subscription billing',
  'identity layer',
  'workflow automation',
  'document AI',
  'status pages',
  'email deliverability',
  'feature flags',
  'observability',
  'contract management',
  'procurement',
  'revenue recognition',
  'partner portals'
];

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const companies = [];
let idx = 0;

for (const [categoryId, rivalName] of Object.entries(RIVALS)) {
  idx += 1;
  companies.push({
    id: `acq-rival-${categoryId}`,
    name: rivalName,
    isRival: true,
    rivalCategory: categoryId,
    segment: 'enterprise',
    baseMrr: 420_000,
    basePrice: 48_000_000,
    description: `Your category rival — acquisition removes market friction and adds their book of business.`
  });
}

while (companies.length < 99) {
  const n = companies.length + 1;
  const roll = n % 10;
  let segment;
  let baseMrr;
  let basePrice;
  let name;
  const niche = NICHES[n % NICHES.length];

  if (roll <= 5) {
    segment = 'small';
    const pre = SMALL_PREFIX[n % SMALL_PREFIX.length];
    name = `${pre} ${niche.split(' ')[0]} Co.`;
    baseMrr = 800 + (n % 40) * 120;
    basePrice = 180_000 + (n % 50) * 22_000;
  } else if (roll <= 8) {
    segment = 'mid';
    const pre = SMALL_PREFIX[(n + 3) % SMALL_PREFIX.length];
    const suf = MID_SUFFIX[n % MID_SUFFIX.length];
    name = `${pre} ${suf}`;
    baseMrr = 12_000 + (n % 35) * 1_800;
    basePrice = 2_200_000 + (n % 40) * 180_000;
  } else {
    segment = 'enterprise';
    const pre = SMALL_PREFIX[(n + 7) % SMALL_PREFIX.length];
    const suf = ENTERPRISE_SUFFIX[n % ENTERPRISE_SUFFIX.length];
    name = `${pre} ${suf}`;
    baseMrr = 85_000 + (n % 30) * 12_000;
    basePrice = 18_000_000 + (n % 25) * 2_400_000;
  }

  companies.push({
    id: `acq-${String(n).padStart(3, '0')}-${slug(name).slice(0, 32)}`,
    name,
    segment,
    baseMrr,
    basePrice,
    description: `Profitable ${niche} — steady subscribers, light integration work.`
  });
}

writeFileSync(
  out,
  `${JSON.stringify({ version: 1, companies: companies.slice(0, 99) }, null, 2)}\n`
);
console.log(`Wrote ${companies.length} acquisition targets to ${out}`);
