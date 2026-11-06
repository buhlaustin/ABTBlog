import { fetchGameJson } from './utils.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import { buildNarrativeContext } from './GameContext.js';
import { maybeCompetitorNewsArticle, bumpCompetitorPressure } from './Competitor.js';
import { getArr } from './Workspace.js';
import bundledTimeline from '../data/news-timeline-seed.json' with { type: 'json' };
import { calendarTurn, formatStateMonth, formatCalendarStamp } from './GameCalendar.js';
import { formatMoney } from './constants.js';
import { panelStatCard, panelMetricGroup, panelMetricGrid, panelSnapshotSection } from './PanelChrome.js';

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
    seedCelebrationShown: false,
    unreadCount: 0,
    publishedTurn: null
  };
}

export function monthTurn(state) {
  return calendarTurn(state);
}

function monthLabel(state) {
  return formatStateMonth(state);
}

function seededRand(state, salt = 0) {
  let t = ((state.meta?.runSeed ?? 1) + monthTurn(state) * 7919 + salt * 104729) >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function newsDateLabel(state) {
  const snap = state.news?.closedMonthSnapshot;
  if (snap?.closedYear != null && snap?.closedMonthIndex != null) {
    return formatCalendarStamp(snap.closedYear, snap.closedMonthIndex);
  }
  return monthLabel(state);
}

function newsContext(state) {
  const narrative = buildNarrativeContext(state);
  const company = state.company?.name ?? 'Startup';
  const snap = state.news?.closedMonthSnapshot;
  const rev = formatMoney(
    snap?.monthRevenue ?? state.calendar?.monthRevenue ?? state.finance?.monthlyRevenue ?? 0
  );
  const arr = formatMoney(snap?.arrAfter ?? getArr(state));
  const rival = state.world?.competitor?.name ?? 'a rival';
  const rivalProduct = state.world?.competitor?.product ?? 'a similar product';
  const hub = state.offices?.hubLabel ?? narrative.cityOrHub;
  return { company, narrative, rev, arr, rival, rivalProduct, hub, state };
}

/** Rotating offline beats — picked by month + run seed, deduped against archive. */
const OFFLINE_NEWS_TEMPLATES = [
  {
    id: 'desk-close',
    source: 'The Financier Times',
    build: (c) => ({
      headline: `${c.company} books ${c.rev} month as ${c.narrative.fundingStage} story deepens`,
      dek: 'Investors watch recurring revenue and burn.',
      body: `${c.company}, a ${c.narrative.category} outfit operating from ${c.narrative.workspaceDescription}, reported roughly ${c.rev} in the latest period with ${c.arr} ARR on the slide deck. Insiders describe the product as ${c.narrative.productMaturityNote} amid ${c.narrative.marketBuzzNote}.`
    })
  },
  {
    id: 'hiring-signal',
    source: 'Macrohard Newsdesk',
    build: (c) => ({
      headline: `${c.company} hiring signals point to ${c.narrative.category} expansion`,
      dek: `${c.narrative.headcount} employees on the roster.`,
      body: `Recruiting chatter around ${c.company} picked up after the team closed another month. The company remains ${c.narrative.fundingStage} with ${c.narrative.headcount} people across functions, according to sources who asked not to be named because they still want referral bonuses.`
    })
  },
  {
    id: 'product-chatter',
    source: 'Chirp Business',
    build: (c) => ({
      headline: `ProNet threads debate whether ${c.company} is "finally enterprise-ready"`,
      dek: 'Screenshot economy in full effect.',
      body: `A ${c.narrative.productMaturityNote} release cycle fueled overnight takes. Bears cite competition from ${c.rival}; bulls point to ${c.narrative.marketBuzzNote} and ${c.arr} ARR as proof the category still has room.`
    })
  },
  {
    id: 'runway-watch',
    source: 'The Financier Times',
    build: (c) => ({
      headline: `Runway watch: ${c.company} balances growth against ${formatMoney(c.narrative.monthlyOverhead)} overhead`,
      dek: c.narrative.runwayMonths != null ? `About ${c.narrative.runwayMonths} months of cash cited.` : 'Cash position closely held.',
      body: `Analysts modeling ${c.company} note ${c.narrative.fundingStage} companies rarely get quiet months. The firm carried ${formatMoney(c.narrative.cash)} in cash while posting ${c.rev} in revenue for the period just ended.`
    })
  },
  {
    id: 'category-heat',
    source: 'Parody Wire',
    build: (c) => ({
      headline: `${c.narrative.category} sector heats up as ${c.company} keeps shipping`,
      dek: `${c.hub} listed as operating base.`,
      body: `Category newsletters circled ${c.company} after another operational month. ${c.rival} remains the shorthand competitor, pitching ${c.rivalProduct} to the same buyers. ${c.company} declined a hot take but forwarded a press kit.`
    })
  },
  {
    id: 'founder-profile',
    source: 'Founder Daily',
    build: (c) => ({
      headline: `Inside ${c.company}'s month: shipping cadence keeps climbing`,
      dek: 'Founder equity story still central.',
      body: `Profile writers refreshed their ${c.company} Google Doc after the latest numbers. The team works from ${c.narrative.workspaceDescription}; market tone is ${c.narrative.marketBuzzNote}. Public filings are not yet in play.`
    })
  },
  {
    id: 'enterprise-pipeline',
    source: 'The Financier Times',
    build: (c) => ({
      headline: `${c.company} enterprise pipeline rumors refuse to die`,
      dek: 'Procurement portals allegedly bookmarked.',
      body: `Sources claim ${c.company} logged another month above ${c.rev} while chasing larger contracts in ${c.narrative.category}. Competitor ${c.rival} reportedly undercut on price; ${c.company} leaned on product depth.`
    })
  },
  {
    id: 'buzz-meter',
    source: 'Chirp Business',
    build: (c) => ({
      headline: `Buzz meter: ${c.company} ${c.narrative.marketBuzzNote} after latest ship cycle`,
      dek: 'Marketing Twitter takes the win.',
      body: `Engagement charts for ${c.company} ticked up following the month close. ARR now quoted near ${c.arr}. Skeptics note ${c.rival} raised louder last week; optimists say category winners compound quietly.`
    })
  },
  {
    id: 'prelaunch-waitlist',
    source: 'Startup Chirp',
    when: (c) =>
      Boolean(c.state.launch?.phase === 'pre_launch' || c.state.launch?.phase === 'scheduled') &&
      (c.state.launch?.waitlistSignups ?? 0) > 0,
    build: (c) => ({
      headline: `${c.company} waitlist passes ${(c.state.launch?.waitlistSignups ?? 0).toLocaleString()} signups`,
      dek: 'Pre-sell revenue quietly hits the bank account.',
      body: `Founders claim ${c.narrative.category} momentum before launch day. Buzz sits at ${c.state.product?.buzz ?? 0} with product level ${c.state.product?.level ?? 0}. Rivals still loud; your pre-sell booked total is the quiet flex.`
    })
  },
  {
    id: 'public-tease',
    source: 'IPO Watch (Parody)',
    when: (c) => Boolean(c.state.flags?.ipoFiled || c.state.publicMarket?.ticker),
    build: (c) => ({
      headline: `${c.company} public-market watchers parse another ${c.rev} month`,
      dek: c.state.publicMarket?.ticker ? `Ticker ${c.state.publicMarket.ticker} on everyone's second monitor.` : 'Listing chatter persists.',
      body: `Market commentators tied ${c.company}'s operating month to float dynamics and guidance games. The company remains a ${c.narrative.category} story with ${c.arr} ARR in investor decks.`
    })
  },
  {
    id: 'public-index-flows',
    source: 'The Financier Times',
    when: (c) => Boolean(c.state.publicMarket?.indexMember),
    build: (c) => ({
      headline: `${c.state.publicMarket?.ticker ?? c.company} rides ${c.state.publicMarket?.indexName ?? 'index'} rebalance flows`,
      dek: 'Passive money pretends not to care about your burn multiple.',
      body: `Index inclusion keeps ${c.company} in ETF baskets while active managers debate ${c.arr} ARR versus ${c.state.publicMarket?.analystRating ?? 'Hold'} consensus. Short interest sits near ${c.state.publicMarket?.shortInterestPct ?? 0}%.`
    })
  },
  {
    id: 'public-analyst-spat',
    source: 'Terminal Chatter',
    when: (c) =>
      Boolean(c.state.flags?.ipoFiled) &&
      (c.state.publicMarket?.guidanceBeatStreak ?? 0) === 0 &&
      (c.state.publicMarket?.monthsPublic ?? 0) >= 2,
    build: (c) => ({
      headline: `Analysts bicker over ${c.state.publicMarket?.ticker ?? c.company} after a soft month`,
      dek: `${c.state.publicMarket?.analystRating ?? 'Hold'} vs reality.`,
      body: `Whisper revenue missed the chat room consensus. ${c.company} still prints ${c.rev} for the month, but the stock desk wants a clearer beat streak before raising price targets above ${c.state.publicMarket?.analystTarget ?? '—'}.`
    })
  },
  {
    id: 'seed-grind',
    source: 'Patty Fundsworth Substack',
    when: (c) => c.state.flags?.seedRoundClosed && !c.state.flags?.seriesAClosed,
    build: (c) => ({
      headline: `${c.company} seed investors ask for "one more chart"`,
      dek: 'Deck v47 rumored.',
      body: `${c.company} closed another month at ${c.rev} while partners debated whether ${c.arr} ARR is "real ARR." The founder promised a bigger vision and a smaller burn slide.`
    })
  },
  {
    id: 'series-a-pressure',
    source: 'The Financier Times',
    when: (c) => c.state.flags?.seriesAClosed && !c.state.flags?.seriesBClosed,
    build: (c) => ({
      headline: `Series A pressure mounts on ${c.company} after ${c.rev} month`,
      dek: 'Board slides due before vacation season.',
      body: `${c.company} must show ${c.narrative.category} leadership with ${c.narrative.headcount} employees and ${c.arr} ARR. ${c.rival} hired a splashy CMO; ${c.company} shipped instead.`
    })
  },
  {
    id: 'late-stage-discipline',
    source: 'Macrohard Newsdesk',
    when: (c) => Boolean(c.state.flags?.seriesCClosed || c.state.flags?.seriesDClosed),
    build: (c) => ({
      headline: `${c.company} late-stage discipline: ${c.rev} revenue, eyes on rule of 40`,
      dek: 'Growth-efficiency bingo card updated.',
      body: `Efficiency-minded investors parsed ${c.company}'s month as ${c.narrative.fundingStage} norms tighten. Cash ${formatMoney(c.narrative.cash)}; overhead ${formatMoney(c.narrative.monthlyOverhead)}.`
    })
  },
  {
    id: 'garage-myth',
    source: 'Startup Weekly',
    when: (c) => c.narrative.workspaceDescription.includes('garage'),
    build: (c) => ({
      headline: `${c.company} still ships from a garage — ${c.rev} month says otherwise`,
      dek: 'Myth-making intact.',
      body: `The ${c.narrative.category} startup kept costs low while posting ${c.rev} in revenue. Neighbors report hearing standups through the drywall. ${c.rival} operates from a WeWork; ${c.company} claims moral high ground.`
    })
  },
  {
    id: 'campus-era',
    source: 'The Financier Times',
    when: (c) => c.narrative.workspaceDescription.includes('campus') || c.narrative.workspaceDescription.includes('headquarters'),
    build: (c) => ({
      headline: `${c.company} HQ era: another ${c.rev} month from the home campus`,
      dek: 'Parking lot full of optimistic SUVs.',
      body: `${c.company} consolidated teams under one roof while reporting ${c.arr} ARR. Facilities added cold brew; finance added another scenario model.`
    })
  },
  {
    id: 'hub-city',
    source: 'Global Tech Ledger',
    when: (c) => c.narrative.workspaceDescription.includes('hub'),
    build: (c) => ({
      headline: `${c.company} hub strategy pays off in ${c.hub} with ${c.rev} month`,
      dek: 'Worldwide badge on the website.',
      body: `The ${c.narrative.category} company pointed to its hub footprint as proof it can sell outside one zip code. ${c.rival} opened a WeWork in the same city; drama ensued.`
    })
  },
  {
    id: 'sentiment-board',
    source: 'Boardroom Insider (Parody)',
    when: (c) => (c.narrative.boardSentimentScore ?? 0) > 0,
    build: (c) => ({
      headline: `Board sentiment watch: ${c.company} scores ${c.narrative.boardSentimentScore} after tough month`,
      dek: 'Governance Twitter has opinions.',
      body: `Directors debated whether ${c.rev} revenue and ${c.arr} ARR merit celebration or a stern email. Management promised transparency and slightly better snacks.`
    })
  },
  {
    id: 'competitor-compare',
    source: 'Parody Wire',
    build: (c) => ({
      headline: `${c.rival} vs ${c.company}: same slide, different ${c.narrative.category} pitch`,
      dek: 'Analysts publish another 2×2 matrix.',
      body: `Side-by-side comparisons landed in inboxes after ${c.company}'s ${c.rev} month. ${c.rival} leads on brand heat; ${c.company} leads on ${c.narrative.productMaturityNote} narrative.`
    })
  },
  {
    id: 'customer-win',
    source: 'Customer Success Daily',
    build: (c) => ({
      headline: `Logo hunters claim ${c.company} landed "a top-five" ${c.narrative.category} account`,
      dek: 'NDA prevents naming names.',
      body: `Sales rumor mills spun after ${c.company} posted ${c.rev}. Whether the deal closes this quarter remains unclear; ARR models already did.`
    })
  },
  {
    id: 'international-whisper',
    source: 'The Financier Times',
    build: (c) => ({
      headline: `${c.company} international whispers grow louder after ${c.arr} ARR print`,
      dek: 'Passport stamps optional.',
      body: `Sources say ${c.company} explored overseas hires while closing a ${c.rev} month. ${c.rival} already has a .eu subdomain; ${c.company} has a translation doc.`
    })
  },
  {
    id: 'ops-grind',
    source: 'Macrohard Newsdesk',
    build: (c) => ({
      headline: `Ops grind continues at ${c.company} — ${c.rev} with no flashy launch`,
      dek: 'Boring months win wars.',
      body: `No product confetti this cycle, just execution. ${c.company} remains ${c.narrative.fundingStage} with ${c.narrative.headcount} staff and ${c.narrative.marketBuzzNote}.`
    })
  }
];

function recentHeadlinesSet(state) {
  const set = new Set();
  for (const block of state.news?.archive ?? []) {
    for (const a of block.articles ?? []) {
      if (a.headline) set.add(a.headline);
    }
  }
  return set;
}

const NEWS_STORY_ANGLES = [
  'Anonymized employee / glassdoor-style culture beat',
  'Rival comparison sidebar (competitor in the lede, not the company)',
  'Regulatory, compliance, or procurement friction whisper',
  'Category trend piece with the company as one datapoint',
  'Macro timeline event reaction (only if timelineEvents provided)',
  'Founder human-interest (habits, quotes, myth-making) without hero worship',
  'Enterprise customer logo hunt / deal rumor with NDA tension',
  'Workplace facilities or real-estate symbolism (office, hub, garage)',
  'Product ship cycle — specific feature chatter, not generic "shipping"',
  'Investor / board dynamics and term-sheet theater',
  'Pre-launch waitlist or launch-week energy (if launchPhase fits)',
  'Public-market tape, guidance, or short interest (if public)',
  'Category property / infrastructure spend (data center, EMO, etc.)',
  'Conference, expo, or brand-event circus (if conference configured)',
  'Talent market poaching war in the category',
  'Security incident or near-miss that stayed internal',
  'Partnership or integration rumor with a parody mega-vendor',
  'Efficiency, layoffs, or "year of discipline" (only if layoffs in context)',
  'International expansion whispers',
  'Marketing buzz / social screenshot economy'
];

function pickAssignedNewsAngles(state, count) {
  const rand = seededRand(state, 41);
  const pool = [...NEWS_STORY_ANGLES];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function collectForbiddenHeadlines(state, limit = 32) {
  const headlines = [];
  for (const block of state.news?.archive ?? []) {
    for (const a of block.articles ?? []) {
      if (a.headline) headlines.push(a.headline);
    }
  }
  for (const a of state.news?.currentMonthArticles ?? []) {
    if (a.headline) headlines.push(a.headline);
  }
  return headlines.slice(0, limit);
}

function forbiddenOpeningPhrases(headlines) {
  const phrases = new Set();
  for (const h of headlines) {
    const words = String(h)
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .join(' ');
    if (words.length > 10) phrases.add(words);
  }
  return [...phrases].slice(0, 24);
}

function normalizeHeadlineText(h) {
  return String(h ?? '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function headlineTooSimilar(candidate, forbidden) {
  const c = normalizeHeadlineText(candidate);
  if (!c) return true;
  for (const f of forbidden) {
    const n = normalizeHeadlineText(f);
    if (!n) continue;
    if (c === n) return true;
    const cWords = c.split(' ').slice(0, 5).join(' ');
    const fWords = n.split(' ').slice(0, 5).join(' ');
    if (cWords.length > 12 && cWords === fWords) return true;
  }
  return false;
}

function filterUniqueAiArticles(articles, forbidden) {
  const kept = [];
  const seen = [...forbidden];
  for (const a of articles) {
    if (headlineTooSimilar(a.headline, seen)) continue;
    kept.push(a);
    seen.push(a.headline);
  }
  return kept;
}

function buildTemplateArticle(template, ctx, state) {
  const built = template.build(ctx);
  return {
    id: `offline-${template.id}-${monthTurn(state)}`,
    headline: built.headline,
    dek: built.dek,
    body: built.body,
    source: template.source,
    date: newsDateLabel(state)
  };
}

function pickOfflineTemplateArticles(state, count, reservedHeadlines) {
  const ctx = newsContext(state);
  const recent = recentHeadlinesSet(state);
  const rand = seededRand(state, 3);
  const eligible = OFFLINE_NEWS_TEMPLATES.filter((t) => !t.when || t.when(ctx));
  const picked = [];
  const usedIds = new Set();

  for (let attempt = 0; attempt < 80 && picked.length < count; attempt += 1) {
    const idx = Math.floor(rand() * eligible.length);
    const template = eligible[idx];
    if (!template || usedIds.has(template.id)) continue;
    const article = buildTemplateArticle(template, ctx, state);
    if (recent.has(article.headline) || reservedHeadlines.has(article.headline)) continue;
    usedIds.add(template.id);
    picked.push(article);
  }

  return picked;
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
  const y = state.calendar.year;
  return events.filter((e) => e.month === m && e.year === y);
}

function consumeNextLayoff(state) {
  const queue = state.news?.layoffQueue ?? [];
  const idx = queue.findIndex((e) => !e.consumed);
  if (idx < 0) return null;
  queue[idx].consumed = true;
  return queue[idx];
}

function timelineArticles(state, events) {
  const company = state.company?.name ?? 'Startup';
  return matchingTimelineEvents(state, events).map((e) => ({
    id: `timeline-${e.year}-${e.month}-${e.tag ?? 'world'}`,
    headline: e.headline,
    dek: 'Macro backdrop for operators.',
    body: `${company} operators tracked "${e.headline}" while closing their own month. Investors asked whether ${e.tag ?? 'macro'} trends help or hurt ${state.company?.categoryLabel ?? 'the category'}.`,
    source: 'World Desk (Parody)',
    date: newsDateLabel(state)
  }));
}

function assignCurrentArticles(state, articles) {
  if (!state.news) state.news = createInitialNews();
  const slice = articles.slice(0, 4);
  state.news.currentMonthArticles = slice;
  state.news.unreadCount = slice.length;
  state.news.publishedTurn = monthTurn(state);
}

export function markNewsAsRead(state) {
  if (!state.news) return;
  state.news.unreadCount = 0;
}

export function unreadNewsCount(state) {
  return state.news?.unreadCount ?? 0;
}

/** Tab badge + aria for new headlines. */
export function syncNewsTabAlert(state) {
  if (typeof document === 'undefined') return;
  const tab = document.getElementById('tab-news');
  if (!tab) return;
  const n = unreadNewsCount(state);
  let badge = tab.querySelector('.tab-badge');
  if (n > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'tab-badge';
      badge.setAttribute('aria-hidden', 'true');
      tab.appendChild(badge);
    }
    badge.textContent = n > 9 ? '9+' : String(n);
    tab.setAttribute('aria-label', `News, ${n} new article${n === 1 ? '' : 's'}`);
  } else {
    badge?.remove();
    tab.setAttribute('aria-label', 'News');
  }
}

function offlineNewsArticles(state, timelineEvents = []) {
  const company = state.company?.name ?? 'Startup';
  const articles = [];
  const reserved = new Set();

  for (const t of timelineArticles(state, timelineEvents)) {
    articles.push(t);
    reserved.add(t.headline);
  }

  const layoff = consumeNextLayoff(state);
  if (layoff && layoff.priorHeadcount >= 5) {
    const cut = layoff.priorHeadcount - layoff.newHeadcount;
    const a = {
      id: `layoff-${monthTurn(state)}`,
      headline: `${company} reduces staff by ${cut} roles in restructuring`,
      dek: 'Leadership cites focus and runway.',
      body: `Macrohard Newsdesk confirmed ${company} lowered headcount from ${layoff.priorHeadcount} to ${layoff.newHeadcount} employees. The move represents about ${layoff.layoffPct}% of the prior team. Executives declined to comment on further changes.`,
      source: 'Macrohard Newsdesk',
      date: newsDateLabel(state)
    };
    articles.push(a);
    reserved.add(a.headline);
  }

  const rivalArticle = maybeCompetitorNewsArticle(state);
  if (rivalArticle) {
    articles.push({ id: `rival-${monthTurn(state)}`, ...rivalArticle });
    reserved.add(rivalArticle.headline);
    bumpCompetitorPressure(state, 1);
  }

  if (state.flags?.lastDownRound) {
    const a = {
      id: `downround-${monthTurn(state)}`,
      headline: `${company} closes a down round — board calls it "discipline"`,
      dek: 'Valuation haircut, morale optional.',
      body: 'The Financier Times notes terms were "creative." Your cap table spreadsheet weeps quietly.',
      source: 'The Financier Times',
      date: newsDateLabel(state)
    };
    articles.push(a);
    reserved.add(a.headline);
    state.flags.lastDownRound = false;
  }

  if (state.flags?.seedRoundClosed && !state.news?.seedCelebrationShown) {
    state.news.seedCelebrationShown = true;
    const a = {
      id: `seed-celebrate-${monthTurn(state)}`,
      headline: `VC Twitter celebrates ${company}'s seed close`,
      dek: 'Term sheets or it did not happen.',
      body: 'Patty Fundsworth posted six threads and zero confirmations. Chirp remains undefeated as a source of truth.',
      source: 'Chirp Business',
      date: newsDateLabel(state)
    };
    articles.push(a);
    reserved.add(a.headline);
  }

  const need = Math.max(2, 3 - articles.length);
  articles.push(...pickOfflineTemplateArticles(state, need, reserved));

  return articles.slice(0, 4);
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
    id: a.id ?? `news-${state.calendar.year}-${state.calendar.monthIndex}-${i}`,
    headline: sanitizeNarrativeText(String(a.headline ?? 'Market moves')).slice(0, 120),
    dek: sanitizeNarrativeText(String(a.dek ?? '')).slice(0, 200),
    body: sanitizeNarrativeText(String(a.body ?? '')).slice(0, 1200),
    source: String(a.source ?? 'Parody Wire').slice(0, 80),
    date: String(a.date ?? newsDateLabel(state)).slice(0, 40)
  }));
}

export function applyOfflineMonthlyNews(state, monthSummary = null) {
  if (!state.news) state.news = createInitialNews();
  if (monthSummary) {
    state.news.closedMonthSnapshot = {
      closedYear: monthSummary.closedYear,
      closedMonthIndex: monthSummary.closedMonthIndex,
      monthRevenue: monthSummary.monthRevenue,
      burn: monthSummary.burn,
      arrAfter: monthSummary.arrAfter
    };
  }
  const seed = timelineSeed?.events ?? [];
  assignCurrentArticles(state, offlineNewsArticles(state, seed));
}

/** @returns {Promise<boolean>} true when AI articles replaced offline feed */
export async function enrichMonthlyNewsWithAi(state) {
  if (!state.news) state.news = createInitialNews();
  if (!shouldUseNarrativeAi()) return false;

  const seed = await loadTimelineSeed();
  const timeline = matchingTimelineEvents(state, seed.events ?? []);
  const seedArticles = (state.news.currentMonthArticles ?? []).map((a) => ({
    headline: a.headline,
    dek: a.dek,
    source: a.source
  }));
  const articleCount = Math.max(3, Math.min(4, seedArticles.length || 3));
  const forbiddenHeadlines = collectForbiddenHeadlines(state);
  const context = {
    narrative: buildNarrativeContext(state),
    closedMonth: state.news.closedMonthSnapshot ?? null,
    calendarLabel: newsDateLabel(state),
    timelineEvents: timeline,
    seedArticles,
    forbiddenHeadlines,
    forbiddenOpeningPhrases: forbiddenOpeningPhrases(forbiddenHeadlines),
    assignedAngles: pickAssignedNewsAngles(state, articleCount),
    rules:
      'Rewrite seedArticles completely. Match assignedAngles order to output articles. Obey narrative.narrativeRules.'
  };

  try {
    const res = await requestNarrative('startup_news_month', context);
    const articles = res?.articles ?? res?.result?.articles;
    if (Array.isArray(articles) && articles.length) {
      const sanitized = sanitizeArticles(articles, state);
      const unique = filterUniqueAiArticles(sanitized, forbiddenHeadlines);
      if (unique.length < 2) return false;
      for (const a of unique) {
        a.date = newsDateLabel(state);
      }
      assignCurrentArticles(state, unique);
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
  const unread = unreadNewsCount(state);

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
          <h4>${escapeHtml(formatCalendarStamp(block.year, block.month))}</h4>
          ${block.articles
            .map(
              (a) => `<p><strong>${escapeHtml(a.headline)}</strong> — ${escapeHtml(a.source)}</p>`
            )
            .join('')}
        </section>`
        )
        .join('')
    : '';

  const articleCount = (news.currentMonthArticles ?? []).length;
  const archiveCount = (news.archive ?? []).reduce((n, b) => n + (b.articles?.length ?? 0), 0);
  const alertLine =
    unread > 0
      ? `<div class="finance-alert news-unread-alert" role="status">${unread} new article${unread === 1 ? '' : 's'} this month</div>`
      : '';

  container.innerHTML = `
    <div class="news-panel finance-panel">
      <div class="finance-hero">
        <p class="panel-lede">Parody press coverage — fresh headlines when you close each month.</p>
      </div>
      ${panelSnapshotSection(
        panelMetricGroup(
          'Feed snapshot',
          panelMetricGrid('3', [
            panelStatCard('This month', String(articleCount), { hero: true }),
            panelStatCard('Unread', String(unread), { tone: unread > 0 ? 'pos' : null }),
            panelStatCard('Archive', String(archiveCount))
          ])
        ),
        { ariaLabel: 'News feed snapshot' }
      )}
      ${alertLine}
      <div class="news-toolbar">
        <button type="button" class="btn btn-primary btn-small" id="btn-toggle-news-archive">${showArchive ? 'Hide archive' : 'Show archive'}</button>
      </div>
      <section class="finance-section news-feed-section">
        <h3 class="finance-section-title">${escapeHtml(monthLabel(state))} headlines</h3>
        <div class="news-feed">${current || '<p class="fine-print">No headlines yet this month.</p>'}</div>
      </section>
      ${showArchive ? `<section class="finance-section news-archive-section"><h3 class="finance-section-title">Archive</h3>${archive}</section>` : ''}
    </div>
  `;
}

export function toggleNewsArchive(state) {
  if (!state.news) state.news = createInitialNews();
  state.news.showArchive = !state.news.showArchive;
}
