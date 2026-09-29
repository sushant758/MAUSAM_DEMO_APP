// ─── A2: Card Catalog ─────────────────────────────────────────────────────────
// Each card is the single source of truth for:
//   - Visual identity  (title, badgeIcon, badgeColor, type)
//   - Persona affinity (0 = never shown, 1 = always shown for that persona)
//   - Live compute     compute(ctx) → { visible, urgency 0-1, …display fields }
//   - A5 explainability whyText(ctx, personaId), formulaText, dataFields
//
// Cards with urgency ≥ 0.75 are treated as warnings and pinned at top (IMD gate).
// Card ordering within a persona: score = urgency×0.6 + affinity×0.4 (descending).
// ─────────────────────────────────────────────────────────────────────────────

import {
  clamp, heatIndexC, heatCategoryLabel, uvCategory, uvCategoryLabel,
  uvProtectionTip, aqiCategoryUS, aqiCategoryLabel, aqiStatusColor,
  outdoorComfort, soilMoistureBand, seaStateLabel, frostRisk,
  isThunderstorm, isDenseFog,
} from '../lib/indices';

// ─── helpers ──────────────────────────────────────────────────────────────────
const safeAqi  = (ctx) => ctx?.aqi?.us_aqi ?? 50;
const safeUv   = (ctx) => ctx?.uv?.current ?? 3;
const safeUvMax= (ctx) => ctx?.uv?.max ?? 7;
const safeHi   = (ctx) => {
  const t  = ctx?.weather?.temp    ?? 25;
  const rh = ctx?.weather?.humidity ?? 50;
  return heatIndexC(t, rh);
};
const safeWind = (ctx) => ctx?.weather?.windSpeed ?? 8;
const safeRain = (ctx) => ctx?.daily?.precipProbMax?.[0] ?? 10;
const safeVis  = (ctx) => {
  const h = ctx?.hourly ?? [];
  const hr = ctx?.hour ?? new Date().getHours();
  return h.find((r) => r.hour === hr)?.visibility ?? h[hr]?.visibility ?? 10000;
};

// ─── CARD CATALOG ─────────────────────────────────────────────────────────────
export const CARD_CATALOG = [

  // ══════════════════════════════════════════════════════════════════════════
  // SHARED: cross-persona cards
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'aqi',
    title: 'Air Quality',
    badgeIcon: 'Wind',
    badgeColor: 'bg-teal-100 text-teal-600 border-teal-200',
    // Affinity: how relevant is this card for each persona (0 = omit, 1 = must show)
    affinity: {
      health: 1.0, fitness: 0.75, parent: 0.85, commuter: 0.5,
      beachgoer: 0.4, traveller: 0.35, farmer: 0.6, eventplanner: 0.55,
    },
    compute(ctx) {
      const aqi  = safeAqi(ctx);
      const lbl  = aqiCategoryLabel(aqi);
      const clr  = aqiStatusColor(aqi);
      // AQI urgency: 0 (Good) → 0, 200 (Very Unhealthy) → 1
      const urgency = clamp(aqi / 200, 0, 1);
      return {
        visible: true,
        urgency,
        type: 'status',
        statusText: `AQI ${aqi} • ${lbl}`,
        statusColor: clr,
        subtext: `AQI ${aqi} (${lbl}) — US EPA scale.\nPM2.5: ${ctx?.aqi?.pm2_5?.toFixed(1) ?? '—'} µg/m³  •  PM10: ${ctx?.aqi?.pm10?.toFixed(1) ?? '—'} µg/m³.\n\nGeneral information, not medical advice.`,
        tag: 'Open-Meteo • air-quality API (us_aqi, pm2_5, pm10)',
      };
    },
    whyText: (ctx, pid) =>
      `AQI is ${safeAqi(ctx)} (${aqiCategoryLabel(safeAqi(ctx))}) right now. ${pid === 'health' || pid === 'parent' ? 'High AQI affects breathing — especially important for this persona.' : 'Air quality impacts outdoor comfort and activity safety.'}`,
    formulaText: 'US EPA AQI formula (PM2.5 & PM10 breakpoints). Scale: 0–50 Good, 51–100 Moderate, 101–150 Unhealthy for Sensitive, 151–200 Unhealthy, 201–300 Very Unhealthy, 301+ Hazardous.',
    dataFields: ['us_aqi', 'pm2_5', 'pm10'],
  },

  {
    id: 'uv',
    title: 'UV Index',
    badgeIcon: 'Sun',
    badgeColor: 'bg-amber-100 text-amber-600 border-amber-200',
    affinity: {
      health: 0.95, fitness: 0.85, parent: 0.9, commuter: 0.25,
      beachgoer: 0.7, traveller: 0.5, farmer: 0.45, eventplanner: 0.5,
    },
    compute(ctx) {
      const uv = safeUv(ctx);
      const lbl = uvCategoryLabel(uv);
      const tip = uvProtectionTip(uv);
      const urgency = clamp(uv / 11, 0, 1);
      const statusColor = uv >= 8  ? 'bg-red-50 text-red-700 border-red-200'
                        : uv >= 6  ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : uv >= 3  ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      return {
        visible: true,
        urgency,
        type: 'status',
        statusText: `UV ${uv} • ${lbl}`,
        statusColor,
        subtext: `UV Index: ${uv} (${lbl}). ${tip}\n\nGeneral information, not medical advice.`,
        tag: 'Open-Meteo • hourly uv_index',
      };
    },
    whyText: (ctx, pid) =>
      `UV Index is ${safeUv(ctx)} (${uvCategoryLabel(safeUv(ctx))}) right now. ${['health','parent','beachgoer','fitness'].includes(pid) ? 'Sun protection is critical for this activity profile.' : 'UV exposure is relevant for outdoor planning.'}`,
    formulaText: 'WHO UV Index scale: 0–2 Low, 3–5 Moderate, 6–7 High, 8–10 Very High, 11+ Extreme. No mathematical formula — direct measurement from Open-Meteo (based on solar radiation modelling).',
    dataFields: ['uv_index (hourly)', 'uv_index_max (daily)'],
  },

  {
    id: 'heat_index',
    title: 'Humidity & Heat',
    badgeIcon: 'Droplets',
    badgeColor: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    affinity: {
      health: 0.85, fitness: 0.95, parent: 0.7, commuter: 0.4,
      beachgoer: 0.6, traveller: 0.45, farmer: 0.65, eventplanner: 0.75,
    },
    compute(ctx) {
      const hi  = safeHi(ctx);
      const lbl = heatCategoryLabel(hi);
      const rh  = ctx?.weather?.humidity ?? 50;
      const t   = ctx?.weather?.temp ?? 25;
      // Urgency: comfortable=0, caution=0.3, extreme caution=0.6, danger=0.85, extreme danger=1.0
      const urgency = hi >= 54 ? 1.0 : hi >= 41 ? 0.85 : hi >= 32 ? 0.6 : hi >= 27 ? 0.3 : 0.05;
      const statusColor = hi >= 41 ? 'bg-red-50 text-red-700 border-red-200'
                        : hi >= 32 ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : hi >= 27 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: lbl,
        statusColor,
        subtext: `Relative humidity: ${rh}%. Heat index: ${hi.toFixed(1)}°C (${lbl}).\nDrink water regularly during outdoor activity.\n\nGeneral information, not medical advice.`,
        tag: 'Formula: Rothfusz heat index • Open-Meteo humidity',
      };
    },
    whyText: (ctx) => {
      const hi = safeHi(ctx); const lbl = heatCategoryLabel(hi);
      return `Heat index is ${hi.toFixed(1)}°C (${lbl}) — combining air temperature (${ctx?.weather?.temp ?? '—'}°C) with relative humidity (${ctx?.weather?.humidity ?? '—'}%). This is what your body actually feels.`;
    },
    formulaText: 'Rothfusz (1990) regression: HI = −42.379 + 2.049·T + 10.143·RH − 0.225·T·RH − 0.007·T² − 0.055·RH² + 0.001·T²·RH + 0.001·T·RH² − 0.000002·T²·RH². Valid for T ≥ 80°F (26.7°C) and RH ≥ 40%.',
    dataFields: ['temperature_2m', 'relative_humidity_2m'],
  },

  {
    id: 'outdoor_comfort',
    title: 'Outdoor Comfort Index',
    badgeIcon: 'Smile',
    badgeColor: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    affinity: {
      health: 0.9, fitness: 0.5, parent: 0.55, commuter: 0.2,
      beachgoer: 0.3, traveller: 0.35, farmer: 0.2, eventplanner: 1.0,
    },
    compute(ctx) {
      const hi  = safeHi(ctx);
      const aqi = safeAqi(ctx);
      const uv  = safeUv(ctx);
      const rp  = safeRain(ctx);
      const oci = outdoorComfort({ hi, aqi, uv, rainProb: rp });
      const urgency = 1 - oci / 100; // low OCI = high urgency (bad conditions)
      return {
        visible: true,
        urgency: clamp(urgency, 0, 1),
        type: 'gauge',
        gaugeValue: oci,
        subtext: `Score: ${oci}/100. Higher = more comfortable.\nComponents: heat (35%) + AQI (30%) + UV (15%) + rain probability (20%).`,
        tag: 'Formula: 0.35×heat + 0.30×AQI + 0.15×UV + 0.20×rain',
      };
    },
    whyText: (ctx) => {
      const hi  = safeHi(ctx);
      const oci = outdoorComfort({ hi, aqi: safeAqi(ctx), uv: safeUv(ctx), rainProb: safeRain(ctx) });
      return `Outdoor Comfort Index is ${oci}/100 right now. This combines heat index (${hi.toFixed(1)}°C), AQI (${safeAqi(ctx)}), UV index (${safeUv(ctx)}), and rain probability (${safeRain(ctx)}%).`;
    },
    formulaText: 'OCI = 100 × (1 − penalty). Penalty = 0.35×clamp((HI−24)/17,0,1) + 0.30×clamp(AQI/200,0,1) + 0.15×clamp(UV/11,0,1) + 0.20×clamp(rain%/100,0,1). Range 0–100 where 100 = perfect outdoor conditions.',
    dataFields: ['temperature_2m', 'relative_humidity_2m', 'us_aqi', 'uv_index', 'precipitation_probability'],
  },

  {
    id: 'wind',
    title: 'Wind Conditions',
    badgeIcon: 'Wind',
    badgeColor: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    affinity: {
      health: 0.3, fitness: 0.8, parent: 0.35, commuter: 0.5,
      beachgoer: 0.65, traveller: 0.3, farmer: 0.9, eventplanner: 0.85,
    },
    compute(ctx) {
      const w = safeWind(ctx);
      const label = w > 40 ? 'Strong Wind' : w > 20 ? 'Breezy' : 'Calm';
      const urgency = clamp(w / 60, 0, 1); // 60 km/h = gale
      const statusColor = w > 40 ? 'bg-red-50 text-red-700 border-red-200'
                        : w > 20 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: `${w} km/h • ${label}`,
        statusColor,
        subtext: `Wind speed: ${w} km/h (${label}). ${w > 40 ? '⚠️ Strong wind — avoid exposed high structures, tent events.' : w > 20 ? 'Breezy conditions — secure lightweight items.' : 'Calm conditions — good for outdoor activities.'}`,
        tag: 'Open-Meteo • wind_speed_10m',
      };
    },
    whyText: (ctx, pid) => {
      const w = safeWind(ctx);
      const tips = {
        farmer: 'Spraying is safe when wind ≤ 15 km/h. High wind causes pesticide drift.',
        eventplanner: 'Tent structures are safe up to 40 km/h. Above that, risk of structural failure.',
        fitness: 'High wind affects running form and trail safety.',
      };
      return `Wind is ${w} km/h right now. ${tips[pid] || 'This affects outdoor safety and comfort.'}`;
    },
    formulaText: 'Direct measurement at 10 m height from Open-Meteo. No formula — raw wind speed in km/h. Beaufort scale reference: 0–19 km/h = Light, 20–38 km/h = Moderate, 39–61 km/h = Fresh/Strong.',
    dataFields: ['wind_speed_10m'],
  },

  {
    id: 'visibility',
    title: 'Visibility',
    badgeIcon: 'Eye',
    badgeColor: 'bg-blue-100 text-blue-600 border-blue-200',
    affinity: {
      health: 0.25, fitness: 0.25, parent: 0.7, commuter: 1.0,
      beachgoer: 0.2, traveller: 0.85, farmer: 0.3, eventplanner: 0.2,
    },
    compute(ctx) {
      const visM  = safeVis(ctx);
      const visKm = (visM / 1000).toFixed(1);
      const fog   = isDenseFog(visM);
      const urgency = fog ? 0.85 : clamp(1 - visM / 10000, 0, 0.4);
      const statusColor = fog ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: fog ? `${visKm} km • Dense Fog` : `${visKm} km • Clear`,
        statusColor,
        subtext: `Visibility: ${visKm} km. ${fog ? '⚠️ Dense fog — exercise extreme caution. Fog alert threshold: <1000 m.' : 'Clear conditions. Good for road travel, commuting, and flight operations.'}`,
        tag: 'Open-Meteo • hourly visibility',
      };
    },
    whyText: (ctx, pid) => {
      const visM = safeVis(ctx);
      return `Visibility is ${(visM / 1000).toFixed(1)} km right now. ${isDenseFog(visM) ? '⚠️ Dense fog detected (< 1 km). This is a safety risk for road, air, and marine travel.' : 'Clear visibility — safe for ' + (pid === 'commuter' ? 'commuting' : 'travel') + '.'}`;
    },
    formulaText: 'Fog alert: visibility < 1000 m (1 km). Dense fog: < 200 m. Source: Open-Meteo hourly visibility in metres, converted to km.',
    dataFields: ['visibility (hourly, metres)'],
  },

  {
    id: 'rain_prob',
    title: 'Rain Probability',
    badgeIcon: 'Umbrella',
    badgeColor: 'bg-blue-100 text-blue-600 border-blue-200',
    affinity: {
      health: 0.45, fitness: 0.6, parent: 0.8, commuter: 0.8,
      beachgoer: 0.5, traveller: 0.7, farmer: 0.7, eventplanner: 1.0,
    },
    compute(ctx) {
      const prob = safeRain(ctx);
      const urgency = clamp(prob / 100, 0, 1) * 0.8; // max urgency 0.8 (not a hard warning)
      const statusColor = prob >= 70 ? 'bg-red-50 text-red-700 border-red-200'
                        : prob >= 40 ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      const label = prob >= 70 ? 'High Risk' : prob >= 40 ? 'Moderate Risk' : 'Low Risk';
      return {
        visible: true,
        urgency,
        type: 'status',
        statusText: `${prob}% • ${label}`,
        statusColor,
        subtext: `Rain probability (today's max): ${prob}%. ${prob >= 70 ? '⚠️ High chance of rain — carry umbrella, plan indoor backup.' : prob >= 40 ? 'Moderate rain risk — keep an umbrella handy.' : 'Low rain risk for today.'}`,
        tag: 'Open-Meteo • hourly precipitation_probability',
      };
    },
    whyText: (ctx, pid) => {
      const prob = safeRain(ctx);
      const tips = {
        eventplanner: 'Rain directly threatens outdoor events. Backup plan recommended when probability ≥ 40%.',
        parent: 'Rain at pickup time (3:30 PM) can affect school commute safety.',
        farmer: 'Rain affects irrigation scheduling and crop spraying windows.',
      };
      return `Rain probability today: ${prob}%. ${tips[pid] || 'This affects outdoor planning and activity safety.'}`;
    },
    formulaText: 'Open-Meteo hourly precipitation_probability (%). Maximum daily probability is displayed. 0% = no chance of rain, 100% = certain rain.',
    dataFields: ['precipitation_probability (hourly, %)'],
  },

  {
    id: 'storm_risk',
    title: 'Storm & Severe Weather',
    badgeIcon: 'ShieldCheck',
    badgeColor: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    affinity: {
      health: 0.6, fitness: 0.5, parent: 0.75, commuter: 0.8,
      beachgoer: 0.7, traveller: 0.6, farmer: 0.6, eventplanner: 0.9,
    },
    compute(ctx) {
      const hourly = ctx?.hourly ?? [];
      const hasStorm = hourly.some((h) => isThunderstorm(h.weatherCode));
      const urgency = hasStorm ? 0.9 : 0.05;
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: hasStorm ? '⚠️ Storm Forecast' : 'No Storm Risk',
        statusColor: hasStorm
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        subtext: hasStorm
          ? '⚠️ Thunderstorm (WMO code 95–99) forecast today. Avoid outdoor exposure during storm windows. Postpone outdoor events if possible.'
          : 'No thunderstorm (WMO codes 95–99) detected in today\'s forecast. No active severe weather alert.',
        tag: 'Mock data • IMD warning feed planned',
      };
    },
    whyText: (ctx) => {
      const hasStorm = (ctx?.hourly ?? []).some((h) => isThunderstorm(h.weatherCode));
      return hasStorm
        ? '⚠️ Thunderstorm detected in today\'s weather codes (95–99). This is the highest urgency weather event and is pinned at top.'
        : 'No thunderstorm codes (95–99) detected. Storm check always runs for safety.';
    },
    formulaText: 'WMO weather code check: thunderstorm when code ∈ {95, 96, 99}. Source: Open-Meteo hourly weather_code. IMD warning feed not yet integrated — this is weather-code based only.',
    dataFields: ['weather_code (hourly, WMO 4677)'],
  },

  {
    id: 'sunrise_sunset',
    title: 'Sunrise & Sunset',
    badgeIcon: 'Sun',
    badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    affinity: {
      health: 0.4, fitness: 1.0, parent: 0.5, commuter: 0.3,
      beachgoer: 0.5, traveller: 0.35, farmer: 0.85, eventplanner: 0.9,
    },
    compute(ctx) {
      const rise = ctx?.daily?.sunrise ?? '06:12';
      const set  = ctx?.daily?.sunset  ?? '18:38';
      const [rH] = rise.split(':').map(Number);
      const [sH] = set.split(':').map(Number);
      const goldenStart = `${sH - 1}:${set.split(':')[1]}`;
      return {
        visible: true,
        urgency: 0.1, // informational, always low urgency
        type: 'check',
        statusText: `Sunset ${set}`,
        subtext: `Sunrise: ${rise}  •  Sunset: ${set}.\nGolden hour: approx. ${goldenStart} – ${set}.\nBest outdoor light: ${rise} – ${String(rH + 3).padStart(2,'0')}:${rise.split(':')[1]} AM and 5 PM – ${set}.`,
        tag: 'Open-Meteo • daily sunrise / sunset',
      };
    },
    whyText: (ctx, pid) => {
      const set = ctx?.daily?.sunset ?? '18:38';
      return `Sunset today is at ${set}. ${pid === 'eventplanner' ? 'Golden hour photo window before sunset is ideal for outdoor events.' : pid === 'fitness' ? 'Plan runs before sunrise or after sunset for lower UV and cooler temps.' : 'Daylight hours affect outdoor planning.'}`;
    },
    formulaText: 'Direct from Open-Meteo daily forecast (sunrise/sunset in ISO 8601). Golden hour = 1 hour before sunset. No mathematical formula — astronomical calculation.',
    dataFields: ['sunrise (daily)', 'sunset (daily)'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONA-SPECIFIC: Farmer
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'soil_moisture',
    title: 'Soil Moisture',
    badgeIcon: 'CloudRain',
    badgeColor: 'bg-blue-100 text-blue-600 border-blue-200',
    affinity: {
      health: 0, fitness: 0, parent: 0, commuter: 0,
      beachgoer: 0, traveller: 0, farmer: 1.0, eventplanner: 0,
    },
    compute(ctx) {
      const m  = ctx?.soil?.moisture_0_1 ?? 0.28;
      const band = soilMoistureBand(m);
      const urgency = band === 'Dry' ? 0.6 : band === 'Wet' ? 0.4 : 0.1;
      const statusColor = band === 'Dry' ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : band === 'Wet' ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      return {
        visible: true,
        urgency,
        type: 'status',
        statusText: `${m.toFixed(2)} m³/m³ • ${band}`,
        statusColor,
        subtext: `Soil moisture (0–1 cm depth): ${m.toFixed(2)} m³/m³ (${band}).\n${band === 'Dry' ? 'Irrigation recommended.' : band === 'Wet' ? 'Skip irrigation — soil is saturated.' : 'Adequate for most crops.'}\n\nCheck Gramin Krishi Mausam Sewa for crop-specific guidance.`,
        tag: 'Open-Meteo • soil_moisture_0_to_1cm',
      };
    },
    whyText: (ctx) => {
      const m = ctx?.soil?.moisture_0_1 ?? 0.28;
      return `Soil moisture at 0–1 cm depth is ${m.toFixed(2)} m³/m³ (${soilMoistureBand(m)}). Irrigation threshold: < 0.15 m³/m³ = Dry, 0.15–0.35 = Moist, > 0.35 = Wet.`;
    },
    formulaText: 'Band: < 0.15 m³/m³ = Dry (irrigate), 0.15–0.35 = Moist (monitor), > 0.35 = Wet (skip irrigation). Source: Open-Meteo soil_moisture_0_to_1cm (volumetric water content).',
    dataFields: ['soil_moisture_0_to_1cm (m³/m³)'],
  },

  {
    id: 'rainfall_7d',
    title: 'Rainfall Forecast (7 Days)',
    badgeIcon: 'ShieldAlert',
    badgeColor: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    affinity: {
      health: 0, fitness: 0, parent: 0.2, commuter: 0.1,
      beachgoer: 0.1, traveller: 0.2, farmer: 1.0, eventplanner: 0.3,
    },
    compute(ctx) {
      const sums  = ctx?.daily?.precipSum7d ?? [0,0,0,0,0,0,0];
      const total = sums.reduce((s, v) => s + (v ?? 0), 0).toFixed(1);
      const urgency = clamp(Number(total) / 50, 0, 0.7); // 50 mm = high urgency
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: `${total} mm Forecast`,
        subtext: `Expected total rainfall next 7 days: ${total} mm.\n${Number(total) >= 20 ? 'Significant rain expected — hold heavy irrigation on high-probability days.' : Number(total) >= 5 ? 'Moderate rain — adjust irrigation accordingly.' : 'Light rain or dry spell ahead.'}`,
        tag: 'Open-Meteo • daily precipitation_sum (7-day)',
      };
    },
    whyText: (ctx) => {
      const total = (ctx?.daily?.precipSum7d ?? []).reduce((s, v) => s + (v ?? 0), 0).toFixed(1);
      return `7-day cumulative rainfall forecast: ${total} mm. This helps decide irrigation scheduling and crop protection planning.`;
    },
    formulaText: 'Sum of daily precipitation_sum over 7 forecast days from Open-Meteo. No formula — raw rainfall sum in millimetres.',
    dataFields: ['precipitation_sum (daily, mm) × 7 days'],
  },

  {
    id: 'frost_alert',
    title: 'Frost Alert',
    badgeIcon: 'ThermometerSun',
    badgeColor: 'bg-rose-100 text-rose-600 border-rose-200',
    affinity: {
      health: 0, fitness: 0, parent: 0, commuter: 0.1,
      beachgoer: 0, traveller: 0.1, farmer: 1.0, eventplanner: 0,
    },
    compute(ctx) {
      const mins = ctx?.daily?.tempMin7d ?? [ctx?.weather?.tempMin ?? 18];
      const minTemp = Math.min(...mins);
      const hasFrost = frostRisk(minTemp);
      const urgency = hasFrost ? 0.9 : 0.05;
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: hasFrost ? '⚠️ Frost Risk' : 'No Frost Risk',
        statusColor: hasFrost
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        subtext: `Min night temp this week: ${minTemp.toFixed(1)}°C.\n${hasFrost ? '⚠️ Frost risk detected (≤4°C). Protect sensitive crops with covers or heaters.' : 'No frost risk. Air-temp heuristic: frost when min temp ≤4°C.'}\nCheck local Gramin Krishi Mausam Sewa for crop-specific guidance.`,
        tag: 'Formula: frost when min temp ≤4°C (Open-Meteo daily)',
      };
    },
    whyText: (ctx) => {
      const mins = ctx?.daily?.tempMin7d ?? [18];
      const minTemp = Math.min(...mins);
      return `Minimum forecast temperature this week: ${minTemp.toFixed(1)}°C. ${frostRisk(minTemp) ? '⚠️ FROST RISK: min temp ≤ 4°C. Crop protection needed.' : 'No frost risk (threshold: ≤ 4°C).'}`;
    },
    formulaText: 'Frost heuristic: frost risk when minimum air temperature ≤ 4°C (air temperature at 2 m height from Open-Meteo daily). Ground frost can occur at 2–3°C higher than air temperature.',
    dataFields: ['temperature_2m_min (daily, °C) × 7 days'],
  },

  {
    id: 'spraying_advisory',
    title: 'Crop Spraying Advisory',
    badgeIcon: 'Wind',
    badgeColor: 'bg-amber-100 text-amber-600 border-amber-200',
    affinity: {
      health: 0, fitness: 0, parent: 0, commuter: 0,
      beachgoer: 0, traveller: 0, farmer: 1.0, eventplanner: 0,
    },
    compute(ctx) {
      const w  = safeWind(ctx);
      const rh = ctx?.weather?.humidity ?? 50;
      const ok = w <= 15 && rh >= 40 && rh <= 80;
      const urgency = ok ? 0.15 : 0.5; // medium urgency when conditions bad
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: ok ? 'Spraying Allowed' : 'Wind Too Strong',
        statusColor: ok
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-red-50 text-red-700 border-red-200',
        subtext: `Wind: ${w} km/h. Humidity: ${rh}%.\n${w <= 15 ? 'Good conditions for crop spraying before 11 AM. Avoid spraying when wind > 15 km/h.' : '⚠️ Wind too strong for spraying (> 15 km/h) — pesticide drift risk. Wait for calmer conditions.'}`,
        tag: 'Open-Meteo • wind_speed_10m & humidity',
      };
    },
    whyText: (ctx) => {
      const w = safeWind(ctx);
      return `Wind is ${w} km/h. Safe spraying threshold: ≤ 15 km/h. ${w > 15 ? '⚠️ Spraying not recommended — pesticide drift can damage non-target crops.' : 'Good window for foliar spray application.'}`;
    },
    formulaText: 'Spraying allowed when: wind_speed ≤ 15 km/h AND relative_humidity ≥ 40% AND relative_humidity ≤ 80%. Wind > 15 km/h → pesticide drift risk (FAO guidelines).',
    dataFields: ['wind_speed_10m', 'relative_humidity_2m'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONA-SPECIFIC: Beach / Surfer
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'wave_height',
    title: 'Wave Height & Period',
    badgeIcon: 'Wind',
    badgeColor: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    affinity: {
      health: 0, fitness: 0.2, parent: 0.1, commuter: 0,
      beachgoer: 1.0, traveller: 0.3, farmer: 0, eventplanner: 0,
    },
    compute(ctx) {
      const wave = ctx?.marine?.waveHeight ?? null;
      if (wave === null) {
        return {
          visible: true, urgency: 0.1, type: 'status',
          statusText: 'No Marine Data',
          statusColor: 'bg-slate-50 text-slate-600 border-slate-200',
          subtext: 'Marine data not available for this location. Open-Meteo Marine API requires a coastal lat/lon.',
          tag: 'Open-Meteo Marine API • wave_height, wave_period',
        };
      }
      const label = seaStateLabel(wave);
      const urgency = wave > 3 ? 0.85 : wave > 2 ? 0.5 : wave > 1 ? 0.25 : 0.1;
      const statusColor = wave > 2 ? 'bg-red-50 text-red-700 border-red-200'
                        : wave >= 1 ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      const period = ctx?.marine?.wavePeriod;
      return {
        visible: true, urgency, type: 'status',
        statusText: `${wave.toFixed(1)} m • ${label}`,
        statusColor,
        subtext: `Wave height: ${wave.toFixed(1)} m (${label}).${period ? ` Wave period: ${period.toFixed(0)} s.` : ''}\nHeuristic: < 1 m Calm, 1–2 m Moderate, > 2 m Rough/Caution.`,
        tag: 'Open-Meteo Marine API • wave_height, wave_period',
      };
    },
    whyText: (ctx) => {
      const wave = ctx?.marine?.waveHeight;
      return wave != null
        ? `Wave height is ${wave.toFixed(1)} m (${seaStateLabel(wave)}). Suitable for: < 1 m Beginners, 1–2 m Intermediate surfers, > 2 m Advanced only.`
        : 'Marine data requires a coastal location. The Marine API is separate from the main weather API.';
    },
    formulaText: 'Sea state heuristic: < 1 m = Calm, 1–2 m = Moderate, > 2 m = Rough/Caution. Source: Open-Meteo Marine API (wave_height in metres, wave_period in seconds).',
    dataFields: ['wave_height (Marine API, metres)', 'wave_period (Marine API, seconds)'],
  },

  {
    id: 'sea_temp',
    title: 'Sea Surface Temperature',
    badgeIcon: 'Smile',
    badgeColor: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    affinity: {
      health: 0, fitness: 0.2, parent: 0.1, commuter: 0,
      beachgoer: 1.0, traveller: 0.3, farmer: 0, eventplanner: 0,
    },
    compute(ctx) {
      const sst = ctx?.marine?.seaSurfaceTemp ?? null;
      if (sst === null) {
        return {
          visible: true, urgency: 0.05, type: 'check',
          statusText: 'No Marine Data',
          subtext: 'Sea surface temperature not available for this location.',
          tag: 'Open-Meteo Marine API • sea_surface_temperature',
        };
      }
      const warm = sst >= 24;
      return {
        visible: true, urgency: 0.05,
        type: 'check',
        statusText: `${sst.toFixed(1)}°C • ${warm ? 'Warm' : 'Cool'}`,
        subtext: `Sea surface temperature: ${sst.toFixed(1)}°C.\n${warm ? 'Comfortable for swimming without a wetsuit in tropical conditions.' : 'Cooler water — a thin wetsuit may be advisable for extended swimming.'}`,
        tag: 'Open-Meteo Marine API • sea_surface_temperature',
      };
    },
    whyText: (ctx) => {
      const sst = ctx?.marine?.seaSurfaceTemp;
      return sst != null
        ? `Sea surface temperature is ${sst.toFixed(1)}°C. Wetsuit typically not needed when SST ≥ 24°C.`
        : 'Marine data not available for this inland location.';
    },
    formulaText: 'Wetsuit guidance heuristic: SST ≥ 24°C = comfortable without wetsuit (tropical). SST < 24°C = consider thin wetsuit. Source: Open-Meteo Marine API sea_surface_temperature.',
    dataFields: ['sea_surface_temperature (Marine API, °C)'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONA-SPECIFIC: Parent
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'school_commute',
    title: 'School Commute Safety',
    badgeIcon: 'Bus',
    badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    affinity: {
      health: 0, fitness: 0, parent: 1.0, commuter: 0.3,
      beachgoer: 0, traveller: 0, farmer: 0, eventplanner: 0,
    },
    compute(ctx) {
      const hourly = ctx?.hourly ?? [];
      const morning = hourly.filter((h) => h.hour >= 7 && h.hour <= 9);
      const rainMax  = morning.length ? Math.max(...morning.map((h) => h.rainProb)) : (safeRain(ctx));
      const visMin   = morning.length ? Math.min(...morning.map((h) => h.visibility)) : 10000;
      const storm    = morning.some((h) => isThunderstorm(h.weatherCode));
      const risk = rainMax >= 60 || isDenseFog(visMin) || storm;
      const urgency = risk ? 0.7 : 0.1;
      return {
        visible: true,
        urgency,
        type: 'check',
        statusText: risk ? '⚠️ Use Caution' : 'Safe Commute',
        statusColor: risk
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        subtext: `Morning (7–9 AM): Rain probability ${rainMax}%, visibility ${(visMin / 1000).toFixed(1)} km${storm ? ', thunderstorm risk' : ''}.\n${risk ? '⚠️ Use caution during the school commute.' : 'Safe commute conditions based on weather data.'}`,
        tag: 'Formula: rain prob + visibility + storm codes (Open-Meteo)',
      };
    },
    whyText: (ctx) => {
      const hourly = ctx?.hourly ?? [];
      const morning = hourly.filter((h) => h.hour >= 7 && h.hour <= 9);
      const rainMax = morning.length ? Math.max(...morning.map((h) => h.rainProb)) : safeRain(ctx);
      return `School commute window is 7–9 AM. Rain probability in this window: ${rainMax}%. Visibility: ${((morning[0]?.visibility ?? 10000) / 1000).toFixed(1)} km. Risk triggers: rain ≥ 60%, fog < 1 km, or thunderstorm.`;
    },
    formulaText: 'Risk = (rain_probability ≥ 60%) OR (visibility < 1000 m) OR (weather_code ∈ {95,96,99}) in the 7–9 AM window. All from Open-Meteo hourly data.',
    dataFields: ['precipitation_probability (hourly 7-9 AM)', 'visibility (hourly 7-9 AM)', 'weather_code (hourly 7-9 AM)'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PERSONA-SPECIFIC: Event Planner
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'guest_comfort',
    title: 'Guest Comfort Index',
    badgeIcon: 'Smile',
    badgeColor: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    affinity: {
      health: 0, fitness: 0, parent: 0.3, commuter: 0,
      beachgoer: 0.4, traveller: 0.3, farmer: 0, eventplanner: 1.0,
    },
    compute(ctx) {
      const hi  = safeHi(ctx);
      const oci = outdoorComfort({ hi, aqi: safeAqi(ctx), uv: safeUv(ctx), rainProb: safeRain(ctx) });
      const urgency = 1 - oci / 100;
      return {
        visible: true,
        urgency: clamp(urgency * 0.8, 0, 0.8),
        type: 'gauge',
        gaugeValue: oci,
        subtext: `Outdoor Comfort Index: ${oci}/100 for guest comfort.\n${oci >= 80 ? 'Excellent — guests will be very comfortable outdoors.' : oci >= 60 ? 'Good — comfortable for most guests.' : 'Moderate — consider fans, cooling, or indoor backup.'}`,
        tag: 'Formula: 0.35×heat + 0.30×AQI + 0.15×UV + 0.20×rain',
      };
    },
    whyText: (ctx) => {
      const oci = outdoorComfort({ hi: safeHi(ctx), aqi: safeAqi(ctx), uv: safeUv(ctx), rainProb: safeRain(ctx) });
      return `Guest Comfort Index is ${oci}/100. This measures how comfortable guests will be outdoors, combining heat, air quality, UV, and rain risk.`;
    },
    formulaText: 'Same as Outdoor Comfort Index. Weighted composite: 0.35×heat penalty + 0.30×AQI penalty + 0.15×UV penalty + 0.20×rain probability. 100 = perfect conditions, 0 = extreme discomfort.',
    dataFields: ['temperature_2m', 'relative_humidity_2m', 'us_aqi', 'uv_index', 'precipitation_probability'],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ALWAYS-MOCK cards (shown with grey chip, never get live override)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'pollen',
    title: 'Pollen',
    badgeIcon: 'Wind',
    badgeColor: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    affinity: {
      health: 1.0, fitness: 0.6, parent: 0.7, commuter: 0.2,
      beachgoer: 0.1, traveller: 0.1, farmer: 0.3, eventplanner: 0.2,
    },
    compute() {
      return {
        visible: true,
        urgency: 0.15,
        type: 'status',
        statusText: 'Not Available',
        statusColor: 'bg-slate-50 text-slate-500 border-slate-200',
        subtext: 'Pollen data is not available for this region in the prototype.\nNo public pollen API covers most of India yet.\n\nCheck your local air quality station for pollen counts. General information, not medical advice.',
        tag: 'Mock data • No pollen feed for India in prototype',
      };
    },
    whyText: () => 'Pollen is relevant for allergy and respiratory health planning. No free pollen API covers India — this card is a placeholder until a pollen data source is integrated.',
    formulaText: 'No formula — pollen count is measured by ground-based air sampling stations. Data source planned: IMD / local APMC pollen monitoring networks.',
    dataFields: ['Pollen feed — not yet available'],
  },

  {
    id: 'tide',
    title: 'Tide Timings',
    badgeIcon: 'ShieldCheck',
    badgeColor: 'bg-blue-100 text-blue-600 border-blue-200',
    affinity: {
      health: 0, fitness: 0, parent: 0, commuter: 0,
      beachgoer: 1.0, traveller: 0.2, farmer: 0, eventplanner: 0,
    },
    compute() {
      return {
        visible: true,
        urgency: 0.1,
        type: 'status',
        statusText: 'Mock estimate',
        statusColor: 'bg-slate-50 text-slate-600 border-slate-200',
        subtext: 'High tide: ~1:45 PM (mock estimate). Low tide: ~7:30 AM (mock estimate).\nOpen-Meteo does not provide tide times — these are placeholders.',
        tag: 'Mock data • Tide feed planned (INCOIS)',
      };
    },
    whyText: () => 'Tide timings are critical for beach safety and surf planning. INCOIS (Indian National Centre for Ocean Information Services) provides official tide tables for Indian coasts. Not yet integrated.',
    formulaText: 'Tide prediction requires harmonic analysis of tidal constituents (M2, S2, N2, K1, O1, etc.) — not available from weather APIs. Planned integration: INCOIS tide tables.',
    dataFields: ['Tide feed — planned (INCOIS)'],
  },

  {
    id: 'destination_forecast',
    title: 'Destination Forecast',
    badgeIcon: 'Globe',
    badgeColor: 'bg-sky-100 text-sky-600 border-sky-200',
    affinity: {
      health: 0, fitness: 0, parent: 0, commuter: 0,
      beachgoer: 0, traveller: 1.0, farmer: 0, eventplanner: 0,
    },
    compute() {
      return {
        visible: true,
        urgency: 0.2,
        type: 'check',
        statusText: 'No Destination',
        subtext: 'No saved destination set. Add a destination in your profile to see live weather for your travel location.\n(Live forecast via Open-Meteo once destination is saved.)',
        tag: 'Mock data • Add destination in profile',
      };
    },
    whyText: () => 'Destination forecast will show live Open-Meteo weather for your saved travel destination. Feature requires onboarding (A1) to save destination.',
    formulaText: 'No formula — direct Open-Meteo forecast for the destination lat/lon. Same API as current location weather.',
    dataFields: ['Same as weather.js — requires saved destination lat/lon'],
  },

  {
    id: 'packing',
    title: 'Packing Suggestions',
    badgeIcon: 'Briefcase',
    badgeColor: 'bg-purple-100 text-purple-600 border-purple-200',
    affinity: {
      health: 0, fitness: 0, parent: 0, commuter: 0,
      beachgoer: 0, traveller: 1.0, farmer: 0, eventplanner: 0,
    },
    compute(ctx) {
      const rp = safeRain(ctx);
      const t  = ctx?.weather?.temp ?? 25;
      const uv = safeUv(ctx);
      const items = [];
      if (rp >= 40) items.push('raincoat & compact umbrella');
      if (t >= 32)  items.push('light cotton clothing + cooling towel');
      if (uv >= 6)  items.push('SPF 50+ sunscreen + wide-brim hat');
      if (t <= 15)  items.push('warm layer or jacket');
      const list = items.length ? items.join(', ') : 'standard travel clothing';
      return {
        visible: true,
        urgency: 0.2,
        type: 'status',
        statusText: 'Rule-based',
        statusColor: 'bg-purple-50 text-purple-700 border-purple-200',
        subtext: `Suggested: ${list}.\nRules: rain ≥40% → raincoat; temp ≥32°C → light cotton; UV ≥6 → SPF50+; temp ≤15°C → warm layer.`,
        tag: 'Mock data • Rule-based from local forecast',
      };
    },
    whyText: (ctx) => {
      const rp = safeRain(ctx), uv = safeUv(ctx), t = ctx?.weather?.temp ?? 25;
      return `Packing rules: rain ${rp}% (≥40% → raincoat), UV ${uv} (≥6 → SPF50+), temp ${t}°C (≥32°C → light cotton, ≤15°C → jacket). Based on current forecast.`;
    },
    formulaText: 'Rule-based: if precipitation_probability ≥ 40% → pack raincoat; if temp ≥ 32°C → light clothing; if UV ≥ 6 → SPF 50+; if temp ≤ 15°C → warm layer. Not ML-based.',
    dataFields: ['precipitation_probability (daily max)', 'temperature_2m', 'uv_index'],
  },
];
