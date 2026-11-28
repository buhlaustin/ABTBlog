export const SAVE_VERSION = 2;

export type GameMode = "career" | "sandbox";

export type UiEraId =
  | "early"
  | "dotcom"
  | "web2"
  | "mobile"
  | "platform"
  | "enterprise"
  | "ai";

export type MacroMood = "neutral" | "boom" | "bust";

export type TabId =
  | "desk"
  | "products"
  | "marketing"
  | "people"
  | "finance"
  | "rivals"
  | "research"
  | "news";

export interface Calendar {
  year: number;
  month: number; // 1-12
  index: number; // months since Jan 1995
}

export interface Headcount {
  developers: number;
  designers: number;
  sales: number;
  executives: number;
}

export interface Product {
  id: string;
  name: string;
  kind: "website" | "product" | "ai";
  stage: "concept" | "building" | "live" | "sunset";
  quality: number;
  visitorsBoost: number;
  revenueMonthly: number;
  monthsLive: number;
}

export interface PlannedAction {
  id: string;
  actionKey: string;
  label: string;
  cashCost: number;
  apCost: number;
  payload?: Record<string, string>;
}

export interface NewsItem {
  id: string;
  monthIndex: number;
  headline: string;
  body: string;
  tone: "satire" | "historic";
}

export interface Rival {
  id: string;
  name: string;
  lane: string;
  share: number;
  aggression: number;
  valuation: number;
}

export interface ResearchNode {
  id: string;
  label: string;
  era: UiEraId;
  cost: number;
  months: number;
  unlocked: boolean;
  completed: boolean;
  progress: number;
}

export interface AcquisitionTarget {
  id: string;
  name: string;
  price: number;
  visitors: number;
  synergy: number;
}

export interface GameFlags {
  hasWebsite: boolean;
  hasDomain: boolean;
  hasFirstProduct: boolean;
  ipoCompleted: boolean;
  gameOver: boolean;
  won: boolean;
  legacyUrl: boolean;
  ended: boolean;
}

export interface MonetizationState {
  productRevenueMult: number;
  adArpuMult: number;
  /** Contract-style MRR layered on product revenue. */
  enterpriseMrr: number;
}

export interface ActiveCampaign {
  id: string;
  type: string;
  label: string;
  monthsLeft: number;
}

export interface RevenueBreakdown {
  productMrr: number;
  contractMrr: number;
  adEstimate: number;
  totalEstimate: number;
}

export interface GameState {
  version: number;
  mode: GameMode;
  seed: number;
  companyName: string;
  lane: string;
  calendar: Calendar;
  cash: number;
  valuation: number;
  visitors: number;
  brand: number;
  investorConfidence: number;
  techDebt: number;
  infraTier: number;
  computeBurn: number;
  revenue: number;
  expenses: number;
  headcount: Headcount;
  products: Product[];
  plannedActions: PlannedAction[];
  apTotal: number;
  apLeft: number;
  macro: { mood: MacroMood; adCpm: number; fundingMultiplier: number; eventId?: string };
  rivals: Rival[];
  research: ResearchNode[];
  acquisitions: AcquisitionTarget[];
  ownedAcquisitions: string[];
  news: NewsItem[];
  log: string[];
  flags: GameFlags;
  history: {
    monthIndex: number;
    visitors: number;
    cash: number;
    valuation: number;
    revenue: number;
  }[];
  firedEvents: string[];
  sandbox?: { startYear?: number; startingCash?: number; rivalAggression?: number };
  monetization: MonetizationState;
  monthlyDeck: string[];
  deckMonthIndex: number;
  actionUses: Record<string, number>;
  activeCampaigns: ActiveCampaign[];
  aggressionThisMonth: number;
  lastDeckHighlight: string | null;
}

export interface ActionDef {
  key: string;
  label: string | ((s: GameState) => string);
  ap: number;
  cashCost: number | ((s: GameState) => number);
  eraMin: UiEraId;
  requires?: (s: GameState) => string | null;
  effect: string;
}