const KEY = 'eer_save_v1';

export const StorageManager = {
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state.toJSON()));
      return true;
    } catch {
      return false;
    }
  },
  loadRaw() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(KEY);
  }
};
