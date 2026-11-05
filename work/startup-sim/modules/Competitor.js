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
  'gaming-media': { name: 'LootLoop', product: 'battle passes' }
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
  return {
    headline: `${rival.name} raises a loud seed round in the same lane as ${company}`,
    dek: `Investors pretend ${rival.product} is not the same idea.`,
    body: `${rival.name} closed a fictional round and hired your former intern. ProNet threads are unkind.`,
    source: 'Chirp Business',
    date: `Y${state.calendar.year} M${state.calendar.monthIndex}`
  };
}
