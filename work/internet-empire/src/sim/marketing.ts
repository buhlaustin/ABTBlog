import type { UiEraId } from "./types";

export interface MarketingChannel {
  id: string;
  label: string;
  fromEra: UiEraId;
  blurb: string;
}

export const MARKETING_CHANNELS: MarketingChannel[] = [
  { id: "directories", label: "Web directories", fromEra: "early", blurb: "Yahoo-era listings — use SEO action." },
  { id: "banners", label: "Banner ads", fromEra: "early", blurb: "468×60 glory — use Invest in advertising." },
  { id: "portals", label: "Portal deals", fromEra: "early", blurb: "Homepage slots — Portal partnership action." },
  { id: "paid-search", label: "Paid search", fromEra: "dotcom", blurb: "Keyword auctions unlock ~2000." },
  { id: "social", label: "Social virality", fromEra: "web2", blurb: "Feeds and shares — brand matters." },
  { id: "mobile-ads", label: "In-app ads", fromEra: "mobile", blurb: "Ship mobile app to catch installs." },
  { id: "programmatic", label: "Programmatic", fromEra: "platform", blurb: "RTB stacks — CPM follows macro mood." },
  { id: "ai-copilot", label: "Copilot upsell", fromEra: "ai", blurb: "AI product + compute bill." },
];

const ERA_RANK: Record<string, number> = {
  early: 0,
  dotcom: 1,
  web2: 2,
  mobile: 3,
  platform: 4,
  ai: 5,
  enterprise: 6,
};

export function channelsForEra(eraId: UiEraId | string): MarketingChannel[] {
  const rank = ERA_RANK[eraId] ?? 0;
  return MARKETING_CHANNELS.filter((c) => (ERA_RANK[c.fromEra] ?? 0) <= rank);
}