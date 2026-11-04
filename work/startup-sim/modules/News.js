import { assetBaseUrl } from './utils.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import { buildGameSnapshot } from './GameContext.js';
import { maybeCompetitorNewsArticle, bumpCompetitorPressure } from './Competitor.js';
import { stageLabel } from './constants.js';

let timelineSeed = null;

async function loadTimelineSeed() {
  if (timelineSeed) return timelineSeed;
  try {
    const res = await fetch(`${assetBaseUrl()}data/news-timeline-seed.json`, { cache: 'no-store' });
    timelineSeed = await res.json();
  } catch {
    timelineSeed = { events: [] };
  }
  return timelineSeed;
}

export function createInitialNews() {
  return {
    currentMonthArticles: [],
    archive: [],
    layoffQueue: [],
    showArchive: false
  };
}

export function recordLayoffEvent(state, layoffPct) {
  if (!state.news) state.news = createInitialNews();
  state.news.layoffQueue.push({
    month: state.calendar.monthIndex,
    year: state.calendar.year,
    layoffPct: Math.round(layoffPct * 100)
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
}

function matchingTimelineEvents(state, events) {
  const m = state.calendar.monthIndex;
  const y = 2026 + (state.calendar.year - 1);
  return events.filter((e) => e.month === m && e.year === y);
}

function offlineNewsArticles(state) {
  const company = state.company?.name ?? 'Startup';
  const articles = [
    {
      headline: `${company} keeps grinding in ${stageLabel(state.stage)} mode`,
      dek: 'Analysts pretend to be surprised.',
      body: `The Financier Times notes ${company} closed another month with ${formatMoneyShort(state.finance?.monthlyRevenue ?? 0)} in revenue signals. Parody markets remain unregulated.`,
      source: 'The Financier Times',
      date: monthLabel(state)
    }
  ];

  const layoff = state.news?.layoffQueue?.shift();
  if (layoff) {
    articles.push({
      headline: `${company} trims headcount amid restructuring chatter`,
      dek: 'LinkedIn engagement spikes (ProNet, technically).',
      body: `Macrohard Newsdesk reports a ${layoff.layoffPct}% workforce reduction. Former employees already pitching competing startups.`,
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

  if (state.flags?.seedRoundClosed) {
    articles.push({
      headline: `VC Twitter celebrates ${company} seed rumors`,
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
  return `Y${state.calendar.year} M${state.calendar.monthIndex}`;
}

export async function generateMonthlyNews(state) {
  if (!state.news) state.news = createInitialNews();
  const seed = await loadTimelineSeed();
  const timeline = matchingTimelineEvents(state, seed.events ?? []);

  const context = {
    snapshot: buildGameSnapshot(state),
    timelineEvents: timeline,
    layoffsPending: state.news.layoffQueue?.length ?? 0,
    rules: 'Use parody names only (Macrohard, Financier Times). No real CEOs or trademarks.'
  };

  if (shouldUseNarrativeAi()) {
    try {
      const res = await requestNarrative('startup_news_month', context);
      const articles = res?.articles ?? res?.result?.articles;
      if (Array.isArray(articles) && articles.length) {
        state.news.currentMonthArticles = normalizeArticles(articles, state);
        return { ok: true, source: 'ai' };
      }
    } catch {
      /* fallback */
    }
  }

  state.news.currentMonthArticles = offlineNewsArticles(state);
  return { ok: true, source: 'offline' };
}

function normalizeArticles(raw, state) {
  return raw.slice(0, 4).map((a, i) => ({
    id: `news-${state.calendar.year}-${state.calendar.monthIndex}-${i}`,
    headline: String(a.headline ?? 'Market moves').slice(0, 120),
    dek: String(a.dek ?? '').slice(0, 200),
    body: String(a.body ?? '').slice(0, 1200),
    source: String(a.source ?? 'Parody Wire').slice(0, 80),
    date: String(a.date ?? monthLabel(state)).slice(0, 40)
  }));
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
    <p class="panel-lede">Headlines refresh when you close each month (3–4 articles). Parody outlets only.</p>
    <button type="button" class="btn btn-ghost btn-small" id="btn-toggle-news-archive">
      ${showArchive ? 'Hide archive' : 'Show archive'}
    </button>
    <div class="news-feed">${current || '<div class="tab-placeholder">Close the month to fetch new headlines.</div>'}</div>
    ${showArchive ? `<div class="news-archive">${archive || '<p class="fine-print">No archived months yet.</p>'}</div>` : ''}
  `;
}

export function toggleNewsArchive(state) {
  if (!state.news) state.news = createInitialNews();
  state.news.showArchive = !state.news.showArchive;
}
