import { formatStateMonth } from './GameCalendar.js';

/** One fictional rival per run — news flavor and light market friction. */

const RIVALS = {
  'b2b-saas': { name: 'CloudLedger', product: 'spreadsheet ERP' },
  'consumer-social': { name: 'VibeCircle', product: 'ephemeral groups' },
  marketplace: { name: 'GigRabbit', product: 'two-sided fees' },
  delivery: { name: 'DashDrop', product: '15-minute everything' },
  fintech: { name: 'NeonBank', product: 'metal cards' },
  'ai-tools': { name: 'Promptly AI', product: 'wrapper GPTs' },
  hardware: { name: 'BrickWorks', product: 'overengineered gadgets' },
  healthtech: { name: 'MediMesh', product: 'HIPAA PDFs' },
  edtech: { name: 'LessonLoop', product: 'yet another LMS' },
  climate: { name: 'GreenStack', product: 'carbon dashboards' },
  'gaming-media': { name: 'LootLoop', product: 'battle passes' },
  'space-exploration': { name: 'SpaceXY', product: 'reusable heavy lift' }
};

export function createCompetitorForCategory(categoryId) {
  const base = RIVALS[categoryId] ?? { name: 'Nexus Labs', product: 'a similar pitch' };
  return {
    name: base.name,
    product: base.product,
    pressure: 0
  };
}

/** Slight revenue drag when rival is “winning”. */
export function competitorRevenueMult(state) {
  if (state.world?.competitorAcquired) return 1;
  const p = state.world?.competitor?.pressure ?? 0;
  return Math.max(0.92, 1 - p * 0.015);
}

export function bumpCompetitorPressure(state, amount = 1) {
  if (!state.world?.competitor) return;
  state.world.competitor.pressure = Math.min(5, (state.world.competitor.pressure ?? 0) + amount);
}

export function easeCompetitorPressure(state, amount = 1) {
  if (!state.world?.competitor) return;
  state.world.competitor.pressure = Math.max(0, (state.world.competitor.pressure ?? 0) - amount);
}

/** Optional offline news beat (call from News). */
export function maybeCompetitorNewsArticle(state) {
  const rival = state.world?.competitor;
  if (!rival || Math.random() > 0.35) return null;
  const company = state.company?.name ?? 'You';
  const categoryId = state.company?.categoryId;
  if (categoryId === 'space-exploration' && Math.random() < 0.55) {
    const spaceBeats = [
      {
        headline: `SpaceXY scrubs again; ${company} says cadence still competitive`,
        dek: `Analysts compare ${rival.product} manifest slots to your pipeline.`,
        body: `${rival.name} pushed T-0 for weather. Your comms team resists quote-tweeting. Range safety threads are undefeated.`
      },
      {
        headline: `SpaceXY sticks another booster landing; ${company} cites NASA backlog`,
        dek: `Reuse milestones vs. government contract wins — investors pick sides.`,
        body: `${rival.name} posted a droneship video before your anomaly review slides were done. ProNet declares a launch race.`
      },
      {
        headline: `NASA short-list rumor names ${company} and SpaceXY`,
        dek: `Launch Services Program whispers move defense-adjacent tickers.`,
        body: `Program office neither confirms nor denies. Your BD team cancels vacation. ${rival.name} lawyers send a polite FOIA.`
      },
      {
        headline: `${company} wet dress rehearsal; SpaceXY memes the hold count`,
        dek: `Integrated stack tests are the new earnings calls for space startups.`,
        body: `T-10 scrub still counts as progress in your investor update. ${rival.name} fans count holds like sports stats.`
      }
    ];
    const pick = spaceBeats[Math.floor(Math.random() * spaceBeats.length)];
    return { ...pick, source: 'Orbit Daily', date: formatStateMonth(state, 'short') };
  }
  return {
    headline: `${rival.name} raises a loud seed round in the same lane as ${company}`,
    dek: `Investors pretend ${rival.product} is not the same idea.`,
    body: `${rival.name} closed a fictional round and hired your former intern. ProNet threads are unkind.`,
    source: 'Chirp Business',
    date: formatStateMonth(state, 'short')
  };
}
