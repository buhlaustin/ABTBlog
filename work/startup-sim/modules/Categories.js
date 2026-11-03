import { assetBaseUrl } from './utils.js';
import { clamp } from './utils.js';

let categoriesCache = null;

export async function loadCategories() {
  if (categoriesCache) return categoriesCache;
  try {
    const res = await fetch(`${assetBaseUrl()}data/categories.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('categories fetch failed');
    categoriesCache = await res.json();
  } catch {
    categoriesCache = FALLBACK_CATEGORIES;
  }
  return categoriesCache;
}

export function getCategoryById(id, list = categoriesCache) {
  const source = list || FALLBACK_CATEGORIES;
  return source.find((c) => c.id === id);
}

/** Category-driven unit economics for Phase 1 tasks. */
export function categoryEconomics(category) {
  if (!category) {
    return { revenueMult: 1, costMult: 1, label: 'General' };
  }
  const acv = Number(category.defaultACV) || 0;
  let revenueMult = 1;
  if (acv === 0) {
    revenueMult = 0.85;
  } else {
    revenueMult = clamp(acv / 12_000, 0.55, 1.75);
  }
  const cycle = Number(category.salesCycleWeeks) || 8;
  const costMult = clamp(1 + (cycle - 8) * 0.02, 0.9, 1.25);
  return { revenueMult, costMult, label: category.label };
}

const FALLBACK_CATEGORIES = [
  { id: 'b2b-saas', label: 'B2B SaaS', defaultACV: 12000, salesCycleWeeks: 8 },
  { id: 'consumer-social', label: 'Consumer social', defaultACV: 0, salesCycleWeeks: 0 },
  { id: 'marketplace', label: 'Marketplace / gig economy', defaultACV: 2400, salesCycleWeeks: 4 }
];

/** @deprecated use loadCategories */
export const STARTUP_CATEGORIES = FALLBACK_CATEGORIES;
