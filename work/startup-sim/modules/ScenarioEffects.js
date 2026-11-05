import { formatMoney } from './constants.js';
import { adjustSentiment } from './Sentiment.js';
import { bumpCompetitorPressure, easeCompetitorPressure } from './Competitor.js';
import { applyStockPctMove } from './IPO.js';
import { recordCashOutflow } from './Finance.js';
import { totalHeadcount } from './Staff.js';

export function createInitialModifiers() {
  return { active: [] };
}

export function calendarTurn(state) {
  return (state.calendar.year - 1) * 12 + state.calendar.monthIndex;
}

export function addScenarioModifier(state, mod) {
  if (!state.modifiers) state.modifiers = createInitialModifiers();
  const entry = {
    id: mod.id ?? `mod-${Date.now()}`,
    label: mod.label ?? 'Fallout',
    revenueMult: mod.revenueMult ?? 1,
    costMult: mod.costMult ?? 1,
    monthsLeft: Math.max(1, Number(mod.months) || 1),
    fundraisingBlocked: Boolean(mod.fundraisingBlocked)
  };
  state.modifiers.active.push(entry);
  return entry;
}

export function tickScenarioModifiers(state) {
  if (!state.modifiers?.active?.length) return [];
  const lines = [];
  const next = [];
  for (const mod of state.modifiers.active) {
    const left = (mod.monthsLeft ?? 1) - 1;
    if (left > 0) {
      mod.monthsLeft = left;
      next.push(mod);
    } else {
      lines.push(`${mod.label} lifted — desk economics back to normal.`);
    }
  }
  state.modifiers.active = next;
  return lines;
}

export function scenarioRevenueMult(state) {
  if (!state.modifiers?.active?.length) return 1;
  let m = 1;
  for (const mod of state.modifiers.active) {
    m *= Number(mod.revenueMult) || 1;
  }
  return Math.round(m * 1000) / 1000;
}

export function scenarioCostMult(state) {
  if (!state.modifiers?.active?.length) return 1;
  let m = 1;
  for (const mod of state.modifiers.active) {
    m *= Number(mod.costMult) || 1;
  }
  return Math.round(m * 1000) / 1000;
}

export function isFundraisingBlockedByScenario(state) {
  return Boolean(state.modifiers?.active?.some((m) => m.fundraisingBlocked && (m.monthsLeft ?? 0) > 0));
}

export function activeModifierLabels(state) {
  return (state.modifiers?.active ?? []).map((m) => `${m.label} (${m.monthsLeft} mo)`);
}

function applyHeadcountDelta(state, delta) {
  const n = Math.floor(Number(delta) || 0);
  if (!n || !state.staff?.headcountByDept) return null;
  const hc = state.staff.headcountByDept;
  const depts = ['engineering', 'sales', 'marketing', 'product'];
  if (n < 0) {
    let left = Math.abs(n);
    for (const d of depts) {
      if (left <= 0) break;
      const take = Math.min(hc[d] ?? 0, left);
      hc[d] = (hc[d] ?? 0) - take;
      left -= take;
    }
    state.staff.draftHeadcountByDept = { ...hc };
    return `Headcount −${Math.abs(n)} (now ${totalHeadcount(hc)}).`;
  }
  hc.engineering = (hc.engineering ?? 0) + n;
  state.staff.draftHeadcountByDept = { ...hc };
  return `Headcount +${n} (now ${totalHeadcount(hc)}).`;
}

/** Apply JSON `effects` from crises / desk decisions. Returns human-readable outcome lines. */
export function applyScenarioEffects(state, fx, context = {}) {
  const lines = [];
  const title = context.title ?? 'Scenario';

  if (fx.cash) {
    const amount = Number(fx.cash);
    state.finance.cash = (state.finance.cash ?? 0) + amount;
    if (amount < 0) recordCashOutflow(state, Math.abs(amount), 'scenario');
    lines.push(`Cash ${amount >= 0 ? '+' : ''}${formatMoney(amount)}.`);
  }
  if (fx.buzz) {
    state.product.buzz = (state.product.buzz ?? 0) + Number(fx.buzz);
    lines.push(`Buzz ${fx.buzz > 0 ? '+' : ''}${fx.buzz}.`);
  }
  if (fx.product) {
    state.product.level = Math.max(0, (state.product.level ?? 0) + Number(fx.product));
    lines.push(`Product +${fx.product}.`);
  }
  if (fx.sentiment) {
    const before = state.sentiment?.score ?? 68;
    adjustSentiment(state, Number(fx.sentiment), `${title}`);
    const after = state.sentiment?.score ?? before;
    lines.push(`Market trust ${after - before >= 0 ? '+' : ''}${after - before} (now ${after}).`);
  }
  if (fx.competitor > 0) {
    bumpCompetitorPressure(state, fx.competitor);
    lines.push(`Rival heat +${fx.competitor}.`);
  }
  if (fx.competitor < 0) {
    easeCompetitorPressure(state, Math.abs(fx.competitor));
    lines.push(`Rival heat −${Math.abs(fx.competitor)}.`);
  }
  if (fx.headcountDelta) {
    const line = applyHeadcountDelta(state, fx.headcountDelta);
    if (line) lines.push(line);
  }
  if (fx.instantRevenue) {
    const rev = Math.round(Number(fx.instantRevenue));
    state.finance.cash += rev;
    state.finance.lifetimeRevenue += rev;
    state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + rev;
    lines.push(`Booked ${formatMoney(rev)} this month.`);
  }
  if (fx.modifier) {
    const mod = addScenarioModifier(state, fx.modifier);
    const revPct = Math.round((mod.revenueMult - 1) * 100);
    const costPct = Math.round((mod.costMult - 1) * 100);
    const parts = [];
    if (revPct) parts.push(`desk revenue ${revPct > 0 ? '+' : ''}${revPct}%`);
    if (costPct) parts.push(`costs ${costPct > 0 ? '+' : ''}${costPct}%`);
    if (mod.fundraisingBlocked) parts.push('fundraising frozen');
    lines.push(`${mod.label} for ${mod.monthsLeft} mo${parts.length ? ` (${parts.join(', ')})` : ''}.`);
  }

  if (fx.stockPct) {
    const next = applyStockPctMove(state, fx.stockPct);
    if (next != null) {
      lines.push(`Stock ${fx.stockPct > 0 ? '+' : ''}${Math.round(Number(fx.stockPct) * 100)}%.`);
    }
  }

  return lines;
}

export function describeScenarioEffects(fx) {
  if (!fx) return '';
  const parts = [];
  if (fx.cash) parts.push(`${fx.cash >= 0 ? '+' : ''}${formatMoney(fx.cash)} cash`);
  if (fx.buzz) parts.push(`${fx.buzz > 0 ? '+' : ''}${fx.buzz} buzz`);
  if (fx.product) parts.push(`+${fx.product} product`);
  if (fx.sentiment) parts.push(`${fx.sentiment > 0 ? '+' : ''}${fx.sentiment} trust`);
  if (fx.competitor > 0) parts.push(`+${fx.competitor} rival heat`);
  if (fx.competitor < 0) parts.push(`${fx.competitor} rival heat`);
  if (fx.headcountDelta) parts.push(`${fx.headcountDelta > 0 ? '+' : ''}${fx.headcountDelta} headcount`);
  if (fx.instantRevenue) parts.push(`+${formatMoney(fx.instantRevenue)} revenue`);
  if (fx.modifier) {
    const m = fx.modifier;
    const revPct = Math.round(((m.revenueMult ?? 1) - 1) * 100);
    if (revPct) parts.push(`${revPct > 0 ? '+' : ''}${revPct}% desk revenue (${m.months ?? 1} mo)`);
    if (m.fundraisingBlocked) parts.push('blocks fundraising');
  }
  if (fx.stockPct) parts.push(`${fx.stockPct > 0 ? '+' : ''}${Math.round(fx.stockPct * 100)}% stock`);
  return parts.join(' · ');
}
