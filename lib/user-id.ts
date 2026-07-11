// ============================================================
// Lib: User ID helper — reads from localStorage, falls back to null
// Backend generates `anon_${uuidv4()}` when userId is not provided
// ============================================================

const KEY = 'learniny_user_id';

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY) || null;
}

export function setUserId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, id);
}
