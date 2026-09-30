// ─── src/components/DemoControls.jsx ─────────────────────────────────────────
// A8: Demo override panel — lets a presenter force specific weather scenarios
// without needing real API data or switching cities.
//
// DESIGN RULES:
//  • Only visible when URL has ?demo=1  OR  the dev-mode toggle is on
//  • Never touches ranking logic or catalog.js — just injects a synthetic ctx
//  • Passes overrideCtx up to HomeScreen via onOverride(ctx | null)
//  • "Reset" clears the override and restores real API data
//  • All scenario values are deterministic so screenshots/recordings are stable
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FlaskConical, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

// ── Demo scenarios ─────────────────────────────────────────────────────────────
// Each scenario provides a complete weather context object.
// Values are chosen to exercise different card states visually.

const BASE = {
  locationName: 'Demo City',
  tempUnit: 'C',
  hourlyVis: 8000,
  heatIndex: 28,
  soilMoisture: 0.20,
  marine: null,
};

const DAILY_BASE = {
  precipProbMax: [15, 20, 10, 30, 5, 25, 40],
  tempMax:  [32, 31, 33, 30, 29, 28, 34],
  tempMin:  [22, 21, 23, 20, 19, 18, 24],
  weatherCode: [1, 1, 3, 61, 1, 1, 80],
  sunrise: ['2025-06-01T05:30', '2025-06-02T05:30'],
  sunset:  ['2025-06-01T19:15', '2025-06-02T19:14'],
};

export const DEMO_SCENARIOS = [
  {
    id: 'heatwave',
    label: '🌡️ Heatwave + High AQI',
    labelHi: '🌡️ लू + उच्च AQI',
    description: 'Extreme heat, very high AQI — health & parent personas surface urgent cards',
    ctx: {
      ...BASE,
      isLive: true,
      locationName: 'Demo City (Heatwave)',
      weather: { temp: 43, tempMax: 46, tempMin: 38, humidity: 25, windSpeed: 8, weatherCode: 1 },
      daily: { ...DAILY_BASE, precipProbMax: [5, 3, 2, 4, 3, 2, 5] },
      hourly: { relativeHumidity2m: Array(24).fill(25) },
      aqi: { us_aqi: 175, pm2_5: 90, pm10: 140 },
      uv: { current: 10, daily_max: [11, 10, 9, 11, 10, 9, 8] },
      heatIndex: 52,
    },
  },
  {
    id: 'monsoon',
    label: '🌧️ Heavy Monsoon',
    labelHi: '🌧️ भारी मानसून',
    description: 'High rain probability, thunderstorm code — travel & school commute cards pin',
    ctx: {
      ...BASE,
      isLive: true,
      locationName: 'Demo City (Monsoon)',
      weather: { temp: 27, tempMax: 29, tempMin: 24, humidity: 92, windSpeed: 18, weatherCode: 95 },
      daily: {
        ...DAILY_BASE,
        precipProbMax: [85, 90, 78, 88, 92, 70, 65],
        weatherCode: [95, 95, 80, 95, 80, 61, 61],
      },
      hourly: { relativeHumidity2m: Array(24).fill(90) },
      aqi: { us_aqi: 55, pm2_5: 18, pm10: 30 },
      uv: { current: 2, daily_max: [3, 2, 2, 3, 2, 1, 2] },
      heatIndex: 34,
      hourlyVis: 2500,
    },
  },
  {
    id: 'perfect_beach',
    label: '🏖️ Perfect Beach Day',
    labelHi: '🏖️ परफेक्ट बीच डे',
    description: 'Ideal coastal conditions — beachgoer cards score high',
    ctx: {
      ...BASE,
      isLive: true,
      locationName: 'Demo City (Coastal)',
      weather: { temp: 28, tempMax: 31, tempMin: 24, humidity: 65, windSpeed: 14, weatherCode: 1 },
      daily: { ...DAILY_BASE, precipProbMax: [5, 8, 3, 10, 5, 4, 7] },
      hourly: { relativeHumidity2m: Array(24).fill(65) },
      aqi: { us_aqi: 35, pm2_5: 10, pm10: 18 },
      uv: { current: 7, daily_max: [8, 7, 8, 9, 7, 6, 5] },
      heatIndex: 30,
      marine: { wave_height: 1.2, wave_period: 8, sea_surface_temp: 27 },
    },
  },
  {
    id: 'fog_winter',
    label: '🌫️ Dense Fog + Frost',
    labelHi: '🌫️ घना कोहरा + पाला',
    description: 'Low visibility, frost risk — farmer & commuter cards surface urgent frost/fog alerts',
    ctx: {
      ...BASE,
      isLive: true,
      locationName: 'Demo City (Winter)',
      weather: { temp: 4, tempMax: 10, tempMin: 2, humidity: 95, windSpeed: 4, weatherCode: 45 },
      daily: {
        ...DAILY_BASE,
        tempMax:  [10, 11, 9, 12, 10, 8, 9],
        tempMin:  [2, 3, 1, 4, 2, 0, 1],
        precipProbMax: [15, 10, 20, 8, 12, 18, 10],
        weatherCode: [45, 45, 48, 45, 0, 45, 48],
      },
      hourly: { relativeHumidity2m: Array(24).fill(95) },
      aqi: { us_aqi: 165, pm2_5: 82, pm10: 130 },
      uv: { current: 1, daily_max: [2, 1, 1, 2, 1, 1, 2] },
      heatIndex: 4,
      hourlyVis: 400,
      soilMoisture: 0.08,
    },
  },
  {
    id: 'harvest',
    label: '🌾 Ideal Harvest Day',
    labelHi: '🌾 आदर्श फसल कटाई का दिन',
    description: 'Dry soil, low rain, calm wind — farmer spraying advisory turns green',
    ctx: {
      ...BASE,
      isLive: true,
      locationName: 'Demo City (Farm)',
      weather: { temp: 26, tempMax: 30, tempMin: 18, humidity: 45, windSpeed: 9, weatherCode: 1 },
      daily: { ...DAILY_BASE, precipProbMax: [5, 3, 8, 4, 2, 6, 5] },
      hourly: { relativeHumidity2m: Array(24).fill(45) },
      aqi: { us_aqi: 42, pm2_5: 12, pm10: 22 },
      uv: { current: 5, daily_max: [6, 5, 6, 7, 5, 4, 6] },
      heatIndex: 27,
      soilMoisture: 0.12,
    },
  },
];

// ── Component ──────────────────────────────────────────────────────────────────
/**
 * DemoControls — floating panel for selecting demo weather scenarios.
 *
 * Props:
 *   onOverride  {fn}      — (ctx | null) → void  — called when scenario chosen
 *   activeId    {string|null}  — currently active scenario id (null = real data)
 */
export default function DemoControls({ onOverride, activeId }) {
  const [open, setOpen] = useState(false);
  const { lang, t } = useLanguage();

  const handleSelect = (scenario) => {
    onOverride(scenario.ctx);
    setOpen(false);
  };

  const handleReset = () => {
    onOverride(null);
    setOpen(false);
  };

  const activeScenario = DEMO_SCENARIOS.find((s) => s.id === activeId);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-[360px] px-4 pointer-events-none">
      <div className="pointer-events-auto">

        {/* Trigger pill */}
        <motion.button
          onClick={() => setOpen((v) => !v)}
          whileTap={{ scale: 0.96 }}
          className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-full shadow-lg border text-sm font-bold transition-colors ${
            activeId
              ? 'bg-violet-600 text-white border-violet-700 shadow-violet-500/40'
              : 'bg-white/95 text-slate-700 border-slate-200 shadow-slate-200/80 backdrop-blur-md'
          }`}
          aria-label="Demo scenario controls"
          id="demo-controls-toggle"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FlaskConical className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {activeScenario
                ? (lang === 'hi' ? activeScenario.labelHi : activeScenario.label)
                : (lang === 'hi' ? 'डेमो परिदृश्य' : 'Demo Scenarios')}
            </span>
          </div>
          {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronUp className="w-4 h-4 shrink-0" />}
        </motion.button>

        {/* Dropdown panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute bottom-full left-0 right-0 mb-2 mx-0 bg-white rounded-[1.5rem] shadow-2xl border border-slate-200 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-600" />
                  <span className="text-sm font-bold text-slate-800">
                    {lang === 'hi' ? 'डेमो परिदृश्य चुनें' : 'Choose a Demo Scenario'}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Scenario list */}
              <div className="p-2 flex flex-col gap-1 max-h-72 overflow-y-auto">
                {DEMO_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    id={`demo-scenario-${s.id}`}
                    onClick={() => handleSelect(s)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-colors ${
                      activeId === s.id
                        ? 'bg-violet-50 border border-violet-200 text-violet-800'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <p className="text-sm font-bold leading-tight">
                      {lang === 'hi' ? s.labelHi : s.label}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {s.description}
                    </p>
                  </button>
                ))}
              </div>

              {/* Reset footer */}
              {activeId && (
                <div className="px-3 pb-3">
                  <button
                    onClick={handleReset}
                    id="demo-reset"
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
                  >
                    {lang === 'hi' ? '↺ असली डेटा पर वापस जाएँ' : '↺ Reset to Real Data'}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
