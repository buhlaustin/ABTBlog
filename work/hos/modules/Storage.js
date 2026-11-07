import {
  defaultProfile,
  evaluateNewAchievements,
  mergeRunIntoProfile
} from './runStats.js';

const SAVE_KEY = 'house_of_strategy_save';
const PROFILE_KEY = 'house_of_strategy_profile';

/**
 * Persist and restore game state via localStorage.
 */
export class StorageManager {
  static hasSave() {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  static save(gameState) {
    try {
      const data = JSON.stringify(gameState.toJSON());
      localStorage.setItem(SAVE_KEY, data);
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  }

  static loadRaw() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Load failed:', e);
      return null;
    }
  }

  static clear() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // ignore
    }
  }

  static loadProfile() {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return { ...defaultProfile(), ...data, achievements: { ...data.achievements } };
    } catch (e) {
      console.error('Profile load failed:', e);
      return null;
    }
  }

  static saveProfile(profile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.error('Profile save failed:', e);
      return false;
    }
  }

  /** Merge finished run into career profile. */
  static recordRun(run) {
    const profile = StorageManager.loadProfile() || defaultProfile();
    const newAchievements = evaluateNewAchievements(run, profile);
    const next = mergeRunIntoProfile(profile, run, newAchievements);
    StorageManager.saveProfile(next);
    return { profile: next, newAchievements };
  }

  static clearProfile() {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      // ignore
    }
  }
}

export { SAVE_KEY, PROFILE_KEY };
