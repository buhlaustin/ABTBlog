import { fetchGameJson } from './utils.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import { buildNarrativeContext } from './GameContext.js';
import { maybeCompetitorNewsArticle, bumpCompetitorPressure } from './Competitor.js';
import bundledTimeline from '../data/news-timeline-seed.json' with { type: 'json' };

let timelineSeed = bundledTimeline;
let timelineHydrated = false;

async function loadTimelineSeed() {
  if (timelineHydrated) return timelineSeed;
  try {
    const data = await fetchGameJson('data/news-timeline-seed.json');
    if (data && Array.isArray(data.events)) {
      timelineSeed = data;
    }
  } catch {
    /* keep bundled timeline */
  }
  timelineHydrated = true;
  return timelineSeed;
}

export function preloadNewsTimeline() {
  return loadTimelineSeed();
}

export function createInitialNews() {
  return {
    currentMonthArticles: [],
    archive: [],
    layoffQueue: [],
    showArchive: false,
    seedCelebrationShown: false
  };
}

export function recordLayoffEvent(state, detail) {
  if (!state.news) state.news = createInitialNews();
  const priorHeadcount = detail.priorTotal ?? detail.priorHeadcount ?? 0;
  const newHeadcount = detail.newTotal ?? detail.newHeadcount ?? 0;
  if (priorHeadcount <= 0 || newHeadcount >= priorHeadcount) return;
  state.news.layoffQueue.push({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    priorHeadcount,
    newHeadcount,
    layoffPct: Math.round(detail.layoffPct * 100),
    consumed: false
  });
}

/** Call before calendar month increments. */
export function archiveCurrentNews(state) {
  if (!state.news) state.news = createInitialNews();
  const articles = state.news.currentMonthArticles ?? [];
  if (articles.length) {
    state.news.archive.unshift({
      month: state.calendar.monthIndex,
      year: state.calendar.year,
      articles: [...articles]
    });
    state.news.archive = state.news.archive.slice(0, 24);
  }
  state.news.currentMonthArticles = [];
  state.news.layoffQueue = (state.news.layoffQueue ?? []).filter((e) => !e.consumed);
}

function matchingTimelineEvents(state, events) {
  const m = state.calendar.monthIndex;
  const y = 2026 + (state.calendar.year - 1);
  return events.filter((e) => e.month === m && e.year === y);
}

function consumeNextLayoff(state) {
  const queue = state.news?.layoffQueue ?? [];
  const idx = queue.findIndex((e) => !e.consumed);
  if (idx < 0) return null;
  queue[idx].consumed = true;
  return queue[idx];
}

function offlineNewsArticles(state) {
  const company = state.company?.name ?? 'Startup';
  const narrative = buildNarrativeContext(state);
  const rev = formatMoneyShort(state.finance?.monthlyRevenue ?? 0);
  const articles = [
    {
      headline: `${company} reports another month of operating momentum`,
      dek: 'Analysts watch hiring and recurring revenue.',
      body: `${company}, a ${narrative.category} company working from ${narrative.workspaceDescription}, closed the month with roughly ${rev} in revenue. Insiders describe the team as ${narrative.productMaturityNote} with ${narrative.marketBuzzNote}.`,
      source: 'The Financier Times',
      date: monthLabel(state)
    }
  ];

  const layoff = consumeNextLayoff(state);
  if (layoff && layoff.priorHeadcount >= 5) {
    const cut = layoff.priorHeadcount - layoff.newHeadcount;
    articles.push({
      headline: `${company} reduces staff by ${cut} roles in restructuring`,
      dek: 'Leadership cites focus and runway.',
      body: `Macrohard Newsdesk confirmed ${company} lowered headcount from ${layoff.priorHeadcount} to ${layoff.newHeadcount} employees. The move represents about ${layoff.layoffPct}% of the prior team. Executives declined to comment on further changes.`,
      source: 'Macrohard Newsdesk',
      date: monthLabel(state)
    });
  }

  const rivalArticle = maybeCompetitorNewsArticle(state);
  if (rivalArticle) {
    articles.push(rivalArticle);
    bumpCompetitorPressure(state, 1);
  }

  if (state.flags?.lastDownRound) {
    articles.push({
      headline: `${company} closes a down round — board calls it "discipline"`,
      dek: 'Valuation haircut, morale optional.',
      body: 'The Financier Times notes terms were "creative." Your cap table spreadsheet weeps quietly.',
      source: 'The Financier Times',
      date: monthLabel(state)
    });
    state.flags.lastDownRound = false;
  }

  if (state.flags?.seedRoundClosed && !state.news?.seedCelebrationShown) {
    state.news.seedCelebrationShown = true;
    articles.push({
      headline: `VC Twitter celebrates ${company}'s seed close`,
      dek: 'Term sheets or it did not happen.',
      body: 'Patty Fundsworth posted six threads and zero confirmations. Chirp remains undefeated as a source of truth.',
      source: 'Chirp Business',
      date: monthLabel(state)
    });
  }

  return articles.slice(0, 4);
}

function formatMoneyShort(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

function monthLabel(state) {
  return `Year ${state.calendar.year}, month ${state.calendar.monthIndex}`;
}

const META_BLOCKLIST =
  /\b(sandbox|career mode|desk task|headcount cap|level \d|product level|save v|task slot|XC-only|garage mode|ARR gate|hub hq gate)\b/gi;

function sanitizeNarrativeText(text) {
  return String(text ?? '')
    .replace(META_BLOCKLIST, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function sanitizeArticles(raw, state) {
  return raw.slice(0, 4).map((a, i) => ({
    id: `news-${state.calendar.year}-${state.calendar.monthIndex}-${i}`,
    headline: sanitizeNarrativeText(String(a.headline ?? 'Market moves')).slice(0, 120),
    dek: sanitizeNarrativeText(String(a.dek ?? '')).slice(0, 200),
    body: sanitizeNarrativeText(String(a.body ?? '')).slice(0, 1200),
    source: String(a.source ?? 'Parody Wire').slice(0, 80),
    date: String(a.date ?? monthLabel(state)).slice(0, 40)
  }));
}

export function applyOfflineMonthlyNews(state) {
  if (!state.news) state.news = createInitialNews();
  state.news.currentMonthArticles = offlineNewsArticles(state);
}

/** @returns {Promise<boolean>} true when AI articles replaced offline feed */
export async function enrichMonthlyNewsWithAi(state) {
  if (!state.news) state.news = createInitialNews();
  if (!shouldUseNarrativeAi()) return false;

  const seed = await loadTimelineSeed();
  const timeline = matchingTimelineEvents(state, seed.events ?? []);
  const context = {
    narrative: buildNarrativeContext(state),
    timelineEvents: timeline,
    rules:
      'In-world journalism only. Use narrative.recentLayoffEvents for layoff stories (at most one). Never reference game mechanics listed in narrative.narrativeRules.'
  };

  try {
    const res = await requestNarrative('startup_news_month', context);
    const articles = res?.articles ?? res?.result?.articles;
    if (Array.isArray(articles) && articles.length) {
      state.news.currentMonthArticles = sanitizeArticles(articles, state);
      if ((state.news.layoffQueue ?? []).some((e) => !e.consumed)) {
        consumeNextLayoff(state);
      }
      return true;
    }
  } catch {
    /* keep offline */
  }
  return false;
}

export async function generateMonthlyNews(state) {
  applyOfflineMonthlyNews(state);
  if (await enrichMonthlyNewsWithAi(state)) {
    return { ok: true, source: 'ai' };
  }
  return { ok: true, source: 'offline' };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderNewsPanel(container, state) {
  if (!container) return;
  const news = state.news ?? createInitialNews();
  const showArchive = news.showArchive;

  const current = (news.currentMonthArticles ?? [])
    .map(
      (a) => `
      <article class="news-article">
        <p class="news-source">${escapeHtml(a.source)} · ${escapeHtml(a.date)}</p>
        <h3>${escapeHtml(a.headline)}</h3>
        <p class="news-dek">${escapeHtml(a.dek)}</p>
        <p class="news-body">${escapeHtml(a.body)}</p>
      </article>`
    )
    .join('');

  const archive = showArchive
    ? (news.archive ?? [])
        .map(
          (block) => `
        <section class="news-archive-block">
          <h4>Y${block.year} M${block.month}</h4>
          ${block.articles
            .map(
              (a) => `<p><strong>${escapeHtml(a.headline)}</strong> — ${escapeHtml(a.source)}</p>`
            )
            .join('')}
        </section>`
        )
        .join('')
    : '';

  container.innerHTML = `
    <p class="panel-lede">Parody press coverage updates when you close each month.</p>
    <button type="button" class="btn btn-small" id="btn-toggle-news-archive">${showArchive ? 'Hide archive' : 'Show archive'}</button>
    <div class="news-feed">${current || '<p class="fine-print">No headlines yet this month.</p>'}</div>
    ${archive}
  `;
}

export function toggleNewsArchive(state) {
  if (!state.news) state.news = createInitialNews();
  state.news.showArchive = !state.news.showArchive;
}
