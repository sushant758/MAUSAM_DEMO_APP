// ─── A2: Card Ranker ─────────────────────────────────────────────────────────
// Takes the card catalog, weather context, and a persona ID.
// Returns a sorted array of computed card objects ready for WhiteCard rendering.
//
// Ordering rules (in priority):
//   1. IMD Safety Gate: ONLY real live data (ctx.isLive=true) + non-mock tag + urgency ≥
//      WARNING_THRESHOLD → card is "warning" and pinned at top. Mock cards NEVER pin.
//   2. Cards below MIN_AFFINITY_THRESHOLD for the active persona are excluded entirely.
//      This keeps each persona's feed relevant and persona-specific.
//   3. Remaining cards are sorted by:
//        score = affinity × (0.5 + 0.5 × urgency) × learnedWeight
//      learnedWeight = 1.0 for all cards (placeholder; A8 will tune via user feedback).
//   4. Cards where compute().visible === false are excluded.
// ─────────────────────────────────────────────────────────────────────────────

import { CARD_CATALOG } from './catalog';
import { buildContextSignals, getCardContextBoost } from './context';

// ── Constants ─────────────────────────────────────────────────────────────────
/** urgency ≥ this AND live data AND non-mock → pinned warning */
const WARNING_THRESHOLD = 0.75;

/**
 * Minimum affinity a card must have for the active persona to be shown at all.
 * Prevents cards that "belong to" other personas from polluting the feed.
 * Cards below this threshold are omitted entirely.
 */
const MIN_AFFINITY_THRESHOLD = 0.35;

/**
 * Multiplier applied to every card's score.
 * Phase A8 will load per-card weights from user-feedback data.
 * Until then, learnedWeight = 1 for all cards.
 */
const LEARNED_WEIGHT = 1.0;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return ranked cards for a given persona and weather context.
 *
 * @param {string}       personaId — one of the PERSONAS[].id values
 * @param {object|null}  ctx       — weather context from weather.js (null = mock/loading)
 * @returns {Array<object>}  computed card objects ready for <WhiteCard card={...} />
 */
export function rankPersonaCards(personaId, ctx) {
  const isLiveData = ctx?.isLive === true;
  // A3: Build context signals once for this call (time + weather)
  const signals = buildContextSignals(ctx, new Date());
  const scored = [];

  for (const cardDef of CARD_CATALOG) {
    // ── 1. Affinity threshold gate ───────────────────────────────────────────
    const affinity = cardDef.affinity?.[personaId] ?? 0;
    if (affinity < MIN_AFFINITY_THRESHOLD) continue;

    // ── 2. Compute live values ───────────────────────────────────────────────
    let computed;
    try {
      computed = ctx ? cardDef.compute(ctx) : cardDef.compute(null);
    } catch (e) {
      console.warn(`[Ranker] compute() failed for card "${cardDef.id}":`, e.message);
      continue;
    }

    // ── 3. Visibility gate ───────────────────────────────────────────────────
    if (!computed.visible) continue;

    // ── 4. IMD Safety Gate ───────────────────────────────────────────────────
    // A card may only be treated as a pinned warning when ALL of:
    //   a) cardDef.canWarn === true  ← explicit per-card opt-in (only 4 cards)
    //   b) urgency >= WARNING_THRESHOLD
    //   c) ctx.isLive === true (real Open-Meteo data, not mock/fallback)
    //   d) The card's tag does NOT start with "Mock data"
    //
    // This means ordinary cards like Rain Probability (98%), UV, Visibility,
    // Wind, Outdoor Comfort Index, etc. CANNOT set isWarning even at 100% urgency.
    // Only: storm_forecast (WMO 95-99), aqi (≥200), heat_index (≥41°C), frost_alert.
    const canWarn    = cardDef.canWarn === true;
    const isMockCard = computed.tag?.toLowerCase().startsWith('mock');
    const urgency    = computed.urgency ?? 0;
    const isWarning  = canWarn && urgency >= WARNING_THRESHOLD && isLiveData && !isMockCard;

    // ── 5. A2 Ranking formula + A3 context boost ─────────────────────────────
    // base: score = affinity × (0.5 + 0.5 × urgency) × learnedWeight
    // final: finalScore = base × contextBoost(cardId, signals)
    //
    // contextBoost is in range [0.5, 1.6]:
    //   > 1.0 → card is more relevant right now (boosted)
    //   < 1.0 → card is less relevant right now (suppressed)
    //   = 1.0 → neutral
    const base  = affinity * (0.5 + 0.5 * urgency) * LEARNED_WEIGHT;
    const boost = getCardContextBoost(cardDef.id, signals);
    const score = base * boost;

    // ── 6. Build full card object (WhiteCard interface) ──────────────────────
    const card = {
      // Identity (from catalog definition)
      id: cardDef.id,
      title: cardDef.title,
      badgeIcon: cardDef.badgeIcon,
      badgeColor: cardDef.badgeColor,
      // Computed live values (from catalog.compute(ctx))
      type:        computed.type        ?? 'check',
      statusText:  computed.statusText  ?? '',
      statusColor: computed.statusColor ?? 'bg-slate-50 text-slate-600 border-slate-200',
      gaugeValue:  computed.gaugeValue  ?? 0,
      subtext:     computed.subtext     ?? '',
      tag:         computed.tag         ?? 'Open-Meteo',
      // Ranking metadata (exposed to WhySheet for A5)
      urgency,
      affinity,
      learnedWeight: LEARNED_WEIGHT,
      base,          // A2 base score (before context boost)
      contextBoost: boost,
      score,         // final score = base × contextBoost
      isWarning,
      // A3/A5 hooks
      _signals: signals,
      _def: cardDef,
    };

    scored.push(card);
  }

  // ── 7. Partition and sort ────────────────────────────────────────────────
  // Pinned warnings first (most urgent first), then regular cards (highest score first)
  const warnings = scored
    .filter((c) => c.isWarning)
    .sort((a, b) => b.urgency - a.urgency);

  const regular = scored
    .filter((c) => !c.isWarning)
    .sort((a, b) => b.score - a.score);

  return [...warnings, ...regular];
}

/**
 * Convenience: check if any card for this persona is a pinned warning.
 * Used by HomeScreen to show the warning banner strip.
 */
export function hasActiveWarning(personaId, ctx) {
  if (!ctx) return false;
  return rankPersonaCards(personaId, ctx).some((c) => c.isWarning);
}

// Exported for WhySheet formula display
export const RANKING_FORMULA = 'score = affinity × (0.5 + 0.5 × urgency) × learnedWeight';
export { WARNING_THRESHOLD, MIN_AFFINITY_THRESHOLD, LEARNED_WEIGHT };
