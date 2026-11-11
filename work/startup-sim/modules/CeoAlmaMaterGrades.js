import { escapeHtml } from './PanelChrome.js';
import { resolveCompanyAlmaMater, alumniSchoolTypeLabel } from './CeoAlumniGiving.js';
import { calendarTurn } from './GameCalendar.js';

/** All dimensions use the same A–F ladder (0–100 hidden score under the hood). */
export const ALMA_GRADE_KEYS = [
  'academics',
  'research',
  'athletics',
  'arts_culture',
  'career_outcomes',
  'campus_life',
  'access_affordability',
  'alumni_network'
];

const GRADE_LETTERS = [
  { min: 97, letter: 'A+' },
  { min: 93, letter: 'A' },
  { min: 90, letter: 'A-' },
  { min: 87, letter: 'B+' },
  { min: 83, letter: 'B' },
  { min: 80, letter: 'B-' },
  { min: 77, letter: 'C+' },
  { min: 73, letter: 'C' },
  { min: 70, letter: 'C-' },
  { min: 67, letter: 'D+' },
  { min: 63, letter: 'D' },
  { min: 60, letter: 'D-' },
  { min: 0, letter: 'F' }
];

/**
 * Fictional baseline bands per school type [lo, hi] — jittered per run + school id.
 * Example arcs: liberal arts → strong academics/arts, weaker athletics/research;
 * research flagships → strong research/career/network, athletics varies.
 */
const TYPE_GRADE_BANDS = {
  liberal_arts: {
    academics: [78, 96],
    research: [42, 68],
    athletics: [30, 56],
    arts_culture: [72, 95],
    career_outcomes: [58, 82],
    campus_life: [62, 86],
    access_affordability: [55, 80],
    alumni_network: [50, 78]
  },
  research: {
    academics: [76, 94],
    research: [80, 98],
    athletics: [50, 88],
    arts_culture: [55, 82],
    career_outcomes: [74, 94],
    campus_life: [64, 88],
    access_affordability: [48, 72],
    alumni_network: [72, 95]
  },
  hbcu: {
    academics: [66, 88],
    research: [48, 72],
    athletics: [58, 86],
    arts_culture: [60, 85],
    career_outcomes: [62, 84],
    campus_life: [58, 80],
    access_affordability: [68, 90],
    alumni_network: [64, 88]
  },
  community: {
    academics: [56, 78],
    research: [35, 58],
    athletics: [38, 62],
    arts_culture: [45, 70],
    career_outcomes: [52, 76],
    campus_life: [48, 72],
    access_affordability: [72, 92],
    alumni_network: [40, 65]
  }
};

const DEFAULT_BANDS = TYPE_GRADE_BANDS.research;

/** Two fixed A–F exemplars (not your campus) — illustrates type spread. */
export const ALMA_GRADE_AF_EXAMPLES = [
  {
    name: 'Maryville College (liberal arts)',
    type: 'liberal_arts',
    grades: {
      academics: 88,
      research: 52,
      athletics: 41,
      arts_culture: 90,
      career_outcomes: 72,
      campus_life: 78,
      access_affordability: 68,
      alumni_network: 64
    }
  },
  {
    name: 'Auburn University (research)',
    type: 'research',
    grades: {
      academics: 86,
      research: 91,
      athletics: 82,
      arts_culture: 71,
      career_outcomes: 88,
      campus_life: 80,
      access_affordability: 62,
      alumni_network: 89
    }
  }
];

const TYPE_ARCHETYPE_BLURBS = {
  liberal_arts:
    'Archetype: small-college profile — teaching and arts often sit in the A-/B+ range while D1 athletics might lag in the C/D band (think Maryville-style, not SEC football).',
  research:
    'Archetype: research university — labs, career outcomes, and alumni network skew A-/A; athletics can swing from B to A depending on the conference.',
  hbcu: 'Archetype: HBCU — access, campus community, and spirit often strong (B+ to A-); research scale varies with endowment.',
  community:
    'Archetype: community college — access and affordability often A-/B+; research and big-alumni networks typically C/D until major gifts land.'
};

function hashSeed(a, b, c = 0) {
  let h = (a ^ b ^ c) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

function schoolHash(schoolId) {
  let h = 0;
  for (let i = 0; i < schoolId.length; i += 1) {
    h = Math.imul(31, h) + schoolId.charCodeAt(i);
  }
  return h >>> 0;
}

function rollInBand(seed, schoolId, key, band) {
  const [lo, hi] = band;
  const span = Math.max(1, hi - lo);
  const h = hashSeed(seed, schoolHash(schoolId), key.charCodeAt(0));
  const jitter = (h % 1000) / 1000;
  return Math.round(lo + jitter * span);
}

export function gradeLetter(score) {
  const n = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  return GRADE_LETTERS.find((g) => n >= g.min)?.letter ?? 'F';
}

export function compositeAlmaGradeScore(grades) {
  if (!grades) return 0;
  const vals = ALMA_GRADE_KEYS.map((k) => grades[k] ?? 0).filter((v) => v > 0);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function rollAlmaMaterGrades(school, runSeed) {
  const type = school?.type ?? 'research';
  const bands = TYPE_GRADE_BANDS[type] ?? DEFAULT_BANDS;
  const seed = runSeed ?? 1;
  const id = school?.id ?? 'unknown';
  const grades = { schoolId: id, schoolType: type, seed };
  for (const key of ALMA_GRADE_KEYS) {
    grades[key] = rollInBand(seed, id, key, bands[key] ?? [50, 75]);
  }
  return grades;
}

/** Backfill new dimensions when older saves only stored four scores. */
function migrateGradeShape(g, school, seed) {
  const fresh = rollAlmaMaterGrades(school, seed);
  for (const key of ALMA_GRADE_KEYS) {
    if (g[key] == null) g[key] = fresh[key];
  }
}

export function ensureAlmaMaterGrades(state) {
  const school = resolveCompanyAlmaMater(state);
  if (!school) return null;
  if (!state.company.almaMaterGrades) state.company.almaMaterGrades = {};
  const seed = state.meta?.runSeed ?? 1;
  const g = state.company.almaMaterGrades;
  if (g.schoolId !== school.id || g.seed !== seed || g.academics == null) {
    Object.assign(g, rollAlmaMaterGrades(school, seed));
  } else {
    migrateGradeShape(g, school, seed);
  }
  return g;
}

export function almaMaterGradesDisplay(state) {
  const school = resolveCompanyAlmaMater(state);
  const grades = ensureAlmaMaterGrades(state);
  if (!school || !grades) return null;
  const composite = compositeAlmaGradeScore(grades);
  return {
    school,
    grades: { ...grades },
    composite,
    compositeLetter: gradeLetter(composite),
    archetypeBlurb: TYPE_ARCHETYPE_BLURBS[school.type] ?? TYPE_ARCHETYPE_BLURBS.research,
    byDimension: ALMA_GRADE_KEYS.map((key) => ({
      key,
      label: almaGradeKeyLabel(key),
      score: grades[key] ?? 0,
      letter: gradeLetter(grades[key])
    }))
  };
}

export function almaGradeKeyLabel(key) {
  const labels = {
    academics: 'Academics',
    research: 'Research',
    athletics: 'Athletics',
    arts_culture: 'Arts & culture',
    career_outcomes: 'Career outcomes',
    campus_life: 'Campus life',
    access_affordability: 'Access & affordability',
    alumni_network: 'Alumni network'
  };
  return labels[key] ?? key;
}

export const GIFT_FUND_GRADE_WEIGHTS = {
  'annual-fund': { campus_life: 0.35, alumni_network: 0.3, academics: 0.15 },
  scholarship: { academics: 1, access_affordability: 0.55, campus_life: 0.2 },
  capital: { campus_life: 0.95, academics: 0.35, research: 0.25, athletics: 0.15 },
  'research-innovation': { research: 1.15, academics: 0.45, career_outcomes: 0.35 },
  'entrepreneurship-center': { career_outcomes: 1.1, research: 0.5, alumni_network: 0.4 },
  'arts-culture': { arts_culture: 1.2, campus_life: 0.45, academics: 0.25 },
  'diversity-equity': { access_affordability: 0.85, academics: 0.45, campus_life: 0.35 },
  'global-programs': { academics: 0.5, research: 0.35, alumni_network: 0.4, career_outcomes: 0.3 }
};

export const ATHLETICS_PROGRAM_WEIGHTS = {
  boosters: { athletics: 0.95, alumni_network: 0.2 },
  scholarships: { athletics: 1, access_affordability: 0.35, academics: 0.15 },
  coaching: { athletics: 0.85, career_outcomes: 0.15 },
  facilities: { athletics: 0.75, campus_life: 0.5 },
  stadium: { athletics: 0.85, campus_life: 0.55, alumni_network: 0.25 }
};

export const INVEST_VEHICLE_WEIGHTS = {
  'university-daf': { alumni_network: 0.45, campus_life: 0.25, access_affordability: 0.2 },
  'alumni-venture-fund': { career_outcomes: 1.1, research: 0.65, alumni_network: 0.35 },
  'endowed-scholarship': { academics: 1, access_affordability: 0.7, campus_life: 0.2 },
  'entrepreneurship-fund': { career_outcomes: 1.2, research: 0.55, alumni_network: 0.4 },
  'real-estate-endowment': { campus_life: 1, athletics: 0.2, research: 0.15 },
  'alumni-private-credit': { career_outcomes: 0.65, research: 0.35, campus_life: 0.3 }
};

function pointsFromAmount(amount, weight = 1) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (n <= 0 || weight <= 0) return 0;
  return Math.min(5.5, Math.sqrt(n / 40_000) * weight * 1.1);
}

function letterTone(letter) {
  const head = (letter || 'F').charAt(0);
  if (head === 'A') return 'a';
  if (head === 'B') return 'b';
  if (head === 'C') return 'c';
  if (head === 'D') return 'd';
  return 'f';
}

export function formatGradeBoostTags(weights, max = 3) {
  return Object.entries(weights ?? {})
    .filter(([k]) => ALMA_GRADE_KEYS.includes(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => almaGradeKeyLabel(k));
}

export function giftGradeBoostTags(fundId) {
  return formatGradeBoostTags(GIFT_FUND_GRADE_WEIGHTS[fundId] ?? { campus_life: 0.3, academics: 0.2 });
}

export function athleticsGradeBoostTags(programId) {
  return formatGradeBoostTags(ATHLETICS_PROGRAM_WEIGHTS[programId] ?? { athletics: 1 });
}

export function investGradeBoostTags(vehicleId) {
  return formatGradeBoostTags(INVEST_VEHICLE_WEIGHTS[vehicleId] ?? { career_outcomes: 0.45, research: 0.35 });
}

export const ALMA_GRADE_PLAYBOOK = [
  {
    id: 'give',
    title: 'One-time campus gifts',
    lede: 'Debit your personal bank. Big checks move buzz and sentiment, stack alumni recognition, and nudge the matching A–F pillars.',
    items: [
      'Scholarships & access → academics, affordability',
      'Research & innovation → research, career outcomes',
      'Arts endowment → arts & culture, campus life',
      'Capital / global programs → campus, network, academics'
    ]
  },
  {
    id: 'invest',
    title: 'Investment sleeves',
    lede: 'Capital that stays on campus books — monthly marks, partial giving credit, taxable gains in April.',
    items: [
      'DAF & scholarships → network, access, academics',
      'Venture / entrepreneurship LPs → career, research',
      'Real estate endowment → campus life, facilities story',
      'Illiquid pools lock for several turns; some allow partial withdrawal'
    ]
  },
  {
    id: 'athletics',
    title: 'Varsity & boosters',
    lede: 'Counts toward total alumni lifetime and a separate booster track.',
    items: [
      'Boosters & facilities → athletics, campus life',
      'Stadium naming → athletics, alumni network',
      'Athlete scholarships → athletics, access',
      'Game log shows letter-grade shifts after each gift'
    ]
  }
];

function bumpGrades(grades, weights, amount, state) {
  const lines = [];
  for (const [key, w] of Object.entries(weights)) {
    if (!ALMA_GRADE_KEYS.includes(key)) continue;
    const delta = pointsFromAmount(amount, w);
    if (delta <= 0) continue;
    const before = grades[key] ?? 0;
    grades[key] = Math.min(100, Math.round(before + delta));
    if (grades[key] > before) {
      lines.push(`${almaGradeKeyLabel(key)} ${gradeLetter(before)} → ${gradeLetter(grades[key])}`);
    }
  }
  if (state && lines.length) {
    if (!grades.recentShifts) grades.recentShifts = [];
    const turn = calendarTurn(state);
    for (const text of lines) {
      grades.recentShifts.unshift({ text, turn });
    }
    if (grades.recentShifts.length > 8) grades.recentShifts.length = 8;
  }
  return lines;
}

export function influenceAlmaGradesFromGift(state, { fundId, amount, athletics = false, programId = null }) {
  const grades = ensureAlmaMaterGrades(state);
  if (!grades) return [];
  let weights = {};
  if (athletics && programId) {
    weights = { ...(ATHLETICS_PROGRAM_WEIGHTS[programId] ?? { athletics: 1 }) };
  } else {
    weights = { ...(GIFT_FUND_GRADE_WEIGHTS[fundId] ?? { campus_life: 0.3, academics: 0.2 }) };
  }
  return bumpGrades(grades, weights, amount, state);
}

export function influenceAlmaGradesFromInvestment(state, vehicleId, amount) {
  const grades = ensureAlmaMaterGrades(state);
  if (!grades) return [];
  const weights = INVEST_VEHICLE_WEIGHTS[vehicleId] ?? { career_outcomes: 0.45, research: 0.35 };
  return bumpGrades(grades, weights, amount, state);
}

function renderGradeDimensionCard(dim) {
  const tone = letterTone(dim.letter);
  const pct = Math.max(4, Math.min(100, dim.score));
  return `<div class="ceo-alma-dim ceo-alma-dim--${tone}" style="--ceo-alma-pct: ${pct}%">
    <span class="ceo-alma-dim__letter" aria-hidden="true">${escapeHtml(dim.letter)}</span>
    <span class="ceo-alma-dim__label">${escapeHtml(dim.label)}</span>
    <span class="ceo-alma-dim__bar" role="presentation"><span class="ceo-alma-dim__fill"></span></span>
  </div>`;
}

function renderAfExampleCard(example) {
  const composite = compositeAlmaGradeScore(example.grades);
  const chips = ALMA_GRADE_KEYS.map((k) => {
    const letter = gradeLetter(example.grades[k]);
    return `<span class="ceo-alma-example-chip ceo-alma-example-chip--${letterTone(letter)}">${escapeHtml(almaGradeKeyLabel(k))} ${escapeHtml(letter)}</span>`;
  }).join('');
  return `<article class="ceo-alma-example-card">
    <header class="ceo-alma-example-card__head">
      <strong>${escapeHtml(example.name)}</strong>
      <span class="ceo-alma-letter-badge ceo-alma-letter-badge--${letterTone(gradeLetter(composite))}">${escapeHtml(gradeLetter(composite))}</span>
    </header>
    <div class="ceo-alma-example-chips">${chips}</div>
  </article>`;
}

function renderPlaybookCard(entry) {
  return `<article class="ceo-alma-playbook-card">
    <h5 class="ceo-alma-playbook-card__title">${escapeHtml(entry.title)}</h5>
    <p class="fine-print">${escapeHtml(entry.lede)}</p>
    <ul class="ceo-alma-playbook-list">${entry.items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
  </article>`;
}

function renderRecentShifts(grades) {
  const shifts = grades?.recentShifts ?? [];
  if (!shifts.length) {
    return `<p class="fine-print ceo-alma-shifts-empty">No letter moves yet — gifts and investment commits show up here.</p>`;
  }
  const rows = shifts
    .slice(0, 6)
    .map((s) => `<li><span class="ceo-alma-shift-text">${escapeHtml(s.text)}</span> <span class="fine-print">turn ${s.turn}</span></li>`)
    .join('');
  return `<ul class="ceo-alma-shift-log">${rows}</ul>`;
}

export function renderAlmaMaterGradesPanel(state) {
  const display = almaMaterGradesDisplay(state);
  if (!display) return '';
  const typeLabel = display.school.type ? alumniSchoolTypeLabel(display.school.type) : 'College';
  const grades = display.grades;
  const dimGrid = display.byDimension.map(renderGradeDimensionCard).join('');
  return `<section class="ceo-alma-report" aria-label="Campus report card">
    <header class="ceo-alma-report__hero">
      <div class="ceo-alma-report__identity">
        <p class="ceo-alma-report__kicker">Fictional campus report card</p>
        <h4 class="ceo-alma-report__school">${escapeHtml(display.school.shortLabel ?? display.school.label)}</h4>
        <p class="fine-print">${escapeHtml(typeLabel)} · ${escapeHtml(display.archetypeBlurb.replace(/^Archetype:\s*/, ''))}</p>
      </div>
      <div class="ceo-alma-report__composite ceo-alma-letter-badge ceo-alma-letter-badge--${letterTone(display.compositeLetter)}" aria-label="Composite grade ${escapeHtml(display.compositeLetter)}">
        <span class="ceo-alma-report__composite-label">Composite</span>
        <span class="ceo-alma-report__composite-letter">${escapeHtml(display.compositeLetter)}</span>
        <span class="ceo-alma-report__composite-scale">A+ through F</span>
      </div>
    </header>
    <div class="ceo-alma-dim-grid">${dimGrid}</div>
    <div class="ceo-alma-playbook">
      <h5 class="finance-subhead finance-subhead--minor">What you can do</h5>
      <div class="ceo-alma-playbook-grid">${ALMA_GRADE_PLAYBOOK.map(renderPlaybookCard).join('')}</div>
    </div>
  <details class="finance-details ceo-alma-examples-details">
      <summary>Compare two fictional campuses (A–F)</summary>
      <p class="fine-print">Not your school — just shows how liberal arts vs research types spread across pillars.</p>
      <div class="ceo-alma-example-grid">${ALMA_GRADE_AF_EXAMPLES.map(renderAfExampleCard).join('')}</div>
    </details>
    <div class="ceo-alma-shifts">
      <h5 class="finance-subhead finance-subhead--minor">Recent letter moves</h5>
      ${renderRecentShifts(grades)}
    </div>
  </section>`;
}

/** Compact grade tags for action cards (fund / invest / athletics). */
export function renderGradeBoostTagHtml(tags) {
  if (!tags?.length) return '';
  return `<div class="ceo-alma-boost-tags" aria-label="Strongest report card pillars">${tags
    .map((t) => `<span class="ceo-alma-boost-tag">↑ ${escapeHtml(t)}</span>`)
    .join('')}</div>`;
}

/** Headless: liberal-arts schools should usually beat athletics on the A–F ladder. */
export function liberalArtsAcademicsBeatAthletics(grades, school) {
  if (school?.type !== 'liberal_arts' || !grades) return true;
  return (grades.academics ?? 0) >= (grades.athletics ?? 0);
}
