/**
 * One-off helper: prints pre_launch category task JSON entries.
 * Run: node scripts/generate-prelaunch-category-tasks.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cats = JSON.parse(readFileSync(join(root, 'work/startup-sim/data/categories.json'), 'utf8'));

const specs = {
  'b2b-saas': {
    title: 'Pilot LOI with design partner',
    description: 'SOC2-lite deck and a signed letter of intent with pre-sell deposit.',
    product: 2,
    buzz: 1,
    revenue: [400, 2100]
  },
  'consumer-social': {
    title: 'Creator seed cohort',
    description: 'Twenty micro-creators post early access; pre-sell tips flow through.',
    product: 1,
    buzz: 3,
    revenue: [180, 1400]
  },
  marketplace: {
    title: 'Supply-side pre-launch',
    description: 'Onboard providers before demand shows up — pre-sell listing fees.',
    product: 2,
    buzz: 2,
    revenue: [350, 1900]
  },
  delivery: {
    title: 'Zone launch map + driver waitlist',
    description: 'Draw the first delivery zone; drivers pre-register for shift slots.',
    product: 1,
    buzz: 2,
    revenue: [280, 1600]
  },
  fintech: {
    title: 'Compliance sandbox demo',
    description: 'Bank partner office hours; pre-sell treasury pilot slots.',
    product: 2,
    buzz: 1,
    revenue: [500, 2400]
  },
  'ai-tools': {
    title: 'Eval harness + copilot teaser',
    description: 'Ship evals and a gated copilot waitlist with prepaid credits.',
    product: 3,
    buzz: 2,
    revenue: [320, 2000]
  },
  hardware: {
    title: 'Prototype DVT batch',
    description: 'Ten devices to beta houses; pre-orders fund the next spin.',
    product: 2,
    buzz: 2,
    revenue: [600, 3200]
  },
  healthtech: {
    title: 'Clinic pilot charter',
    description: 'HIPAA checklist and one clinic pre-sell for the pilot cohort.',
    product: 2,
    buzz: 1,
    revenue: [450, 2600]
  },
  edtech: {
    title: 'District champion intro',
    description: 'Teacher advocates and a rostering demo that unlocks pre-sell POs.',
    product: 2,
    buzz: 2,
    revenue: [380, 2200]
  },
  climate: {
    title: 'Site pilot pre-sell',
    description: 'One anchor site and grant-friendly pre-sell milestones.',
    product: 2,
    buzz: 1,
    revenue: [520, 2800]
  },
  'gaming-media': {
    title: 'Creator playtest stream',
    description: 'Early build on stream; pre-sell founder packs in chat.',
    product: 1,
    buzz: 3,
    revenue: [250, 1700]
  }
};

for (const c of cats) {
  const s = specs[c.id];
  if (!s) continue;
  const task = {
    id: `launch-pre-cat-${c.id}`,
    launchPhase: 'pre_launch',
    title: s.title,
    description: s.description,
    types: s.buzz >= s.product ? ['marketing', 'product'] : ['product', 'marketing'],
    stages: ['garage'],
    categories: [c.id],
    cost: 360,
    revenue: s.revenue,
    product: s.product,
    buzz: s.buzz
  };
  console.log(JSON.stringify(task, null, 2) + ',');
}
