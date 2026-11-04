import { STAGES } from './constants.js';
import { assetBaseUrl } from './utils.js';
import bundledManifest from '../assets/manifest.json' with { type: 'json' };

let manifest = bundledManifest;

export async function loadAssetManifest() {
  try {
    const res = await fetch(`${assetBaseUrl()}assets/manifest.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.assets) && data.assets.length > 0) {
        manifest = data;
      }
    }
  } catch {
    /* keep bundled manifest */
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

const STAGE_BACKDROP = {
  [STAGES.GARAGE]: 'assets/backgrounds/garage-bg.svg',
  [STAGES.OFFICE]: 'assets/backgrounds/office-bg.svg',
  [STAGES.XC]: 'assets/backgrounds/skyline-bg.svg',
  [STAGES.POST_XC]: 'assets/backgrounds/skyline-bg.svg',
  [STAGES.PUBLIC]: 'assets/backgrounds/public-bg.svg'
};

const HUB_BACKDROP = {
  bay: 'assets/backgrounds/hub-bay.svg',
  nyc: 'assets/backgrounds/hub-nyc.svg',
  miami: 'assets/backgrounds/hub-miami.svg',
  dallas: 'assets/backgrounds/hub-dallas.svg',
  atlanta: 'assets/backgrounds/hub-atlanta.svg'
};

/** Wide stage / hub backdrop for the main game shell. */
export function gameBackdropUrl(state) {
  const hubId = state?.offices?.hubId;
  const stage = state?.stage ?? STAGES.GARAGE;
  if (
    hubId &&
    HUB_BACKDROP[hubId] &&
    (stage === STAGES.POST_XC || stage === STAGES.PUBLIC)
  ) {
    return assetUrl(HUB_BACKDROP[hubId]);
  }
  const rel = STAGE_BACKDROP[stage] ?? STAGE_BACKDROP[STAGES.GARAGE];
  return assetUrl(rel);
}

export function applyGameBackdrop(state) {
  const screen = document.getElementById('screen-game');
  if (!screen) return;
  const url = gameBackdropUrl(state);
  screen.style.setProperty('--stage-backdrop', `url("${url}")`);
}
