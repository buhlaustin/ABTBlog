/**
 * Generates work/startup-sim/data/growth-campaigns-public-late.json (~200 paid growth plays).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../data/growth-campaigns-public-late.json'
);

const whaleChannels = [
  'CNBC takeover week',
  'Times Square domination',
  'global CFO roadshow',
  'institutional ETF push',
  'sovereign wealth tour',
  'Olympics sponsorship bloc',
  'F1 title partnership',
  'Super Bowl halftime adjacency',
  'Davos pavilion blitz',
  'NYSE bell tour'
];

const midChannels = [
  'podcast network buy',
  'creator marketplace burst',
  'retail media coop',
  'campus ambassador wave',
  'partner co-marketing grid'
];

const campaigns = [];

for (let i = 1; i <= 200; i += 1) {
  const n = String(i).padStart(3, '0');
  const isWhale = i <= 90;
  const tierMin = isWhale ? 7 : 4 + (i % 4);
  const tierMax = 7;
  let cost;
  let revMin;
  let revMax;
  if (isWhale) {
    cost = 800_000 + (i % 20) * 450_000;
    revMin = 400_000_000 + (i % 35) * 95_000_000;
    revMax = revMin + 1_200_000_000 + (i % 11) * 220_000_000;
  } else {
    cost = 40_000 + (i % 15) * 18_000;
    revMin = 80_000 + (i % 25) * 45_000;
    revMax = revMin + 400_000 + (i % 9) * 120_000;
    if (i % 7 === 0) {
      revMin = 2_000_000 + (i % 10) * 800_000;
      revMax = revMin + 8_000_000 + (i % 6) * 1_500_000;
    }
  }

  const channel = isWhale
    ? whaleChannels[i % whaleChannels.length]
    : midChannels[i % midChannels.length];

  campaigns.push({
    id: `growth-public-late-${n}`,
    title: isWhale ? `${channel} (${i})` : `${channel} — wave ${i}`,
    description: isWhale
      ? 'Late-stage public blitz — IR, brand, and enterprise pipeline in one expensive month.'
      : 'Mid/late growth lever with spend that scales with your funding era.',
    cost,
    revenue: [revMin, revMax],
    buzz: isWhale ? 4 + (i % 3) : 2 + (i % 3),
    tierMin,
    tierMax,
    ...(isWhale
      ? {
          whale: true,
          stockPct: Number((0.006 + (i % 6) * 0.003).toFixed(3))
        }
      : {})
  });
}

writeFileSync(outPath, `${JSON.stringify({ campaigns }, null, 2)}\n`, 'utf8');
console.log(`Wrote ${campaigns.length} campaigns to ${outPath}`);
