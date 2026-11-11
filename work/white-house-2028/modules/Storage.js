const KEY = 'wh2028_save_v2';

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
      const raw = localStorage.getItem(KEY) ?? localStorage.getItem('wh2028_save_v1');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(KEY);
    localStorage.removeItem('wh2028_save_v1');
  },
  hasSave() {
    return Boolean(localStorage.getItem(KEY) || localStorage.getItem('wh2028_save_v1'));
  }
};
