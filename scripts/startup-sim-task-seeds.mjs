/** Category-specific desk task seeds — expanded by generate-startup-sim-tasks.mjs */

export const CATEGORY_IDS = [
  'b2b-saas',
  'consumer-social',
  'marketplace',
  'delivery',
  'fintech',
  'ai-tools',
  'hardware',
  'healthtech',
  'climate',
  'gaming-media'
];

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

/** @param {string} categoryId @param {Array<object>} items */
export function packCategoryTasks(categoryId, items) {
  return items.map((item, idx) => ({
    id: `cat-${categoryId}-${slug(item.title) || idx}`,
    categories: [categoryId],
    title: item.title,
    description: item.description,
    types: item.types ?? [item.type ?? 'product'],
    stages: item.stages ?? ['office', 'post_xc'],
    tierMin: item.tierMin ?? 0,
    tierMax: item.tierMax ?? 99,
    cost: item.cost,
    revenue: item.revenue,
    product: item.product ?? 0,
    buzz: item.buzz ?? 0,
    ...(item.rivalPressure != null ? { rivalPressure: item.rivalPressure } : {}),
    ...(item.authored ? { authored: true } : {})
  }));
}

export const SEEDS = {
  'b2b-saas': packCategoryTasks('b2b-saas', [
    { title: 'SOC2 Type II readiness sprint', description: 'Policies, screenshots, and a auditor who asks the same question twelve times.', types: ['product'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 5, cost: 8500, revenue: [6000, 42000], product: 2, buzz: 1 },
    { title: 'SSO + SCIM enterprise pack', description: 'Okta tiles, group sync, and IT admins who finally stop emailing.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 12000, revenue: [25000, 140000], product: 3, buzz: 1 },
    { title: 'Salesforce AppExchange listing', description: 'Managed package, security review, and a demo org that behaves.', types: ['marketing'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 18000, revenue: [45000, 220000], product: 1, buzz: 3 },
    { title: 'Annual contract template overhaul', description: 'Legal redlines vs. what finance can actually recognize.', types: ['sales'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 4500, revenue: [35000, 180000], product: 0, buzz: 0 },
    { title: 'Usage-based metering audit', description: 'Make sure every API call bills the right SKU.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 22000, revenue: [80000, 420000], product: 2, buzz: 0 },
    { title: 'Customer success onboarding playbooks', description: '30/60/90 templates CSMs will actually follow.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 3200, revenue: [8000, 45000], product: 1, buzz: 1 },
    { title: 'Net dollar retention post-mortem', description: 'Find expansion in accounts that were “fully deployed.”', types: ['research'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 6000, revenue: [55000, 280000], product: 0, buzz: 0 },
    { title: 'Enterprise security questionnaire bot', description: 'SIG Lite answers on autopilot — human reviews the scary ones.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 14000, revenue: [30000, 160000], product: 2, buzz: 1 },
    { title: 'RFP response war room', description: 'Forty pages due Friday; coffee due now.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 25000, revenue: [120000, 650000], product: 0, buzz: 2 },
    { title: 'Multi-tenant isolation review', description: 'Prove customer A cannot grep customer B.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 11000, revenue: [18000, 95000], product: 2, buzz: 0 },
    { title: 'Admin audit log GA', description: 'Immutable logs for paranoid compliance teams.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 16000, revenue: [42000, 210000], product: 2, buzz: 1 },
    { title: 'Professional services scoping', description: 'Fixed-fee statements of work that protect margin.', types: ['sales'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 7000, revenue: [65000, 320000], product: 0, buzz: 0 },
    { title: 'Partner co-sell portal', description: 'Deal reg, MDF claims, and partner tiers nobody reads.', types: ['marketing'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 32000, revenue: [95000, 480000], product: 1, buzz: 2 },
    { title: 'Sandbox tenant factory', description: 'Spin up demo orgs without polluting prod.', types: ['product'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 5500, revenue: [12000, 68000], product: 2, buzz: 1 },
    { title: 'Pricing packaging workshop', description: 'Good-better-best with a sane enterprise tier.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 1, tierMax: 4, cost: 2800, revenue: [6000, 38000], product: 0, buzz: 1 },
    { title: 'Champion enablement kit', description: 'Slides your buyer can steal for internal meetings.', types: ['marketing'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 4200, revenue: [22000, 110000], product: 0, buzz: 2, rivalPressure: -1 },
    { title: 'Gartner inquiry prep', description: 'Analyst relations without the analyst awkwardness.', types: ['marketing'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 45000, revenue: [80000, 380000], product: 0, buzz: 3 },
    { title: 'Customer advisory board dinner', description: 'Steak, roadmap hints, and NDA reminders.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 12000, revenue: [35000, 180000], product: 1, buzz: 2 },
    { title: 'Implementation timeline calculator', description: 'Set expectations before SOW signature.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 6500, revenue: [28000, 145000], product: 1, buzz: 0 },
    { title: 'Invoice dunning automation', description: 'Polite emails before finance escalates.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 6, cost: 9000, revenue: [48000, 240000], product: 1, buzz: 0 },
    { title: 'Procurement vendor onboarding', description: 'W-9, insurance cert, and the portal from 2009.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 8000, revenue: [90000, 420000], product: 0, buzz: 0 },
    { title: 'Slack app directory launch', description: 'Slash commands people might remember.', types: ['marketing'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 3800, revenue: [15000, 82000], product: 1, buzz: 3 },
    { title: 'Status page with SLA credits', description: 'Transparency with contractual teeth.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 7200, revenue: [32000, 175000], product: 2, buzz: 1 },
    { title: 'VP Sales playbook rollout', description: 'MEDDIC or spin — pick a religion.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 28000, revenue: [150000, 720000], product: 0, buzz: 1 },
    { title: 'Data residency EU shard', description: 'Frankfurt servers for Frankfurt feelings.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 55000, revenue: [120000, 580000], product: 2, buzz: 1 },
    { title: 'Renewal QBR template fleet', description: 'Quarterly business reviews that show value.', types: ['sales'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 5000, revenue: [45000, 230000], product: 0, buzz: 0 },
    { title: 'Developer docs information architecture', description: 'Navigation that does not require a map.', types: ['product'], stages: ['garage', 'office'], tierMin: 0, tierMax: 2, cost: 1200, revenue: [800, 6500], product: 2, buzz: 1 },
    { title: 'Product-led growth experiment', description: 'Free tier that converts without angering sales.', types: ['marketing'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 6500, revenue: [18000, 95000], product: 1, buzz: 3 },
    { title: 'Enterprise DR failover drill', description: 'Break prod on purpose — gently.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 42000, revenue: [60000, 310000], product: 2, buzz: 0 },
    { title: 'Land-and-expand landmine review', description: 'Find accounts ready for the upsell nudge.', types: ['sales'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 4500, revenue: [38000, 195000], product: 0, buzz: 0 },
    { title: 'Category creation keynote draft', description: 'Name the problem only you solve — loudly.', types: ['marketing'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 15000, revenue: [55000, 290000], product: 0, buzz: 4, rivalPressure: -1 },
    { title: 'Integration marketplace v1', description: 'Zapier, webhooks, and partners who break on Tuesday.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 24000, revenue: [85000, 440000], product: 3, buzz: 2 }
  ]),

  healthtech: packCategoryTasks('healthtech', [
    { title: 'HIPAA risk assessment', description: 'Spreadsheet dread with real remediation tickets.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 5, cost: 6500, revenue: [8000, 48000], product: 1, buzz: 0 },
    { title: 'BAA negotiation with cloud vendor', description: 'Legal blesses your hosting before PHI lands.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 4200, revenue: [5000, 32000], product: 0, buzz: 0 },
    { title: 'IRB submission packet', description: 'Ethics board paperwork at geological speed.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 5, cost: 9000, revenue: [6000, 38000], product: 1, buzz: 0 },
    { title: 'Epic App Orchard application', description: 'HL7 messages and hospital IT gatekeepers.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 35000, revenue: [45000, 260000], product: 2, buzz: 2 },
    { title: 'FHIR API certification push', description: 'Interoperability slides that become real endpoints.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 18000, revenue: [28000, 155000], product: 3, buzz: 1 },
    { title: 'Single-ward clinical pilot', description: 'One unit, infinite consent forms.', types: ['sales'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 12000, revenue: [35000, 180000], product: 2, buzz: 1 },
    { title: 'Clinician champion rounds', description: 'Shadow nurses; learn what your UI breaks.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 1, tierMax: 3, cost: 2800, revenue: [4000, 24000], product: 2, buzz: 0 },
    { title: 'Patient consent UX rewrite', description: 'Plain language people tap through without rage.', types: ['product'], stages: ['garage', 'office'], tierMin: 0, tierMax: 2, cost: 1800, revenue: [1200, 9200], product: 2, buzz: 1 },
    { title: 'Telehealth visit flow hardening', description: 'Waiting rooms, reconnect logic, and bandwidth excuses.', types: ['product'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 8500, revenue: [22000, 110000], product: 2, buzz: 2 },
    { title: 'ePrescribing certification', description: 'Surescripts paperwork and pharmacy callbacks.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 22000, revenue: [40000, 210000], product: 2, buzz: 0 },
    { title: 'Medical coding review', description: 'CPT bundles that match what clinicians actually do.', types: ['research'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 7500, revenue: [30000, 165000], product: 0, buzz: 0 },
    { title: 'Payer contracting workshop', description: 'Reimbursement math vs. hopeful unit economics.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 28000, revenue: [95000, 480000], product: 0, buzz: 1 },
    { title: 'Prior authorization automation', description: 'Fax machines cry; software wins slowly.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 32000, revenue: [110000, 520000], product: 3, buzz: 1 },
    { title: 'De-identification pipeline audit', description: 'Safe research datasets without accidental faces.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 14000, revenue: [25000, 140000], product: 2, buzz: 0 },
    { title: 'Patient portal MVP', description: 'Results, messages, and login flows seniors can use.', types: ['product'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 11000, revenue: [18000, 98000], product: 2, buzz: 2 },
    { title: 'Remote patient monitoring kit', description: 'Devices, alerts, and escalation paths that work at 2 a.m.', types: ['product'], stages: ['post_xc'], tierMin: 4, tierMax: 6, cost: 26000, revenue: [75000, 360000], product: 2, buzz: 2 },
    { title: 'Clinical outcomes study design', description: 'Endpoints regulators and buyers both accept.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 45000, revenue: [55000, 290000], product: 1, buzz: 1 },
    { title: 'FDA SaMD pathway consult', description: 'Classification letters and predicate hunting.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 65000, revenue: [80000, 420000], product: 1, buzz: 2 },
    { title: 'Hospital IT security review', description: 'Pen test reports for committees who skim the summary.', types: ['sales'], stages: ['post_xc'], tierMin: 4, tierMax: 6, cost: 15000, revenue: [85000, 410000], product: 0, buzz: 0 },
    { title: 'Referral network onboarding', description: 'Specialists who might actually click your link.', types: ['sales'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 8000, revenue: [42000, 220000], product: 0, buzz: 2 },
    { title: 'Credentialing packet sprint', description: 'Provider enrollment before first claim.', types: ['research'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 6000, revenue: [28000, 150000], product: 0, buzz: 0 },
    { title: 'Malpractice insurance review', description: 'Coverage that matches your workflow risk.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 3500, revenue: [2000, 18000], product: 0, buzz: 0 },
    { title: 'Quality measure reporting', description: 'HEDIS-adjacent dashboards hospitals notice.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 24000, revenue: [90000, 450000], product: 2, buzz: 0 },
    { title: 'Pharmacy integration pilot', description: 'Fill status callbacks without pager storms.', types: ['product'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 17000, revenue: [48000, 250000], product: 2, buzz: 1 },
    { title: 'Population health dashboard', description: 'Cohort views care managers will open daily.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 38000, revenue: [120000, 580000], product: 2, buzz: 1 },
    { title: 'Clinical trial site activation', description: 'Investigators, supplies, and source docs.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 52000, revenue: [140000, 620000], product: 1, buzz: 2 },
    { title: 'Patient support hotline scripts', description: 'Compassionate macros for scary questions.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 1, tierMax: 3, cost: 2200, revenue: [6000, 35000], product: 1, buzz: 1 },
    { title: 'Chart abstraction study', description: 'Human review to train your models honestly.', types: ['research'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 9500, revenue: [22000, 120000], product: 1, buzz: 0 },
    { title: 'Behavioral health parity check', description: 'Benefits language that passes scrutiny.', types: ['research'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 5500, revenue: [15000, 85000], product: 0, buzz: 0 },
    { title: 'Medical device data ingest', description: 'BLE streams into workflows clinicians trust.', types: ['product'], stages: ['post_xc'], tierMin: 4, tierMax: 6, cost: 29000, revenue: [65000, 340000], product: 3, buzz: 1 },
    { title: 'Health system innovation lab pitch', description: 'Pilot inside a flagship hospital brand.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 18000, revenue: [110000, 520000], product: 1, buzz: 3 },
    { title: 'PHI encryption at rest review', description: 'Keys, KMS, and backup tapes accounted for.', types: ['product'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 7800, revenue: [12000, 72000], product: 2, buzz: 0 }
  ])
};
