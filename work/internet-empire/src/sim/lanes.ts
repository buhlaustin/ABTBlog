export interface LaneDef {
  id: string;
  label: string;
  blurb: string;
  visitorMult: number;
  revenueMult: number;
  brandMult: number;
  hostingDiscount: number;
}

export const LANES: LaneDef[] = [
  {
    id: "content",
    label: "Content & media",
    blurb: "Traffic-first; ads and brand compound.",
    visitorMult: 1.12,
    revenueMult: 0.95,
    brandMult: 1.15,
    hostingDiscount: 0,
  },
  {
    id: "commerce",
    label: "Commerce",
    blurb: "Monetize carts and conversions.",
    visitorMult: 1.0,
    revenueMult: 1.18,
    brandMult: 1.0,
    hostingDiscount: 0,
  },
  {
    id: "tools",
    label: "Search & tools",
    blurb: "Utility keeps users coming back.",
    visitorMult: 1.08,
    revenueMult: 1.05,
    brandMult: 1.05,
    hostingDiscount: 0,
  },
  {
    id: "enterprise",
    label: "Enterprise B2B",
    blurb: "Slow deals, fat contracts.",
    visitorMult: 0.85,
    revenueMult: 1.22,
    brandMult: 0.95,
    hostingDiscount: 0,
  },
  {
    id: "hosting",
    label: "Infrastructure & hosting",
    blurb: "You sell uptime; racks are your product.",
    visitorMult: 0.92,
    revenueMult: 1.08,
    brandMult: 0.9,
    hostingDiscount: 0.2,
  },
];

export function laneDef(id: string): LaneDef {
  return LANES.find((l) => l.id === id) ?? LANES[0]!;
}