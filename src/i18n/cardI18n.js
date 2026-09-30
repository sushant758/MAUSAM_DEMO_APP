// ─── src/i18n/cardI18n.js ─────────────────────────────────────────────────────
// A7: Translates card body (subtext) and statusText labels at render time.
// ZERO changes to catalog.js or ranker.js — this is a pure presentation layer.
//
// Strategy: extract raw numeric values from each card's already-computed
// English statusText/subtext (format is deterministic — we wrote catalog.js),
// then rebuild the string from the translated template in strings.js.
//
// RULES (per spec):
//   Keep English: AQI, PM2.5, PM10, UV, IMD, US EPA, Open-Meteo, °C, °F, µg/m³
//   Translate level words via t('level.*') keys
// ─────────────────────────────────────────────────────────────────────────────

// ── Tiny helper: extract first regex group from a string ──────────────────────
function ex(str, re, fallback = '—') {
  return str?.match(re)?.[1] ?? fallback;
}

// ── B7: 12-hour time formatter ────────────────────────────────────────────────
// Accepts "HH:MM" or ISO-8601 datetime strings.
// lang='hi' uses सुबह/शाम instead of AM/PM.
export function to12h(timeStr, lang = 'en') {
  if (!timeStr || timeStr === '—') return timeStr;
  // Handle ISO 8601: "2025-06-01T06:12" → extract "06:12"
  const hhmm = timeStr.includes('T') ? timeStr.split('T')[1]?.substring(0, 5) : timeStr.substring(0, 5);
  if (!hhmm || !hhmm.includes(':')) return timeStr;
  const [hStr, mStr] = hhmm.split(':');
  const h24 = parseInt(hStr, 10);
  const m   = mStr ?? '00';
  const isPM = h24 >= 12;
  const h12  = h24 % 12 || 12;
  if (lang === 'hi') {
    return `${h12}:${m} ${isPM ? 'शाम' : 'सुबह'}`;
  }
  return `${h12}:${m} ${isPM ? 'PM' : 'AM'}`;
}

// ── Translate level words (per spec) ─────────────────────────────────────────
export function translateLevel(label, t) {
  if (!label) return label;
  const map = {
    'Low': t('level.low'),
    'Moderate': t('level.moderate'),
    'Moderate Risk': t('level.moderate') + ' ' + t('level.high_risk').replace('अधिक', '').trim(),
    'High': t('level.high'),
    'High Risk': t('level.high_risk'),
    'Caution': t('level.caution'),
    'Comfortable': t('level.comfortable'),
    'Not Available': t('level.na'),
    'No IMD Alert': t('level.no_imd'),
    'Good': t('level.low'),          // AQI Good maps to level.low shade
    'Unhealthy': t('level.high'),
    'Very Unhealthy': t('level.high'),
    'Hazardous': t('level.high'),
    'Calm': t('level.calm'),
    'Breezy': t('level.breezy'),
    'Strong Wind': t('level.strong_wind'),
    'Clear': t('level.clear'),
    'Dense Fog': t('level.dense_fog'),
    'Safe Commute': t('level.safe'),
    'Use Caution': t('level.caution_commute'),
    'Warm': t('level.warm'),
    'Cool': t('level.cool'),
    'No Marine Data': t('level.no_marine'),
    'Frost Risk': t('level.frost_risk').replace('⚠️ ', ''),
    'No Frost Risk': t('level.no_frost'),
    'Spraying Allowed': t('level.spraying_ok'),
    'Wind Too Strong': t('level.spraying_no'),
    'Mock estimate': t('level.mock_est'),
    'Rule-based': t('level.rule_based'),
    'No Destination': t('level.no_dest'),
    'Dry': t('level.caution'),
    'Moist': t('level.moderate'),
    'Wet': t('level.high'),
  };
  return map[label] ?? label; // fallback: keep English (matches spec for technical terms)
}

// ── Translate UV protection tip ───────────────────────────────────────────────
function translateUvTip(tip, t, lang) {
  if (lang === 'en') return tip;
  // The tip is a short sentence — translate by UV level keyword
  if (tip?.includes('SPF 50+') || tip?.includes('Extreme')) return 'SPF 50+ सनस्क्रीन लगाएँ, टोपी पहनें, सुबह 11 से 3 बजे तक छाँव में रहें।';
  if (tip?.includes('SPF 30') || tip?.includes('Very High')) return 'SPF 30+ सनस्क्रीन और धूप से बचाने वाले कपड़े पहनें।';
  if (tip?.includes('High')) return 'SPF 30 सनस्क्रीन और धूप का चश्मा लगाएँ।';
  if (tip?.includes('Moderate')) return 'धूप से बचाव की सलाह दी जाती है।';
  return 'सुरक्षा की कोई विशेष ज़रूरत नहीं।';
}

// ── Main translator ───────────────────────────────────────────────────────────
/**
 * Returns the translated card body (subtext) for a given card.
 *
 * @param {object} card   — computed card object from ranker.js
 * @param {string} lang   — 'en' | 'hi'
 * @param {function} t    — translate function from useLanguage()
 * @returns {string}      — translated subtext string
 */
export function getTranslatedCardBody(card, lang, t) {
  if (lang === 'en' || !card) return card?.subtext ?? '';

  const sub  = card.subtext ?? '';
  const stat = card.statusText ?? '';
  const id   = card.id;

  // Helper: fill placeholders in a template string
  const fill = (key, vars) =>
    t(key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);

  switch (id) {

    case 'aqi': {
      const n     = ex(stat, /AQI (\d+)/);
      const level = ex(stat, /AQI \d+ • (.+)/);
      const pm25  = ex(sub,  /PM2\.5: ([^\s]+)/);
      const pm10  = ex(sub,  /PM10: ([^\s]+)/);
      return fill('body.aqi', { n, level: translateLevel(level, t), pm25, pm10 });
    }

    case 'uv': {
      const n     = ex(stat, /UV (\d+)/);
      const level = ex(stat, /UV \d+ • (.+)/);
      const tip   = ex(sub, /\). (.+?)\n/s) || ex(sub, /\)\. (.+?)\n\n/);
      return fill('body.uv', { n, level: translateLevel(level, t), tip: translateUvTip(tip, t, lang) });
    }

    case 'heat_index': {
      const rh    = ex(sub,  /humidity: (\d+)%/);
      const hi    = ex(sub,  /Heat index: ([\d.]+)°C/);
      const level = ex(sub,  /°C \((.+?)\)/);
      return fill('body.heat_index', { rh, hi, level: translateLevel(level, t) });
    }

    case 'outdoor_comfort': {
      const score = ex(sub, /Score: (\d+)\/100/);
      return fill('body.outdoor_comfort', { score });
    }

    case 'rain_prob': {
      const pct = ex(sub, /today's max\): (\d+)%/);
      const num = Number(pct);
      if (num >= 70) return fill('body.rain_prob.high', { pct });
      if (num >= 40) return fill('body.rain_prob.mod',  { pct });
      return fill('body.rain_prob.low', { pct });
    }

    case 'wind': {
      const w   = ex(sub, /Wind speed: (\d+) km\/h/);
      const num = Number(w);
      if (num > 40) return fill('body.wind.strong', { w });
      if (num > 20) return fill('body.wind.breezy', { w });
      return fill('body.wind.calm', { w });
    }

    case 'visibility': {
      const km  = ex(sub, /Visibility: ([\d.]+) km/);
      const fog = sub.includes('Dense fog');
      if (fog) return fill('body.visibility.fog',   { km });
      return fill('body.visibility.clear', { km });
    }

    case 'storm_forecast': {
      const window = ex(sub, /window: (.+?)\)/);
      return fill('body.storm', { window });
    }

    case 'imd_warnings': {
      const hasStorm = sub.includes('possible storm');
      return hasStorm ? t('body.imd.storm') : t('body.imd.clear');
    }

    case 'sunrise_sunset': {
      const rise24      = ex(sub, /Sunrise: (.+?)  •/);
      const set24       = ex(sub, /Sunset: (.+?)\./);
      const goldenStart24 = ex(sub, /approx\. (.+?) –/);
      const riseEnd24   = ex(sub, /– (.+?) AM/);
      // B7: convert to 12h format (localized)
      const rise       = to12h(rise24, lang);
      const set        = to12h(set24, lang);
      const goldenStart= to12h(goldenStart24, lang);
      const riseEnd    = to12h(riseEnd24, lang);
      return fill('body.sunrise', { rise, set, goldenStart, riseEnd });
    }

    case 'soil_moisture': {
      const m    = ex(sub, /depth\): ([\d.]+) m³/);
      const band = ex(sub, /m³\/m³ \((.+?)\)/);
      const key  = band === 'Dry' ? 'body.soil.dry' : band === 'Wet' ? 'body.soil.wet' : 'body.soil.moist';
      return fill(key, { m });
    }

    case 'rainfall_7d': {
      const total = ex(sub, /7 days: ([\d.]+) mm/);
      const num   = Number(total);
      if (num >= 20) return fill('body.rainfall.high', { total });
      if (num >= 5)  return fill('body.rainfall.mod',  { total });
      return fill('body.rainfall.low', { total });
    }

    case 'frost_alert': {
      const min      = ex(sub, /temp this week: ([\d.-]+)°C/);
      const hasFrost = sub.includes('Frost risk detected');
      const key      = hasFrost ? 'body.frost.yes' : 'body.frost.no';
      return fill(key, { min });
    }

    case 'spraying_advisory': {
      const w    = ex(sub, /Wind: (\d+) km\/h/);
      const rh   = ex(sub, /Humidity: (\d+)%/);
      const ok   = !sub.includes('too strong');
      const key  = ok ? 'body.spray.ok' : 'body.spray.no';
      return fill(key, { w, rh });
    }

    case 'wave_height': {
      if (sub.includes('not available')) return t('body.wave.no_data');
      const wave  = ex(sub, /Wave height: ([\d.]+) m/);
      const level = ex(sub, /m \((.+?)\)/);
      const pSec  = ex(sub, /Wave period: ([\d.]+) s/);
      const period = pSec !== '—'
        ? fill('body.wave.period', { p: pSec })
        : '';
      return fill('body.wave.data', { wave, level: translateLevel(level, t), period });
    }

    case 'sea_temp': {
      if (sub.includes('not available')) return t('body.sea.no_data');
      const sst  = ex(sub, /temperature: ([\d.]+)°C/);
      const warm = sub.includes('without a wetsuit');
      return fill(warm ? 'body.sea.warm' : 'body.sea.cool', { sst });
    }

    case 'school_commute': {
      const rain  = ex(sub, /Rain probability (\d+)%/);
      const vis   = ex(sub, /visibility ([\d.]+) km/);
      const storm = sub.includes('thunderstorm risk');
      const stormPart = storm ? t('body.commute.storm') : '';
      const risk  = sub.includes('Use caution');
      const key   = risk ? 'body.commute.risk' : 'body.commute.ok';
      return fill(key, { rain, vis, storm: stormPart });
    }

    case 'guest_comfort': {
      const oci = ex(sub, /Index: (\d+)\/100/);
      const num = Number(oci);
      if (num >= 80) return fill('body.guest.high', { oci });
      if (num >= 60) return fill('body.guest.good', { oci });
      return fill('body.guest.mod', { oci });
    }

    case 'pollen':               return t('body.pollen');
    case 'tide':                 return t('body.tide');
    case 'destination_forecast': return t('body.destination');

    case 'packing': {
      const list = ex(sub, /Suggested: (.+?)\./);
      return fill('body.packing', { list });
    }

    default:
      return sub; // unknown card — keep English
  }
}

// ── Translate statusText label ────────────────────────────────────────────────
/**
 * Returns a translated status badge label for a card.
 * Only level-word parts are translated; numbers, units, and brand names stay EN.
 */
export function getTranslatedStatusText(card, lang, t) {
  if (lang === 'en' || !card) return card?.statusText ?? '';
  const stat = card.statusText ?? '';

  // Per-card overrides for specific patterns
  switch (card.id) {
    case 'imd_warnings': return t('level.no_imd');
    case 'storm_forecast': return t('level.storm');
    case 'pollen':        return t('level.na');
    case 'tide':          return t('level.mock_est');
    case 'destination_forecast': return t('level.no_dest');
    case 'sunrise_sunset': {
      // "Sunset 18:38" → "सूर्यास्त 6:38 शाम" (hi) / "Sunset 6:38 PM" (en)
      const time24 = stat.replace(/^Sunset\s*/, '').trim();
      const time12 = to12h(time24, lang);
      if (lang === 'hi') return `${t('chip.sunset')} ${time12}`;
      return `Sunset ${time12}`;
    }

    case 'frost_alert':
      // catalog returns '⚠️ Frost Risk' or 'No Frost Risk'
      return stat.startsWith('⚠️') ? t('level.frost_risk') : t('level.no_frost');

    case 'spraying_advisory':
      return stat.includes('Allowed') ? t('level.spraying_ok') : t('level.spraying_no');
    case 'school_commute':
      return stat.includes('Caution') ? t('level.caution_commute') : t('level.safe');
    case 'wave_height':
      if (stat === 'No Marine Data') return t('level.no_marine');
      // "2.1 m • Rough" — keep numbers, translate label
      return stat.replace(/• (.+)$/, (_, lbl) => '• ' + translateLevel(lbl.trim(), t));
    case 'sea_temp':
      if (stat === 'No Marine Data') return t('level.no_marine');
      // "26.5°C • Warm"
      return stat.replace(/• (.+)$/, (_, lbl) => '• ' + translateLevel(lbl.trim(), t));
    default:
      // Generic: "AQI 72 • Moderate" → translate only the label part after •
      if (stat.includes(' • ')) {
        const [prefix, label] = stat.split(' • ');
        return `${prefix} • ${translateLevel(label?.trim(), t)}`;
      }
      return translateLevel(stat, t);
  }
}
