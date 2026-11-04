import { assetBaseUrl } from './utils.js';
import { adjustSentiment } from './Sentiment.js';
import { bumpCompetitorPressure, easeCompetitorPressure } from './Competitor.js';
import { isPublicCompany } from './IPO.js';

let crisisCatalog = null;

export function createInitialCrisisState() {
  return { active: null };
}

async function loadCrises() {
  if (crisisCatalog) return crisisCatalog;
  try {
    const res = await fetch(`${assetBaseUrl()}data/crises.json`, { cache: 'no-store' });
    crisisCatalog = await res.json();
  } catch {
    crisisCatalog = { crises: [] };
  }
  return crisisCatalog;
}

export async function rollMonthStartCrisis(state) {
  if (state.flags?.gameOver) return null;
  if (state.crisis?.active) return state.crisis.active;
  if (!state.crisis) state.crisis = createInitialCrisisState();
  if (Math.random() > 0.14) return null;

  const { crises } = await loadCrises();
  if (!crises?.length) return null;
  const def = crises[Math.floor(Math.random() * crises.length)];
  state.crisis.active = {
    id: def.id,
    title: def.title,
    description: def.description,
    choices: def.choices ?? []
  };
  return state.crisis.active;
}

export function hasActiveCrisis(state) {
  return Boolean(state.crisis?.active?.choices?.length);
}

export function applyCrisisChoice(state, choiceIndex) {
  const active = state.crisis?.active;
  if (!active) return { ok: false, reason: 'No active crisis.' };
  const choice = active.choices[choiceIndex];
  if (!choice) return { ok: false, reason: 'Pick an option.' };

  const fx = choice.effects ?? {};
  if (fx.cash) state.finance.cash = (state.finance.cash ?? 0) + Number(fx.cash);
  if (fx.buzz) state.product.buzz = (state.product.buzz ?? 0) + Number(fx.buzz);
  if (fx.sentiment) adjustSentiment(state, Number(fx.sentiment), `Crisis: ${active.title}`);
  if (fx.competitor > 0) bumpCompetitorPressure(state, fx.competitor);
  if (fx.competitor < 0) easeCompetitorPressure(state, Math.abs(fx.competitor));

  if (isPublicCompany(state) && fx.stockPct) {
    const pm = state.publicMarket;
    const price = pm.sharePrice ?? pm.ipoPrice ?? 1;
    const next = Math.max((pm.ipoPrice ?? price) * 0.2, price * (1 + Number(fx.stockPct)));
    pm.sharePrice = Math.round(next * 100) / 100;
  }

  const summary = choice.label;
  state.crisis.active = null;
  return { ok: true, summary, crisisId: active.id };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderCrisisPanel(container, state) {
  if (!container) return;
  const active = state.crisis?.active;
  if (!active) {
    container.innerHTML = '';
    return;
  }
  const buttons = (active.choices ?? [])
    .map(
      (c, i) =>
        `<button type="button" class="btn btn-primary crisis-choice" data-crisis-choice="${i}">${escapeHtml(c.label)}</button>`
    )
    .join('');

  container.innerHTML = `
    <p class="eyebrow">Crisis card</p>
    <h2>${escapeHtml(active.title)}</h2>
    <p class="lede">${escapeHtml(active.description)}</p>
    <div class="crisis-actions">${buttons}</div>
    <p class="fine-print">Pick a path before you close the month — this does not replace a desk task.</p>
  `;
}
