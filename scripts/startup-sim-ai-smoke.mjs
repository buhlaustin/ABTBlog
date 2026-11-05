/**
 * Narrative API smoke for Startup Simulator kinds.
 *
 * Default (CI): startup_health only — no OpenAI spend.
 * Full release check: node scripts/startup-sim-ai-smoke.mjs --full
 *
 * Env: HOS_NARRATIVE_API_URL or STARTUP_SIM_NARRATIVE_URL (POST endpoint).
 */
import { createInitialState } from '../work/startup-sim/modules/GameState.js';
import { buildGameSnapshot } from '../work/startup-sim/modules/GameContext.js';

const url = String(
  process.env.HOS_NARRATIVE_API_URL || process.env.STARTUP_SIM_NARRATIVE_URL || ''
)
  .trim()
  .replace(/\/$/, '');

const full = process.argv.includes('--full');

if (!url) {
  console.log('SKIP: set HOS_NARRATIVE_API_URL or STARTUP_SIM_NARRATIVE_URL to run AI smoke');
  process.exit(0);
}

const state = createInitialState({
  companyName: 'Narrative Smoke Co',
  categoryId: 'b2b-saas',
  mode: 'career'
});
const snapshot = buildGameSnapshot(state);

/** @type {{ kind: string, context: object, validate: (data: unknown) => boolean, label?: string }[]} */
const KINDS = [
  {
    kind: 'startup_health',
    context: { ping: true },
    validate: (d) => Boolean(d && typeof d === 'object' && d.ok && d.startupKinds)
  },
  {
    kind: 'startup_xc_interview_score',
    context: {
      companyName: state.company.name,
      category: state.company.categoryLabel,
      lifetimeRevenue: 0,
      answers: [
        { id: 'q1', prompt: 'What are you building?', answer: 'B2B workflow automation for SMBs.' },
        { id: 'q2', prompt: 'Why now?', answer: 'Remote work broke their ops stack.' }
      ]
    },
    validate: (d) =>
      d &&
      typeof d === 'object' &&
      (d.accepted !== undefined || d.waitlisted !== undefined || d.type === 'startup_xc_score')
  },
  {
    kind: 'startup_news_month',
    context: {
      snapshot,
      timelineEvents: [{ headline: 'Macrohard announces fictional cloud region' }],
      layoffsPending: 0,
      rules: 'Parody names only.'
    },
    validate: (d) => {
      const articles = d?.articles ?? d?.result?.articles;
      return Array.isArray(articles) && articles.length >= 1;
    }
  },
  {
    kind: 'startup_advisor_chat',
    context: {
      snapshot,
      messages: [{ role: 'user', content: 'Should I hire sales or finish the product?' }],
      rules: 'In-game advice only.'
    },
    validate: (d) =>
      d &&
      typeof d === 'object' &&
      (Boolean(d.reply) || Boolean(d.text) || d.type === 'startup_advisor')
  },
  {
    kind: 'startup_ipo_press',
    context: {
      snapshot,
      ticker: 'SMK',
      openPrice: 24,
      companyName: state.company.name
    },
    validate: (d) =>
      d &&
      typeof d === 'object' &&
      (Boolean(d.headline) || d.type === 'startup_ipo_press')
  }
];

const toRun = full ? KINDS : KINDS.filter((k) => k.kind === 'startup_health');

async function postKind(kind, context) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, context })
  });
  const raw = await res.text();
  let data = null;
  try {
    data = JSON.parse(raw);
  } catch {
    /* non-JSON */
  }
  return { ok: res.ok, status: res.status, data, rawPreview: raw.slice(0, 240) };
}

let failed = false;

console.log(`AI smoke → ${url} (${full ? 'full kinds' : 'health only'})`);

for (const { kind, context, validate } of toRun) {
  let result;
  try {
    result = await postKind(kind, context);
  } catch (err) {
    console.error(`FAIL ${kind}: ${err instanceof Error ? err.message : err}`);
    failed = true;
    continue;
  }

  if (!result.ok) {
    if (result.status === 403 && /origin not allowed/i.test(result.rawPreview)) {
      console.log(
        `SKIP ${kind}: Lambda origin gate blocks GitHub Actions (expected — game uses browser origin in prod)`
      );
      continue;
    }
    console.error(`FAIL ${kind}: HTTP ${result.status} — ${result.rawPreview}`);
    failed = true;
    continue;
  }

  if (!validate(result.data)) {
    console.error(`FAIL ${kind}: unexpected body — ${result.rawPreview}`);
    failed = true;
    continue;
  }

  console.log(`OK ${kind}`);
}

if (failed) process.exit(1);
