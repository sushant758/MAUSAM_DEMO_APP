import React, { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, MOCK_LOCATIONS } from '../data/personaData';
import { fetchWeatherCtx } from '../services/weather';
import { heatIndexC, heatCategoryLabel, uvCategoryLabel, uvProtectionTip,
         aqiCategoryLabel, aqiStatusColor, outdoorComfort, bestWindow,
         fmtHour, soilMoistureBand, seaStateLabel, frostRisk } from '../lib/indices';
import Header from './Header';
import HeroCard from './HeroCard';
import WhiteCard from './WhiteCard';
import ChatbotSection from './ChatbotSection';
import LocationModal from './LocationModal';
import UserProfileModal from './UserProfileModal';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_UNIT = 'mausam.tempUnit';
const LS_AUTO = 'mausam.autoPersona';

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── Compute live card overrides from ctx ────────────────────────────────────
// Returns a map { [cardId]: { subtext, statusText, gaugeValue, statusColor } }
// Only cards where we have real formula-derived data get overrides.
// This is a lightweight bridge until the A2 catalog engine is in place (Phase 4).
function computeLiveOverrides(ctx) {
  if (!ctx) return {};

  const { weather, uv, aqi, marine, soil, daily, hourly } = ctx;
  const hi     = heatIndexC(weather.temp, weather.humidity);
  const hiLbl  = heatCategoryLabel(hi);
  const uvLbl  = uvCategoryLabel(uv.current);
  const uvTip  = uvProtectionTip(uv.current);
  const aqiLbl = aqiCategoryLabel(aqi.us_aqi);
  const aqiClr = aqiStatusColor(aqi.us_aqi);
  const oci    = outdoorComfort({ hi, aqi: aqi.us_aqi, uv: uv.current, rainProb: daily.precipProbMax?.[0] ?? 10 });

  // Best windows (used by Fitness, Health, Commuter heroes)
  const bestRun   = hourly.length ? bestWindow(hourly, { lenH: 2, fromH: 5,  toH: 10 }) : null;
  const bestField = hourly.length ? bestWindow(hourly, { lenH: 2, fromH: 4,  toH: 9  }) : null;

  const overrides = {};

  // ─── Health persona ───────────────────────────────────────────────────────
  overrides['h1'] = {
    subtext: `AQI ${aqi.us_aqi} (${aqiLbl}) — US AQI scale. PM2.5: ${aqi.pm2_5?.toFixed(1)} µg/m³, PM10: ${aqi.pm10?.toFixed(1)} µg/m³.\n\nGeneral information, not medical advice.`,
    statusText: `AQI ${aqi.us_aqi} • ${aqiLbl}`,
    statusColor: aqiClr,
  };
  overrides['h2'] = {
    subtext: `UV Index: ${uv.current} (${uvLbl}). ${uvTip}\n\nGeneral information, not medical advice.`,
    statusText: `UV ${uv.current} • ${uvLbl}`,
    statusColor: uv.current >= 6
      ? 'bg-red-50 text-red-700 border-red-200'
      : uv.current >= 3
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  overrides['h3'] = {
    subtext: `Relative humidity: ${weather.humidity}%. Heat index: ${hi.toFixed(1)}°C (${hiLbl}). Drink water regularly during outdoor activity.\n\nGeneral information, not medical advice.`,
    statusText: hiLbl,
  };
  overrides['h4'] = {
    subtext: `Score: ${oci}/100. Formula: 35% heat index + 30% AQI + 15% UV + 20% rain probability. Higher = more comfortable.`,
    gaugeValue: oci,
  };

  // ─── Fitness persona ──────────────────────────────────────────────────────
  overrides['fit1'] = {
    subtext: `Heat index: ${hi.toFixed(1)}°C (${hiLbl}). ${hi >= 32 ? 'Reduce workout intensity — heat stress risk elevated.' : 'Low heat stress risk. Good for morning runs.'}`,
    statusText: hiLbl,
    statusColor: hi >= 41 ? 'bg-red-50 text-red-700 border-red-200'
                : hi >= 32 ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  overrides['fit2'] = {
    subtext: `Wind: ${weather.windSpeed} km/h. Conditions${weather.weatherCode <= 1 ? ' dry and clear' : ' variable'}. ${weather.windSpeed > 40 ? 'Strong wind — caution on exposed trails.' : 'Comfortable wind for outdoor running.'}`,
    statusText: weather.windSpeed > 40 ? 'Strong Wind' : 'Good Conditions',
  };
  overrides['fit3'] = {
    subtext: `UV Index ${uv.current} (${uvLbl}) during exercise window. ${uvTip}`,
    statusText: `UV ${uv.current} • ${uvLbl}`,
    statusColor: uv.current >= 6
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-amber-50 text-amber-700 border-amber-200',
  };
  overrides['fit4'] = {
    subtext: `Sunrise: ${daily.sunrise}. Sunset: ${daily.sunset}. Best light for running: ${daily.sunrise} – ${daily.sunrise.replace(/(\d+)/, (h) => String(parseInt(h) + 3))} AM and 5 PM – ${daily.sunset}.`,
    statusText: 'Daylight Clear',
  };

  // ─── Beach persona ────────────────────────────────────────────────────────
  if (marine) {
    const waveM = marine.waveHeight ?? 0;
    overrides['b1'] = {
      subtext: `Wave height: ${waveM.toFixed(1)} m (${seaStateLabel(waveM)}). ${marine.wavePeriod ? `Wave period: ${marine.wavePeriod.toFixed(0)} s.` : ''} Heuristic: <1 m Calm, 1–2 m Moderate, >2 m Rough/Caution.`,
      statusText: `${waveM.toFixed(1)} m • ${seaStateLabel(waveM)}`,
      statusColor: waveM > 2 ? 'bg-red-50 text-red-700 border-red-200'
                 : waveM >= 1 ? 'bg-amber-50 text-amber-700 border-amber-200'
                 : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    overrides['b2'] = {
      subtext: `Sea surface temperature: ${marine.seaSurfaceTemp?.toFixed(1) ?? '—'}°C. ${(marine.seaSurfaceTemp ?? 0) >= 24 ? 'Warm — comfortable swimming without wetsuit.' : 'Cooler — wetsuit may be advisable.'}`,
      statusText: `${marine.seaSurfaceTemp?.toFixed(1) ?? '—'}°C • ${(marine.seaSurfaceTemp ?? 0) >= 24 ? 'Warm' : 'Cool'}`,
    };
  }
  // UV beach card always uses live UV
  overrides['b3'] = {
    subtext: `UV Index ${uv.max} (max today, ${uvCategoryLabel(uv.max)}). Apply SPF 50+ water-resistant sunscreen. Reapply every 2 hours.`,
    statusText: `UV ${uv.max} • ${uvCategoryLabel(uv.max)}`,
    statusColor: uv.max >= 8 ? 'bg-red-50 text-red-700 border-red-200'
               : uv.max >= 6 ? 'bg-orange-50 text-orange-700 border-orange-200'
               : 'bg-amber-50 text-amber-700 border-amber-200',
  };

  // ─── Parent persona ───────────────────────────────────────────────────────
  const pickupRainProb = daily.precipProbMax?.[0] ?? 40;
  overrides['p2'] = {
    subtext: `Rain probability at pickup time: ${pickupRainProb}%. ${pickupRainProb >= 40 ? 'Keep an umbrella in the car.' : 'Low rain risk at pickup time.'}`,
    statusText: `${pickupRainProb}% Rain Risk`,
    statusColor: pickupRainProb >= 60 ? 'bg-red-50 text-red-700 border-red-200'
               : pickupRainProb >= 40 ? 'bg-sky-50 text-sky-700 border-sky-200'
               : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  overrides['p3'] = {
    subtext: `UV Index ${uv.current} (${uvLbl}) during school hours. ${uv.current >= 3 ? 'Apply SPF 30+ if children play outdoors before 4 PM.' : 'UV is low — no special protection needed.'}\n\nGeneral information, not medical advice.`,
    statusText: `UV ${uv.current} • ${uvLbl}`,
    statusColor: uv.current >= 6
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-amber-50 text-amber-700 border-amber-200',
  };
  overrides['p4'] = {
    subtext: `Outdoor Comfort Index: ${oci}/100 for evening play window (5–6:30 PM). ${oci >= 70 ? 'Good conditions for outdoor play.' : 'Consider indoor activities due to heat or rain.'}`,
    gaugeValue: oci,
  };

  // ─── Farmer persona ───────────────────────────────────────────────────────
  const soilBand = soilMoistureBand(soil.moisture_0_1);
  overrides['f1'] = {
    subtext: `Soil moisture (0–1 cm): ${soil.moisture_0_1.toFixed(2)} m³/m³ (${soilBand}). ${soilBand === 'Dry' ? 'Irrigation recommended.' : soilBand === 'Wet' ? 'Skip irrigation — soil is saturated.' : 'Adequate for most crops.'}`,
    statusText: `${soil.moisture_0_1.toFixed(2)} m³/m³ • ${soilBand}`,
    statusColor: soilBand === 'Dry'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : soilBand === 'Wet'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const totalRain7d = (daily.precipSum7d ?? []).reduce((s, v) => s + (v ?? 0), 0).toFixed(1);
  overrides['f2'] = {
    subtext: `Expected total rainfall next 7 days: ${totalRain7d} mm. ${Number(totalRain7d) >= 10 ? 'Significant rain expected — skip heavy irrigation on days with >50% probability.' : 'Light rain or dry spell ahead.'}`,
    statusText: `${totalRain7d} mm Forecast`,
  };
  overrides['f3'] = {
    subtext: `Wind: ${weather.windSpeed} km/h. ${weather.windSpeed <= 15 ? 'Good conditions for crop spraying before 11 AM.' : 'Wind too strong for spraying (>15 km/h) — wait for calmer conditions.'}`,
    statusText: weather.windSpeed <= 15 ? 'Spraying Allowed' : 'Wind Too Strong',
    statusColor: weather.windSpeed <= 15
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-red-50 text-red-700 border-red-200',
  };
  const minTemp7d = Math.min(...(daily.tempMin7d ?? [weather.tempMin]));
  overrides['f4'] = {
    subtext: `Min night temp this week: ${minTemp7d.toFixed(1)}°C. ${frostRisk(minTemp7d) ? '⚠️ Frost risk detected (≤4°C). Protect sensitive crops.' : 'No frost risk. Air-temp heuristic: frost when min ≤4°C.'} Check Gramin Krishi Mausam Sewa for crop-specific guidance.`,
    statusText: frostRisk(minTemp7d) ? '⚠️ Frost Risk' : 'No Frost Risk',
    statusColor: frostRisk(minTemp7d)
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  // ─── Commuter persona ─────────────────────────────────────────────────────
  const visM = hourly[ctx.hour]?.visibility ?? 10000;
  const visKm = (visM / 1000).toFixed(1);
  overrides['c1'] = {
    subtext: `Visibility: ${visKm} km. ${visM < 1000 ? '⚠️ Dense fog — exercise extreme caution. Fog alert: <1000 m.' : 'Clear conditions. No fog.'}`,
    statusText: visM < 1000 ? `${visKm} km • Dense Fog` : `${visKm} km • No Fog`,
    statusColor: visM < 1000
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const eveningRainProb = daily.precipProbMax?.[0] ?? 30;
  overrides['c2'] = {
    subtext: `Rain probability this evening: ${eveningRainProb}%. ${eveningRainProb >= 40 ? 'Carry a compact umbrella for the commute home.' : 'Low evening rain risk.'}`,
    statusText: `${eveningRainProb}% Evening Rain`,
    statusColor: eveningRainProb >= 60
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-sky-50 text-sky-700 border-sky-200',
  };

  // ─── Event Planner persona ────────────────────────────────────────────────
  overrides['ep1'] = {
    subtext: `Rain probability this evening: ${daily.precipProbMax?.[0] ?? 10}%. ${(daily.precipProbMax?.[0] ?? 10) >= 40 ? '⚠️ Backup plan advised when rain probability >40%.' : 'Low rain risk — good for outdoor events.'}`,
    statusText: `${daily.precipProbMax?.[0] ?? 10}% • ${(daily.precipProbMax?.[0] ?? 10) < 20 ? 'Low Risk' : 'Moderate Risk'}`,
    statusColor: (daily.precipProbMax?.[0] ?? 10) >= 40
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  overrides['ep2'] = {
    subtext: `Wind speed: ${weather.windSpeed} km/h. ${weather.windSpeed > 40 ? '⚠️ Strong wind — tent structures at risk.' : 'Safe for open tent structures, arches, and light decorations.'}`,
    statusText: `${weather.windSpeed} km/h • ${weather.windSpeed > 40 ? 'Caution' : 'Safe'}`,
    statusColor: weather.windSpeed > 40
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  overrides['ep3'] = {
    subtext: `Sunset: ${daily.sunset}. Golden hour: approx. ${daily.sunset.replace(/(\d+):(\d+)/, (_, h, m) => `${parseInt(h) - 1}:${m}`)} – ${daily.sunset}. Best light for outdoor photography.`,
    statusText: `Sunset ${daily.sunset}`,
  };
  overrides['ep4'] = {
    subtext: `Evening temp: ~${weather.tempMax}°C max today. Outdoor Comfort Index: ${oci}/100. ${oci >= 70 ? 'Guests will be comfortable outdoors.' : 'Moderate comfort — consider fans or cooling.'}`,
    gaugeValue: oci,
  };

  return overrides;
}

export default function HomeScreen({ user, onLogout, isPhoneFrame, onTogglePhoneFrame }) {
  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0);
  const [tempUnit, setTempUnit] = useState(() => readLS(LS_UNIT, 'C'));
  const [autoSwitchedMode, setAutoSwitchedMode] = useState(() => readLS(LS_AUTO, true));
  const [currentLocation, setCurrentLocation] = useState(MOCK_LOCATIONS[0]);

  // A4: weather context state
  const [weatherCtx, setWeatherCtx] = useState(null);
  const [wxLoading, setWxLoading] = useState(true);

  // F6: banner
  const [autoBannerVisible, setAutoBannerVisible] = useState(false);
  const [autoBannerText, setAutoBannerText] = useState('');
  const prevPersonaIndexRef = useRef(null);
  const bannerTimerRef = useRef(null);

  // F8: selected personas
  const [selectedPersonas, setSelectedPersonas] = useState(() => [PERSONAS[0].id]);

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // F9: shared chat
  const [sharedMessages, setSharedMessages] = useState([]);
  const [sharedDraftMap, setSharedDraftMap] = useState({});

  const scrollContainerRef = useRef(null);
  const tabRowRef = useRef(null);
  const tabRefs = useRef([]);

  const activePersona = PERSONAS[currentPersonaIndex];

  // ─── Persist F3 settings ───────────────────────────────────────────────────
  useEffect(() => { writeLS(LS_UNIT, tempUnit); }, [tempUnit]);
  useEffect(() => { writeLS(LS_AUTO, autoSwitchedMode); }, [autoSwitchedMode]);

  // ─── A4: Fetch weather on location change ─────────────────────────────────
  useEffect(() => {
    setWxLoading(true);
    let cancelled = false;
    fetchWeatherCtx(currentLocation).then((ctx) => {
      if (cancelled) return;
      setWeatherCtx(ctx);
      setWxLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentLocation.id]);

  // ─── A4: Compute live overrides (memoized on ctx) ─────────────────────────
  const liveOverrides = useMemo(
    () => (weatherCtx ? computeLiveOverrides(weatherCtx) : {}),
    [weatherCtx]
  );

  // ─── A4: Build live location from ctx (overrides mock temp/condition) ─────
  const liveLocation = useMemo(() => {
    if (!weatherCtx) return currentLocation;
    const tempC = Math.round(weatherCtx.weather.temp);
    const tempF = Math.round(tempC * 9 / 5 + 32);
    return {
      ...currentLocation,
      tempC,
      tempF,
      condition: weatherCtx.weather.condition,
    };
  }, [weatherCtx, currentLocation]);

  // ─── Scroll helpers ────────────────────────────────────────────────────────
  const forceScrollToTop = useCallback(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // ─── Core persona change — swipe / tab / auto / demo ──────────────────────
  const goToPersona = useCallback((getNewIndex, source = 'tab') => {
    setCurrentPersonaIndex((prevIndex) => {
      const nextIndex = typeof getNewIndex === 'function' ? getNewIndex(prevIndex) : getNewIndex;
      if (source === 'auto' && nextIndex !== prevIndex) {
        prevPersonaIndexRef.current = prevIndex;
        const reason = `Switched to ${PERSONAS[nextIndex].name.split(' ')[0]} mode • Based on time of day & conditions`;
        setAutoBannerText(reason);
        setAutoBannerVisible(true);
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setAutoBannerVisible(false), 6000);
      }
      if (source === 'swipe') {
        setAutoSwitchedMode(false);
        writeLS(LS_AUTO, false);
      }
      return nextIndex;
    });
    forceScrollToTop();
    requestAnimationFrame(() => {
      forceScrollToTop();
      setTimeout(forceScrollToTop, 0);
      setTimeout(forceScrollToTop, 30);
    });
  }, [forceScrollToTop]);

  const handleNextPersona   = useCallback(() => goToPersona((p) => (p + 1) % PERSONAS.length, 'swipe'), [goToPersona]);
  const handlePrevPersona   = useCallback(() => goToPersona((p) => (p - 1 + PERSONAS.length) % PERSONAS.length, 'swipe'), [goToPersona]);
  const handleSelectPersona = useCallback((i) => goToPersona(i, 'tab'), [goToPersona]);

  useLayoutEffect(() => {
    forceScrollToTop();
    const id = requestAnimationFrame(() => forceScrollToTop());
    return () => cancelAnimationFrame(id);
  }, [currentPersonaIndex, forceScrollToTop]);

  useEffect(() => {
    const el = tabRefs.current[currentPersonaIndex];
    if (el && tabRowRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentPersonaIndex]);

  // F6 banner handlers
  const handleDismissBanner = useCallback(() => {
    setAutoBannerVisible(false);
    clearTimeout(bannerTimerRef.current);
  }, []);
  const handleUndoBanner = useCallback(() => {
    setAutoBannerVisible(false);
    clearTimeout(bannerTimerRef.current);
    setAutoSwitchedMode(false);
    writeLS(LS_AUTO, false);
    if (prevPersonaIndexRef.current !== null) {
      goToPersona(prevPersonaIndexRef.current, 'tab');
      prevPersonaIndexRef.current = null;
    }
  }, [goToPersona]);
  useEffect(() => () => clearTimeout(bannerTimerRef.current), []);

  // ─── Live hero score ───────────────────────────────────────────────────────
  const heroPersona = useMemo(() => {
    if (!weatherCtx) return activePersona;
    const { weather, uv, aqi, daily } = weatherCtx;
    const hi  = heatIndexC(weather.temp, weather.humidity);
    const oci = outdoorComfort({ hi, aqi: aqi.us_aqi, uv: uv.current, rainProb: daily.precipProbMax?.[0] ?? 10 });
    return { ...activePersona, hero: { ...activePersona.hero, score: oci, scoreLabel: 'Comfort' } };
  }, [activePersona, weatherCtx]);

  return (
    <div
      ref={scrollContainerRef}
      className="w-full h-full flex flex-col bg-gradient-to-b from-sky-200 via-sky-100/60 to-slate-50 text-slate-800 ios-scroll overflow-y-auto no-scrollbar pb-32 sm:pb-24 min-h-screen"
    >
      <Header
        location={liveLocation}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        tempUnit={tempUnit}
        onToggleTempUnit={() => setTempUnit((u) => (u === 'C' ? 'F' : 'C'))}
        autoSwitchedMode={autoSwitchedMode}
        onToggleAutoSwitched={() => setAutoSwitchedMode((a) => !a)}
        currentPersona={activePersona}
        user={user}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isPhoneFrame={isPhoneFrame}
        onTogglePhoneFrame={onTogglePhoneFrame}
        autoBannerVisible={autoBannerVisible}
        autoBannerText={autoBannerText}
        onDismissBanner={handleDismissBanner}
        onUndoBanner={handleUndoBanner}
      />

      <main className="w-full px-3 sm:px-4 flex flex-col flex-1">

        {/* A4: Live/Mock data status strip */}
        {!wxLoading && (
          <div className={`mx-1 mb-1 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold ${
            weatherCtx?.isLive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${weatherCtx?.isLive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {weatherCtx?.isLive
              ? `Live • Open-Meteo • ${liveLocation.name}`
              : 'Showing sample data — offline or location unsupported'}
          </div>
        )}
        {wxLoading && (
          <div className="mx-1 mb-1 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-400 font-semibold animate-pulse">
            Fetching live weather…
          </div>
        )}

        {/* F8: Persona Tab Row with ★ dots */}
        <div
          ref={tabRowRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 mb-1 scroll-smooth"
        >
          {PERSONAS.map((p, idx) => {
            const isActive   = idx === currentPersonaIndex;
            const isSelected = selectedPersonas.includes(p.id);
            return (
              <button
                key={p.id}
                ref={(el) => (tabRefs.current[idx] = el)}
                onClick={() => handleSelectPersona(idx)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20 scale-105'
                    : 'bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <span>{p.name}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />}
                {!isActive && isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" aria-label="Selected" />}
              </button>
            );
          })}
        </div>

        {/* Hero Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePersona.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <HeroCard
              persona={heroPersona}
              personaIndex={currentPersonaIndex}
              totalPersonas={PERSONAS.length}
              onNextPersona={handleNextPersona}
              onPrevPersona={handlePrevPersona}
              onSelectPersona={handleSelectPersona}
            />
          </motion.div>
        </AnimatePresence>

        {/* Info Cards — with live overrides */}
        <div className="w-full my-3 flex flex-col gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`cards-${activePersona.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {activePersona.cards.map((card, idx) => (
                <WhiteCard
                  key={card.id}
                  card={card}
                  index={idx}
                  isLive={weatherCtx?.isLive ?? false}
                  fetchedAt={weatherCtx?.fetchedAt}
                  liveOverride={liveOverrides[card.id]}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* F9: Shared assistant */}
        <ChatbotSection
          persona={activePersona}
          currentLocation={liveLocation}
          currentTempC={liveLocation.tempC}
          tempUnit={tempUnit}
          sharedMessages={sharedMessages}
          setSharedMessages={setSharedMessages}
          sharedDraftMap={sharedDraftMap}
          setSharedDraftMap={setSharedDraftMap}
        />
      </main>

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={currentLocation}
        onSelectLocation={(loc) => {
          setCurrentLocation(loc);
        }}
        tempUnit={tempUnit}
      />
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onLogout={onLogout}
      />
    </div>
  );
}
