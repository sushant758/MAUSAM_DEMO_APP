// ─── src/lib/cardWeights.js ───────────────────────────────────────────────────
// B1: Feedback learning — per-card weight storage.
//
// updateWeight(cardId, delta) persists a learned weight (clamped 0.5 – 1.5).
// delta = +0.1 for thumbs-up, -0.1 for thumbs-down (callers can choose scale).
// Weights are applied as learnedWeight on the NEXT persona switch or refresh
// so they never cause an in-session re-rank surprise.
//
// The weight map is stored at localStorage key "mausam.cardWeights".
// resetWeights() deletes all weights and restores defaults.
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = 'mausam.cardWeights';
const MIN_W  = 0.5;
const MAX_W  = 1.5;
const DEFAULT_W = 1.0;

/** Load the full weight map from localStorage. Returns {} on miss/error. */
export function loadWeights() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Persist the full weight map to localStorage. */
function saveWeights(map) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

/**
 * Update the stored weight for a card.
 * @param {string} cardId   — the catalog card id
 * @param {number} delta    — positive = boost, negative = suppress
 */
export function updateWeight(cardId, delta) {
  const map = loadWeights();
  const current = map[cardId] ?? DEFAULT_W;
  const next = Math.max(MIN_W, Math.min(MAX_W, current + delta));
  map[cardId] = Math.round(next * 100) / 100; // 2 decimal places
  saveWeights(map);
  return map[cardId];
}

/**
 * Get the stored weight for a card (or 1.0 if not set).
 */
export function getWeight(cardId) {
  return loadWeights()[cardId] ?? DEFAULT_W;
}

/**
 * Reset all weights back to 1.0 (delete the key).
 */
export function resetWeights() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

export { MIN_W, MAX_W, DEFAULT_W };
