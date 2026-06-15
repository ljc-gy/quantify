/**
 * Simple in-memory cache with TTL.
 * Avoids repeated computation or external API calls within the TTL window.
 */
const store = new Map();

export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function setCache(key, data, ttlMs = 30000) {
  store.set(key, { data, expires: Date.now() + ttlMs });
}

export function invalidateCache(pattern) {
  for (const key of store.keys()) {
    if (key.includes(pattern)) store.delete(key);
  }
}
