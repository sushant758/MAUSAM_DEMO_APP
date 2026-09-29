// ─── Pure weather formula functions ──────────────────────────────────────────
// All functions are side-effect-free and unit-testable.
// Formulas shown here are also displayed in the "Why this card?" sheet (A5).
// ─────────────────────────────────────────────────────────────────────────────

/** Clamp x to [a, b] */
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

/**
 * Heat Index (°C) — Rothfusz regression.
 * Below 26.7°C (80°F) apparent temp returns air temp directly.
 * Formula: NWS / Rothfusz (1990).
 */
export const heatIndexC = (tC, rh) => {
  const t = tC * 9 / 5 + 32;          // convert to °F for Rothfusz
  if (t < 80) return tC;              // below threshold, return air temp
  const hi =
    -42.379
    + 2.04901523 * t
    + 10.14333127 * rh
    - 0.22475541 * t * rh
    - 0.00683783 * t * t
    - 0.05481717 * rh * rh
    + 0.00122874 * t * t * rh
    + 0.00085282 * t * rh * rh
    - 0.00000199 * t * t * rh * rh;
  return (hi - 32) * 5 / 9;           // back to °C
};

/**
 * Heat index category (NWS thresholds in °C).
 * Returns: 'extreme_danger' | 'danger' | 'extreme_caution' | 'caution' | 'comfortable'
 */
export const heatCategory = (hi) =>
  hi >= 54 ? 'extreme_danger'
  : hi >= 41 ? 'danger'
  : hi >= 32 ? 'extreme_caution'
  : hi >= 27 ? 'caution'
  : 'comfortable';

/** Human-readable heat category label */
export const heatCategoryLabel = (hi) => ({
  extreme_danger: 'Extreme Danger',
  danger: 'Danger',
  extreme_caution: 'Extreme Caution',
  caution: 'Caution',
  comfortable: 'Comfortable',
}[heatCategory(hi)] ?? 'Comfortable');

/**
 * UV Index category — WHO scale.
 * Returns: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme'
 */
export const uvCategory = (u) =>
  u >= 11 ? 'extreme'
  : u >= 8 ? 'very_high'
  : u >= 6 ? 'high'
  : u >= 3 ? 'moderate'
  : 'low';

/** Human-readable UV category label */
export const uvCategoryLabel = (u) => ({
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  very_high: 'Very High',
  extreme: 'Extreme',
}[uvCategory(u)] ?? 'Low');

/** Generic UV protection tip based on category */
export const uvProtectionTip = (u) => {
  const cat = uvCategory(u);
  if (cat === 'low') return 'No protection required.';
  if (cat === 'moderate') return 'Wear SPF 30+. Seek shade during midday hours.';
  if (cat === 'high') return 'Wear SPF 30+, hat, and sunglasses. Reduce midday sun exposure.';
  if (cat === 'very_high') return 'Wear SPF 50+, protective clothing, and stay in shade 11 AM–3 PM.';
  return 'Avoid sun exposure. SPF 50+ and full-coverage clothing essential.';
};

/**
 * US AQI category (EPA scale).
 * Returns: 'good' | 'moderate' | 'unhealthy_sensitive' | 'unhealthy' | 'very_unhealthy' | 'hazardous'
 */
export const aqiCategoryUS = (a) =>
  a > 300 ? 'hazardous'
  : a > 200 ? 'very_unhealthy'
  : a > 150 ? 'unhealthy'
  : a > 100 ? 'unhealthy_sensitive'
  : a > 50 ? 'moderate'
  : 'good';

/** Human-readable AQI category label */
export const aqiCategoryLabel = (a) => ({
  good: 'Good',
  moderate: 'Moderate',
  unhealthy_sensitive: 'Unhealthy for Sensitive',
  unhealthy: 'Unhealthy',
  very_unhealthy: 'Very Unhealthy',
  hazardous: 'Hazardous',
}[aqiCategoryUS(a)] ?? 'Good');

/** Color class for AQI status */
export const aqiStatusColor = (a) => {
  const cat = aqiCategoryUS(a);
  if (cat === 'good') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (cat === 'moderate') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (cat === 'unhealthy_sensitive') return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

/**
 * Outdoor Comfort Index — 0 to 100 (higher = more comfortable).
 * Weights: heat 35%, air quality 30%, UV 15%, rain probability 20%.
 * Formula visible in "Why this card?" sheet.
 * @param {{ hi: number, aqi: number, uv: number, rainProb: number }} params
 */
export const outdoorComfort = ({ hi, aqi, uv, rainProb }) => {
  const pen =
    0.35 * clamp((hi - 24) / 17, 0, 1)    // heat penalty (24°C–41°C range)
  + 0.30 * clamp(aqi / 200, 0, 1)          // AQI penalty (0–200)
  + 0.15 * clamp(uv / 11, 0, 1)            // UV penalty (0–11)
  + 0.20 * clamp(rainProb / 100, 0, 1);    // rain penalty (0–100%)
  return Math.round(100 * (1 - pen));
};

/**
 * Best time window — slides a `lenH`-hour window over hourly rows,
 * picks the window with the lowest average outdoor-comfort penalty.
 * @param {Array<{hour:number, hi:number, aqi:number, uv:number, rainProb:number}>} hours
 * @param {{ lenH?: number, fromH?: number, toH?: number }} opts
 * @returns {{ startHour: number, endHour: number, penalty: number, comfortPct: number } | null}
 */
export const bestWindow = (hours, { lenH = 2, fromH = 5, toH = 21 } = {}) => {
  const pen = (h) =>
    0.35 * clamp((h.hi - 24) / 17, 0, 1)
  + 0.30 * clamp(h.aqi / 200, 0, 1)
  + 0.15 * clamp(h.uv / 11, 0, 1)
  + 0.20 * clamp(h.rainProb / 100, 0, 1);

  const rows = hours.filter((h) => h.hour >= fromH && h.hour <= toH);
  let best = null;
  for (let i = 0; i + lenH <= rows.length; i++) {
    const slice = rows.slice(i, i + lenH);
    const avgPen = slice.reduce((s, h) => s + pen(h), 0) / lenH;
    if (!best || avgPen < best.penalty) {
      best = {
        startHour: rows[i].hour,
        endHour: rows[i + lenH - 1].hour + 1,
        penalty: avgPen,
        comfortPct: Math.round(100 * (1 - avgPen)),
      };
    }
  }
  return best;
};

/** Format hour as "6:00 AM" */
export const fmtHour = (h) => {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:00 ${ampm}`;
};

/** Soil moisture band label */
export const soilMoistureBand = (m3m3) =>
  m3m3 < 0.15 ? 'Dry' : m3m3 < 0.35 ? 'Moist' : 'Wet';

/** Wave height sea-state label (heuristic) */
export const seaStateLabel = (waveM) =>
  waveM < 1 ? 'Calm' : waveM < 2 ? 'Moderate' : 'Rough — Caution';

/** Frost risk heuristic (air temp ≤ 4°C) */
export const frostRisk = (tempMinC) => tempMinC <= 4;

/** Thunderstorm weather codes (WMO 4677) */
export const isThunderstorm = (code) => code >= 95 && code <= 99;
/** Dense fog */
export const isDenseFog = (visibility_m) => visibility_m < 1000;
