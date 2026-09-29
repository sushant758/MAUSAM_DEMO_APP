// ─── A2: Card Ranker ─────────────────────────────────────────────────────────
// Takes the card catalog, weather context, and a persona ID.
// Returns a sorted array of computed card objects ready for WhiteCard rendering.
//
// Ordering rules (in priority):
//   1. Cards with urgency ≥ WARNING_THRESHOLD are "warnings" → pinned at top
//      (IMD safety gate — these can never be reordered or hidden by the user)
//   2. Remaining cards are sorted by: score = urgency×0.6 + affinity×0.4 (desc)
//   3. Cards with affinity = 0 for this persona are omitted entirely
//   4. Cards where compute().visible === false are omitted
// ─────────────────────────────────────────────────────────────────────────────

import { CARD_CATALOG } from './catalog';

const WARNING_THRESHOLD = 0.75; // urgency ≥ this → treat as warning, pin at top

/**
 * Return ranked cards for a given persona and weather context.
 *
 * @param {string}            personaId  — one of the PERSONAS[].id values
 * @param {object|null}       ctx        — weather context from weather.js (null = mock/loading)
 * @returns {Array<object>}  computed card objects ready for <WhiteCard card={...} />
 */
export function rankPersonaCards(personaId, ctx) {
  const useFallback = !ctx;

  const scored = [];

  for (const cardDef of CARD_CATALOG) {
    // 1. Affinity gate: skip if this persona has zero affinity for the card
    const affinity = cardDef.affinity?.[personaId] ?? 0;
    if (affinity === 0) continue;

    // 2. Compute live values
    let computed;
    try {
      computed = useFallback
        ? cardDef.compute(null)   // will use null-safe defaults
        : cardDef.compute(ctx);
    } catch (e) {
      console.warn(`[Ranker] compute() failed for card "${cardDef.id}":`, e.message);
      continue;
    }

    // 3. Visibility gate
    if (!computed.visible) continue;

    // 4. Build the full card object (WhiteCard interface)
    const card = {
      // Identity (from catalog)
      id: cardDef.id,
      title: cardDef.title,
      badgeIcon: cardDef.badgeIcon,
      badgeColor: cardDef.badgeColor,
      // Computed live values
      type:        computed.type        ?? 'check',
      statusText:  computed.statusText  ?? '',
      statusColor: computed.statusColor ?? 'bg-slate-50 text-slate-600 border-slate-200',
      gaugeValue:  computed.gaugeValue  ?? 0,
      subtext:     computed.subtext     ?? '',
      tag:         computed.tag         ?? 'Open-Meteo',
      // Ranking metadata
      urgency:  computed.urgency ?? 0,
      affinity,
      score: (computed.urgency ?? 0) * 0.6 + affinity * 0.4,
      isWarning: (computed.urgency ?? 0) >= WARNING_THRESHOLD,
      // A5 explainability
      _def: cardDef,
    };

    scored.push(card);
  }

  // 5. Partition: warnings (pinned) vs regular (sorted by score desc)
  const warnings = scored
    .filter((c) => c.isWarning)
    .sort((a, b) => b.urgency - a.urgency);    // most urgent warning first

  const regular = scored
    .filter((c) => !c.isWarning)
    .sort((a, b) => b.score - a.score);        // highest combined score first

  return [...warnings, ...regular];
}

/**
 * Convenience: check if any card for this persona is a warning.
 * Used by HeroCard to show a warning dot.
 */
export function hasActiveWarning(personaId, ctx) {
  if (!ctx) return false;
  return rankPersonaCards(personaId, ctx).some((c) => c.isWarning);
}
