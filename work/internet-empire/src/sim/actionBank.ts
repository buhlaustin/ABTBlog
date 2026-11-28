import { deriveUiEra } from "./eras";
import { laneDef } from "./lanes";
import { startCampaign } from "./campaigns";
import { initialProductMrr } from "./monetization";
import { monthRng } from "./rng";
import type { GameState, UiEraId } from "./types";

const ERA_ORDER: UiEraId[] = ["early", "dotcom", "web2", "mobile", "platform", "ai", "enterprise"];

function eraRank(id: string): number {
  const i = ERA_ORDER.indexOf(id as UiEraId);
  return i >= 0 ? i : 0;
}

function eraMeets(state: GameState, min: UiEraId): boolean {
  return eraRank(deriveUiEra(state)) >= eraRank(min);
}

export interface BankAction {
  key: string;
  label: string;
  effect: string;
  ap: number;
  cashCost: number | ((s: GameState) => number);
  eraMin: UiEraId;
  lanes?: string[];
  weight: number;
  maxPerRun?: number;
  requires?: (s: GameState) => string | null;
  apply: (s: GameState) => void;
}

const PRODUCT_SUFFIX = [
  "Pro",
  "Suite",
  "Cloud",
  "Plus",
  "Workspace",
  "Platform",
  "Hub",
  "Labs",
  "Network",
  "OS",
];

const AGGRESSIVE_ACTIONS = new Set([
  "price_increase",
  "viral_stunt",
  "land_grab_tlds",
  "superbowl_trailer",
  "poach_talent",
  "undercut_rival",
]);

export function pickProductNameFromBank(state: GameState): string {
  const rng = monthRng(state, 517);
  const suffix = PRODUCT_SUFFIX[rng.int(0, PRODUCT_SUFFIX.length - 1)]!;
  return `${state.companyName} ${suffix}`;
}

export const ACTION_BANK: BankAction[] = [
  {
    key: "price_increase",
    label: "Raise prices 8%",
    effect: "+product revenue (compounding).",
    ap: 1,
    cashCost: 0,
    eraMin: "dotcom",
    weight: 12,
    maxPerRun: 6,
    requires: (s) =>
      !s.products.some((p) => p.kind !== "website" && p.stage === "live") ? "Need a live product." : null,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.08;
      s.brand -= 2;
      s.log.push("Raised prices — finance smiled, forums frowned.");
    },
  },
  {
    key: "enterprise_pilot",
    label: "Land enterprise pilot",
    effect: "+$8k–25k MRR stack (lane-scaled).",
    ap: 2,
    cashCost: 1200,
    eraMin: "web2",
    lanes: ["enterprise", "tools"],
    weight: 14,
    requires: (s) => (s.headcount.sales < 1 ? "Hire sales first." : null),
    apply: (s) => {
      const bump = laneDef(s.lane).revenueMult * (8000 + s.brand * 120);
      s.monetization.enterpriseMrr += Math.round(bump);
      s.investorConfidence += 4;
      s.log.push("Signed a logo-heavy pilot — procurement promises speed.");
    },
  },
  {
    key: "ad_network_deal",
    label: "Ad network rev-share deal",
    effect: "Boost ad ARPU for 12+ months.",
    ap: 1,
    cashCost: 400,
    eraMin: "early",
    lanes: ["content"],
    weight: 11,
    apply: (s) => {
      s.monetization.adArpuMult *= 1.22;
      s.visitors += 90;
      s.log.push("Ad network took 30% but CPM finally moved.");
    },
  },
  {
    key: "affiliate_blitz",
    label: "Affiliate blitz",
    effect: "Traffic now, revenue cut to partners.",
    ap: 1,
    cashCost: 700,
    eraMin: "dotcom",
    lanes: ["commerce", "content"],
    weight: 10,
    apply: (s) => {
      s.visitors += 320;
      s.monetization.productRevenueMult *= 1.05;
      s.cash -= 150;
      s.log.push("Affiliates spammed Reddit — visitors came anyway.");
    },
  },
  {
    key: "viral_stunt",
    label: "Viral marketing stunt",
    effect: "Spiky visitors + brand swing.",
    ap: 1,
    cashCost: 1500,
    eraMin: "web2",
    weight: 9,
    apply: (s) => {
      const rng = monthRng(s, 88);
      const hit = rng.chance(0.45);
      if (hit) {
        s.visitors += rng.int(400, 1200);
        s.brand += 8;
        s.log.push("Stunt worked — trended for 48 hours.");
      } else {
        s.brand -= 5;
        s.log.push("Stunt flopped — at least it was memorable.");
      }
    },
  },
  {
    key: "open_api",
    label: "Launch developer API",
    effect: "Platform products + traffic.",
    ap: 2,
    cashCost: 3500,
    eraMin: "platform",
    weight: 11,
    requires: (s) => (s.headcount.developers < 2 ? "Need 2+ developers." : null),
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.12;
      s.visitors += 250;
      s.techDebt += 6;
      s.log.push("API keys issued — developers arrived with opinions.");
    },
  },
  {
    key: "freemium_split",
    label: "Freemium conversion push",
    effect: "Monetize free users harder.",
    ap: 1,
    cashCost: 600,
    eraMin: "mobile",
    weight: 10,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.15;
      s.brand -= 3;
      s.visitors = Math.round(s.visitors * 0.97);
      s.log.push("Paywall nudges shipped — churn reports pending.");
    },
  },
  {
    key: "customer_success",
    label: "Customer success squad",
    effect: "Retain revenue on live products.",
    ap: 1,
    cashCost: 2800,
    eraMin: "web2",
    weight: 8,
    apply: (s) => {
      for (const p of s.products) {
        if (p.stage === "live" && p.kind !== "website") {
          p.revenueMonthly = Math.round(p.revenueMonthly * 1.1);
        }
      }
      s.log.push("CS team sent thank-you emails — expansion calls booked.");
    },
  },
  {
    key: "data_insights_sku",
    label: "Ship analytics add-on",
    effect: "New high-margin SKU.",
    ap: 2,
    cashCost: 4500,
    eraMin: "platform",
    weight: 9,
    apply: (s) => {
      const name = `${s.companyName} Insights`;
      s.products.push({
        id: `insight-${s.calendar.index}`,
        name,
        kind: "product",
        stage: "live",
        quality: 62,
        visitorsBoost: 80,
        revenueMonthly: initialProductMrr(s, 62, "premium"),
        monthsLive: 0,
      });
      s.log.push(`Launched ${name} — dashboards monetized.`);
    },
  },
  {
    key: "gov_contract",
    label: "Pursue government RFP",
    effect: "Chunky contract MRR.",
    ap: 3,
    cashCost: 6000,
    eraMin: "enterprise",
    lanes: ["enterprise", "hosting"],
    weight: 7,
    apply: (s) => {
      s.monetization.enterpriseMrr += 18_000;
      s.cash -= 2000;
      s.log.push("Won a boring contract — revenue is patriotic.");
    },
  },
  {
    key: "influencer_drop",
    label: "Influencer drop campaign",
    effect: "Visitors + brand (mobile era).",
    ap: 1,
    cashCost: 2200,
    eraMin: "mobile",
    weight: 10,
    apply: (s) => {
      s.visitors += 500;
      s.brand += 6;
      s.monetization.adArpuMult *= 1.06;
      s.log.push("Creator posted the sponsored hashtag — traffic followed.");
    },
  },
  {
    key: "marketplace_fee",
    label: "Turn on marketplace take rate",
    effect: "Commerce lane juice.",
    ap: 2,
    cashCost: 1800,
    eraMin: "web2",
    lanes: ["commerce"],
    weight: 12,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.2;
      s.investorConfidence += 3;
      s.log.push("12% platform fee enabled — sellers noticed.");
    },
  },
  {
    key: "sla_tier",
    label: "Sell premium SLA tier",
    effect: "Hosting lane MRR.",
    ap: 1,
    cashCost: 900,
    eraMin: "dotcom",
    lanes: ["hosting", "enterprise"],
    weight: 11,
    apply: (s) => {
      s.monetization.enterpriseMrr += Math.round(6000 * laneDef(s.lane).revenueMult);
      s.brand += 4;
      s.log.push("Five-nines tier listed — enterprises opened wallets.");
    },
  },
  {
    key: "newsletter_paywall",
    label: "Paywall the newsletter",
    effect: "Content lane subscriber MRR.",
    ap: 1,
    cashCost: 300,
    eraMin: "web2",
    lanes: ["content"],
    weight: 10,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.1;
      s.monetization.adArpuMult *= 0.95;
      s.brand += 5;
      s.log.push("Substack energy achieved — ARPU climbed.");
    },
  },
  {
    key: "churn_firefight",
    label: "Churn firefight",
    effect: "Recover product MRR.",
    ap: 1,
    cashCost: 1100,
    eraMin: "platform",
    weight: 8,
    requires: (s) => (s.techDebt < 8 ? null : "Tech debt too high for quick fix."),
    apply: (s) => {
      for (const p of s.products) {
        if (p.stage === "live") p.revenueMonthly = Math.round(p.revenueMonthly * 1.08);
      }
      s.techDebt = Math.max(0, s.techDebt - 8);
      s.log.push("Retention offers sent — churn curve flattened.");
    },
  },
  {
    key: "ai_upsell",
    label: "AI feature upsell",
    effect: "Attach AI to live products.",
    ap: 2,
    cashCost: 5000,
    eraMin: "ai",
    weight: 14,
    requires: (s) =>
      !s.products.some((p) => p.stage === "live" && p.kind === "product") ? "Need a live product." : null,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.18;
      s.computeBurn += 800;
      s.investorConfidence += 5;
      s.log.push("Copilot buttons everywhere — ARPU jumped overnight.");
    },
  },
  {
    key: "conference_sponsorship",
    label: "Sponsor major conference",
    effect: "Brand + enterprise pipeline.",
    ap: 1,
    cashCost: 4500,
    eraMin: "dotcom",
    weight: 7,
    apply: (s) => {
      s.brand += 12;
      s.monetization.enterpriseMrr += 4000;
      s.visitors += 150;
      s.log.push("Logo on every lanyard — leads scanned, revenue lagged.");
    },
  },
  {
    key: "white_label_deal",
    label: "White-label partnership",
    effect: "B2B revenue multiplier.",
    ap: 2,
    cashCost: 3200,
    eraMin: "web2",
    lanes: ["tools", "enterprise"],
    weight: 9,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.14;
      s.monetization.enterpriseMrr += 7000;
      s.log.push("Partner shipped your product under their brand.");
    },
  },
  {
    key: "international_expansion",
    label: "Open EU data center",
    effect: "Visitors + hosting cost.",
    ap: 2,
    cashCost: 12_000,
    eraMin: "platform",
    weight: 8,
    apply: (s) => {
      s.visitors = Math.round(s.visitors * 1.15);
      s.infraTier += 1;
      s.monetization.productRevenueMult *= 1.07;
      s.log.push("GDPR checkbox acquired — international traffic arrived.");
    },
  },
  {
    key: "hire_executive",
    label: "Recruit seasoned executive",
    effect: "Sales multiplier + payroll.",
    ap: 2,
    cashCost: 8000,
    eraMin: "dotcom",
    weight: 6,
    maxPerRun: 3,
    apply: (s) => {
      s.headcount.executives += 1;
      s.investorConfidence += 8;
      s.monetization.productRevenueMult *= 1.1;
      s.log.push("Executive hired — deck quality improved immediately.");
    },
  },
  {
    key: "bundle_suite",
    label: "Bundle products into suite",
    effect: "Combine live SKUs.",
    ap: 2,
    cashCost: 2000,
    eraMin: "web2",
    weight: 8,
    requires: (s) =>
      s.products.filter((p) => p.stage === "live" && p.kind === "product").length < 2
        ? "Need 2+ live products."
        : null,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.25;
      s.brand += 6;
      s.log.push("Suite pricing page live — customers confused but paid more.");
    },
  },
  {
    key: "launch_spinoff",
    label: "Incubate spin-off product",
    effect: "Second product line from bank.",
    ap: 2,
    cashCost: 2500,
    eraMin: "dotcom",
    weight: 11,
    apply: (s) => {
      const name = pickProductNameFromBank(s);
      s.products.push({
        id: `spin-${s.calendar.index}`,
        name,
        kind: "product",
        stage: "building",
        quality: 28,
        visitorsBoost: 0,
        revenueMonthly: 0,
        monthsLive: 0,
      });
      s.log.push(`Spin-off ${name} entered build.`);
    },
  },
  {
    key: "seo_content_farm",
    label: "SEO content sprint",
    effect: "Long-tail traffic.",
    ap: 1,
    cashCost: 800,
    eraMin: "early",
    weight: 10,
    apply: (s) => {
      s.brand += 6;
      s.visitors += 180;
      s.monetization.adArpuMult *= 1.05;
      s.log.push("500 landing pages shipped — Google eventually noticed.");
    },
  },
  {
    key: "paid_search_blitz",
    label: "Paid search blitz",
    effect: "Conversion-focused ads.",
    ap: 1,
    cashCost: 1800,
    eraMin: "dotcom",
    weight: 9,
    apply: (s) => {
      s.visitors += 260;
      s.monetization.productRevenueMult *= 1.04;
      s.log.push("Keyword auctions entered — CPCs hurt but converted.");
    },
  },
  {
    key: "subscription_annual",
    label: "Push annual billing",
    effect: "Cash now, happier LTV.",
    ap: 1,
    cashCost: 0,
    eraMin: "mobile",
    weight: 10,
    apply: (s) => {
      const lift = Math.round(s.revenue * 0.15 + 5000);
      s.cash += lift;
      s.monetization.productRevenueMult *= 1.06;
      s.log.push(`Annual plan promo — collected $${lift.toLocaleString()} upfront.`);
    },
  },
  {
    key: "start_series_b",
    label: "Start Series B roadshow",
    effect: "3-month campaign → funding.",
    ap: 2,
    cashCost: 2000,
    eraMin: "web2",
    weight: 7,
    requires: (s) =>
      s.activeCampaigns.some((c) => c.type === "series_b_roadshow") ? "Roadshow already running." : null,
    apply: (s) => {
      startCampaign(s, "series_b_roadshow");
    },
  },
  {
    key: "start_pmf_sprint",
    label: "Start PMF sprint",
    effect: "2-month build + monetization boost.",
    ap: 2,
    cashCost: 1500,
    eraMin: "dotcom",
    weight: 9,
    requires: (s) =>
      s.activeCampaigns.some((c) => c.type === "pmf_push") ? "PMF sprint already running." : null,
    apply: (s) => {
      startCampaign(s, "pmf_push");
    },
  },
  {
    key: "start_hypergrowth",
    label: "Hypergrowth hiring wave",
    effect: "2-month hiring + revenue tailwind.",
    ap: 2,
    cashCost: 6000,
    eraMin: "dotcom",
    weight: 8,
    apply: (s) => {
      startCampaign(s, "hypergrowth_hire");
    },
  },
  {
    key: "start_soc2",
    label: "Begin SOC 2 certification",
    effect: "4-month compliance → enterprise MRR.",
    ap: 2,
    cashCost: 8000,
    eraMin: "platform",
    weight: 7,
    lanes: ["enterprise", "hosting", "tools"],
    apply: (s) => {
      startCampaign(s, "soc2_certification");
    },
  },
  {
    key: "start_category_blitz",
    label: "Category marketing blitz",
    effect: "2-month brand + ad ARPU spike.",
    ap: 2,
    cashCost: 5500,
    eraMin: "web2",
    weight: 8,
    apply: (s) => {
      startCampaign(s, "category_blitz");
    },
  },
  {
    key: "retargeting_pixel",
    label: "Retargeting pixel rollout",
    effect: "Ad efficiency + product conv.",
    ap: 1,
    cashCost: 900,
    eraMin: "web2",
    weight: 10,
    apply: (s) => {
      s.monetization.adArpuMult *= 1.09;
      s.monetization.productRevenueMult *= 1.03;
      s.visitors += 100;
      s.log.push("Pixel chased users across the web — creepy, effective.");
    },
  },
  {
    key: "reseller_channel",
    label: "Stand up reseller channel",
    effect: "Enterprise MRR channel.",
    ap: 2,
    cashCost: 4200,
    eraMin: "web2",
    lanes: ["enterprise", "tools"],
    weight: 9,
    apply: (s) => {
      s.monetization.enterpriseMrr += 9000;
      s.headcount.sales += 1;
      s.log.push("Resellers added margin — your logo, their rolodex.");
    },
  },
  {
    key: "land_grab_tlds",
    label: "Land-grab related domains",
    effect: "Brand + defensive traffic.",
    ap: 1,
    cashCost: 2400,
    eraMin: "dotcom",
    weight: 8,
    apply: (s) => {
      s.brand += 9;
      s.visitors += 220;
      s.cash -= 200;
      s.log.push("Bought every typo of your .com — typosquatters cried.");
    },
  },
  {
    key: "superbowl_trailer",
    label: "Super Bowl spot (local market)",
    effect: "Mass awareness spike.",
    ap: 2,
    cashCost: 25_000,
    eraMin: "mobile",
    weight: 5,
    maxPerRun: 1,
    apply: (s) => {
      s.visitors += 2500;
      s.brand += 18;
      s.monetization.adArpuMult *= 1.08;
      s.log.push("Regional Super Bowl ad aired — water cooler discussed.");
    },
  },
  {
    key: "poach_talent",
    label: "Poach rival engineering lead",
    effect: "Dev velocity + rival pressure.",
    ap: 2,
    cashCost: 15_000,
    eraMin: "platform",
    weight: 6,
    apply: (s) => {
      s.headcount.developers += 1;
      s.techDebt = Math.max(0, s.techDebt - 6);
      s.brand += 6;
      s.log.push("Poached a rival principal — NDAs were tweeted.");
    },
  },
  {
    key: "undercut_rival",
    label: "Undercut rival pricing",
    effect: "Share grab, margin hit.",
    ap: 1,
    cashCost: 500,
    eraMin: "dotcom",
    weight: 9,
    apply: (s) => {
      s.monetization.productRevenueMult *= 0.94;
      s.visitors += 400;
      s.brand += 4;
      s.log.push("Price war declared — users cheered, CFO sweated.");
    },
  },
  {
    key: "tiktok_channel",
    label: "TikTok growth channel",
    effect: "Gen-Z traffic funnel.",
    ap: 1,
    cashCost: 1200,
    eraMin: "mobile",
    weight: 11,
    apply: (s) => {
      s.visitors += 650;
      s.brand += 7;
      s.monetization.adArpuMult *= 1.04;
      s.log.push("Short-form funnel live — algorithm chose violence.");
    },
  },
  {
    key: "security_audit",
    label: "Security red-team audit",
    effect: "Reduce tech debt + brand trust.",
    ap: 1,
    cashCost: 3500,
    eraMin: "platform",
    weight: 8,
    apply: (s) => {
      s.techDebt = Math.max(0, s.techDebt - 12);
      s.brand += 5;
      s.investorConfidence += 4;
      s.log.push("Red team found issues — you fixed the loud ones.");
    },
  },
  {
    key: "patent_defense",
    label: "File defensive patents",
    effect: "Investor confidence + lawsuit armor.",
    ap: 2,
    cashCost: 7000,
    eraMin: "web2",
    weight: 6,
    apply: (s) => {
      s.investorConfidence += 8;
      s.cash -= 1200;
      s.log.push("Patent stack filed — attorneys high-fived.");
    },
  },
  {
    key: "usage_based_pricing",
    label: "Switch to usage-based pricing",
    effect: "Spiky enterprise revenue.",
    ap: 2,
    cashCost: 1000,
    eraMin: "platform",
    weight: 10,
    requires: (s) =>
      !s.products.some((p) => p.stage === "live" && p.kind !== "website")
        ? "Need live paid product."
        : null,
    apply: (s) => {
      s.monetization.productRevenueMult *= 1.16;
      s.monetization.enterpriseMrr += 5000;
      s.brand -= 2;
      s.log.push("Meters everywhere — finance loves the upside.");
    },
  },
  {
    key: "cloud_repatriate",
    label: "Repatriate workloads in-house",
    effect: "Lower hosting, higher capex.",
    ap: 2,
    cashCost: 18_000,
    eraMin: "ai",
    lanes: ["hosting", "enterprise"],
    weight: 7,
    apply: (s) => {
      s.infraTier += 1;
      s.monetization.productRevenueMult *= 1.05;
      s.computeBurn = Math.max(0, s.computeBurn - 600);
      s.log.push("Racks purchased — cloud bill blinked.");
    },
  },
];

export function bankActionByKey(key: string): BankAction | undefined {
  return ACTION_BANK.find((a) => a.key === key);
}

export function bankCashCost(state: GameState, a: BankAction): number {
  return typeof a.cashCost === "function" ? a.cashCost(state) : a.cashCost;
}

function uses(state: GameState, key: string): number {
  return state.actionUses[key] ?? 0;
}

export function bankActionEligible(state: GameState, a: BankAction): boolean {
  if (!eraMeets(state, a.eraMin)) return false;
  if (a.lanes && !a.lanes.includes(state.lane)) return false;
  if (a.maxPerRun != null && uses(state, a.key) >= a.maxPerRun) return false;
  if (a.requires) {
    const r = a.requires(state);
    if (r) return false;
  }
  return true;
}

export function applyBankAction(state: GameState, key: string): void {
  const a = bankActionByKey(key);
  if (!a) return;
  a.apply(state);
  state.actionUses[key] = (state.actionUses[key] ?? 0) + 1;
  state.lastDeckHighlight = a.label;
  if (AGGRESSIVE_ACTIONS.has(key)) state.aggressionThisMonth += 1;
}