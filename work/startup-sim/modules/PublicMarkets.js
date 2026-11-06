import { formatMoney } from './constants.js';
import { recordCashOutflow } from './Finance.js';
import {
  canFileIpo,
  isPublicCompany,
  renderPublicStockPanel,
  renderPreIpoPublicBlock,
  applyStockPctMove,
  pushMarketTape,
  whisperRevenueTarget,
  marketCap
} from './IPO.js';
import { adjustSentiment, hasInstitutionalBoard, sentimentLabel } from './Sentiment.js';
import { calendarTurn } from './XC.js';
import { formatCalendarStamp } from './GameCalendar.js';
import {
  escapeHtml,
  panelStatCard,
  panelMetricGrid,
  panelMetricGroup,
  panelMetricStack
} from './PanelChrome.js';

const FINANCE_SECTIONS = new Set(['overview', 'public']);
const PUBLIC_SECTIONS = new Set(['market', 'events', 'calendar']);

const PRE_IPO_IR_STEPS = [
  {
    id: 'counsel',
    title: 'IR counsel & S-1 review',
    description: 'Outside counsel stress-tests disclosure language before you file.',
    cost: 28_000,
    flag: 'counsel'
  },
  {
    id: 'audit',
    title: 'Audit committee bridge',
    description: 'Big-four style sign-off on two years of books investors will ask for.',
    cost: 42_000,
    flag: 'audit'
  },
  {
    id: 'roadshowDeck',
    title: 'Institutional roadshow deck',
    description: '40-slide narrative with cohort charts the buy-side actually reads.',
    cost: 16_500,
    flag: 'roadshowDeck'
  }
];

export function publicFinanceTabVisible(state) {
  return Boolean(state.flags?.ipoUnlocked || state.flags?.ipoFiled || isPublicCompany(state));
}

export function setFinanceSection(state, section) {
  if (!state.finance) return;
  state.finance.section = FINANCE_SECTIONS.has(section) ? section : 'overview';
}

export function setPublicSection(state, section) {
  if (!state.publicMarket) return;
  state.publicMarket.publicSection = PUBLIC_SECTIONS.has(section) ? section : 'market';
}

export function activeFinanceSection(state) {
  const s = state.finance?.section ?? 'overview';
  if (s === 'public' && !publicFinanceTabVisible(state)) return 'overview';
  return FINANCE_SECTIONS.has(s) ? s : 'overview';
}

function activePublicSection(state) {
  const s = state.publicMarket?.publicSection ?? 'market';
  return PUBLIC_SECTIONS.has(s) ? s : 'market';
}

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

export function monthsUntilEarnings(state) {
  if (!isPublicCompany(state)) return null;
  const m = state.publicMarket?.monthsPublic ?? 0;
  if (isEarningsMonth(state)) return 0;
  return 3 - (m % 3);
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

function streetCredLabel(score) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  if (s >= 78) return 'Trusted';
  if (s >= 62) return 'Known';
  if (s >= 45) return 'Mixed';
  return 'Skeptical';
}

function bumpStreetCred(state, delta) {
  if (!state.publicMarket) return;
  const next = Math.max(0, Math.min(100, (state.publicMarket.streetCredibility ?? 50) + delta));
  state.publicMarket.streetCredibility = next;
}

function recordIrEvent(state, def, summary) {
  if (!state.publicMarket) return;
  if (!Array.isArray(state.publicMarket.irEventLog)) state.publicMarket.irEventLog = [];
  state.publicMarket.irEventLog.unshift({
    id: def.id,
    title: def.title,
    summary,
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  state.publicMarket.irEventLog = state.publicMarket.irEventLog.slice(0, 14);
}

const PUBLIC_EVENTS = [
  {
    id: 'public-earnings-rehearsal',
    category: 'earnings',
    title: 'Earnings rehearsal',
    description: 'Walk the board chair and IR through slides before the live call.',
    cost: 9_500,
    when: (s) => isEarningsMonth(s) || isEarningsNextMonth(s),
    whenLabel: 'Month before or of earnings.',
    sentiment: 2,
    stockPct: 0.012,
    earningsPrep: 1,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-earnings-call',
    category: 'earnings',
    title: 'Host earnings call',
    description: 'Live Q&A with analysts — tone matters as much as the numbers.',
    cost: 18_000,
    when: (s) => isEarningsMonth(s),
    whenLabel: 'Earnings month only.',
    sentiment: 3,
    stockPct: 0.022,
    earningsPrep: 2,
    credibility: 3,
    maxPerMonth: 1
  },
  {
    id: 'public-post-earnings-callbacks',
    category: 'earnings',
    title: 'Post-earnings analyst callbacks',
    description: 'CEO dials the top ten holders to explain the guide before they trim.',
    cost: 8_800,
    when: (s) => isEarningsMonth(s),
    whenLabel: 'Earnings month only.',
    sentiment: 2,
    stockPct: 0.009,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-10q-review',
    category: 'compliance',
    title: '10-Q disclosure review',
    description: 'Legal and finance lock footnotes before they hit EDGAR.',
    cost: 6_400,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 1,
    stockPct: 0.004,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-shareholder-letter',
    category: 'holders',
    title: 'Annual shareholder letter',
    description: 'Founder letter in the proxy — long-term story for index funds.',
    cost: 12_000,
    when: (s) => isPublicCompany(s) && (s.publicMarket?.monthsPublic ?? 0) >= 3,
    whenLabel: '3+ months public.',
    sentiment: 2,
    stockPct: 0.011,
    credibility: 3,
    maxPerMonth: 1
  },
  {
    id: 'public-investor-roadshow',
    category: 'holders',
    title: 'Investor roadshow week',
    description: 'CEO 1:1s with top holders — softens volatility after a choppy month.',
    cost: 14_500,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 3,
    stockPct: 0.018,
    credibility: 3,
    maxPerMonth: 1
  },
  {
    id: 'public-investor-day',
    category: 'holders',
    title: 'Investor day (half-day)',
    description: 'Product demos and TAM slides for institutions and sell-side.',
    cost: 35_000,
    when: (s) => isPublicCompany(s) && (s.publicMarket?.monthsPublic ?? 0) >= 2,
    whenLabel: '2+ months public.',
    sentiment: 4,
    stockPct: 0.028,
    credibility: 4,
    maxPerMonth: 1,
    minMonthsBetween: 6,
    lastTurnKey: 'lastInvestorDayTurn'
  },
  {
    id: 'public-analyst-briefing',
    category: 'holders',
    title: 'Analyst briefing lunch',
    description: 'Buy-side analysts get the narrative before they update models.',
    cost: 7_200,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 2,
    stockPct: 0.01,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-conference-keynote',
    category: 'visibility',
    title: 'Industry conference keynote',
    description: 'Main-stage slot — every fintech blogger live-tweets your charts.',
    cost: 19_500,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 1,
    stockPct: 0.016,
    credibility: 3,
    maxPerMonth: 1,
    minMonthsBetween: 4,
    lastTurnKey: 'lastConferenceTurn'
  },
  {
    id: 'public-cnbc-spot',
    category: 'visibility',
    title: 'CNBC closing bell spot',
    description: 'Seven-minute CEO hit — retail flow follows the chyron.',
    cost: 9_000,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 1,
    stockPct: 0.019,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-media-fireside',
    category: 'visibility',
    title: 'Media fireside chat',
    description: 'Friendly podcast — retail holders share clips on social.',
    cost: 5_500,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 1,
    stockPct: 0.014,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-retail-ama',
    category: 'visibility',
    title: 'Retail shareholder AMA',
    description: 'Reddit-style AMA — high engagement, messy questions.',
    cost: 3_200,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 0,
    stockPct: 0.021,
    credibility: 1,
    maxPerMonth: 1,
    volatility: true
  },
  {
    id: 'public-town-hall',
    category: 'holders',
    title: 'All-hands + shareholder town hall',
    description: 'Employees and retail holders hear the same story from the CEO.',
    cost: 11_000,
    when: (s) => isPublicCompany(s),
    whenLabel: 'While public.',
    sentiment: 2,
    stockPct: 0.006,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-esg-submission',
    category: 'compliance',
    title: 'ESG questionnaire push',
    description: 'Answer the ratings agencies so ESG funds can hold you.',
    cost: 8_500,
    when: (s) => isPublicCompany(s) && (s.publicMarket?.monthsPublic ?? 0) >= 2,
    whenLabel: '2+ months public.',
    sentiment: 1,
    stockPct: 0.005,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-quiet-period-memo',
    category: 'compliance',
    title: 'Quiet-period compliance memo',
    description: 'Train execs on what they cannot say the week before earnings.',
    cost: 2_800,
    when: (s) => isEarningsNextMonth(s),
    whenLabel: 'Month before earnings.',
    sentiment: 1,
    stockPct: 0.003,
    credibility: 1,
    earningsPrep: 1,
    maxPerMonth: 1
  },
  {
    id: 'public-activist-response',
    category: 'crisis',
    title: 'Activist response war room',
    description: 'Board, legal, and IR align when approval score is shaky.',
    cost: 22_000,
    when: (s) => isPublicCompany(s) && (s.sentiment?.score ?? 100) < 45,
    whenLabel: 'Board approval below 45.',
    sentiment: 5,
    stockPct: 0.008,
    credibility: 2,
    maxPerMonth: 1
  },
  {
    id: 'public-crisis-presser',
    category: 'crisis',
    title: 'Crisis press conference',
    description: 'Get ahead of a bad tape with a controlled narrative.',
    cost: 15_000,
    when: (s) => {
      if (!isPublicCompany(s)) return false;
      const move = s.publicMarket?.lastMonthDeltaPct ?? 0;
      const heat = s.world?.competitor?.pressure ?? 0;
      return move <= -0.05 || heat >= 4 || (s.sentiment?.score ?? 100) < 38;
    },
    whenLabel: 'After a sharp drawdown, high rival heat, or very low board approval.',
    sentiment: 3,
    stockPct: 0.015,
    credibility: 1,
    maxPerMonth: 1,
    minMonthsBetween: 3,
    lastTurnKey: 'lastCrisisPressTurn'
  },
  {
    id: 'public-index-outreach',
    category: 'holders',
    title: 'Index inclusion outreach',
    description: 'Lobby index committees before passive flows show up in the tape.',
    cost: 28_000,
    when: (s) => isPublicCompany(s) && (s.publicMarket?.monthsPublic ?? 0) >= 4 && !s.publicMarket?.indexMember,
    whenLabel: '4+ months public, not yet indexed.',
    sentiment: 2,
    stockPct: 0.025,
    credibility: 3,
    maxPerMonth: 1,
    minMonthsBetween: 6,
    lastTurnKey: 'lastIndexOutreachTurn'
  }
];

const CATEGORY_LABELS = {
  earnings: 'Earnings season',
  holders: 'Institutional & holders',
  visibility: 'Visibility & media',
  compliance: 'Compliance & disclosure',
  crisis: 'Crisis & governance'
};

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

  let stockPct = def.stockPct ?? 0;
  if (def.volatility && stockPct) {
    const jitter = (Math.random() - 0.45) * 0.02;
    stockPct = Math.max(-0.03, stockPct + jitter);
  }

  let sentimentNote = '';
  if (hasInstitutionalBoard(state) && def.sentiment) {
    adjustSentiment(state, def.sentiment, `${def.title} — board liked the visibility.`);
    sentimentNote = ` Board approval +${def.sentiment} (${sentimentLabel(state.sentiment.score)}).`;
  }

  let stockNote = '';
  if (stockPct) {
    applyStockPctMove(state, stockPct);
    stockNote = ` Stock ${stockPct >= 0 ? '+' : ''}${(stockPct * 100).toFixed(1)}%.`;
  }

  if (def.credibility) bumpStreetCred(state, def.credibility);

  const summary = `${def.title} — spent ${formatMoney(def.cost)}.${sentimentNote}${stockNote}`;
  pushMarketTape(state, `IR: ${def.title}.`);
  recordIrEvent(state, def, summary);
  return { ok: true, summary };
}

export function runPreIpoIrPrep(state, stepId) {
  if (isPublicCompany(state)) return { ok: false, reason: 'Already public.' };
  if (!publicFinanceTabVisible(state)) return { ok: false, reason: 'Unlock the IPO window first.' };
  const step = PRE_IPO_IR_STEPS.find((s) => s.id === stepId);
  if (!step) return { ok: false, reason: 'Unknown prep step.' };
  if (!state.publicMarket) state.publicMarket = { irReadiness: {} };
  if (!state.publicMarket.irReadiness) state.publicMarket.irReadiness = {};
  if (state.publicMarket.irReadiness[step.flag]) {
    return { ok: false, reason: 'Already completed.' };
  }
  const cash = state.finance?.cash ?? 0;
  if (cash < step.cost) return { ok: false, reason: `Need ${formatMoney(step.cost)} company cash.` };
  state.finance.cash -= step.cost;
  recordCashOutflow(state, step.cost, 'ir_prep');
  state.publicMarket.irReadiness[step.flag] = true;
  const ready = countIrReadiness(state);
  return {
    ok: true,
    summary: `${step.title} done (${formatMoney(step.cost)}). IR readiness ${ready}/3 — each step adds ~1.2% to opening pop.`
  };
}

function countIrReadiness(state) {
  const ir = state.publicMarket?.irReadiness ?? {};
  return [ir.counsel, ir.audit, ir.roadshowDeck].filter(Boolean).length;
}

function renderEventCard(state, def) {
  const gate = publicEventAvailability(state, def);
  const disabled = gate.ok ? '' : 'disabled';
  const effects = [
    def.sentiment ? `+${def.sentiment} board` : null,
    def.stockPct ? `${def.stockPct >= 0 ? '+' : ''}${(def.stockPct * 100).toFixed(1)}% stock` : null,
    def.credibility ? `+${def.credibility} street cred` : null,
    def.earningsPrep ? `+${def.earningsPrep} earnings prep` : null
  ]
    .filter(Boolean)
    .join(' · ');
  const hint = gate.ok ? '' : `<p class="fine-print public-event-lock">${escapeHtml(gate.reason)}</p>`;
  return `<article class="finance-card public-event-card">
    <h4 class="finance-section-title">${escapeHtml(def.title)}</h4>
    <p class="fine-print">${escapeHtml(def.description)}</p>
    <p class="fine-print">Cost ${formatMoney(def.cost)} · ${escapeHtml(def.whenLabel)}</p>
    ${effects ? `<p class="fine-print public-event-effects">${escapeHtml(effects)}</p>` : ''}
    ${hint}
    <button type="button" class="btn btn-ghost btn-small" data-public-event="${escapeHtml(def.id)}" ${disabled}>Run event</button>
  </article>`;
}

function renderEventsByCategory(state) {
  const order = ['earnings', 'holders', 'visibility', 'compliance', 'crisis'];
  return order
    .map((cat) => {
      const items = PUBLIC_EVENTS.filter((e) => e.category === cat);
      if (!items.length) return '';
      const cards = items.map((d) => renderEventCard(state, d)).join('');
      return `<section class="public-event-category" aria-label="${escapeHtml(CATEGORY_LABELS[cat] ?? cat)}">
        <h4 class="finance-metric-group-title">${escapeHtml(CATEGORY_LABELS[cat] ?? cat)}</h4>
        <div class="public-event-grid">${cards}</div>
      </section>`;
    })
    .join('');
}

function renderEarningsCommandCenter(state) {
  const pm = state.publicMarket ?? {};
  const until = monthsUntilEarnings(state);
  const phase =
    until === 0
      ? 'Live earnings month'
      : until === 1
        ? 'Quiet period approaching'
        : `${until} month(s) to earnings`;
  const whisper = pm.whisperRevenueTarget ?? whisperRevenueTarget(state);
  const lastRev = state.finance?.monthlyRevenue ?? state.finance?.mrr ?? 0;
  const tone = pm.guidanceTone ?? 'inline';
  const toneLabel = tone === 'sandbag' ? 'Sandbag' : tone === 'aggressive' ? 'Guide high' : 'Inline';
  const prep = pm.earningsPrepLevel ?? 0;

  const dots = [0, 1, 2].map((i) => {
    const active = until === i || (until === 0 && i === 0);
    const cls = active ? 'public-earn-dot public-earn-dot--active' : 'public-earn-dot';
    const label = i === 0 ? 'Earnings' : i === 1 ? '−1 mo' : '−2 mo';
    return `<span class="${cls}" title="${escapeHtml(label)}"></span>`;
  }).join('');

  return panelMetricGroup(
    'Earnings command center',
    `<div class="public-earnings-track" aria-hidden="true">${dots}</div>
    <p class="fine-print public-earnings-phase"><strong>${escapeHtml(phase)}</strong> · Guidance tone: ${escapeHtml(toneLabel)}</p>
    ${panelMetricGrid('3', [
      panelStatCard('Whisper target', `${formatMoney(whisper)}/mo`),
      panelStatCard('Last month rev.', formatMoney(lastRev)),
      panelStatCard('Earnings prep', `${prep}/3`)
    ])}`,
    { lede: 'Beat the whisper each month to extend your guidance streak. Prep stacks through rehearsal, quiet-period memo, and the live call.' }
  );
}

function renderIrActivityLog(state) {
  const log = state.publicMarket?.irEventLog ?? [];
  if (!log.length) {
    return `<p class="fine-print">IR activity will appear here after you run public events.</p>`;
  }
  const items = log
    .map(
      (e) =>
        `<li><span class="tape-when">${escapeHtml(formatCalendarStamp(e.year, e.month))}</span> <strong>${escapeHtml(e.title)}</strong> — ${escapeHtml(e.summary)}</li>`
    )
    .join('');
  return `<ul class="public-ir-log">${items}</ul>`;
}

function renderPreIpoReadiness(state) {
  const ir = state.publicMarket?.irReadiness ?? {};
  const ready = countIrReadiness(state);
  const steps = PRE_IPO_IR_STEPS.map((step) => {
    const done = ir[step.flag];
    if (done) {
      return `<li class="public-ir-prep public-ir-prep--done"><strong>${escapeHtml(step.title)}</strong> — complete</li>`;
    }
    return `<li class="public-ir-prep">
      <strong>${escapeHtml(step.title)}</strong>
      <p class="fine-print">${escapeHtml(step.description)}</p>
      <button type="button" class="btn btn-ghost btn-small" data-pre-ipo-ir="${escapeHtml(step.id)}">${formatMoney(step.cost)} · Complete</button>
    </li>`;
  }).join('');

  return `<section class="finance-section finance-card" aria-label="Pre-IPO IR readiness">
    <h3 class="finance-section-title">Pre-IPO IR readiness (${ready}/3)</h3>
    <p class="fine-print">Optional before filing — each finished step adds roughly 1.2% to the opening pop on listing day.</p>
    <ul class="public-ir-prep-list">${steps}</ul>
  </section>`;
}

function renderPublicSubnav(state, section) {
  const tab = (id, label) =>
    `<button type="button" class="${section === id ? 'active' : ''}" data-public-subtab="${id}">${label}</button>`;
  return `<nav class="finance-subtabs people-subtabs public-inner-subtabs" aria-label="Public company sections">
    ${tab('market', 'Market desk')}
    ${tab('events', 'IR events')}
    ${tab('calendar', 'Calendar & log')}
  </nav>`;
}

export function renderFinancePublicSection(container, state) {
  if (!container) return;

  if (!publicFinanceTabVisible(state)) {
    container.innerHTML = `<p class="tab-placeholder">Reach IPO ARR gate to unlock public-market tools.</p>`;
    return;
  }

  if (!isPublicCompany(state)) {
    container.innerHTML = `<div class="finance-public-panel">
      ${renderPreIpoReadiness(state)}
      <div class="finance-public-pre">${renderPreIpoPublicBlock(state)}</div>
    </div>`;
    return;
  }

  const pm = state.publicMarket ?? {};
  const section = activePublicSection(state);
  const sentimentScore = state.sentiment?.score ?? 68;
  const cred = pm.streetCredibility ?? 50;
  const prep = pm.earningsPrepLevel ?? 0;
  const cap = marketCap(state);
  const eventsUsedCount = eventsUsed(state).length;

  const headStats = panelMetricStack(
    panelMetricGroup(
      'Street pulse',
      panelMetricGrid('3', [
        panelStatCard('Street credibility', `${cred} — ${streetCredLabel(cred)}`, { hero: true }),
        panelStatCard('Market cap', formatMoney(cap)),
        panelStatCard('Events this month', String(eventsUsedCount))
      ])
    ),
    hasInstitutionalBoard(state)
      ? panelMetricGroup(
          'Board',
          panelMetricGrid('2', [
            panelStatCard('Board approval', `${sentimentScore} — ${escapeHtml(sentimentLabel(sentimentScore))}`),
            panelStatCard('Guidance streak', String(pm.guidanceBeatStreak ?? 0))
          ])
        )
      : null
  );

  let body = '';
  if (section === 'market') {
    body = `<div id="finance-public-stock-mount"></div>
      <p class="fine-print">Guidance tone, buybacks, and corporate actions live on the market desk. Earnings prep (${prep}/3) boosts the quarterly mark.</p>`;
  } else if (section === 'events') {
    body = `<section class="finance-section" aria-label="Public company events">
      <p class="fine-print">Events spend company cash immediately. Street credibility nudges monthly stock marks; crisis tools unlock when the tape or board turns sour.</p>
      ${renderEventsByCategory(state)}
    </section>`;
  } else {
    body = `${renderEarningsCommandCenter(state)}
      <section class="finance-section" aria-label="IR activity log">
        <h3 class="finance-section-title">IR activity log</h3>
        ${renderIrActivityLog(state)}
      </section>`;
  }

  container.innerHTML = `
    <div class="finance-public-panel">
      <header class="finance-public-head">
        <p class="panel-lede">You are public — manage the quote, the calendar, and how the CEO shows up to the street.</p>
      </header>
      ${renderPublicSubnav(state, section)}
      ${headStats}
      ${body}
    </div>`;

  if (section === 'market') {
    renderPublicStockPanel(container.querySelector('#finance-public-stock-mount'), state);
  }
}
