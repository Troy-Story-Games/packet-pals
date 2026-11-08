import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** localStorage that never throws (private mode, blocked storage, quota errors). */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Progress just won't persist; the app keeps working.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const persistStorage = createJSONStorage(() => safeLocalStorage);
