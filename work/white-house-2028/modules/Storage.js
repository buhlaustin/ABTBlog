const KEY = 'wh2028_save_v1';

export const Storage = {
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  },
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(KEY);
  },
  hasSave() {
    return Boolean(localStorage.getItem(KEY));
  }
};
