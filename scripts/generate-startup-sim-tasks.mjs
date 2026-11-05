/**
 * Rebuild tasks.json: core universal tasks + category-specific catalog (~600 tasks).
 * Run: node scripts/generate-startup-sim-tasks.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEEDS, packCategoryTasks } from './startup-sim-task-seeds.mjs';
import { EXTRA_ROWS } from './startup-sim-category-extra.mjs';
import { HAND_AUTHORED } from './startup-sim-task-seeds-authored.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const path = join(root, 'work/startup-sim/data/tasks.json');
const data = JSON.parse(readFileSync(path, 'utf8'));

const keep = data.tasks.filter((t) => !t.id.startsWith('gen-') && !t.id.startsWith('cat-'));

function band(i) {
  const bands = [
    { stages: ['garage', 'office'], tierMin: 0, tierMax: 2, cost: 650, rev: [400, 4200] },
    { stages: ['office', 'xc'], tierMin: 1, tierMax: 3, cost: 2800, rev: [2200, 22000] },
    { stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 11000, rev: [22000, 145000] },
    { stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 38000, rev: [95000, 520000] }
  ];
  return bands[i % bands.length];
}

/** Curated titles + descriptions per vertical (32 each). */
function categoryBlock(categoryId, label, rows) {
  const types = ['product', 'marketing', 'sales', 'research'];
  return packCategoryTasks(
    categoryId,
    rows.map((row, i) => {
      const b = band(i);
      const title = row[0];
      const description = row[1];
      const type = row[2] ?? types[i % types.length];
      return {
        title,
        description,
        types: [type],
        stages: b.stages,
        tierMin: b.tierMin,
        tierMax: b.tierMax,
        cost: Math.round(b.cost * (0.85 + (i % 5) * 0.06)),
        revenue: [Math.round(b.rev[0] * (0.9 + (i % 4) * 0.08)), Math.round(b.rev[1] * (0.92 + (i % 3) * 0.05))],
        product: type === 'product' ? (i % 2 === 0 ? 2 : 1) : 0,
        buzz: type === 'marketing' ? (i % 3 === 0 ? 3 : 2) : type === 'sales' ? 1 : 0
      };
    })
  );
}

const BULK = {
  'consumer-social': categoryBlock('consumer-social', 'Consumer social', [
    ['Invite-only beta codes', 'Scarcity mechanics and referral links that feel exclusive.', 'marketing'],
    ['Creator seed program', 'Pay early creators in credits before you have revenue.', 'marketing'],
    ['Feed ranking experiment', 'A/B the algorithm until time-on-app moves.', 'product'],
    ['Moderation policy draft', 'Community rules before the bad posts arrive.', 'research'],
    ['UGC safety classifier', 'NSFW filters that fail open safely.', 'product'],
    ['Push notification re-engagement', 'Hooks that do not get you uninstalled.', 'marketing'],
    ['Onboarding swipe tutorial', 'Teach the loop in three screens max.', 'product'],
    ['College campus ambassador launch', 'Posters, QR codes, and questionable chalk art.', 'marketing'],
    ['In-app events feature', 'Live rooms that do not melt the servers.', 'product'],
    ['Trust & safety escalation queue', 'Humans review the edge cases.', 'product'],
    ['Viral loop instrumentation', 'Measure k-factor without fooling yourself.', 'research'],
    ['Sticker pack drop', 'Expressive pixels users share off-platform.', 'marketing'],
    ['Privacy settings refresh', 'Granular controls journalists can praise.', 'product'],
    ['Influencer whitelisting campaign', 'Paid posts that still feel native.', 'marketing'],
    ['Comment threading v2', 'Debates without infinite nesting hell.', 'product'],
    ['Report & block UX audit', 'Friction for bad actors, not victims.', 'product'],
    ['Social graph import', 'Find friends without creepy upload vibes.', 'product'],
    ['Meme template generator', 'Lower the barrier to shareable content.', 'marketing'],
    ['Community guidelines video', 'Friendly tone, firm boundaries.', 'marketing'],
    ['Retention cohort analysis', 'Find day-7 drop-offs and fix one.', 'research'],
    ['Brand partnership pilot', 'Co-branded filters with a snack company.', 'sales'],
    ['App Store featuring pitch', 'Editorial story angle beyond “social network”.', 'marketing'],
    ['Dark mode launch', 'OLED-friendly and screenshot-ready.', 'product'],
    ['Anti-spam rate limits', 'Bots hate this one trick.', 'product'],
    ['User verification badges', 'Blue checks without the chaos.', 'product'],
    ['Live audio rooms beta', 'Drop-in chats; moderation on a hair trigger.', 'product'],
    ['Share-to-TikTok integration', 'Export vertical clips in one tap.', 'marketing'],
    ['Community moderator hiring sprint', 'Volunteers plus paid leads.', 'sales'],
    ['Seasonal challenge campaign', 'Hashtag week with cheap prizes.', 'marketing'],
    ['Data export & portability', 'GDPR-friendly exit ramps.', 'product'],
    ['Ad-free subscription test', 'See if anyone pays to remove promos.', 'sales'],
    ['Cross-posting to ProNet', 'Meet users where they already argue.', 'marketing']
  ]),
  marketplace: categoryBlock('marketplace', 'Marketplace', [
    ['Supply-side signup blitz', 'Bonuses for the first 100 providers on the platform.', 'marketing'],
    ['Demand-side coupon launch', 'Subsidize first transactions until liquidity sticks.', 'marketing'],
    ['Trust & safety playbook', 'ID checks, strikes, and appeal flows.', 'product'],
    ['Rating system redesign', 'Stars that reflect real quality, not revenge.', 'product'],
    ['Dispute resolution center', 'Refunds without Twitter wars.', 'product'],
    ['Dynamic pricing experiment', 'Surge rules supply and demand can tolerate.', 'research'],
    ['Insurance certificate tracking', 'Verify coverage before jobs go live.', 'product'],
    ['Background check vendor RFP', 'Pick a checker that scales with gigs.', 'sales'],
    ['Market launch in one zip code', 'Density before geography.', 'marketing'],
    ['Provider onboarding video', 'Two-minute setup that reduces support tickets.', 'marketing'],
    ['Customer support macros', 'Templates for lost items and late arrivals.', 'research'],
    ['Fraud ring investigation', 'Pattern detection on fake accounts.', 'product'],
    ['Payout schedule transparency', 'When providers actually get paid.', 'product'],
    ['SEO landing pages per city', 'Long-tail “near me” pages that convert.', 'marketing'],
    ['Referral credits both sides', 'Double-sided incentives with caps.', 'marketing'],
    ['Service category expansion', 'Add pet care or assembly — pick your wedge.', 'product'],
    ['SLA for enterprise buyers', 'B2B contracts for recurring orders.', 'sales'],
    ['Mobile app driver mode', 'Offline-friendly flows for the field.', 'product'],
    ['Photo proof-of-delivery', 'Reduce “where is my stuff” tickets.', 'product'],
    ['Tax document collection', '1099 readiness before January panic.', 'product'],
    ['Liquidity heatmap review', 'Find deserts and run local promos.', 'research'],
    ['Brand safety for promos', 'No coupons on illegal services.', 'research'],
    ['API for partner marketplaces', 'Embed listings elsewhere.', 'product'],
    ['Peak hour incentive budget', 'Pay supply when demand spikes.', 'marketing'],
    ['Cancellation policy tuning', 'Balance fairness vs. utilization.', 'research'],
    ['In-app tipping rollout', 'Optional gratitude that providers keep.', 'product'],
    ['Quality score calibration', 'Weights that match user complaints.', 'product'],
    ['Enterprise vendor onboarding', 'Procurement portals for big clients.', 'sales'],
    ['Localized language pack', 'Spanish support in your top metro.', 'product'],
    ['Incident response tabletop', 'When a provider headline goes wrong.', 'research'],
    ['Merchandising featured listings', 'Paid placement without ruining trust.', 'sales'],
    ['Unit economics per market', 'Kill cities that never contribution-margin.', 'research']
  ]),
  delivery: categoryBlock('delivery', 'Delivery & logistics', [
    ['Routing algorithm tune-up', 'Shave minutes off ETA estimates.', 'product'],
    ['Dark store pilot', 'Micro-fulfillment for impulse categories.', 'product'],
    ['Driver incentive heatmap', 'Bonuses where supply is thin.', 'marketing'],
    ['Cold chain packaging test', 'Melted groceries hurt ratings.', 'product'],
    ['Batching orders experiment', 'Stack deliveries without cold food.', 'product'],
    ['Customer ETA comms refresh', 'Honest delays reduce angry calls.', 'product'],
    ['Fleet insurance review', 'Coverage that matches vehicle types.', 'research'],
    ['Merchant tablet rollout', 'In-store order flow that staff learn.', 'sales'],
    ['Last-mile partner contract', '3PL backup when you spike.', 'sales'],
    ['Pick & pack layout study', 'Walk paths that save labor hours.', 'research'],
    ['Delivery zone expansion', 'Draw polygons that ops can serve.', 'marketing'],
    ['Tip pooling policy', 'Fair splits for stacked orders.', 'research'],
    ['Weather surge playbook', 'Rain pricing without rage tweets.', 'marketing'],
    ['WISMO ticket deflection', 'Where-is-my-order self-serve.', 'product'],
    ['Barcode scan QA', 'Wrong item rates down 1 point.', 'product'],
    ['Hub-and-spoke inventory', 'Forward stock near demand.', 'product'],
    ['Driver safety training', 'Modules that reduce incidents.', 'research'],
    ['Corporate catering channel', 'B2B lunch orders with invoices.', 'sales'],
    ['Returns & reverse logistics', 'Pick up failed deliveries cleanly.', 'product'],
    ['Fuel surcharge modeling', 'Pass-through math customers accept.', 'research'],
    ['Night delivery curfew policy', 'Noise complaints vs. revenue.', 'research'],
    ['Autonomous vehicle pilot PR', 'Robots on sidewalks — permit first.', 'marketing'],
    ['Freshness SLA with grocers', 'Penalty clauses that are enforceable.', 'sales'],
    ['Dynamic batch window UI', 'Show drivers fair groupings.', 'product'],
    ['Fraudulent order detection', 'Stolen cards on quick commerce.', 'product'],
    ['Localized picker hiring fair', 'Staff warehouses in new cities.', 'sales'],
    ['Packaging sustainability swap', 'Compostable bags investors mention.', 'marketing'],
    ['Delivery proof photo ML', 'Verify drop-off without privacy creep.', 'product'],
    ['Partner restaurant onboarding', 'Menu ingest that survives updates.', 'sales'],
    ['Peak holiday staffing plan', 'Temps, overtime, and realistic promos.', 'research'],
    ['Carbon offset line item', 'Optional green fee A/B test.', 'marketing'],
    ['Load board for overflow', 'External couriers when you saturate.', 'sales']
  ]),
  fintech: categoryBlock('fintech', 'Fintech', [
    ['KYC flow UX polish', 'Selfie scans that pass on first try.', 'product'],
    ['AML alert tuning', 'False positives down, real hits up.', 'product'],
    ['Sponsor bank diligence packet', 'Charts for partners who say no slowly.', 'sales'],
    ['Ledger reconciliation automation', 'Penny-perfect books nightly.', 'product'],
    ['PCI scope reduction', 'Tokenize cards; shrink audit surface.', 'product'],
    ['Fraud model retrain', 'New features from latest chargebacks.', 'product'],
    ['Card program BIN sponsorship', 'Plastic or virtual — pick a lane.', 'sales'],
    ['Wire transfer cutoff comms', 'Cutoff times users actually read.', 'product'],
    ['Regulatory exam prep room', 'Binders bankers expect.', 'research'],
    ['Open banking API launch', 'OAuth flows developers enjoy.', 'product'],
    ['BNPL merchant onboarding', 'Checkout widget in one sprint.', 'sales'],
    ['Credit bureau pull integration', 'Hard vs soft pulls documented.', 'product'],
    ['Collections workflow compassion', 'Delinquency without harassment vibes.', 'product'],
    ['Model risk management memo', 'Document models regulators understand.', 'research'],
    ['Interest rate disclosure refresh', 'APY footnotes compliant and clear.', 'research'],
    ['Dispute resolution Reg E', 'Chargeback timelines on rails.', 'product'],
    ['Sanctions screening batch', 'OFAC lists without blocking grandma.', 'product'],
    ['Treasury cash sweep', 'Idle balances earn something safe.', 'product'],
    ['Embedded finance SDK docs', 'Partners integrate without Slack spam.', 'product'],
    ['Wealth advisor channel pilot', 'White-label for RIAs.', 'sales'],
    ['Crypto custody paperwork', 'Disclaimers and cold storage story.', 'research'],
    ['Real-time payments rail', 'RTP/FedNow readiness checklist.', 'product'],
    ['Onboarding selfie liveness', 'Spoof attacks get harder.', 'product'],
    ['SOC 1 control narrative', 'Auditors love a good spreadsheet.', 'research'],
    ['Merchant underwriting rules', 'Approve good MCCs faster.', 'product'],
    ['Stablecoin treasury experiment', 'Treasury team says “carefully.”', 'research'],
    ['Financial wellness content hub', 'SEO for money anxiety keywords.', 'marketing'],
    ['Account takeover playbooks', 'Step-up auth when signals spike.', 'product'],
    ['Partner bank QBR', 'Relationship maintenance with risk officers.', 'sales'],
    ['Invoice financing pilot', 'SMB cash flow product with guardrails.', 'sales'],
    ['Tax form 1099 pipeline', 'January without engineering fire drills.', 'product'],
    ['Consumer complaint log review', 'CFPB-ready responses.', 'research'],
    ['FX spread transparency test', 'Show fees before users swap.', 'product']
  ]),
  'ai-tools': categoryBlock('ai-tools', 'AI tools', [
    ['Eval harness v1', 'Golden sets before you ship model changes.', 'product'],
    ['Prompt library cleanup', 'Version prompts like code.', 'product'],
    ['RAG pipeline hardening', 'Chunking that respects semantics.', 'product'],
    ['GPU cost dashboard', 'Show burn by customer and feature.', 'product'],
    ['Model card publication', 'Capabilities, limits, and bias notes.', 'research'],
    ['Safety red team week', 'Jailbreak attempts before users find them.', 'research'],
    ['Enterprise VPC deployment', 'Single-tenant boxes for paranoid CIOs.', 'product'],
    ['Token pricing calculator', 'Margin-positive tiers on the pricing page.', 'research'],
    ['Latency optimization sprint', 'P95 down for streaming completions.', 'product'],
    ['Hallucination benchmark blog', 'Honest scores build trust.', 'marketing'],
    ['Agent workflow designer', 'Multi-step tools with guardrails.', 'product'],
    ['Human review queue', 'HITL for high-risk outputs.', 'product'],
    ['Synthetic data generation', 'Train without leaking client text.', 'product'],
    ['Fine-tune weekend', 'GPU bills arrive Monday.', 'product'],
    ['Copilot plugin marketplace', 'Third-party actions with scopes.', 'product'],
    ['LLM observability traces', 'Spans for every prompt/response.', 'product'],
    ['Semantic cache layer', 'Repeat queries cost less.', 'product'],
    ['Annotation contractor onboarding', 'Labelers with NDAs and guidelines.', 'sales'],
    ['Distillation experiment', 'Small model, cheaper inference.', 'product'],
    ['Guardrails policy editor', 'Block PII and banned topics.', 'product'],
    ['Academic benchmark submission', 'Leaderboard clout — earned honestly.', 'marketing'],
    ['OSS model release', 'Weights, license, and responsible use doc.', 'marketing'],
    ['HuggingFace launch campaign', 'Community upvotes and demo notebooks.', 'marketing'],
    ['SOC2 for AI vendors', 'Security story for enterprise buyers.', 'research'],
    ['Rate limit abuse detection', 'Key rotation for leakers.', 'product'],
    ['Customer fine-tune offering', 'Private adapters with clear SLAs.', 'sales'],
    ['Batch API for bulk jobs', 'Night runs for big documents.', 'product'],
    ['Multimodal demo reel', 'Vision + text screenshots for sales.', 'marketing'],
    ['Context window upgrade', 'Long docs without “forgetting”.', 'product'],
    ['Embedding model refresh', 'Better retrieval quality A/B.', 'product'],
    ['AI ethics committee notes', 'Document decisions when models refuse.', 'research'],
    ['Partner SI enablement kit', 'Consultancies implement you faster.', 'sales']
  ]),
  hardware: categoryBlock('hardware', 'Hardware', [
    ['Prototype fab run', 'Rev D still smells like hot glue.', 'product'],
    ['DFM review with CM', 'Design for manufacture before MOQ panic.', 'product'],
    ['Certification pre-scan (FCC/CE)', 'Radiated emissions without surprises.', 'research'],
    ['Battery life optimization', 'Milliamps matter on spec sheets.', 'product'],
    ['Retail channel test', 'Big-box meeting, small-box shipment.', 'sales'],
    ['Returns RMA workflow', 'Hardware back without losing minds.', 'product'],
    ['Firmware OTA pipeline', 'Updates that do not brick devices.', 'product'],
    ['Tooling deposit negotiation', 'Spread NRE across first POs.', 'sales'],
    ['Supply chain dual-source', 'Second supplier for the critical chip.', 'research'],
    ['Packaging unboxing study', 'First 60 seconds on YouTube.', 'marketing'],
    ['Field failure analysis', 'Teardown the units that died.', 'product'],
    ['IoT cloud pairing UX', 'QR codes grandma can scan.', 'product'],
    ['Warranty policy drafting', 'RMA windows support can honor.', 'research'],
    ['Kickstarter fulfillment plan', 'Backer tiers → pick/pack reality.', 'sales'],
    ['Thermal chamber testing', 'Heat soak before summer returns.', 'product'],
    ['Accessory SKU launch', 'Cables and mounts with margin.', 'sales'],
    ['Manufacturing QA checklist', 'Catch defects before ship.', 'product'],
    ['Repair partner network', 'Fix-it shops for out-of-warranty.', 'sales'],
    ['Sustainability take-back program', 'Recycling story for ESG decks.', 'marketing'],
    ['BLE range tuning', 'Antenna layout that passes walk tests.', 'product'],
    ['Enterprise fleet PO pilot', '500 units with support SLAs.', 'sales'],
    ['Compliance labeling (WEEE/RoHS)', 'Stickers regulators expect.', 'research'],
    ['Inventory safety stock model', 'Lead times vs. cash tied up.', 'research'],
    ['Demo unit loaner program', 'Sales kits that come back.', 'sales'],
    ['Noise/Vibration test', 'Whirrs users accept on desk.', 'product'],
    ['Waterproofing IP rating push', 'Ingress protection marketing can cite.', 'product'],
    ['Customs HS code classification', 'Import duties modeled correctly.', 'research'],
    ['Reverse logistics refurb line', 'B-stock units resold cleanly.', 'product'],
    ['Partner SDK for hardware API', 'Devs build on your device data.', 'product'],
    ['Retail endcap display design', 'Shelf presence that moves boxes.', 'marketing'],
    ['Failure mode effects analysis', 'FMEA before mass production.', 'research'],
    ['On-device ML accelerator', 'Edge inference within watt budget.', 'product']
  ]),
  climate: categoryBlock('climate', 'Climate & energy', [
    ['Grid interconnect study', 'Utility timelines in plain English.', 'research'],
    ['PPA term sheet workshop', 'Power purchase math that closes.', 'sales'],
    ['Carbon accounting methodology', 'Scopes documented for buyers.', 'research'],
    ['M&V plan for savings', 'Measurement & verification customers trust.', 'research'],
    ['Solar site prospecting GIS', 'Roofs and fields ranked by yield.', 'product'],
    ['Battery dispatch optimization', 'Charge/discharge against tariffs.', 'product'],
    ['REC retirement workflow', 'Credits retired, not double-sold.', 'product'],
    ['EPC partner onboarding', 'Install crews with quality scores.', 'sales'],
    ['Permitting packet automation', 'City PDFs generated consistently.', 'product'],
    ['Demand response pilot', 'Curtail load when grid peaks.', 'product'],
    ['Scope 3 supplier survey', 'Upstream emissions data collection.', 'research'],
    ['ESG investor deck refresh', 'Impact metrics with audit trail.', 'marketing'],
    ['Heat pump installer training', 'Certify partners before season.', 'sales'],
    ['Wildfire risk model integration', 'Insurance-friendly hazard layers.', 'product'],
    ['Community solar subscriber drive', 'Bill credits marketed locally.', 'marketing'],
    ['ISO/RTO market registration', 'Bid into wholesale markets legally.', 'research'],
    ['EV fleet charger layout', 'Depot plans with load management.', 'product'],
    ['Green tariff customer signup', 'Utility programs bundled in UX.', 'sales'],
    ['Lifecycle assessment report', 'Cradle-to-grave emissions PDF.', 'research'],
    ['Weatherization audit workflow', 'Home efficiency jobs end-to-end.', 'product'],
    ['Carbon credit registry API', 'Mint/retire with serial numbers.', 'product'],
    ['Microgrid controller beta', 'Island mode without chaos.', 'product'],
    ['Corporate VPPA signature', 'Offtake deal with Fortune 500.', 'sales'],
    ['Satellite imagery QA', 'Panel detection for asset owners.', 'product'],
    ['Rate case intervention memo', 'Regulatory filing support.', 'research'],
    ['Biogas feedstock contracts', 'Supply agreements with farms.', 'sales'],
    ['Green hydrogen feasibility', 'Pilot memo even if answer is “later”.', 'research'],
    ['Building decarb roadmap SaaS', 'Pathways per square foot.', 'product'],
    ['Climate risk disclosure export', 'CSRD-style reports on schedule.', 'product'],
    ['Offset portfolio diversification', 'Mix nature and tech credits.', 'research'],
    ['Energy audit sales playbook', 'Close retrofits, not just audits.', 'sales'],
    ['Thermal storage pilot site', 'Molten salt or ice — pick your sci-fi.', 'product']
  ]),
  'gaming-media': categoryBlock('gaming-media', 'Gaming & media', [
    ['Battle pass season design', 'Rewards grind that feels fair.', 'product'],
    ['Live ops calendar', 'Events spaced so devs sleep.', 'product'],
    ['Anti-cheat telemetry', 'Detect aimbots without false bans.', 'product'],
    ['Creator payout program', 'Revenue share streamers understand.', 'sales'],
    ['Cross-play negotiation', 'Platform holders say maybe.', 'sales'],
    ['Localization pass (L10n)', 'Strings and cultural jokes adapted.', 'product'],
    ['Community Discord moderation', 'Mods, bots, and escalation paths.', 'marketing'],
    ['Trailer capture session', 'Gameplay footage that sells fantasy.', 'marketing'],
    ['Soft launch in test market', 'Philippines or Canada — classic move.', 'marketing'],
    ['Ad monetization waterfall', 'Mediation that protects UX.', 'product'],
    ['Guild/clan feature MVP', 'Social glue for retention.', 'product'],
    ['Esports exhibition match', 'Small prize pool, big social clips.', 'marketing'],
    ['Content moderation ML', 'Chat toxicity down a notch.', 'product'],
    ['IP collaboration pitch', 'Skins with a movie franchise.', 'sales'],
    ['Patch notes writers room', 'Balance changes explained clearly.', 'marketing'],
    ['Platform certification prep', 'TCR for consoles — checklist time.', 'product'],
    ['Whale-friendly offers audit', 'Ethical limits on high spenders.', 'research'],
    ['Speedrun-friendly mode', 'Category rules community asked for.', 'product'],
    ['Music licensing clearance', 'Tracks that will not get DMCA’d.', 'research'],
    ['User-generated content tools', 'Maps/skins with review queue.', 'product'],
    ['Retention D1/D7 experiment', 'Fix the tutorial drop-off.', 'research'],
    ['Influencer early access keys', 'Streamers onboard embargoes.', 'marketing'],
    ['Seasonal narrative arc', 'Story beats across 8 weeks.', 'product'],
    ['Cloud save sync', 'Cross-device progress without tears.', 'product'],
    ['Merch store pop-up', 'Hoodies that actually ship.', 'sales'],
    ['Comic/transmedia tie-in', 'Lore outside the client.', 'marketing'],
    ['Netcode lag reduction', 'Rollback or better tick rate.', 'product'],
    ['Parental controls panel', 'Spend caps for family accounts.', 'product'],
    ['Review bomb response plan', 'Steam charts damage control.', 'marketing'],
    ['SDK for modders', 'Safe APIs for community content.', 'product'],
    ['Subscription tier experiment', 'Monthly stipend of premium currency.', 'sales'],
    ['Highlight clip auto-gen', 'Share buttons for viral moments.', 'product'],
    ['Voice chat safety tools', 'Mute/report that works mid-match.', 'product']
  ])
};

const universalScale = [
  { title: 'Board-ready metrics pack', description: 'ARR, burn, and cohort charts investors expect.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 8000, revenue: [45000, 220000], product: 0, buzz: 1 },
  { title: 'All-hands roadmap reveal', description: 'Internal alignment before external promises.', types: ['marketing'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 5500, revenue: [12000, 68000], product: 1, buzz: 2 },
  { title: 'Vendor consolidation RFP', description: 'Fewer SaaS logos on the IT spreadsheet.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 12000, revenue: [35000, 180000], product: 0, buzz: 0 },
  { title: 'Second product line exploration', description: 'Adjacent SKU without starving the core.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 28000, revenue: [55000, 290000], product: 2, buzz: 2 },
  { title: 'International entity setup', description: 'Subsidiary paperwork for overseas hires.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 45000, revenue: [80000, 380000], product: 0, buzz: 0 },
  { title: 'Post-acquisition integration day 1', description: 'Systems, culture, and one shared Slack.', types: ['sales'], stages: ['public'], tierMin: 7, tierMax: 7, cost: 120000, revenue: [250000, 1200000], product: 1, buzz: 2 },
  { title: 'Workforce planning model', description: 'Headcount vs. pipeline with finance sign-off.', types: ['research'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 6500, revenue: [22000, 120000], product: 0, buzz: 0 },
  { title: 'Executive offsite strategy', description: 'Sticky notes that become OKRs.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 22000, revenue: [40000, 210000], product: 0, buzz: 1 },
  { title: 'Customer advisory council', description: 'Quarterly feedback from logos you want more of.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 15000, revenue: [65000, 320000], product: 1, buzz: 2 },
  { title: 'Brand trust survey', description: 'Baseline NPS before the rebrand.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 5, cost: 4200, revenue: [8000, 45000], product: 0, buzz: 1 },
  { title: 'Crisis comms runbook', description: 'Who tweets when prod is on fire.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 3, tierMax: 6, cost: 5000, revenue: [15000, 85000], product: 0, buzz: 0 },
  { title: 'Annual user conference', description: 'Badge scans, breakout rooms, one big keynote.', types: ['marketing'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 85000, revenue: [180000, 820000], product: 2, buzz: 5, rivalPressure: -1 },
  { title: 'Platform reliability review', description: 'SLOs, error budgets, and adult supervision.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 18000, revenue: [42000, 240000], product: 2, buzz: 0 },
  { title: 'Strategic partnership MOU', description: 'Non-binding until lawyers bind it.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 12000, revenue: [95000, 480000], product: 0, buzz: 2 },
  { title: 'Data warehouse migration', description: 'Snowflake bill arrives later.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 32000, revenue: [55000, 280000], product: 2, buzz: 0 },
  { title: 'Public benefit corp narrative', description: 'Mission language for impact investors.', types: ['marketing'], stages: ['public'], tierMin: 7, tierMax: 7, cost: 25000, revenue: [60000, 310000], product: 0, buzz: 2 },
  { title: 'Secondary tender offer prep', description: 'Employee liquidity without full exit.', types: ['sales'], stages: ['public'], tierMin: 7, tierMax: 7, cost: 65000, revenue: [120000, 580000], product: 0, buzz: 1 },
  { title: 'Office hybrid policy rollout', description: 'Desk booking and culture questions.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 3500, revenue: [5000, 32000], product: 0, buzz: 0 },
  { title: 'Competitive win-loss interviews', description: 'Why deals die — recorded honestly.', types: ['research'], stages: ['post_xc'], tierMin: 3, tierMax: 5, cost: 4800, revenue: [18000, 98000], product: 0, buzz: 0 },
  { title: 'Grant application sprint', description: 'Non-dilutive cash with reporting strings.', types: ['sales'], stages: ['garage', 'office'], tierMin: 0, tierMax: 2, cost: 1200, revenue: [0, 8000], product: 1, buzz: 1 },
  { title: 'Open-source compliance audit', description: 'LICENSE files and dependency notices in order.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 5, cost: 6200, revenue: [8000, 52000], product: 1, buzz: 1 },
  { title: 'Revenue recognition policy', description: 'Finance and sales agree when to book ARR.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 14000, revenue: [35000, 190000], product: 0, buzz: 0 },
  { title: 'Sales kickoff (SKO)', description: 'Pipeline chants and comp plan slides.', types: ['marketing'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 55000, revenue: [120000, 620000], product: 0, buzz: 2 },
  { title: 'Bug bounty program launch', description: 'Pay hackers before black hats find you.', types: ['product'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 18000, revenue: [28000, 155000], product: 2, buzz: 2 },
  { title: 'Talent brand content series', description: 'Engineering blog posts that recruit.', types: ['marketing'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 4, cost: 4500, revenue: [6000, 42000], product: 0, buzz: 3 },
  { title: 'Cap table scenario modeling', description: 'Dilution math before the term sheet.', types: ['research'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 5, cost: 3800, revenue: [2000, 22000], product: 0, buzz: 0 },
  { title: 'Partner API business review', description: 'Quarterly sync with your biggest integrator.', types: ['sales'], stages: ['post_xc', 'public'], tierMin: 4, tierMax: 7, cost: 9000, revenue: [75000, 380000], product: 1, buzz: 1 },
  { title: 'Design system v2 rollout', description: 'Components designers and devs both use.', types: ['product'], stages: ['office', 'post_xc'], tierMin: 2, tierMax: 5, cost: 11000, revenue: [15000, 88000], product: 2, buzz: 1 },
  { title: 'Incident postmortem culture', description: 'Blameless writeups that actually change things.', types: ['research'], stages: ['post_xc'], tierMin: 3, tierMax: 6, cost: 4200, revenue: [12000, 72000], product: 1, buzz: 0 },
  { title: 'Global payroll expansion', description: 'EOR in one country without entity panic.', types: ['research'], stages: ['post_xc', 'public'], tierMin: 5, tierMax: 7, cost: 32000, revenue: [45000, 240000], product: 0, buzz: 0 },
  { title: 'Analyst day dry run', description: 'Public company metrics rehearsal.', types: ['marketing'], stages: ['public'], tierMin: 7, tierMax: 7, cost: 48000, revenue: [95000, 480000], product: 0, buzz: 2 }
].map((t, i) => ({ id: `uni-scale-${i + 1}-${t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`, ...t }));

const extraCategoryTasks = Object.entries(EXTRA_ROWS).flatMap(([categoryId, rows]) =>
  categoryBlock(categoryId, categoryId, rows)
);

const categoryTasks = [
  ...Object.values(SEEDS).flat(),
  ...Object.values(HAND_AUTHORED).flat(),
  ...Object.values(BULK).flat(),
  ...extraCategoryTasks
];

const ids = new Set();
const merged = [];
for (const t of [...keep, ...categoryTasks, ...universalScale]) {
  if (ids.has(t.id)) continue;
  ids.add(t.id);
  merged.push(t);
}

writeFileSync(
  path,
  `${JSON.stringify({ version: 3, tasks: merged }, null, 2)}\n`
);

console.log(`tasks.json rebuilt: ${merged.length} tasks (${keep.length} core, ${categoryTasks.length} category, ${universalScale.length} universal)`);
