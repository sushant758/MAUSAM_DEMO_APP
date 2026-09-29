// ─── A3: Context Engine ───────────────────────────────────────────────────────
// Computes contextual signals from time-of-day, day-of-week, and live weather data.
// Provides:
//   buildContextSignals(ctx, now?) → signals object
//   suggestPersona(signals, PERSONAS) → personaId string
//   getCardContextBoost(cardId, signals) → multiplier (0.5 – 1.5)
//
// The context engine is intentionally decoupled from the ranker:
// ranker calls getCardContextBoost() to adjust the base affinity-urgency score.
// HomeScreen calls suggestPersona() to drive auto-persona switching.
// ─────────────────────────────────────────────────────────────────────────────

import { heatIndexC, isThunderstorm } from '../lib/indices';

// ─── buildContextSignals ──────────────────────────────────────────────────────
/**
 * Derive all contextual signals from the current time and weather context.
 *
 * @param {object|null} ctx   — weather context from weather.js
 * @param {Date}        now   — current time (default: new Date())
 * @returns {object}    signals — flat set of boolean/numeric context flags
 */
export function buildContextSignals(ctx, now = new Date()) {
  const hour       = now.getHours();
  const minute     = now.getMinutes();
  const dayOfWeek  = now.getDay();     // 0 = Sun, 6 = Sat
  const month      = now.getMonth();   // 0-indexed

  // ── Time buckets ──────────────────────────────────────────────────────────
  const isDawn      = hour >= 4  && hour <= 5;
  const isMorning   = hour >= 6  && hour <= 11;
  const isAfternoon = hour >= 12 && hour <= 15;
  const isEvening   = hour >= 16 && hour <= 20;
  const isNight     = hour >= 21 || hour <= 3;
  const isWeekend   = dayOfWeek === 0 || dayOfWeek === 6;
  const isWeekday   = !isWeekend;

  // School commute window: 7–9 AM weekdays
  const isSchoolMorning = isWeekday && hour >= 7 && hour <= 9;
  // Office commute: 8–10 AM weekdays
  const isCommuteHour   = isWeekday && hour >= 8 && hour <= 10;
  // Afternoon pickup: 3–4 PM weekdays
  const isPickupTime    = isWeekday && hour >= 15 && hour <= 16;
  // Early morning fitness: 5–8 AM
  const isFitnessWindow = hour >= 5 && hour <= 8;
  // Farming window: early morning (4–8 AM) or late afternoon (4–6 PM)
  const isFarmWindow    = (hour >= 4 && hour <= 8) || (hour >= 16 && hour <= 18);
  // Spraying window: early morning only (< 11 AM)
  const isSprayWindow   = hour >= 5 && hour <= 10;
  // Golden hour / event time: 5–8 PM
  const isEventWindow   = hour >= 17 && hour <= 20;

  // ── Season (India-centric) ─────────────────────────────────────────────────
  // Mar–Jun = Summer, Jul–Sep = Monsoon, Oct–Nov = Post-monsoon, Dec–Feb = Winter
  const season = (month >= 2 && month <= 5) ? 'summer'
               : (month >= 6 && month <= 9) ? 'monsoon'
               : (month >= 10 && month <= 11) ? 'autumn'
               : 'winter';

  // ── Weather signals ────────────────────────────────────────────────────────
  const temp   = ctx?.weather?.temp     ?? 25;
  const rh     = ctx?.weather?.humidity ?? 50;
  const hi     = heatIndexC(temp, rh);
  const aqi    = ctx?.aqi?.us_aqi       ?? 50;
  const uv     = ctx?.uv?.current       ?? 3;
  const rain   = ctx?.daily?.precipProbMax?.[0] ?? 10;
  const wind   = ctx?.weather?.windSpeed ?? 8;

  // Visibility (current hour)
  const hourlyRow = (ctx?.hourly ?? []).find((h) => h.hour === hour)
                 ?? (ctx?.hourly ?? [])[hour]
                 ?? null;
  const visM = hourlyRow?.visibility ?? 10000;

  const hasStorm = (ctx?.hourly ?? []).some((h) => isThunderstorm(h.weatherCode));
  const isLive   = ctx?.isLive ?? false;

  return {
    // Time
    hour, minute, dayOfWeek, month, season,
    isWeekday, isWeekend,
    isDawn, isMorning, isAfternoon, isEvening, isNight,
    isSchoolMorning, isCommuteHour, isPickupTime,
    isFitnessWindow, isFarmWindow, isSprayWindow, isEventWindow,

    // Weather: numeric
    temp, hi, aqi, uv, rain, wind, visM,

    // Weather: boolean
    isHighAQI:     aqi >= 150,
    isVeryHighAQI: aqi >= 200,
    isHighUV:      uv >= 6,
    isExtremeHeat: hi >= 41,
    isHot:         temp >= 35,
    isRainy:       rain >= 50,
    isFoggy:       visM < 1000,
    isWindy:       wind > 40,
    isStorm:       hasStorm && isLive, // only real storm (live data)
    isLive,
  };
}

// ─── suggestPersona ───────────────────────────────────────────────────────────
/**
 * Return the persona ID that best fits the current context signals.
 * Priority: severe conditions > time-of-day > day-of-week > default.
 *
 * @param {object}          signals  — from buildContextSignals()
 * @param {Array<{id:string}>} personas — PERSONAS array
 * @returns {string}  personaId
 */
export function suggestPersona(signals, personas) {
  const pId = (...ids) => {
    for (const id of ids) {
      const found = personas.find((p) => p.id === id);
      if (found) return found.id;
    }
    return personas[0]?.id ?? 'health';
  };

  const {
    isStorm, isExtremeHeat, isVeryHighAQI, isHighAQI, isFoggy,
    isWeekend, isWeekday,
    isMorning, isAfternoon, isEvening, isNight, isFitnessWindow,
    isCommuteHour, isSchoolMorning, isPickupTime, isEventWindow, isSprayWindow,
    isFarmWindow, hour, season,
  } = signals;

  // ── 1. Severe conditions override everything ───────────────────────────────
  if (isStorm)                       return pId('commuter');       // safety-first
  if (isExtremeHeat || isVeryHighAQI) return pId('health');        // health crisis
  if (isFoggy && isWeekday)          return pId('commuter');       // fog: road safety

  // ── 2. High-AQI mornings: health persona ──────────────────────────────────
  if (isHighAQI && isMorning)        return pId('health');

  // ── 3. Time + day-of-week logic ───────────────────────────────────────────
  if (isWeekday) {
    if (isCommuteHour)               return pId('commuter');       // 8–10 AM weekday
    if (isSchoolMorning)             return pId('parent');         // 7–9 AM with kids
    if (isPickupTime)                return pId('parent');         // 3–4 PM pickup
    if (isEventWindow)               return pId('eventplanner');   // 5–8 PM events
    if (isMorning && !isCommuteHour) return pId('health');         // mid-morning
    if (isAfternoon)                 return pId('farmer');         // 12–3 PM midday
    if (isNight)                     return pId('health');         // night: rest
  } else {
    // Weekend
    if (isFitnessWindow)             return pId('fitness');        // 5–8 AM workout
    if (isMorning && !isFitnessWindow) return pId('beachgoer');   // 9 AM–noon: outdoors
    if (isAfternoon)                 return pId('traveller');      // leisure travel
    if (isEventWindow)               return pId('eventplanner');   // evening events
    if (isNight)                     return pId('health');
  }

  // ── 4. Season-based nudge when no strong time/condition signal ────────────
  if (season === 'monsoon' && isAfternoon) return pId('farmer');
  if (season === 'summer'  && isAfternoon) return pId('health');

  // ── 5. Default: health persona (universal, informative) ───────────────────
  return pId('health');
}

// ─── getCardContextBoost ──────────────────────────────────────────────────────
/**
 * Return a context-aware multiplier for a card's score.
 * Applied after the base score: finalScore = baseScore × contextBoost.
 *
 * Values:
 *   > 1.0  → card is more relevant right now (boosted)
 *   = 1.0  → neutral (no context adjustment)
 *   < 1.0  → card is less relevant right now (suppressed)
 *
 * @param {string} cardId
 * @param {object} signals — from buildContextSignals()
 * @returns {number}  multiplier
 */
export function getCardContextBoost(cardId, signals) {
  const {
    isMorning, isAfternoon, isEvening, isNight,
    isCommuteHour, isSchoolMorning, isPickupTime, isEventWindow,
    isSprayWindow, isFarmWindow, isFitnessWindow,
    isHighAQI, isExtremeHeat, isFoggy, isRainy, isWindy,
    season,
  } = signals;

  switch (cardId) {
    // ── Morning-boosted cards ────────────────────────────────────────────────
    case 'rain_prob':
      // Knowing rain probability is most useful in the morning
      return isMorning ? 1.3 : isEvening ? 1.2 : 1.0;

    case 'visibility':
      // Fog/visibility matters most during commute hours
      return (isCommuteHour || isFoggy) ? 1.5 : isMorning ? 1.2 : 0.8;

    case 'school_commute':
      // Only highly relevant during school commute window
      return isSchoolMorning ? 1.6 : isPickupTime ? 1.4 : 0.6;

    case 'sunrise_sunset':
      // Useful near dawn/dusk
      return (isMorning && signals.hour <= 7) ? 1.5
           : (isEvening && signals.hour >= 17) ? 1.4
           : isNight ? 0.5
           : 0.8;

    // ── Evening-boosted cards ────────────────────────────────────────────────
    case 'outdoor_comfort':
    case 'guest_comfort':
      return isEventWindow ? 1.4 : isAfternoon ? 1.1 : isNight ? 0.7 : 1.0;

    case 'ep_sunset':
    case 'ep3':          // event planner sunset card
      return isEventWindow ? 1.5 : 0.8;

    // ── Condition-boosted cards ──────────────────────────────────────────────
    case 'aqi':
      return isHighAQI ? 1.4 : isMorning ? 1.1 : 1.0;

    case 'heat_index':
      return isExtremeHeat ? 1.5 : isAfternoon ? 1.2 : 1.0;

    case 'wind':
      return isWindy ? 1.4 : isEventWindow ? 1.2 : 1.0;   // wind matters for events

    case 'uv':
      return (signals.hour >= 10 && signals.hour <= 15) ? 1.3  // peak UV hours
           : (signals.isHighUV) ? 1.2
           : 0.9;

    // ── Fitness window ───────────────────────────────────────────────────────
    case 'heat_exertion':
      return isFitnessWindow ? 1.4 : 0.8;

    // ── Farming windows ──────────────────────────────────────────────────────
    case 'soil_moisture':
      return isFarmWindow ? 1.3
           : season === 'monsoon' ? 1.2
           : 1.0;

    case 'spraying_advisory':
      return isSprayWindow ? 1.6 : 0.5;   // strongly suppressed outside morning

    case 'frost_alert':
      return season === 'winter' ? 1.5 : 0.6;

    case 'rainfall_7d':
      return season === 'monsoon' ? 1.3 : 1.0;

    // ── Beach / wave cards ───────────────────────────────────────────────────
    case 'wave_height':
    case 'sea_temp':
    case 'tide':
      return (signals.hour >= 8 && signals.hour <= 18) ? 1.2 : 0.7; // daytime beach

    // ── Night/fatigue suppression ────────────────────────────────────────────
    case 'destination_forecast':
      return isEvening ? 1.3 : isNight ? 1.2 : 1.0;  // trip planning in evening

    case 'packing':
      return isEvening ? 1.2 : 1.0;

    default:
      return 1.0; // no boost or suppression
  }
}
