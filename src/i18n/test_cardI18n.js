// Quick smoke-test for cardI18n translations (ESM)
import { getTranslatedCardBody, getTranslatedStatusText } from './cardI18n.js';
import { STRINGS } from './strings.js';

const t = (key, fb) => STRINGS.hi[key] ?? STRINGS.en[key] ?? fb ?? key;
const lang = 'hi';

const tests = [
  { id: 'aqi', statusText: 'AQI 72 \u2022 Moderate',
    subtext: 'AQI 72 (Moderate) \u2014 US EPA scale.\nPM2.5: 28.5 \u00b5g/m\u00b3  \u2022  PM10: 45.2 \u00b5g/m\u00b3.\n\nGeneral information, not medical advice.' },
  { id: 'rain_prob', statusText: '78% \u2022 High Risk',
    subtext: "Rain probability (today's max): 78%. High chance of rain \u2014 carry umbrella." },
  { id: 'soil_moisture', statusText: '0.18 m\u00b3/m\u00b3 \u2022 Moist',
    subtext: 'Soil moisture (0\u20131 cm depth): 0.18 m\u00b3/m\u00b3 (Moist).\nAdequate for most crops.\n\nCheck Gramin Krishi Mausam Sewa for crop-specific guidance.' },
  { id: 'wave_height', statusText: '1.8 m \u2022 Moderate',
    subtext: 'Wave height: 1.8 m (Moderate). Wave period: 12 s.\nHeuristic: Calm, Moderate, Rough/Caution.' },
  { id: 'spraying_advisory', statusText: 'Wind Too Strong',
    subtext: 'Wind: 22 km/h. Humidity: 65%.\nWind too strong for spraying (> 15 km/h).' },
  { id: 'uv', statusText: 'UV 8 \u2022 Very High',
    subtext: 'UV Index: 8 (Very High). Apply SPF 50+ sunscreen every 2 hours.\n\nGeneral information, not medical advice.' },
  { id: 'pollen', statusText: 'Not Available',
    subtext: 'Pollen data is not available for this region in the prototype.' },
  { id: 'frost_alert', statusText: 'No Frost Risk',
    subtext: 'Min night temp this week: 12.0\u00b0C.\nNo frost risk. Air-temp heuristic: frost when min temp \u22644\u00b0C.\nCheck local Gramin Krishi Mausam Sewa for crop-specific guidance.' },
  { id: 'wind', statusText: '8 km/h \u2022 Calm',
    subtext: 'Wind speed: 8 km/h (Calm). Calm conditions \u2014 good for outdoor activities.' },
];

let allOk = true;
for (const card of tests) {
  const stat = getTranslatedStatusText(card, lang, t);
  const body = getTranslatedCardBody(card, lang, t);
  const isHindi = /[\u0900-\u097F]/.test(body);
  const status = isHindi ? '\u2705 PASS' : '\u26a0\ufe0f  WARN';
  console.log(card.id + ': ' + status);
  console.log('  status:', stat.substring(0, 60));
  console.log('  body:', body.substring(0, 80));
  if (!isHindi) allOk = false;
}

console.log('\nOverall:', allOk ? 'ALL PASS \u2705' : 'SOME WARNINGS \u26a0\ufe0f');
