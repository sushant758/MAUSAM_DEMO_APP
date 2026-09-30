// src/lib/indices.test.js
// ─── A8: Unit tests for pure weather formula functions ─────────────────────────
// All functions are side-effect free — no mocking needed.
// ──────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  clamp,
  heatIndexC,
  heatCategory,
  heatCategoryLabel,
  uvCategory,
  uvCategoryLabel,
  uvProtectionTip,
  aqiCategoryUS,
  aqiCategoryLabel,
  aqiStatusColor,
  outdoorComfort,
  bestWindow,
  soilMoistureBand,
  seaStateLabel,
  frostRisk,
  isThunderstorm,
  isDenseFog,
} from './indices';

// ── clamp ──────────────────────────────────────────────────────────────────────
describe('clamp', () => {
  it('clamps to lower bound', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps to upper bound', () => expect(clamp(15, 0, 10)).toBe(10));
  it('returns value when in range', () => expect(clamp(5, 0, 10)).toBe(5));
});

// ── heatIndexC ────────────────────────────────────────────────────────────────
describe('heatIndexC', () => {
  it('returns air temp below 26.7°C threshold', () => {
    expect(heatIndexC(25, 60)).toBe(25);
  });

  it('returns air temp when Fahrenheit equivalent is below 80°F', () => {
    // 26°C = 78.8°F < 80°F → return air temp
    expect(heatIndexC(26, 70)).toBe(26);
  });

  it('heat index > air temp above threshold', () => {
    const hi = heatIndexC(38, 80);
    expect(hi).toBeGreaterThan(38);
  });

  it('heat index increases with humidity', () => {
    const lo = heatIndexC(35, 40);
    const hi = heatIndexC(35, 90);
    expect(hi).toBeGreaterThan(lo);
  });

  it('produces reasonable value at 40°C/90%RH', () => {
    const hi = heatIndexC(40, 90);
    expect(hi).toBeGreaterThan(45);   // should feel dangerously hot
    expect(hi).toBeLessThan(110);     // Rothfusz can reach ~94°C at extreme humidity
  });
});

// ── heatCategory ──────────────────────────────────────────────────────────────
describe('heatCategory', () => {
  it('comfortable below 27°C', () => expect(heatCategory(25)).toBe('comfortable'));
  it('caution 27–32°C', () => expect(heatCategory(29)).toBe('caution'));
  it('extreme_caution 32–41°C', () => expect(heatCategory(36)).toBe('extreme_caution'));
  it('danger 41–54°C', () => expect(heatCategory(45)).toBe('danger'));
  it('extreme_danger ≥54°C', () => expect(heatCategory(55)).toBe('extreme_danger'));
});

// ── heatCategoryLabel ─────────────────────────────────────────────────────────
describe('heatCategoryLabel', () => {
  it('returns Comfortable for 25°C', () => expect(heatCategoryLabel(25)).toBe('Comfortable'));
  it('returns Caution for 29°C', () => expect(heatCategoryLabel(29)).toBe('Caution'));
  it('returns Extreme Danger for 55°C', () => expect(heatCategoryLabel(55)).toBe('Extreme Danger'));
});

// ── uvCategory ────────────────────────────────────────────────────────────────
describe('uvCategory', () => {
  it('low for UV 0–2', () => {
    expect(uvCategory(0)).toBe('low');
    expect(uvCategory(2)).toBe('low');
  });
  it('moderate for UV 3–5', () => expect(uvCategory(4)).toBe('moderate'));
  it('high for UV 6–7', () => expect(uvCategory(6)).toBe('high'));
  it('very_high for UV 8–10', () => expect(uvCategory(9)).toBe('very_high'));
  it('extreme for UV ≥11', () => expect(uvCategory(11)).toBe('extreme'));
});

// ── uvCategoryLabel ───────────────────────────────────────────────────────────
describe('uvCategoryLabel', () => {
  it('Low for UV 2', () => expect(uvCategoryLabel(2)).toBe('Low'));
  it('Very High for UV 8', () => expect(uvCategoryLabel(8)).toBe('Very High'));
  it('Extreme for UV 12', () => expect(uvCategoryLabel(12)).toBe('Extreme'));
});

// ── uvProtectionTip ───────────────────────────────────────────────────────────
describe('uvProtectionTip', () => {
  it('no protection needed at low UV', () => {
    expect(uvProtectionTip(1)).toContain('No protection');
  });
  it('SPF 30+ for moderate', () => {
    expect(uvProtectionTip(4)).toContain('SPF 30');
  });
  it('SPF 50+ for very high UV', () => {
    expect(uvProtectionTip(9)).toContain('SPF 50');
  });
  it('full coverage for extreme UV', () => {
    expect(uvProtectionTip(12)).toContain('full-coverage');
  });
});

// ── aqiCategoryUS ─────────────────────────────────────────────────────────────
describe('aqiCategoryUS', () => {
  it('good for AQI 0–50', () => expect(aqiCategoryUS(30)).toBe('good'));
  it('moderate for AQI 51–100', () => expect(aqiCategoryUS(75)).toBe('moderate'));
  it('unhealthy_sensitive for AQI 101–150', () => expect(aqiCategoryUS(120)).toBe('unhealthy_sensitive'));
  it('unhealthy for AQI 151–200', () => expect(aqiCategoryUS(170)).toBe('unhealthy'));
  it('very_unhealthy for AQI 201–300', () => expect(aqiCategoryUS(250)).toBe('very_unhealthy'));
  it('hazardous for AQI >300', () => expect(aqiCategoryUS(350)).toBe('hazardous'));
});

// ── aqiCategoryLabel ──────────────────────────────────────────────────────────
describe('aqiCategoryLabel', () => {
  it('returns Good for AQI 30', () => expect(aqiCategoryLabel(30)).toBe('Good'));
  it('returns Unhealthy for AQI 175', () => expect(aqiCategoryLabel(175)).toBe('Unhealthy'));
  it('returns Hazardous for AQI 350', () => expect(aqiCategoryLabel(350)).toBe('Hazardous'));
});

// ── aqiStatusColor ────────────────────────────────────────────────────────────
describe('aqiStatusColor', () => {
  it('returns emerald for Good AQI', () => {
    expect(aqiStatusColor(30)).toContain('emerald');
  });
  it('returns yellow for Moderate AQI', () => {
    expect(aqiStatusColor(75)).toContain('yellow');
  });
  it('returns red for Unhealthy AQI', () => {
    expect(aqiStatusColor(170)).toContain('red');
  });
});

// ── outdoorComfort ────────────────────────────────────────────────────────────
describe('outdoorComfort', () => {
  it('returns 100 for perfect conditions', () => {
    expect(outdoorComfort({ hi: 24, aqi: 0, uv: 0, rainProb: 0 })).toBe(100);
  });

  it('returns 0 for extreme conditions', () => {
    // hi=41°C, aqi=200, uv=11, rain=100% → all penalties maxed
    expect(outdoorComfort({ hi: 41, aqi: 200, uv: 11, rainProb: 100 })).toBe(0);
  });

  it('score decreases with higher AQI', () => {
    const clean = outdoorComfort({ hi: 28, aqi: 30, uv: 4, rainProb: 10 });
    const dirty = outdoorComfort({ hi: 28, aqi: 180, uv: 4, rainProb: 10 });
    expect(clean).toBeGreaterThan(dirty);
  });

  it('score decreases with higher rain probability', () => {
    const dry  = outdoorComfort({ hi: 28, aqi: 50, uv: 4, rainProb: 5 });
    const rainy = outdoorComfort({ hi: 28, aqi: 50, uv: 4, rainProb: 80 });
    expect(dry).toBeGreaterThan(rainy);
  });

  it('returns integer (Math.round)', () => {
    const result = outdoorComfort({ hi: 30, aqi: 60, uv: 5, rainProb: 20 });
    expect(Number.isInteger(result)).toBe(true);
  });

  it('result stays in [0, 100]', () => {
    const result = outdoorComfort({ hi: 60, aqi: 500, uv: 20, rainProb: 150 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});

// ── bestWindow ────────────────────────────────────────────────────────────────
describe('bestWindow', () => {
  const makeHours = (n, overrides = {}) =>
    Array.from({ length: n }, (_, i) => ({
      hour: i + 6,
      hi: 28,
      aqi: 50,
      uv: 4,
      rainProb: 10,
      ...overrides,
    }));

  it('returns null for empty hours', () => {
    expect(bestWindow([])).toBeNull();
  });

  it('returns a window object with correct shape', () => {
    const result = bestWindow(makeHours(6));
    expect(result).toHaveProperty('startHour');
    expect(result).toHaveProperty('endHour');
    expect(result).toHaveProperty('comfortPct');
  });

  it('picks the cooler window when conditions differ', () => {
    const hours = [
      { hour: 6, hi: 24, aqi: 30, uv: 2, rainProb: 5 },  // cool morning
      { hour: 7, hi: 24, aqi: 30, uv: 2, rainProb: 5 },
      { hour: 14, hi: 40, aqi: 150, uv: 9, rainProb: 60 }, // harsh afternoon
      { hour: 15, hi: 40, aqi: 150, uv: 9, rainProb: 60 },
    ];
    const result = bestWindow(hours, {});
    expect(result.startHour).toBe(6);
  });
});

// ── soilMoistureBand ──────────────────────────────────────────────────────────
describe('soilMoistureBand', () => {
  it('Dry below 0.15', () => expect(soilMoistureBand(0.10)).toBe('Dry'));
  it('Moist 0.15–0.34', () => expect(soilMoistureBand(0.25)).toBe('Moist'));
  it('Wet at 0.35+', () => expect(soilMoistureBand(0.40)).toBe('Wet'));
});

// ── seaStateLabel ─────────────────────────────────────────────────────────────
describe('seaStateLabel', () => {
  it('Calm below 1m', () => expect(seaStateLabel(0.5)).toBe('Calm'));
  it('Moderate 1–2m', () => expect(seaStateLabel(1.5)).toBe('Moderate'));
  it('Rough above 2m', () => expect(seaStateLabel(2.5)).toContain('Rough'));
});

// ── frostRisk ─────────────────────────────────────────────────────────────────
describe('frostRisk', () => {
  it('true at 4°C', () => expect(frostRisk(4)).toBe(true));
  it('true below 4°C', () => expect(frostRisk(-2)).toBe(true));
  it('false above 4°C', () => expect(frostRisk(5)).toBe(false));
});

// ── isThunderstorm ────────────────────────────────────────────────────────────
describe('isThunderstorm', () => {
  it('true for WMO code 95', () => expect(isThunderstorm(95)).toBe(true));
  it('true for WMO code 99', () => expect(isThunderstorm(99)).toBe(true));
  it('false for WMO code 80 (rain shower)', () => expect(isThunderstorm(80)).toBe(false));
  it('false for code 0 (clear)', () => expect(isThunderstorm(0)).toBe(false));
});

// ── isDenseFog ────────────────────────────────────────────────────────────────
describe('isDenseFog', () => {
  it('true below 1000m', () => expect(isDenseFog(500)).toBe(true));
  it('false at 1000m', () => expect(isDenseFog(1000)).toBe(false));
  it('false above 1000m', () => expect(isDenseFog(5000)).toBe(false));
});
