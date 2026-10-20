/**
 * Browser identity helper.
 * Generates a unique ID per browser/device and persists it in localStorage.
 * Used to determine room ownership (creator vs viewer) without auth.
 */

const STORAGE_KEY = "coup_champs_browser_id";

export const getBrowserId = (): string => {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const newId = `browser_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch {
    // Fallback for incognito / storage issues
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
};
