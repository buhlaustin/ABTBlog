import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import {
  canFileIpo,
  isPublicCompany,
  renderPublicStockPanel,
  renderPreIpoPublicBlock,
  applyStockPctMove,
} from './IPO.js';
import { adjustSentiment, hasInstitutionalBoard, sentimentLabel } from './Sentiment.js';
import { calendarTurn } from './XC.js';
import { escapeHtml, panelStatCard, panelMetricGrid, panelMetricGroup } from './PanelChrome.js';

const FINANCE_SECTIONS = new Set(['overview', 'public']);

export function publicFinanceTabVisible(state) {
  return Boolean(state.flags?.ipoUnlocked || state.flags?.ipoFiled || isPublicCompany(state));
}

export function setFinanceSection(state, section) {
  if (!state.finance) return;
  state.finance.section = FINANCE_SECTIONS.has(section) ? section : 'overview';
}

export function activeFinanceSection(state) {
  const s = state.finance?.section ?? 'overview';
  if (s === 'public' && !publicFinanceTabVisible(state)) return 'overview';
  return FINANCE_SECTIONS.has(s) ? s : 'overview';
}

/** Earnings every 3 months after listing (same cadence as monthly stock tick). */
export function isEarningsMonth(state) {
  if (!isPublicCompany(state)) return false;
  const m = state.publicMarket?.monthsPublic ?? 0;
  return m > 0 && m % 3 === 0;
}

export function isEarningsNextMonth(state) {
  if (!isPublicCompany(state)) return false;
  const m = state.publicMarket?.monthsPublic ?? 0;
  return m % 3 === 2;
}

function eventsUsed(state) {
  if (!state.publicMarket) return [];
  if (!Array.isArray(state.publicMarket.eventsUsedThisMonth)) {
    state.publicMarket.eventsUsedThisMonth = [];
  }
  return state.publicMarket.eventsUsedThisMonth;
}

export function resetPublicMarketEventsAtMonthStart(state) {
  if (!state.publicMarket) return;
  state.publicMarket.eventsUsedThisMonth = [];
}

const PUBLIC_EVENTS = [
  {
    id: 'public-earnings-rehearsal',
    title: 'Earnings rehearsal',
    description: 'Walk the board chair and IR through slides before the live call.',
    cost: 9_500,
    when: (s) => isEarningsMonth(s) || isEarningsNextMonth(s),
    whenLabel: 'Available the month before or of earnings.',
    sentiment: 2,
    stockPct: 0.012,
    earningsPrep: 1,
    maxPerMonth: 1
  },
  {
    id: 'public-earnings-call',
    title: 'Host earnings call',
    description: 'Live Q&A with analysts — tone matters as much as the numbers.',
    cost: 18_000,
    when: (s) => isEarningsMonth(s),
    whenLabel: 'Earnings month only.',
    sentiment: 3,
    stockPct: 0.022,
    earningsPrep: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-investor-roadshow',
    title: 'Investor roadshow week',
    description: 'CEO 1:1s with top holders — softens volatility after a choppy month.',
    cost: 14_500,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 3,
    stockPct: 0.018,
    maxPerMonth: 1
  },
  {
    id: 'public-analyst-briefing',
    title: 'Analyst briefing lunch',
    description: 'Buy-side analysts get the narrative before they update models.',
    cost: 7_200,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 2,
    stockPct: 0.01,
    maxPerMonth: 1
  },
  {
    id: 'public-media-fireside',
    title: 'Media fireside chat',
    description: 'Friendly podcast — retail holders share clips on social.',
    cost: 5_500,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 1,
    stockPct: 0.014,
    maxPerMonth: 1
  },
  {
    id: 'public-activist-response',
    title: 'Activist response war room',
    description: 'Board, legal, and IR align when approval score is shaky.',
    cost: 22_000,
    when: (s) => isPublicCompany(s) && (s.sentiment?.score ?? 100) < 45,
    whenLabel: 'Board approval below 45.',
    sentiment: 5,
    stockPct: 0.008,
    maxPerMonth: 1
  },
  {
    id: 'public-index-outreach',
    title: 'Index inclusion outreach',
    description: 'Lobby index committees before passive flows show up in the tape.',
    cost: 28_000,
    when: (s) => isPublicCompany(s) && (s.publicMarket?.monthsPublic ?? 0) >= 4 && !s.publicMarket?.indexMember,
    whenLabel: '4+ months public, not yet indexed.',
    sentiment: 2,
    stockPct: 0.025,
    maxPerMonth: 1,
    minMonthsBetween: 6,
    lastTurnKey: 'lastIndexOutreachTurn'
  },
  {
    id: 'public-town-hall',
    title: 'All-hands + shareholder town hall',
    description: 'Employees and retail holders hear the same story from the CEO.',
    cost: 11_000,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 2,
    stockPct: 0.006,
    maxPerMonth: 1
  }
];

function eventUsedCount(state, eventId) {
  return eventsUsed(state).filter((id) => id === eventId).length;
}

export function publicEventAvailability(state, def) {
  if (!isPublicCompany(state)) {
    return { ok: false, reason: 'List on the exchange first.' };
  }
  if (!def.when(state)) {
    return { ok: false, reason: def.whenLabel ?? 'Not available right now.' };
  }
  const used = eventUsedCount(state, def.id);
  if (used >= (def.maxPerMonth ?? 1)) {
    return { ok: false, reason: 'Already ran this event this month.' };
  }
  if (def.lastTurnKey && def.minMonthsBetween) {
    const turn = calendarTurn(state);
    const last = state.publicMarket?.[def.lastTurnKey];
    if (last != null && turn - last < def.minMonthsBetween) {
      return { ok: false, reason: `Wait ${def.minMonthsBetween - (turn - last)} more month(s).` };
    }
  }
  const cash = state.finance?.cash ?? 0;
  if (cash < def.cost) {
    return { ok: false, reason: `Need ${formatMoney(def.cost)} company cash.` };
  }
  return { ok: true };
}

export function runPublicMarketEvent(state, eventId) {
  const def = PUBLIC_EVENTS.find((e) => e.id === eventId);
  if (!def) return { ok: false, reason: 'Unknown event.' };
  const gate = publicEventAvailability(state, def);
  if (!gate.ok) return gate;

  state.finance.cash -= def.cost;
  recordCashOutflow(state, def.cost, 'ir_event');
  eventsUsed(state).push(def.id);

  if (def.lastTurnKey) {
    state.publicMarket[def.lastTurnKey] = calendarTurn(state);
  }
  if (def.earningsPrep) {
    state.publicMarket.earningsPrepLevel = Math.min(
      3,
      (state.publicMarket.earningsPrepLevel ?? 0) + def.earningsPrep
    );
  }

  let sentimentNote = '';
  if (hasInstitutionalBoard(state) && def.sentiment) {
    adjustSentiment(state, def.sentiment, `${def.title} — board liked the visibility.`);
    sentimentNote = ` Board approval +${def.sentiment} (${sentimentLabel(state.sentiment.score)}).`;
  }

  let stockNote = '';
  if (def.stockPct) {
    applyStockPctMove(state, def.stockPct);
    stockNote = ` Stock ${def.stockPct >= 0 ? '+' : ''}${(def.stockPct * 100).toFixed(1)}%.`;
  }

  const summary = `${def.title} — spent ${formatMoney(def.cost)}.${sentimentNote}${stockNote}`;
  return { ok: true, summary };
}

function renderEventCard(state, def) {
  const gate = publicEventAvailability(state, def);
  const disabled = gate.ok ? '' : 'disabled';
  const title = escapeHtml(def.title);
  const desc = escapeHtml(def.description);
  const hint = gate.ok ? '' : `<p class="fine-print public-event-lock">${escapeHtml(gate.reason)}</p>`;
  return `<article class="finance-card public-event-card">
    <h4 class="finance-section-title">${title}</h4>
    <p class="fine-print">${desc}</p>
    <p class="fine-print">Cost ${formatMoney(def.cost)} · ${escapeHtml(def.whenLabel)}</p>
    ${hint}
    <button type="button" class="btn btn-ghost btn-small" data-public-event="${escapeHtml(def.id)}" ${disabled}>Run event</button>
  </article>`;
}

export function renderFinancePublicSection(container, state) {
  if (!container) return;

  if (!publicFinanceTabVisible(state)) {
    container.innerHTML = `<p class="tab-placeholder">Reach IPO ARR gate to unlock public-market tools.</p>`;
    return;
  }

  if (!isPublicCompany(state)) {
    container.innerHTML = `<div class="finance-public-pre">${renderPreIpoPublicBlock(state)}</div>`;
    return;
  }

  const pm = state.publicMarket ?? {};
  const earningsFlag = isEarningsMonth(state)
    ? 'Earnings month — calls move the quote harder.'
    : isEarningsNextMonth(state)
      ? 'Earnings next month — prep events are open.'
      : 'Next earnings in about ' + (3 - ((pm.monthsPublic ?? 0) % 3)) + ' month(s).';
  const prep = pm.earningsPrepLevel ?? 0;
  const prepLine =
    prep > 0
      ? `Earnings prep +${prep} — bonus on this month's close if it's earnings.`
      : 'Run rehearsal or the live call to stack earnings prep.';

  const sentimentScore = state.sentiment?.score ?? 68;
  const eventCards = PUBLIC_EVENTS.map((d) => renderEventCard(state, d)).join('');

  container.innerHTML = `
    <div class="finance-public-panel">
      <header class="finance-public-head">
        <p class="panel-lede">Manage the listing, street calendar, and CEO visibility — events spend company cash and nudge board approval and the share price.</p>
        <p class="fine-print public-earnings-chip">${escapeHtml(earningsFlag)} ${escapeHtml(prepLine)}</p>
      </header>
      <div id="finance-public-stock-mount"></div>
      ${
        hasInstitutionalBoard(state)
          ? panelMetricGroup(
              'Board & street',
              panelMetricGrid('2', [
                panelStatCard('Board approval', `${sentimentScore} — ${escapeHtml(sentimentLabel(sentimentScore))}`),
                panelStatCard('Earnings prep', String(prep))
              ])
            )
          : ''
      }
      <section class="finance-section" aria-label="Public company events">
        <h3 class="finance-section-title">Public events (this month)</h3>
        <p class="fine-print">Up to one run per event type per month. Effects apply immediately; earnings prep boosts the quarterly close.</p>
        <div class="public-event-grid">${eventCards}</div>
      </section>
    </div>`;

  renderPublicStockPanel(container.querySelector('#finance-public-stock-mount'), state);
}
