import { STAGES } from './GameState.js';
import { assetBaseUrl } from './utils.js';

let manifest = null;

export async function loadAssetManifest() {
  if (manifest) return manifest;
  try {
    const res = await fetch(`${assetBaseUrl()}assets/manifest.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest missing');
    manifest = await res.json();
  } catch {
    manifest = { version: 1, assets: [] };
  }
  return manifest;
}

export function assetUrl(relativePath) {
  const clean = String(relativePath || '').replace(/^\//, '');
  return `${assetBaseUrl()}${clean}`;
}

const STAGE_ICON = {
  [STAGES.GARAGE]: 'assets/icons/garage.svg',
  [STAGES.OFFICE]: 'assets/icons/office.svg',
  [STAGES.XC]: 'assets/icons/skyline.svg',
  [STAGES.POST_XC]: 'assets/icons/skyline.svg',
  [STAGES.PUBLIC]: 'assets/icons/public.svg'
};

export function stageIconPath(stage) {
  return STAGE_ICON[stage] ?? STAGE_ICON[STAGES.GARAGE];
}

export function stageIconUrl(stage) {
  return assetUrl(stageIconPath(stage));
}
