import { adjustSentiment } from './Sentiment.js';
import { bumpCompetitorPressure, easeCompetitorPressure } from './Competitor.js';
import { isPublicCompany, whisperRevenueTarget } from './IPO.js';
import { launchLifecycleActive } from './LaunchLifecycle.js';

/** Buzz fades unless you keep shipping — caps runaway stacking. */
export function applyBuzzDecayAtMonthStart(state) {
  const buzz = state.product?.buzz ?? 0;
  if (buzz <= 2) return [];
  let decay = buzz >= 12 ? 3 : buzz >= 6 ? 2 : 1;
  if (launchLifecycleActive(state) && state.launch?.phase === 'pre_launch') {
    decay = Math.min(decay, 1);
    if (buzz <= 4) return [];
  }
  state.product.buzz = Math.max(0, buzz - decay);
  return [`Market attention cooled — buzz −${decay} (now ${state.product.buzz}).`];
}

/** Rival heat creeps when you're quiet; strong months push back. */
export function settleRivalHeatAtMonthEnd(state, monthRevenue, burn) {
  const rival = state.world?.competitor;
  if (!rival) return [];

  const lines = [];
  const safeBurn = Math.max(1, burn);
  const ratio = monthRevenue / safeBurn;
  const campaigns = state.growth?.campaignsThisMonth?.length ?? 0;
  const deskDone = state.calendar?.tasksCompleted ?? 0;

  if (ratio >= 1.35 || monthRevenue >= safeBurn * 1.2) {
    easeCompetitorPressure(state, 1);
    lines.push(`${rival.name} lost a news cycle — rival heat eased.`);
  } else if (ratio < 0.55 && deskDone > 0) {
    bumpCompetitorPressure(state, 1);
    lines.push(`${rival.name} grabbed mindshare while revenue lagged burn.`);
  }

  if (campaigns >= 2) {
    easeCompetitorPressure(state, 1);
    lines.push('Aggressive growth spend cooled rival heat.');
  }

  if (Math.random() < 0.22 && (rival.pressure ?? 0) < 5) {
    bumpCompetitorPressure(state, 1);
    lines.push(`${rival.name} launched a loud feature in your category.`);
  }

  return lines;
}

/** After Series A, skipping all board prep has a cost. */
export function settleBoardGovernance(state) {
  if (!state.flags?.seriesAClosed || state.flags?.gameOver) return [];
  const offered = (state.board?.monthTasks ?? []).filter((t) => t.status === 'pending' || t.status === 'done').length;
  const done = state.board?.completedThisMonth ?? 0;
  if (offered < 1) return [];

  if (done >= 1) {
    state.board.governanceStreak = (state.board.governanceStreak ?? 0) + 1;
    if (done >= 2) adjustSentiment(state, 1, 'Strong board month');
    return ['Board prep filed — investors stay off the warpath.'];
  }

  state.board.governanceStreak = 0;
  adjustSentiment(state, -4, 'Board prep skipped');
  bumpCompetitorPressure(state, 1);
  return ['You skipped board prep — sentiment dipped and rivals smelled blood.'];
}

/** Public: did this month beat implied burn guidance? Feeds stock tick. */
export function scorePublicGuidanceBeat(state, monthRevenue, burn) {
  if (!isPublicCompany(state)) return [];
  if (!state.publicMarket) return [];
  const target = whisperRevenueTarget(state);
  state.publicMarket.whisperRevenueTarget = target;
  const beat = monthRevenue >= target;
  if (beat) {
    state.publicMarket.guidanceBeatStreak = (state.publicMarket.guidanceBeatStreak ?? 0) + 1;
    return ['Street liked the month — guidance beat streak continues.'];
  }
  state.publicMarket.guidanceBeatStreak = 0;
  return ['Revenue missed the whisper number — guidance streak reset.'];
}

export function applyTaskRivalEffects(state, taskDef) {
  const delta = Number(taskDef.rivalPressure ?? 0);
  if (delta > 0) bumpCompetitorPressure(state, delta);
  else if (delta < 0) easeCompetitorPressure(state, Math.abs(delta));

  const types = taskDef.types ?? [];
  if ((types.includes('marketing') || types.includes('sales')) && (taskDef.buzz ?? 0) >= 2 && delta === 0) {
    easeCompetitorPressure(state, 1);
  }
}

export function applyCampaignRivalEffects(state, campaignDef) {
  const ease = campaignDef.rivalEase ?? (campaignDef.buzz >= 4 ? 1 : 0);
  if (ease > 0) easeCompetitorPressure(state, ease);
}
