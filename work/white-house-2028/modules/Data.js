import tuning from '../data/tuning.json' with { type: 'json' };
import backgrounds from '../data/backgrounds.json' with { type: 'json' };
import announcements from '../data/announcements.json' with { type: 'json' };
import actions from '../data/actions.json' with { type: 'json' };
import events from '../data/events.json' with { type: 'json' };
import states from '../data/states.json' with { type: 'json' };

export const TUNING = tuning;
export const BACKGROUNDS = backgrounds;
export const ANNOUNCEMENTS = announcements;
export const ACTIONS = actions;
export const EVENTS = events;
export const STATES = states;
export const PARTY_LABELS = { R: 'Republican', D: 'Democrat', I: 'Independent' };
export const PARTY_COLORS = { R: '#c41e3a', D: '#2e5aac', I: '#6b5b95' };

export function getState(id) {
  return STATES.find((s) => s.id === id);
}

export function totalEv() {
  return STATES.reduce((sum, s) => sum + s.ev, 0);
}

export function statesByTimezoneOrder() {
  const order = ['eastern', 'central', 'mountain', 'pacific'];
  return [...STATES].sort((a, b) => order.indexOf(a.timezone) - order.indexOf(b.timezone) || b.ev - a.ev);
}
