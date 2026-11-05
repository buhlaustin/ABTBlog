/**
 * Handcrafted M&A catalog — category rivals + unique targets with sane ARR multiples.
 * Run: node scripts/generate-acquisition-catalog.mjs
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'work/startup-sim/data/acquisition-targets.json');

/** Target count (11 rivals + handcrafted targets). */
export const ACQUISITION_CATALOG_SIZE = 165;

const SMALL_MRR = [4_200, 6_800, 9_500, 12_800, 16_500, 22_000, 27_500];
const MID_MRR = [58_000, 92_000, 138_000, 205_000, 310_000, 465_000, 620_000];
const ENT_MRR = [980_000, 1_650_000, 2_800_000, 4_500_000, 7_200_000, 11_500_000, 16_000_000];

const SMALL_MULT = [4.8, 5.2, 5.5, 5.8, 6.0, 6.2, 6.5];
const MID_MULT = [7.2, 7.8, 8.4, 9.0, 9.6, 10.2, 10.8];
const ENT_MULT = [9.5, 10.5, 11.5, 12.5, 13.0, 13.5, 14.0];

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mk(id, name, segment, baseMrr, arrMultiple, description, marketCategory) {
  const row = {
    id,
    name,
    segment,
    baseMrr,
    basePrice: Math.round(baseMrr * 12 * arrMultiple),
    description
  };
  if (marketCategory) row.marketCategory = marketCategory;
  return row;
}

function pickMrr(segment, slot) {
  const list = segment === 'small' ? SMALL_MRR : segment === 'mid' ? MID_MRR : ENT_MRR;
  const mult = segment === 'small' ? SMALL_MULT : segment === 'mid' ? MID_MULT : ENT_MULT;
  const i = slot % list.length;
  return { baseMrr: list[i], arrMultiple: mult[i] };
}

/** @type {Record<string, { rival: string; targets: Array<{ name: string; segment: 'small'|'mid'|'enterprise'; blurb: string; slot: number }> }>} */
const BY_CATEGORY = {
  'b2b-saas': {
    rival: 'CloudLedger',
    targets: [
      { name: 'LedgerLite', segment: 'small', blurb: 'SMB invoicing — sticky accountants, minimal overlap with your core SKU.', slot: 0 },
      { name: 'QuotaPilot', segment: 'small', blurb: 'Sales quota tracking for mid-market reps — clean API, fast close.', slot: 1 },
      { name: 'StackBeacon', segment: 'small', blurb: 'Internal developer portal — docs + service catalog for IT buyers.', slot: 2 },
      { name: 'Northstar CRM', segment: 'small', blurb: 'Vertical CRM for agencies — high NPS, low churn cohort.', slot: 3 },
      { name: 'Pipeline Owl', segment: 'small', blurb: 'Revenue intelligence widgets — embeds into Salesforce sandboxes.', slot: 4 },
      { name: 'Briefcase BI', segment: 'small', blurb: 'Self-serve analytics for finance teams — exports to Excel reliably.', slot: 5 },
      { name: 'ContractKit', segment: 'mid', blurb: 'CLM for procurement — annual contracts, strong upsell motion.', slot: 0 },
      { name: 'RevOps Foundry', segment: 'mid', blurb: 'GTM data warehouse — connects billing, CRM, and product usage.', slot: 1 },
      { name: 'TenantCloud', segment: 'mid', blurb: 'Multi-tenant identity for B2B apps — SSO bundle with SCIM.', slot: 2 },
      { name: 'Atlas ERP Bridge', segment: 'mid', blurb: 'Integration layer for NetSuite — recurring SI partner revenue.', slot: 3 },
      { name: 'Summit Spend', segment: 'mid', blurb: 'Corporate card + expense — interchange float and SaaS fee stack.', slot: 4 },
      { name: 'Monolith Suite', segment: 'enterprise', blurb: 'Full revenue cloud — billing, CPQ, and usage metering at scale.', slot: 2 },
      { name: 'Fortress Data', segment: 'enterprise', blurb: 'Enterprise data platform — petabyte pipelines, Fortune 500 logos.', slot: 4 },
      { name: 'Orbit Works', segment: 'enterprise', blurb: 'Global workflow OS — 40 countries, heavy services attach.', slot: 6 }
    ]
  },
  'consumer-social': {
    rival: 'VibeCircle',
    targets: [
      { name: 'Campfire Chat', segment: 'small', blurb: 'Niche community rooms — creators pay for moderation tools.', slot: 1 },
      { name: 'PollPop', segment: 'small', blurb: 'Live polling for streamers — tips plus subscription tiers.', slot: 2 },
      { name: 'Album Alley', segment: 'small', blurb: 'Private photo sharing — family plans with print upsells.', slot: 3 },
      { name: 'HobbyHub', segment: 'small', blurb: 'Interest graph forums — ads plus premium badges.', slot: 4 },
      { name: 'LocalLoop', segment: 'small', blurb: 'Neighborhood boards — hyperlocal ad inventory.', slot: 5 },
      { name: 'ClipForge', segment: 'small', blurb: 'Short-form editor SDK — licensed to other social apps.', slot: 6 },
      { name: 'Pulse Events', segment: 'mid', blurb: 'Ticketing + social RSVPs — take rate on paid events.', slot: 0 },
      { name: 'CreatorLedger', segment: 'mid', blurb: 'Payouts and tax forms for influencers — float on balances.', slot: 1 },
      { name: 'StreamNest', segment: 'mid', blurb: 'Co-watch parties — premium subs and brand sponsorships.', slot: 2 },
      { name: 'TrustCircle', segment: 'mid', blurb: 'Verified identity for dating apps — B2B API revenue.', slot: 3 },
      { name: 'ViralMetrics', segment: 'mid', blurb: 'Growth analytics for consumer apps — annual enterprise deals.', slot: 5 },
      { name: 'Gather Global', segment: 'enterprise', blurb: 'Live social graph — hundreds of millions of MAU, ad-heavy.', slot: 1 },
      { name: 'EchoSphere', segment: 'enterprise', blurb: 'Audio-first network — podcast ads and premium audio.', slot: 3 },
      { name: 'Parlor Media', segment: 'enterprise', blurb: 'Gen-Z video feed — brand safety team already built.', slot: 5 }
    ]
  },
  marketplace: {
    rival: 'GigRabbit',
    targets: [
      { name: 'ToolSwap', segment: 'small', blurb: 'Peer rental for power tools — insurance fee on each booking.', slot: 0 },
      { name: 'TutorBay', segment: 'small', blurb: 'Lesson marketplace — 18% take rate, school partnerships.', slot: 2 },
      { name: 'FitMatch', segment: 'small', blurb: 'Trainer booking — subscription for gyms.', slot: 3 },
      { name: 'CraftCart', segment: 'small', blurb: 'Handmade goods — seller SaaS plus checkout fees.', slot: 4 },
      { name: 'RideShare Lite', segment: 'small', blurb: 'Regional ride pool — municipal contracts.', slot: 5 },
      { name: 'ParkSpot', segment: 'small', blurb: 'Parking spot marketplace — IoT sensors bundled.', slot: 6 },
      { name: 'ProService Hub', segment: 'mid', blurb: 'Home services lead gen — pay-per-lead and SaaS for pros.', slot: 0 },
      { name: 'B2B Exchange', segment: 'mid', blurb: 'Wholesale parts — escrow and logistics margin.', slot: 1 },
      { name: 'TalentLane', segment: 'mid', blurb: 'Contractor marketplace for enterprises — VMS integrations.', slot: 2 },
      { name: 'FleetBoard', segment: 'mid', blurb: 'Commercial vehicle leasing marketplace — lender partnerships.', slot: 4 },
      { name: 'SupplyGrid', segment: 'mid', blurb: 'Industrial MRO marketplace — sticky supplier onboarding.', slot: 6 },
      { name: 'Global Bazaar', segment: 'enterprise', blurb: 'Cross-border C2C — FX spread and seller services.', slot: 2 },
      { name: 'Metro Commerce', segment: 'enterprise', blurb: 'City-scale delivery marketplace — dense courier network.', slot: 4 },
      { name: 'TradeTower', segment: 'enterprise', blurb: 'B2B procurement exchange — Fortune 500 supplier graph.', slot: 6 }
    ]
  },
  delivery: {
    rival: 'DashDrop',
    targets: [
      { name: 'SnackRun', segment: 'small', blurb: 'Campus food delivery — student meal plans.', slot: 0 },
      { name: 'RxRoute', segment: 'small', blurb: 'Pharmacy same-day — insurance billing integrations.', slot: 1 },
      { name: 'BulkBox', segment: 'small', blurb: 'Wholesale grocery for restaurants — recurring routes.', slot: 2 },
      { name: 'FlowerDash', segment: 'small', blurb: 'Florist network — holiday spikes, predictable churn.', slot: 3 },
      { name: 'DryClean Go', segment: 'small', blurb: 'Pickup/delivery for dry cleaners — B2B SaaS fee.', slot: 4 },
      { name: 'PetParcel', segment: 'small', blurb: 'Pet food subscription delivery — high LTV households.', slot: 5 },
      { name: 'ColdChain Co', segment: 'mid', blurb: 'Temperature-controlled logistics — pharma clients.', slot: 0 },
      { name: 'LastMile Labs', segment: 'mid', blurb: 'Routing optimization SaaS sold to regional couriers.', slot: 1 },
      { name: 'DarkStore OS', segment: 'mid', blurb: 'Micro-fulfillment software — per-location licensing.', slot: 3 },
      { name: 'FreightLink', segment: 'mid', blurb: 'LTL freight matching — take rate on loads.', slot: 4 },
      { name: 'CourierCloud', segment: 'mid', blurb: 'White-label delivery stack for retailers.', slot: 5 },
      { name: 'Continental Carry', segment: 'enterprise', blurb: 'National last-mile — owns sort centers in 30 metros.', slot: 2 },
      { name: 'AirCargo One', segment: 'enterprise', blurb: 'Express air freight — enterprise SLAs and fuel surcharges.', slot: 3 },
      { name: 'OmniLogistics', segment: 'enterprise', blurb: '3PL with tech layer — billion-dollar GMV run rate.', slot: 5 }
    ]
  },
  fintech: {
    rival: 'NeonBank',
    targets: [
      { name: 'PennyJar', segment: 'small', blurb: 'Round-up savings app — interchange share with sponsor bank.', slot: 0 },
      { name: 'InvoiceFactoring', segment: 'small', blurb: 'SMB receivables advance — spread on factored invoices.', slot: 1 },
      { name: 'TaxTiny', segment: 'small', blurb: 'Freelancer quarterly taxes — annual filing upsell.', slot: 2 },
      { name: 'SplitTab', segment: 'small', blurb: 'Group payments for restaurants — viral consumer loop.', slot: 3 },
      { name: 'CreditCoach', segment: 'small', blurb: 'Credit score monitoring — affiliate and subscription mix.', slot: 4 },
      { name: 'PayLink API', segment: 'small', blurb: 'Embedded checkout for vertical SaaS — per-transaction fee.', slot: 5 },
      { name: 'TreasuryDesk', segment: 'mid', blurb: 'Cash management for startups — yield share on deposits.', slot: 0 },
      { name: 'LendFlow', segment: 'mid', blurb: 'Embedded lending SDK — origination fees plus servicing.', slot: 1 },
      { name: 'WealthStack', segment: 'mid', blurb: 'RIA platform — AUM bps and software fee.', slot: 2 },
      { name: 'FraudShield', segment: 'mid', blurb: 'Transaction monitoring — per-API-call pricing.', slot: 4 },
      { name: 'CardCore', segment: 'mid', blurb: 'Issuer-processor middleware — enterprise contracts.', slot: 6 },
      { name: 'Union Trust', segment: 'enterprise', blurb: 'Regional bank with digital front-end — deposit base included.', slot: 2 },
      { name: 'CapitalBridge', segment: 'enterprise', blurb: 'Investment bank tech — syndication fees and data feeds.', slot: 4 },
      { name: 'PayNet Global', segment: 'enterprise', blurb: 'Cross-border payments rail — FX and compliance moat.', slot: 6 }
    ]
  },
  'ai-tools': {
    rival: 'Promptly AI',
    targets: [
      { name: 'PromptPad', segment: 'small', blurb: 'Prompt library for marketing teams — seat-based SaaS.', slot: 0 },
      { name: 'LabelBot', segment: 'small', blurb: 'Human-in-the-loop labeling — per-task pricing.', slot: 1 },
      { name: 'DocuMind', segment: 'small', blurb: 'Contract summarization — legal vertical focus.', slot: 2 },
      { name: 'SupportGenie', segment: 'small', blurb: 'Ticket draft assistant — Zendesk marketplace leader.', slot: 3 },
      { name: 'CodeReview AI', segment: 'small', blurb: 'PR comment bot — dev-tool subscription.', slot: 4 },
      { name: 'VoiceClone Studio', segment: 'small', blurb: 'Synthetic voice for ads — usage-based minutes.', slot: 5 },
      { name: 'ModelHost', segment: 'mid', blurb: 'Private model deployment — GPU markup plus support.', slot: 0 },
      { name: 'EvalForge', segment: 'mid', blurb: 'LLM eval harness — enterprise compliance buyers.', slot: 1 },
      { name: 'AgentOps', segment: 'mid', blurb: 'Observability for AI agents — traces and guardrails.', slot: 2 },
      { name: 'RAGWorks', segment: 'mid', blurb: 'Enterprise retrieval stack — knowledge base connectors.', slot: 3 },
      { name: 'FineTune Foundry', segment: 'mid', blurb: 'Custom model training — project fees plus hosting.', slot: 5 },
      { name: 'Cortex Cloud', segment: 'enterprise', blurb: 'Foundation model API — hyperscaler contracts and reserved capacity.', slot: 3 },
      { name: 'InferenceGrid', segment: 'enterprise', blurb: 'Global inference fabric — latency SLA for Fortune 100.', slot: 4 },
      { name: 'MindCorp Platform', segment: 'enterprise', blurb: 'Full-stack enterprise AI — services arm drives services revenue.', slot: 6 }
    ]
  },
  hardware: {
    rival: 'BrickWorks',
    targets: [
      { name: 'SensorStick', segment: 'small', blurb: 'USB environmental sensors — hardware margin plus cloud fee.', slot: 0 },
      { name: 'BadgeTap', segment: 'small', blurb: 'Office access badges — replacement hardware cycle.', slot: 1 },
      { name: 'PrintPod', segment: 'small', blurb: 'Compact 3D printers — consumables revenue.', slot: 2 },
      { name: 'DroneMap Kit', segment: 'small', blurb: 'Survey drones for construction — software unlock.', slot: 3 },
      { name: 'ChargeTile', segment: 'small', blurb: 'Wireless charging pads — retail channel partnerships.', slot: 4 },
      { name: 'CamGuard', segment: 'small', blurb: 'Smart camera firmware — subscription for cloud clips.', slot: 5 },
      { name: 'RoboArm Co', segment: 'mid', blurb: 'Warehouse cobots — lease plus maintenance contracts.', slot: 0 },
      { name: 'EdgeGate', segment: 'mid', blurb: 'Industrial IoT gateways — recurring firmware support.', slot: 1 },
      { name: 'PowerCell Systems', segment: 'mid', blurb: 'Battery packs for EV fleets — long sales cycles.', slot: 2 },
      { name: 'FabControl', segment: 'mid', blurb: 'Semiconductor test equipment software — seat licenses.', slot: 4 },
      { name: 'OptiLens', segment: 'mid', blurb: 'AR optics supplier — royalty on unit shipments.', slot: 6 },
      { name: 'Silicon Foundry', segment: 'enterprise', blurb: 'Custom ASIC house — multi-year supply agreements.', slot: 2 },
      { name: 'MegaFab Industries', segment: 'enterprise', blurb: 'Contract manufacturing — Apple-tier clients.', slot: 4 },
      { name: 'Orbital Hardware', segment: 'enterprise', blurb: 'Satellite bus manufacturer — government and commercial backlog.', slot: 6 }
    ]
  },
  healthtech: {
    rival: 'MediMesh',
    targets: [
      { name: 'SleepTrack', segment: 'small', blurb: 'Consumer sleep coaching — device bundle optional.', slot: 0 },
      { name: 'MedRemind', segment: 'small', blurb: 'Medication adherence app — pharma sponsorships.', slot: 1 },
      { name: 'TherapyNotes Lite', segment: 'small', blurb: 'Solo practitioner EHR — HIPAA-ready hosting.', slot: 2 },
      { name: 'LabResults Portal', segment: 'small', blurb: 'Patient lab viewer — clinic SaaS fee.', slot: 3 },
      { name: 'VitalsWidget', segment: 'small', blurb: 'RPM devices for clinics — per-patient monitoring fee.', slot: 4 },
      { name: 'CareCircle', segment: 'small', blurb: 'Family caregiver coordination — premium subs.', slot: 5 },
      { name: 'ClinicFlow', segment: 'mid', blurb: 'Multi-location practice management — billing clearinghouse cut.', slot: 0 },
      { name: 'PriorAuth Bot', segment: 'mid', blurb: 'Payer automation — per-authorization pricing.', slot: 1 },
      { name: 'ImagingCloud', segment: 'mid', blurb: 'DICOM storage and viewer — hospital contracts.', slot: 2 },
      { name: 'TrialBridge', segment: 'mid', blurb: 'Clinical trial recruitment — sponsor fees.', slot: 3 },
      { name: 'HealthData Vault', segment: 'mid', blurb: 'Consent-managed records exchange — transaction fees.', slot: 5 },
      { name: 'CareNet National', segment: 'enterprise', blurb: 'Payor-provider network — value-based care contracts.', slot: 2 },
      { name: 'MedDevice Corp', segment: 'enterprise', blurb: 'Implant portfolio — recurring sterilization and software.', slot: 4 },
      { name: 'BioPharm OS', segment: 'enterprise', blurb: 'Pharmacovigilance platform — global regulatory footprint.', slot: 6 }
    ]
  },
  edtech: {
    rival: 'LessonLoop',
    targets: [
      { name: 'QuizWhiz', segment: 'small', blurb: 'Classroom quizzes — freemium with school licenses.', slot: 0 },
      { name: 'ParentPing', segment: 'small', blurb: 'School-parent messaging — district contracts.', slot: 1 },
      { name: 'SkillSnacks', segment: 'small', blurb: 'Micro-learning for pros — B2B team plans.', slot: 2 },
      { name: 'LanguageLoop', segment: 'small', blurb: 'Live tutor matching — take rate on lessons.', slot: 3 },
      { name: 'GradeGrid', segment: 'small', blurb: 'Gradebook SaaS — SIS integrations.', slot: 4 },
      { name: 'CampusJobs', segment: 'small', blurb: 'University job board — employer listings revenue.', slot: 5 },
      { name: 'LMS Bridge', segment: 'mid', blurb: 'Corporate training LMS — seat expansion motion.', slot: 0 },
      { name: 'CredEngine', segment: 'mid', blurb: 'Digital credentials — issuer and verifier fees.', slot: 1 },
      { name: 'SimLab', segment: 'mid', blurb: 'VR training simulations — hardware bundles.', slot: 2 },
      { name: 'AdmitFlow', segment: 'mid', blurb: 'Admissions CRM for universities — annual licenses.', slot: 4 },
      { name: 'ResearchHub', segment: 'mid', blurb: 'Grant management — indirect cost recovery tools.', slot: 6 },
      { name: 'EduGlobal', segment: 'enterprise', blurb: 'International school operator — tuition plus edtech stack.', slot: 2 },
      { name: 'DegreeWorks', segment: 'enterprise', blurb: 'Online degree provider — OPM revenue share deals.', slot: 3 },
      { name: 'ScholarPlatform', segment: 'enterprise', blurb: 'National assessment platform — government renewals.', slot: 5 }
    ]
  },
  climate: {
    rival: 'GreenStack',
    targets: [
      { name: 'CarbonLedger', segment: 'small', blurb: 'SMB emissions accounting — audit-ready exports.', slot: 0 },
      { name: 'SolarQuote', segment: 'small', blurb: 'Residential solar leads — installer referral fees.', slot: 1 },
      { name: 'EVCharge Map', segment: 'small', blurb: 'Charger discovery app — network affiliate revenue.', slot: 2 },
      { name: 'WasteWatch', segment: 'small', blurb: 'Municipal waste analytics — SaaS for cities.', slot: 3 },
      { name: 'WaterSense', segment: 'small', blurb: 'Smart irrigation controllers — utility rebates.', slot: 4 },
      { name: 'HeatPump Hub', segment: 'small', blurb: 'Contractor marketplace for retrofits — lead fees.', slot: 5 },
      { name: 'GridFlex', segment: 'mid', blurb: 'Demand response aggregator — capacity payments.', slot: 0 },
      { name: 'REC Marketplace', segment: 'mid', blurb: 'Renewable credit trading — spread on certificates.', slot: 1 },
      { name: 'BatteryOS', segment: 'mid', blurb: 'Storage fleet software — availability bonuses.', slot: 2 },
      { name: 'Scope3 Data', segment: 'mid', blurb: 'Supply chain emissions — enterprise annual contracts.', slot: 3 },
      { name: 'ClimateRisk API', segment: 'mid', blurb: 'Physical risk scores for lenders — data licensing.', slot: 5 },
      { name: 'TerraPower Services', segment: 'enterprise', blurb: 'Utility-scale solar O&M — long-term service margins.', slot: 2 },
      { name: 'CarbonCapture Co', segment: 'enterprise', blurb: 'Industrial capture plants — tax credit stack plus offtake.', slot: 4 },
      { name: 'GreenInfra Partners', segment: 'enterprise', blurb: 'Renewable project developer — GW pipeline.', slot: 6 }
    ]
  },
  'gaming-media': {
    rival: 'LootLoop',
    targets: [
      { name: 'IndiePort', segment: 'small', blurb: 'PC indie game launcher — rev share on sales.', slot: 0 },
      { name: 'StreamOverlay', segment: 'small', blurb: 'OBS widgets for streamers — cosmetic marketplace.', slot: 1 },
      { name: 'GuildChat', segment: 'small', blurb: 'Clan comms for mobile games — premium server slots.', slot: 2 },
      { name: 'LootTracker', segment: 'small', blurb: 'Inventory analytics for MMO players — subscription.', slot: 3 },
      { name: 'PodcastHost', segment: 'small', blurb: 'Pod hosting with dynamic ads — creator rev share.', slot: 4 },
      { name: 'FanArt Market', segment: 'small', blurb: 'Licensed fan merch — IP holder splits.', slot: 5 },
      { name: 'AdPlay Network', segment: 'mid', blurb: 'In-game brand placements — CPM plus studio share.', slot: 0 },
      { name: 'EsportsStats', segment: 'mid', blurb: 'Data feeds for betting partners — licensing fees.', slot: 1 },
      { name: 'GameBackend', segment: 'mid', blurb: 'Multiplayer infra — MAU-tier pricing.', slot: 2 },
      { name: 'MediaRights Desk', segment: 'mid', blurb: 'Sports rights tracking — league SaaS contracts.', slot: 4 },
      { name: 'CreatorStudio Pro', segment: 'mid', blurb: 'Video editing for YouTubers — pro tier upsell.', slot: 6 },
      { name: 'WorldPlay Entertainment', segment: 'enterprise', blurb: 'AAA studio with live-service titles — catalog IP.', slot: 2 },
      { name: 'GlobalStream Media', segment: 'enterprise', blurb: 'FAST channels and AVOD — ad sales house included.', slot: 3 },
      { name: 'Interactive Empire', segment: 'enterprise', blurb: 'Publisher with mobile portfolio — IAP and ads mix.', slot: 5 }
    ]
  }
};

const RIVAL_MRR = {
  'b2b-saas': 10_500_000,
  'consumer-social': 8_200_000,
  marketplace: 9_400_000,
  delivery: 8_800_000,
  fintech: 11_200_000,
  'ai-tools': 12_800_000,
  hardware: 7_600_000,
  healthtech: 9_100_000,
  edtech: 6_900_000,
  climate: 8_500_000,
  'gaming-media': 10_100_000
};

const companies = [];
let serial = 0;

for (const [categoryId, block] of Object.entries(BY_CATEGORY)) {
  serial += 1;
  const rivalMrr = RIVAL_MRR[categoryId] ?? 9_000_000;
  companies.push({
    id: `acq-rival-${categoryId}`,
    name: block.rival,
    isRival: true,
    rivalCategory: categoryId,
    segment: 'enterprise',
    baseMrr: rivalMrr,
    basePrice: Math.round(rivalMrr * 12 * 12.5),
    description:
      'Category rival at scale — buying them removes competitive drag and folds their revenue into your P&L.'
  });

  for (const t of block.targets) {
    serial += 1;
    const { baseMrr, arrMultiple } = pickMrr(t.segment, t.slot);
    const id = `acq-${String(serial).padStart(3, '0')}-${slug(t.name).slice(0, 36)}`;
    companies.push(
      mk(id, t.name, t.segment, baseMrr, arrMultiple, t.blurb, categoryId)
    );
  }
}

const names = new Set();
const ids = new Set();
for (const c of companies) {
  if (names.has(c.name)) throw new Error(`Duplicate name: ${c.name}`);
  if (ids.has(c.id)) throw new Error(`Duplicate id: ${c.id}`);
  names.add(c.name);
  ids.add(c.id);
}

if (companies.length !== ACQUISITION_CATALOG_SIZE) {
  throw new Error(`Expected ${ACQUISITION_CATALOG_SIZE} companies, got ${companies.length}`);
}

const ent = companies.filter((c) => c.segment === 'enterprise' && !c.isRival);
const maxEntMrr = Math.max(...ent.map((c) => c.baseMrr));
if (maxEntMrr < 5_000_000) {
  throw new Error(`Enterprise MRR ceiling too low: ${maxEntMrr}`);
}

writeFileSync(
  out,
  `${JSON.stringify({ version: 2, catalogSize: ACQUISITION_CATALOG_SIZE, companies }, null, 2)}\n`
);
console.log(`Wrote ${companies.length} handcrafted acquisition targets to ${out}`);
