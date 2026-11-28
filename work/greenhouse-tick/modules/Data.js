/** Tuning and copy for Neighborhood Greenhouse — tutorial sim. */

export const TUNING = {
  maxWeeks: 12,
  winGrowth: 100,
  startHealth: 72,
  reservoirCap: 100,
  ideal: {
    moisture: { lo: 38, hi: 68 },
    sun: { lo: 45, hi: 78 },
    nutrients: { lo: 28, hi: 62 },
  },
};

export const WEATHER = [
  {
    id: "heatwave",
    label: "Heat wave",
    blurb: "Vents struggle; soil dries faster.",
    moisture: -14,
    sun: 12,
    health: -4,
  },
  {
    id: "overcast",
    label: "Overcast week",
    blurb: "Plants stretch for light; growth slows.",
    sun: -18,
    growthMod: 0.72,
  },
  {
    id: "downpour",
    label: "Heavy rain",
    blurb: "Reservoir fills; mold risk climbs.",
    moisture: 22,
    reservoir: 18,
    mold: 8,
  },
  {
    id: "calm",
    label: "Steady skies",
    blurb: "Boring weather — your decisions matter most.",
  },
];

export const ACTIONS = {
  water: { label: "Irrigate", moisture: 16, reservoir: -12, ap: 1 },
  mist: { label: "Light mist", moisture: 8, mold: 2, ap: 1 },
  shade: { label: "Roll shade cloth", sun: -14, moisture: 4, ap: 1 },
  openRoof: { label: "Open roof vents", sun: 12, moisture: -10, ap: 1 },
  feed: { label: "Add nutrients", nutrients: 18, health: 2, ap: 1 },
  compost: { label: "Compost tea", nutrients: 10, mold: -6, ap: 1 },
  scout: { label: "Scout beds", blurbOnly: true, ap: 1 },
};

export const WEEKLY_AP = 3;