import { assetBaseUrl } from './utils.js';

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

const FALLBACK_CATEGORIES = [
  { id: 'b2b-saas', label: 'B2B SaaS' },
  { id: 'consumer-social', label: 'Consumer social' },
  { id: 'marketplace', label: 'Marketplace / gig economy' },
  { id: 'delivery', label: 'Delivery & logistics' },
  { id: 'fintech', label: 'Fintech' },
  { id: 'ai-tools', label: 'AI tools' },
  { id: 'hardware', label: 'Hardware + software' },
  { id: 'healthtech', label: 'Healthtech' },
  { id: 'climate', label: 'Climate & energy' },
  { id: 'gaming-media', label: 'Gaming & media' }
];

/** @deprecated use loadCategories */
export const STARTUP_CATEGORIES = FALLBACK_CATEGORIES;
