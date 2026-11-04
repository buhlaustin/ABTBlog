import { clamp, fetchGameJson } from './utils.js';
import bundledCategories from '../data/categories.json' with { type: 'json' };

let categoriesCache = bundledCategories;

export async function loadCategories() {
  if (!categoriesCache?.length) {
    throw new Error('startup-sim: bundled categories.json is empty');
  }
  try {
    const data = await fetchGameJson('data/categories.json');
    if (Array.isArray(data) && data.length > 0) {
      categoriesCache = data;
    }
  } catch {
    /* keep bundled list */
  }
  return categoriesCache;
}

export function getCategoryById(id, list = categoriesCache) {
  const source = list || bundledCategories;
  return source.find((c) => c.id === id);
}

export function getCategoriesSync() {
  return categoriesCache ?? bundledCategories;
}

/** Category-driven unit economics for tasks. */
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

/** @deprecated use loadCategories */
export const STARTUP_CATEGORIES = bundledCategories;
