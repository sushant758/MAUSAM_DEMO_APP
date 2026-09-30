// src/i18n/i18n.test.js
// ─── A8: Unit tests for the i18n layer ─────────────────────────────────────
// Tests STRINGS completeness, t() lookup, tp() template substitution,
// cardI18n translation output, and level-word mapping.
// ────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { STRINGS } from './strings';
import { getTranslatedCardBody, getTranslatedStatusText, translateLevel } from './cardI18n';

// ── STRINGS completeness ──────────────────────────────────────────────────────
describe('STRINGS — completeness', () => {
  const enKeys = Object.keys(STRINGS.en);
  const hiKeys = Object.keys(STRINGS.hi);

  it('has English strings', () => expect(enKeys.length).toBeGreaterThan(0));
  it('has Hindi strings', () => expect(hiKeys.length).toBeGreaterThan(0));

  it('every EN key has a HI translation', () => {
    const missing = enKeys.filter((k) => !STRINGS.hi.hasOwnProperty(k));
    expect(missing).toHaveLength(0);
  });

  it('every HI key exists in EN (no orphaned HI keys)', () => {
    const orphaned = hiKeys.filter((k) => !STRINGS.en.hasOwnProperty(k));
    expect(orphaned).toHaveLength(0);
  });

  it('EN and HI key counts are equal', () => {
    expect(enKeys.length).toBe(hiKeys.length);
  });
});

// ── STRINGS — spot checks (EN) ─────────────────────────────────────────────────
describe('STRINGS.en — spot checks', () => {
  it('chip.live is "Live"', () => expect(STRINGS.en['chip.live']).toBe('Live'));
  it('chip.mock is "Mock data"', () => expect(STRINGS.en['chip.mock']).toBe('Mock data'));
  it('level.low is "Low"', () => expect(STRINGS.en['level.low']).toBe('Low'));
  it('level.moderate is "Moderate"', () => expect(STRINGS.en['level.moderate']).toBe('Moderate'));
  it('level.high is "High"', () => expect(STRINGS.en['level.high']).toBe('High'));
  it('banner.undo is "Undo"', () => expect(STRINGS.en['banner.undo']).toBe('Undo'));
  it('chat.greeting exists and is non-empty', () => {
    expect(STRINGS.en['chat.greeting']).toBeTruthy();
  });
});

// ── STRINGS — spot checks (HI) ────────────────────────────────────────────────
describe('STRINGS.hi — spot checks', () => {
  it('chip.live contains Devanagari', () => {
    expect(/[\u0900-\u097F]/.test(STRINGS.hi['chip.live'])).toBe(true);
  });
  it('chip.mock contains Devanagari', () => {
    expect(/[\u0900-\u097F]/.test(STRINGS.hi['chip.mock'])).toBe(true);
  });
  it('level.low is "कम"', () => expect(STRINGS.hi['level.low']).toBe('कम'));
  it('level.moderate is "मध्यम"', () => expect(STRINGS.hi['level.moderate']).toBe('मध्यम'));
  it('level.high is "उच्च"', () => expect(STRINGS.hi['level.high']).toBe('उच्च'));
  it('banner.undo contains Devanagari (पूर्ववत)', () => {
    expect(/[\u0900-\u097F]/.test(STRINGS.hi['banner.undo'])).toBe(true);
  });
  it('body.sunrise HI contains {riseEnd} placeholder (12h time injected at runtime)', () => {
    const val = STRINGS.hi['body.sunrise'];
    // Template contains the placeholder; actual सुबह/शाम suffix comes from to12h() at runtime
    expect(val).toContain('{riseEnd}');
    // AM must NOT appear in the HI template (was a previous bug)
    expect(val).not.toContain(' AM ');
  });
  it('chip.note.pollen HI contains Devanagari', () => {
    expect(/[\u0900-\u097F]/.test(STRINGS.hi['chip.note.pollen'])).toBe(true);
  });
  it('chip.sunset HI is "सूर्यास्त"', () => {
    expect(STRINGS.hi['chip.sunset']).toBe('सूर्यास्त');
  });
});

// ── translateLevel ────────────────────────────────────────────────────────────
describe('translateLevel (HI)', () => {
  const t = (key, fb) => STRINGS.hi[key] ?? STRINGS.en[key] ?? fb ?? key;

  it('Low → कम', () => expect(translateLevel('Low', t)).toBe('कम'));
  it('Moderate → मध्यम', () => expect(translateLevel('Moderate', t)).toBe('मध्यम'));
  it('High → उच्च', () => expect(translateLevel('High', t)).toBe('उच्च'));
  it('Caution → सावधानी', () => expect(translateLevel('Caution', t)).toBe('सावधानी'));
  it('Comfortable → आरामदायक', () => expect(translateLevel('Comfortable', t)).toBe('आरामदायक'));
  it('Not Available → उपलब्ध नहीं', () => expect(translateLevel('Not Available', t)).toBe('उपलब्ध नहीं'));
  it('High Risk → अधिक जोखिम', () => expect(translateLevel('High Risk', t)).toBe('अधिक जोखिम'));
  it('No IMD Alert → कोई IMD चेतावनी नहीं', () => {
    expect(translateLevel('No IMD Alert', t)).toBe('कोई IMD चेतावनी नहीं');
  });
  it('unknown label falls through unchanged', () => {
    expect(translateLevel('Some Unknown Term', t)).toBe('Some Unknown Term');
  });
});

// ── getTranslatedStatusText ────────────────────────────────────────────────────
describe('getTranslatedStatusText', () => {
  const t = (key, fb) => STRINGS.hi[key] ?? STRINGS.en[key] ?? fb ?? key;
  const lang = 'hi';

  it('returns statusText unchanged for lang=en', () => {
    const card = { id: 'aqi', statusText: 'AQI 72 • Moderate' };
    expect(getTranslatedStatusText(card, 'en', t)).toBe('AQI 72 • Moderate');
  });

  it('translates level word in "AQI 72 • Moderate"', () => {
    const card = { id: 'aqi', statusText: 'AQI 72 • Moderate' };
    const result = getTranslatedStatusText(card, lang, t);
    expect(result).toContain('AQI 72');
    expect(result).toContain('मध्यम');
  });

  it('translates pollen status to "उपलब्ध नहीं"', () => {
    const card = { id: 'pollen', statusText: 'Not Available' };
    expect(getTranslatedStatusText(card, lang, t)).toContain('उपलब्ध');
  });

  it('translates frost_alert "No Frost Risk" to HI', () => {
    const card = { id: 'frost_alert', statusText: 'No Frost Risk' };
    const result = getTranslatedStatusText(card, lang, t);
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
    expect(result).not.toContain('⚠️');
  });

  it('translates frost_alert "⚠️ Frost Risk" to HI with emoji', () => {
    const card = { id: 'frost_alert', statusText: '⚠️ Frost Risk' };
    const result = getTranslatedStatusText(card, lang, t);
    expect(result).toContain('⚠️');
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
  });

  it('translates sunrise_sunset "Sunset 18:38" to HI with 12h format', () => {
    const card = { id: 'sunrise_sunset', statusText: 'Sunset 18:38' };
    const result = getTranslatedStatusText(card, lang, t);
    expect(result).toContain('सूर्यास्त');  // contains सूर्यास्त
    // B7: 18:38 (24h) is now rendered as 6:38 शाम (12h HI)
    expect(result).toContain('6:38');
    expect(result).toContain('शाम');
  });

  it('translates spraying Allowed', () => {
    const card = { id: 'spraying_advisory', statusText: 'Spraying Allowed' };
    const result = getTranslatedStatusText(card, lang, t);
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
  });

  it('translates wind speed "8 km/h • Calm" — keeps number', () => {
    const card = { id: 'wind', statusText: '8 km/h • Calm' };
    const result = getTranslatedStatusText(card, lang, t);
    expect(result).toContain('8 km/h');
  });
});

// ── getTranslatedCardBody ─────────────────────────────────────────────────────
describe('getTranslatedCardBody', () => {
  const t = (key, fb) => STRINGS.hi[key] ?? STRINGS.en[key] ?? fb ?? key;
  const lang = 'hi';

  const makeCard = (id, statusText, subtext) => ({ id, statusText, subtext });

  it('returns EN subtext unchanged for lang=en', () => {
    const card = makeCard('pollen', 'Not Available', 'Pollen data is not available.');
    expect(getTranslatedCardBody(card, 'en', t)).toBe('Pollen data is not available.');
  });

  it('translates pollen card to HI', () => {
    const card = makeCard('pollen', 'Not Available', 'Pollen data is not available.');
    const result = getTranslatedCardBody(card, lang, t);
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
  });

  it('translates AQI card body contains Devanagari', () => {
    const card = makeCard(
      'aqi',
      'AQI 72 • Moderate',
      'AQI 72 (Moderate) — US EPA scale.\nPM2.5: 28.5 µg/m³  •  PM10: 45.2 µg/m³.\n\nGeneral information, not medical advice.',
    );
    const result = getTranslatedCardBody(card, lang, t);
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
  });

  it('AQI body keeps AQI number and µg/m³ unit', () => {
    const card = makeCard(
      'aqi',
      'AQI 72 • Moderate',
      'AQI 72 (Moderate) — US EPA scale.\nPM2.5: 28.5 µg/m³  •  PM10: 45.2 µg/m³.\n\nGeneral information, not medical advice.',
    );
    const result = getTranslatedCardBody(card, lang, t);
    expect(result).toContain('72');
    expect(result).toContain('µg/m³');
  });

  it('rain_prob body for 78% contains varna number', () => {
    const card = makeCard(
      'rain_prob',
      '78% • High Risk',
      "Rain probability (today's max): 78%. High chance.",
    );
    const result = getTranslatedCardBody(card, lang, t);
    expect(result).toContain('78%');
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
  });

  it('soil_moisture body contains m³/m³ unit', () => {
    const card = makeCard(
      'soil_moisture',
      '0.18 m³/m³ • Moist',
      'Soil moisture (0–1 cm depth): 0.18 m³/m³ (Moist).\nAdequate for most crops.',
    );
    const result = getTranslatedCardBody(card, lang, t);
    expect(result).toContain('m³/m³');
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
  });

  it('wind card Calm body in HI', () => {
    const card = makeCard(
      'wind',
      '8 km/h • Calm',
      'Wind speed: 8 km/h (Calm). Calm conditions.',
    );
    const result = getTranslatedCardBody(card, lang, t);
    expect(result).toContain('8 km/h');
    expect(/[\u0900-\u097F]/.test(result)).toBe(true);
  });

  it('unknown card id returns original English subtext', () => {
    const card = makeCard('unknown_card_xyz', 'N/A', 'Some EN text');
    expect(getTranslatedCardBody(card, lang, t)).toBe('Some EN text');
  });
});
