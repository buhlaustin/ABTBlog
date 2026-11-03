/** Startup categories — expand via data/categories.json in Phase 1. */
export const STARTUP_CATEGORIES = [
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

export function getCategoryById(id) {
  return STARTUP_CATEGORIES.find((c) => c.id === id);
}
