/**
 * ~200 tier 4–7 growth plays — unique titles, original-scale revenue (no billion bases).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../data/growth-campaigns-public-late.json'
);

const channels = [
  'Bloomberg TV',
  'CNBC Squawk Box',
  'Wall Street Journal',
  'Financial Times',
  'TechCrunch Disrupt',
  'SaaStr Annual',
  'Dreamforce alley',
  'AWS re:Invent',
  'Google Cloud Next',
  'Microsoft Ignite',
  'LinkedIn thought-leadership',
  'YouTube pre-roll',
  'Spotify host-read',
  'Netflix ad tier',
  'Hulu sports adjacency',
  'Reddit AMA week',
  'Discord partner server',
  'Twitch sponsored stream',
  'Substack crossover',
  'Newsletter bundle'
];

const plays = [
  'brand lift sprint',
  'demand gen burst',
  'enterprise pipeline push',
  'developer awareness wave',
  'analyst mindshare blitz',
  'partner co-marketing grid',
  'retail media test',
  'campus hiring funnel',
  'CFO breakfast series',
  'CISO roundtable tour',
  'vertical podcast takeover',
  'industry report sponsor',
  'customer story film',
  'case study roadshow',
  'search keyword siege',
  'ABM account surge',
  'event keynote package',
  'airport terminal domination',
  'transit wrap pilot',
  'stadium jumbotron rotation'
];

const descFor = (channel, play) => {
  const lines = [
    `${channel} — ${play}. Finance asks for attribution; marketing cites “brand.”`,
    `Paid ${play} on ${channel}. Legal clears claims; growth clears the invoice.`,
    `${channel} buys a month of ${play}. Sales wants leads by Friday.`,
    `One-month ${play} through ${channel}. IR watches mentions; ops watches traffic.`,
    `${channel} package built around ${play}. CAC slides get updated reluctantly.`
  ];
  return lines[(channel.length + play.length) % lines.length];
};

const campaigns = [];

for (let i = 0; i < 200; i += 1) {
  const n = String(i + 1).padStart(3, '0');
  const channel = channels[i % channels.length];
  const play = plays[Math.floor(i / channels.length) % plays.length];
  const title = `${channel}: ${play}`;
  const tierMin = i < 60 ? 4 + (i % 3) : i < 140 ? 5 + (i % 2) : 7;
  const tierMax = 7;

  let cost;
  let revMin;
  let revMax;
  if (tierMin >= 7) {
    cost = 650_000 + (i % 18) * 185_000;
    revMin = 520_000 + (i % 14) * 95_000;
    revMax = Math.min(12_000_000, revMin + 1_800_000 + (i % 9) * 420_000);
  } else if (tierMin >= 5) {
    cost = 85_000 + (i % 16) * 22_000;
    revMin = 70_000 + (i % 20) * 38_000;
    revMax = revMin + 650_000 + (i % 11) * 85_000;
  } else {
    cost = 18_000 + (i % 12) * 8_500;
    revMin = 15_000 + (i % 18) * 12_000;
    revMax = revMin + 180_000 + (i % 8) * 35_000;
  }

  const entry = {
    id: `growth-public-late-${n}`,
    title,
    description: descFor(channel, play),
    cost,
    revenue: [revMin, revMax],
    buzz: tierMin >= 7 ? 5 + (i % 4) : 2 + (i % 4),
    tierMin,
    tierMax
  };
  if (tierMin >= 7 && i % 7 === 0) {
    entry.stockPct = Number((0.004 + (i % 5) * 0.002).toFixed(3));
  }
  campaigns.push(entry);
}

writeFileSync(outPath, `${JSON.stringify({ campaigns }, null, 2)}\n`, 'utf8');
console.log(`Wrote ${campaigns.length} campaigns to ${outPath}`);
