import { STAGES } from './constants.js';
import { assetBaseUrl, fetchGameJson } from './utils.js';
import bundledManifest from '../assets/manifest.json' with { type: 'json' };

let manifest = bundledManifest;

export async function loadAssetManifest() {
  try {
    const data = await fetchGameJson('assets/manifest.json');
    if (Array.isArray(data?.assets) && data.assets.length > 0) {
      manifest = data;
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
  [STAGES.GARAGE]: 'assets/icons/garage.jpg',
  [STAGES.OFFICE]: 'assets/icons/office.jpg',
  [STAGES.XC]: 'assets/icons/skyline.jpg',
  [STAGES.POST_XC]: 'assets/icons/skyline.jpg',
  [STAGES.PUBLIC]: 'assets/icons/public.jpg'
};

export function stageIconPath(stage) {
  return STAGE_ICON[stage] ?? STAGE_ICON[STAGES.GARAGE];
}

export function stageIconUrl(stage) {
  return assetUrl(stageIconPath(stage));
}

const STAGE_BACKDROP = {
  [STAGES.GARAGE]: 'assets/backgrounds/garage-bg.jpg',
  [STAGES.OFFICE]: 'assets/backgrounds/office-bg.jpg',
  [STAGES.XC]: 'assets/backgrounds/skyline-bg.jpg',
  [STAGES.POST_XC]: 'assets/backgrounds/skyline-bg.jpg',
  [STAGES.PUBLIC]: 'assets/backgrounds/public-bg.jpg'
};

const HUB_BACKDROP = {
  bay: 'assets/backgrounds/hub-bay.jpg',
  nyc: 'assets/backgrounds/hub-nyc.jpg',
  miami: 'assets/backgrounds/hub-miami.jpg',
  dallas: 'assets/backgrounds/hub-dallas.jpg',
  atlanta: 'assets/backgrounds/hub-atlanta.jpg',
  nashville: 'assets/backgrounds/hub-nashville.jpg'
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
