import tuning from '../data/tuning.json' with { type: 'json' };
import backgrounds from '../data/backgrounds.json' with { type: 'json' };
import announcements from '../data/announcements.json' with { type: 'json' };
import actions from '../data/actions.json' with { type: 'json' };
import events from '../data/events.json' with { type: 'json' };
import states from '../data/states.json' with { type: 'json' };
import policies from '../data/policies.json' with { type: 'json' };
import staffRoles from '../data/staff-roles.json' with { type: 'json' };
import socialTopics from '../data/social-topics.json' with { type: 'json' };
import endorsements from '../data/endorsements.json' with { type: 'json' };
import primarySchedule from '../data/primary-schedule.json' with { type: 'json' };

export const TUNING = tuning;
export const BACKGROUNDS = backgrounds;
export const ANNOUNCEMENTS = announcements;
export const ACTIONS = actions;
export const EVENTS = events;
export const STATES = states;
export const POLICIES = policies;
export const STAFF_ROLES = staffRoles;
export const SOCIAL_TOPICS = socialTopics;
export const ENDORSEMENTS = endorsements;
export const PRIMARY_SCHEDULE = primarySchedule;
export const PARTY_LABELS = { R: 'Republican', D: 'Democrat', I: 'Independent' };
export const PARTY_COLORS = { R: '#c41e3a', D: '#2e5aac', I: '#6b5b95' };
export const REGIONS = ['northeast', 'south', 'midwest', 'west'];

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

export function battlegroundStates(state) {
  return STATES.filter((st) => {
    const sup = state.stateSupport?.[st.id] ?? 45;
    return Math.abs(sup - 50) <= 6 || st.battleground;
  })
    .sort((a, b) => Math.abs((state.stateSupport[a.id] ?? 50) - 50) - Math.abs((state.stateSupport[b.id] ?? 50) - 50))
    .slice(0, 12);
}
