/**
 * Re-applies human-written titles/descriptions to catalog-expansion tasks
 * while preserving gameplay stats (cost, stages, types, etc.).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/tasks-catalog-expansion.json');

/** @type {{ title: string; description: string }[]} */
const COPY = [
  {
    title: 'Shadow five onboarding calls',
    description: 'Listen where new users stall before they quietly churn.'
  },
  {
    title: 'Patch the signup funnel leak',
    description: 'Instrument drop-offs and ship two small UX fixes this month.'
  },
  {
    title: 'Win back a churned logo',
    description: 'Founder call, honest retro, and a tight re-pilot scope.'
  },
  {
    title: 'Ship role-based permissions',
    description: 'Stop enterprise deals dying on “everyone is admin.”'
  },
  {
    title: 'Publish release notes people read',
    description: 'Plain language, screenshots, and one customer thank-you.'
  },
  {
    title: 'Run a SOC 2 tabletop',
    description: 'Pretend the auditor lands Friday; close the scary gaps first.'
  },
  {
    title: 'Offer annual prepay discount',
    description: 'Trade modest margin for cash up front and firm renewal dates.'
  },
  {
    title: 'Define product-qualified leads',
    description: 'Give sales one activation threshold everyone trusts.'
  },
  {
    title: 'Host a customer advisory lunch',
    description: 'Six power users, no deck, one roadmap bet prioritized.'
  },
  {
    title: 'Harden billing webhooks',
    description: 'Idempotency, retries, and alerts before finance finds duplicates.'
  },
  {
    title: 'Stand up a sandbox tenant',
    description: 'Let prospects click around without a sales engineer babysitting.'
  },
  {
    title: 'Rewrite the pricing page',
    description: 'Clarify tiers, limits, and the upgrade path in one scroll.'
  },
  {
    title: 'Cold-email 50 ideal accounts',
    description: 'Short notes, one concrete outcome, no “synergies” paragraph.'
  },
  {
    title: 'Fix your demo dataset',
    description: 'Seed believable numbers so pitches do not start with apologies.'
  },
  {
    title: 'Interview churned trial users',
    description: 'Learn why they bounced before blaming marketing spend.'
  },
  {
    title: 'Ship power-user keyboard shortcuts',
    description: 'Small surface area, loud delight in niche communities.'
  },
  {
    title: 'Negotiate co-marketing with an integrator',
    description: 'Shared webinar, joint case study, split the lead list.'
  },
  {
    title: 'Audit third-party script weight',
    description: 'Drop tags that slow LCP and leak data you should not share.'
  },
  {
    title: 'Launch a public roadmap',
    description: 'Show what you will build and what you explicitly will not.'
  },
  {
    title: 'Run a pricing sensitivity survey',
    description: 'Stop guessing ARPU—ask willingness-to-pay with a simple study.'
  },
  {
    title: 'Close the security questionnaire backlog',
    description: 'Standard answers, evidence links, fewer all-nighters.'
  },
  {
    title: 'Pilot usage-based billing',
    description: 'Meter one dimension cleanly before rebilling the whole base.'
  },
  {
    title: 'Record a founder AMA livestream',
    description: 'Raw Q&A beats polished ads for early trust.'
  },
  {
    title: 'Migrate off the flaky cron host',
    description: 'Move scheduled jobs somewhere observability actually exists.'
  },
  {
    title: 'Build a churn early-warning dashboard',
    description: 'Leading indicators support can act on this week.'
  },
  {
    title: 'White-glove setup for top accounts',
    description: 'Concierge onboarding for logos that reference you later.'
  },
  {
    title: 'Ship SSO for Google Workspace',
    description: 'Remove the IT blocker on mid-market pilots.'
  },
  {
    title: 'Run competitive win-loss calls',
    description: 'Neutral third party extracts truth sales will not say aloud.'
  },
  {
    title: 'Publish an engineering blog post',
    description: 'Explain one hard technical choice with receipts.'
  },
  {
    title: 'Tighten API rate limits',
    description: 'Protect uptime; document limits customers can plan around.'
  },
  {
    title: 'Launch referral credits experiment',
    description: 'Give both sides something meaningful, not a vanity badge.'
  },
  {
    title: 'Fix mobile layout on checkout',
    description: 'Half your trials sign up on phones—meet them there.'
  },
  {
    title: 'Schedule exec check-ins for renewals',
    description: 'Relationship heat before the ninety-day red zone.'
  },
  {
    title: 'Deprecate a legacy feature flag',
    description: 'Kill zombie code paths before they bite a big customer.'
  },
  {
    title: 'Host a virtual user conference',
    description: 'One track, customer speakers, recording as evergreen content.'
  },
  {
    title: 'Map F500 procurement steps',
    description: 'Know legal, InfoSec, and vendor onboarding timelines upfront.'
  },
  {
    title: 'Ship audit logs for admins',
    description: 'Enterprise buyers ask; have an answer before the RFP.'
  },
  {
    title: 'Rewrite outbound email sequences',
    description: 'Three emails max, each with a different proof point.'
  },
  {
    title: 'Instrument ad click to activation',
    description: 'Find the step marketing and product both ignore.'
  },
  {
    title: 'Run a customer bug bash',
    description: 'Invite power users to break staging; reward findings loudly.'
  },
  {
    title: 'Negotiate cloud commit credits',
    description: 'Prebuy infra at a discount while growth is still predictable.'
  },
  {
    title: 'Launch a community Slack',
    description: 'Peer support scales better than founder DMs.'
  },
  {
    title: 'Publish SLA and status page',
    description: 'Transparency buys patience during incidents.'
  },
  {
    title: 'Ship CSV export customers asked for',
    description: 'Unblock finance and ops workflows this quarter.'
  },
  {
    title: 'Sponsor a niche newsletter',
    description: 'Highly targeted reach beats generic display ads.'
  },
  {
    title: 'Automate trial expiration nudges',
    description: 'Timely emails beat generic “we miss you” blasts.'
  },
  {
    title: 'Conduct an accessibility sweep',
    description: 'WCAG fixes widen TAM and reduce support tickets.'
  },
  {
    title: 'Run an internal phishing drill',
    description: 'Train the team before a real breach ruins a deal.'
  },
  {
    title: 'Bundle implementation hours',
    description: 'Services unlock six-figure ACV faster than software alone.'
  },
  {
    title: 'Consolidate analytics vendors',
    description: 'One source of truth for product and growth metrics.'
  },
  {
    title: 'Ship webhook retry diagnostics',
    description: 'Let customers debug dead endpoints without opening tickets.'
  },
  {
    title: 'Launch an annual customer summit',
    description: 'Fly in top logos; record testimonials on-site.'
  },
  {
    title: 'Rebuild search with synonyms',
    description: 'Stop zero-result queries from looking like missing features.'
  },
  {
    title: 'Pitch a vertical case study',
    description: 'One deep industry story beats ten generic logos.'
  },
  {
    title: 'Fix invoice PDF branding',
    description: 'Small polish signals you are ready for finance teams.'
  },
  {
    title: 'Run an infra cost review',
    description: 'Right-size instances before margins surprise the board.'
  },
  {
    title: 'Enable SCIM provisioning',
    description: 'IT pushes users; you stop spreadsheet seat math.'
  },
  {
    title: 'Host developer office hours',
    description: 'API adoption grows when someone answers live.'
  },
  {
    title: 'Ship guided setup checklist',
    description: 'Progress-bar onboarding beats a blank dashboard stare.'
  },
  {
    title: 'Test a freemium upgrade nudge',
    description: 'One well-timed prompt—not ten nag modals.'
  },
  {
    title: 'Map data retention policies',
    description: 'Align defaults with GDPR and customer contracts.'
  },
  {
    title: 'Launch a reseller pilot',
    description: 'Let agencies sell you where your team cannot travel.'
  },
  {
    title: 'Refresh employer brand on LinkedIn',
    description: 'Hiring velocity matters once fundraising slows.'
  },
  {
    title: 'Ship multi-currency checkout',
    description: 'Stop losing international trials at the payment step.'
  },
  {
    title: 'Template quarterly business reviews',
    description: 'CSMs show value; renewals get easier to forecast.'
  },
  {
    title: 'Cut support response time',
    description: 'Macros, triage tiers, and one visible SLA timer.'
  },
  {
    title: 'Build a Salesforce integration',
    description: 'CRM sync removes “another tab” objections.'
  },
  {
    title: 'Offer a lightweight bug bounty',
    description: 'Responsible disclosure beats a surprise headline.'
  },
  {
    title: 'Publish an open-source SDK',
    description: 'Developer love compounds; watch support load while doing it.'
  },
  {
    title: 'Renegotiate payment processor fees',
    description: 'Basis points matter at volume—ask annually.'
  },
  {
    title: 'Ship dark mode',
    description: 'Low-effort morale win; screenshots look modern in decks.'
  },
  {
    title: 'Recruit five co-building design partners',
    description: 'Five logos shape the roadmap; they accept rough edges for influence.'
  },
  {
    title: 'Fix SPF and DKIM for product email',
    description: 'Land in inbox, not promotions—or worse, spam.'
  },
  {
    title: 'Launch a changelog RSS feed',
    description: 'Power users subscribe; support repeats fewer “what shipped?” questions.'
  },
  {
    title: 'Instrument the North Star metric',
    description: 'One chart the whole company argues about productively.'
  },
  {
    title: 'Offer VPC or private deploy',
    description: 'Unblock regulated buyers even if few take it.'
  },
  {
    title: 'Ship bulk admin actions',
    description: 'IT admins will not click fifty times to offboard users.'
  },
  {
    title: 'Host a customer hackathon',
    description: 'New integrations emerge; dev communities notice.'
  },
  {
    title: 'Audit role escalation paths',
    description: 'Close privilege creep before security review finds it.'
  },
  {
    title: 'Publish an API versioning policy',
    description: 'Set expectations before breaking changes alienate builders.'
  },
  {
    title: 'Launch customer certification',
    description: 'Trained admins expand usage inside accounts.'
  },
  {
    title: 'Fix timezone bugs in reporting',
    description: '“Yesterday” must mean the same thing globally.'
  },
  {
    title: 'Run a win celebration ritual',
    description: 'Sales, product, and support hear why deals actually close.'
  },
  {
    title: 'Ship saved views and filters',
    description: 'Power users organize data; stickiness follows.'
  },
  {
    title: 'Partner with a university pipeline',
    description: 'Intern hiring beats generic job boards later.'
  },
  {
    title: 'Deploy canary releases',
    description: 'Reduce blast radius when shipping weekly.'
  },
  {
    title: 'Launch a limited beta flag',
    description: 'Scarcity and feedback from friendly accounts.'
  },
  {
    title: 'Rewrite Terms for clarity',
    description: 'Legal still wins; humans can understand acceptance.'
  },
  {
    title: 'Dedicated Slack for whale accounts',
    description: 'High-touch without pretending every customer is equal.'
  },
  {
    title: 'Ship print-friendly reports',
    description: 'Ops teams still export PDFs—stop fighting it.'
  },
  {
    title: 'Renegotiate overlapping SaaS renewals',
    description: 'Fewer overlapping tools and better bundle pricing with finance.'
  },
  {
    title: 'Publish a public incident postmortem',
    description: 'Trust recovery after a bad outage week.'
  },
  {
    title: 'Enable custom domains for customers',
    description: 'White-label credibility for platform plays.'
  },
  {
    title: 'List on a cloud marketplace',
    description: 'Procurement paths customers already trust.'
  },
  {
    title: 'Fix duplicate CRM contacts',
    description: 'Hygiene before marketing automation embarrasses you.'
  },
  {
    title: 'Ship scheduled report emails',
    description: 'Executives get Monday numbers without logging in.'
  },
  {
    title: 'Empathy interviews with support',
    description: 'Product learns the top tickets that should not exist.'
  },
  {
    title: 'Write a pilot success plan',
    description: 'Mutual milestones so pilots convert or fail fast clearly.'
  },
  {
    title: 'Executive dashboard PDF export',
    description: 'Board prep in minutes, not all-nighter slides.'
  },
  {
    title: 'Close books early this month',
    description: 'Revenue recognition discipline before scale makes it messy.'
  }
];

/** Gameplay department tags — hand-matched to each title, not balance-rotated. */
const TYPES = [
  ['research'],
  ['product'],
  ['sales'],
  ['product'],
  ['marketing'],
  ['product'],
  ['sales'],
  ['research'],
  ['research'],
  ['product'],
  ['sales'],
  ['marketing'],
  ['sales'],
  ['sales'],
  ['research'],
  ['product'],
  ['marketing'],
  ['product'],
  ['product'],
  ['research'],
  ['product'],
  ['product'],
  ['marketing'],
  ['product'],
  ['product'],
  ['sales'],
  ['product'],
  ['research'],
  ['marketing'],
  ['product'],
  ['marketing'],
  ['product'],
  ['sales'],
  ['product'],
  ['marketing'],
  ['research'],
  ['product'],
  ['sales'],
  ['research'],
  ['product'],
  ['research'],
  ['marketing'],
  ['product'],
  ['marketing'],
  ['product'],
  ['marketing'],
  ['marketing'],
  ['product'],
  ['research'],
  ['sales'],
  ['research'],
  ['product'],
  ['marketing'],
  ['product'],
  ['marketing'],
  ['research'],
  ['product'],
  ['product'],
  ['sales'],
  ['marketing'],
  ['product'],
  ['product'],
  ['product'],
  ['research'],
  ['product'],
  ['product'],
  ['marketing'],
  ['product'],
  ['product'],
  ['marketing'],
  ['product'],
  ['product'],
  ['research'],
  ['marketing'],
  ['product'],
  ['marketing'],
  ['research'],
  ['product'],
  ['marketing'],
  ['research'],
  ['product'],
  ['marketing'],
  ['product'],
  ['sales'],
  ['product'],
  ['sales'],
  ['research'],
  ['product'],
  ['marketing'],
  ['research'],
  ['product'],
  ['sales'],
  ['marketing'],
  ['product'],
  ['sales'],
  ['research'],
  ['sales'],
  ['product'],
  ['research'],
  ['research']
];

/** Fix stat rows that recycled early-game numbers on late-stage tasks. */
const ECONOMICS_BY_ID = {
  'catalog-expansion-002': { cost: 6800, revenue: [5440, 14960] },
  'catalog-expansion-044': { cost: 7400, revenue: [6290, 16280] },
  'catalog-expansion-080': { cost: 9200, revenue: [7820, 20240] },
  'catalog-expansion-081': { cost: 5200, revenue: [4420, 11440] },
  'catalog-expansion-086': { cost: 7200, revenue: [6120, 15840] }
};

function stageRank(stages) {
  const rank = { garage: 0, office: 1, xc: 2, post_xc: 3, public: 4 };
  return Math.max(0, ...(stages ?? ['garage']).map((s) => rank[s] ?? 0));
}

/** Re-tier cost/revenue when a late-stage task still carries garage-scale stats. */
function fixRecycledEconomics(t) {
  const override = ECONOMICS_BY_ID[t.id];
  if (override) {
    t.cost = override.cost;
    t.revenue = override.revenue;
    return;
  }
  const tierMin = t.tierMin ?? 0;
  const late = stageRank(t.stages) >= 3;
  if (!late || tierMin < 3) return;
  if (t.cost >= 4000) return;
  const bump = 5200 + tierMin * 800;
  t.cost = bump;
  t.revenue = [Math.round(bump * 0.85), Math.round(bump * 2.2)];
}

const raw = JSON.parse(readFileSync(dataPath, 'utf8'));
const tasks = raw.tasks ?? [];
if (COPY.length !== tasks.length || TYPES.length !== tasks.length) {
  console.error(`COPY ${COPY.length} TYPES ${TYPES.length} tasks ${tasks.length}`);
  process.exit(1);
}

const titles = new Set();
for (let i = 0; i < tasks.length; i += 1) {
  const t = tasks[i];
  const { title, description } = COPY[i];
  if (titles.has(title.toLowerCase())) {
    console.error(`Duplicate title: ${title}`);
    process.exit(1);
  }
  titles.add(title.toLowerCase());
  t.title = title;
  t.description = description;
  t.types = [...TYPES[i]];
  fixRecycledEconomics(t);
}

writeFileSync(dataPath, `${JSON.stringify({ version: raw.version ?? 1, tasks }, null, 2)}\n`);
console.log(`Wrote ${tasks.length} catalog-expansion tasks (copy, types, economics).`);
