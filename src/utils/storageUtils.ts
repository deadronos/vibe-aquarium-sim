export const readFromStorage = (key: string, fallback: string | null = null): string | null => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? raw : fallback;
  } catch (error) {
    console.warn(`Error reading from localStorage key "${key}":`, error);
    return fallback;
  }
};

export const writeToStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Error writing to localStorage key "${key}":`, error);
  }
};

export const readBoolFromStorage = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch (error) {
    console.warn(`Error reading bool from localStorage key "${key}":`, error);
    return fallback;
  }
};

export const writeBoolToStorage = (key: string, value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false');
  } catch (error) {
    console.warn(`Error writing bool to localStorage key "${key}":`, error);
  }
};
