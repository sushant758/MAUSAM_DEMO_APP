import React, { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, MOCK_LOCATIONS } from '../data/personaData';
import { fetchWeatherCtx } from '../services/weather';
import { heatIndexC, outdoorComfort } from '../lib/indices';
import { rankPersonaCards } from '../engine/ranker';
import { buildContextSignals, suggestPersona } from '../engine/context';
import Header from './Header';
import HeroCard from './HeroCard';
import WhiteCard from './WhiteCard';
import WhySheet from './WhySheet';
import LocationModal from './LocationModal';
import SettingsSheet from './SettingsSheet';
import FloatingChatbot, { AskMausamMitraCard } from './FloatingChatbot';
import { useLanguage } from '../i18n/LanguageContext';
import { updateWeight, resetWeights } from '../lib/cardWeights';

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

// ─── Card skeleton loader ──────────────────────────────────────────────────────
function CardSkeleton({ count = 4 }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full bg-white/70 rounded-[1.75rem] p-5 animate-pulse"
          style={{ opacity: 1 - i * 0.15 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-200" />
            <div className="flex-1 h-4 bg-slate-200 rounded-full" />
            <div className="w-16 h-6 bg-slate-200 rounded-full" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 bg-slate-100 rounded-full" />
            <div className="h-3 bg-slate-100 rounded-full w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomeScreen({
  user, onLogout, isPhoneFrame, onTogglePhoneFrame,
  // A1: settings from onboarding / SettingsSheet
  initialLocation, initialPersonaId, initialTempUnit, initialAutoPersona,
  onSettingsChange,
  // A8: demo override ctx (null = use real API data)
  demoCtx = null,
}) {
  // A1: initialPersonaId from onboarding sets the starting persona
  const initPersonaIdx = Math.max(0, PERSONAS.findIndex((p) => p.id === (initialPersonaId ?? 'health')));
  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(initPersonaIdx);
  const [tempUnit, setTempUnit] = useState(initialTempUnit ?? 'C');
  const [autoSwitchedMode, setAutoSwitchedMode] = useState(initialAutoPersona ?? true);
  const [currentLocation, setCurrentLocation] = useState(initialLocation ?? MOCK_LOCATIONS[0]);

  // A4: weather context
  const [weatherCtx, setWeatherCtx] = useState(null);
  const [wxLoading, setWxLoading] = useState(true);

  // F6: auto-switch banner
  const [autoBannerVisible, setAutoBannerVisible] = useState(false);
  const [autoBannerText, setAutoBannerText] = useState('');

  const { t } = useLanguage();
  const prevPersonaIndexRef = useRef(null);
  const bannerTimerRef = useRef(null);

  // F8: selected personas
  const [selectedPersonas, setSelectedPersonas] = useState(() => [PERSONAS[0].id]);

  // Modals / sheets
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // A5: WhySheet state + card votes (no backend — stored in React state)
  const [whyCard, setWhyCard] = useState(null);
  const [cardVotes, setCardVotes] = useState({});
  // A4: chatbot sheet open state (used to hide FAB when other sheets are open)
  const [chatOpen, setChatOpen] = useState(false);

  const handleVote = useCallback((cardId, vote) => {
    setCardVotes((prev) => ({ ...prev, [cardId]: vote }));
    // B1: persist vote as learned weight delta (applies on next render/refresh)
    if (vote === 'up')   updateWeight(cardId, +0.1);
    if (vote === 'down') updateWeight(cardId, -0.1);
  }, []);


  // F9: shared chat
  const [sharedMessages, setSharedMessages] = useState([]);
  const [sharedDraftMap, setSharedDraftMap] = useState({});

  const scrollContainerRef = useRef(null);
  const tabRowRef = useRef(null);
  const tabRefs = useRef([]);

  const activePersona = PERSONAS[currentPersonaIndex];

  // ─── A1: sync tempUnit / autoSwitchedMode back to App settings ─────────────
  useEffect(() => { writeLS(LS_UNIT, tempUnit); onSettingsChange?.({ tempUnit }); }, [tempUnit]);
  useEffect(() => { writeLS(LS_AUTO, autoSwitchedMode); onSettingsChange?.({ autoPersona: autoSwitchedMode }); }, [autoSwitchedMode]);

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
  // A8: activeCtx = demoCtx if a demo scenario is active, else real API data
  const activeCtx       = demoCtx ?? weatherCtx;
  const isActiveLoading = demoCtx ? false : wxLoading;

  // ─── A2: Rank cards for the active persona ────────────────────────────────
  // Memoized — recomputes only when persona or weather context changes
  const rankedCards = useMemo(
    () => rankPersonaCards(activePersona.id, activeCtx),
    [activePersona.id, activeCtx]
  );


  // ─── A4: Build live location from ctx (overrides mock temp/condition) ─────
  const liveLocation = useMemo(() => {
    if (!activeCtx) return currentLocation;
    const tempC = Math.round(activeCtx.weather.temp);
    const tempF = Math.round(tempC * 9 / 5 + 32);
    return { ...currentLocation, tempC, tempF, condition: activeCtx.weather.condition };
  }, [activeCtx, currentLocation]);

  // ─── Scroll helpers ────────────────────────────────────────────────────────
  const forceScrollToTop = useCallback(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // ─── Core persona change ───────────────────────────────────────────────────
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

  // ─── A3: Auto-persona switching ────────────────────────────────────────
  // Declared AFTER goToPersona to avoid the temporal dead zone.
  // When autoSwitchedMode is on, suggests the most contextually relevant
  // persona using time-of-day, day-of-week, and live weather signals.
  // Fires once on each new weather load, then every 15 min for time shifts.
  // Swiping sets autoSwitchedMode=false and stops all auto-switching.
  const lastAutoCtxRef = useRef(null);

  useEffect(() => {
    if (!autoSwitchedMode || !weatherCtx) return;

    const doAutoSwitch = () => {
      const signals     = buildContextSignals(weatherCtx, new Date());
      const suggestedId = suggestPersona(signals, PERSONAS);
      const nextIdx     = PERSONAS.findIndex((p) => p.id === suggestedId);
      if (nextIdx >= 0) goToPersona(nextIdx, 'auto');
    };

    // Fire once when a new weather ctx arrives
    if (lastAutoCtxRef.current !== weatherCtx) {
      lastAutoCtxRef.current = weatherCtx;
      doAutoSwitch();
    }

    // Re-check every 15 min for time-of-day persona shifts
    const id = setInterval(doAutoSwitch, 15 * 60 * 1000);
    return () => clearInterval(id);
  }, [autoSwitchedMode, weatherCtx, goToPersona]);

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

  // ─── A2: Live hero score = OCI from real ctx ───────────────────────────────
  const heroPersona = useMemo(() => {
    if (!activeCtx) return activePersona;
    const { weather, uv, aqi, daily } = activeCtx;
    const hi  = heatIndexC(weather.temp, weather.humidity);
    const oci = outdoorComfort({ hi, aqi: aqi.us_aqi, uv: uv.current, rainProb: daily.precipProbMax?.[0] ?? 10 });
    return { ...activePersona, hero: { ...activePersona.hero, score: oci, scoreLabel: 'Comfort' } };
  }, [activePersona, activeCtx]);

  // ─── A2: Check if any warning card is active ──────────────────────────────
  // Belt-and-suspenders: banner requires BOTH live data AND at least one
  // card that the ranker tagged isWarning (urgency >= 0.75 + live + non-mock).
  // The ranker already blocks isWarning without live data, but we guard here
  // too so the banner is structurally impossible without real API data.
  const hasWarning = useMemo(
    () => activeCtx?.isLive === true && rankedCards.some((c) => c.isWarning),
    [rankedCards, activeCtx]
  );

  // ─── A5: WhySheet handlers ────────────────────────────────────────────────
  const handleWhyClick = useCallback((card) => setWhyCard(card), []);
  const handleWhyClose = useCallback(() => setWhyCard(null), []);

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
        onOpenProfile={() => setIsSettingsOpen(true)}
        isPhoneFrame={isPhoneFrame}
        onTogglePhoneFrame={onTogglePhoneFrame}
        autoBannerVisible={autoBannerVisible}
        autoBannerText={autoBannerText}
        onDismissBanner={handleDismissBanner}
        onUndoBanner={handleUndoBanner}
      />

      <main className="w-full px-3 sm:px-4 flex flex-col flex-1">

        {/* A4: Live/Mock status strip */}
        {!isActiveLoading && (
          <div className={`mx-1 mb-1 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-[11px] font-semibold ${
            activeCtx?.isLive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeCtx?.isLive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {activeCtx?.isLive
              ? `Live · Open-Meteo · ${liveLocation.name}`
              : 'Showing sample data — offline or location unsupported'}
          </div>
        )}
        {isActiveLoading && (
          <div className="mx-1 mb-1 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-400 font-semibold animate-pulse">
            Fetching live weather…
          </div>
        )}

        {/* A2: Warning banner when a card has urgency ≥ 0.75 */}
        <AnimatePresence>
          {/* Banner: only when live data AND actual isWarning cards exist */}
          {hasWarning && !isActiveLoading && (
            <motion.div
              key="warning-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-1 mb-1 px-3 py-2 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-[11px] font-bold"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" />
              {t('banner.warning')}
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* A2: Ranked info cards */}
        <div className="w-full my-3 flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {isActiveLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CardSkeleton count={4} />
              </motion.div>
            ) : (
              <motion.div
                key={`cards-${activePersona.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                {rankedCards.map((card, idx) => {
                  // For the SourceChip: a card is "live" when it has a non-mock tag and we have live ctx
                  const cardIsLive = (activeCtx?.isLive ?? false)
                    && !card.tag?.toLowerCase().startsWith('mock');
                  return (
                    <WhiteCard
                      key={card.id}
                      card={card}
                      index={idx}
                      isLive={cardIsLive}
                      fetchedAt={activeCtx?.fetchedAt}
                      onWhyClick={() => handleWhyClick(card)}
                    />
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* A4: "Ask Mausam Mitra" card at bottom of feed */}
        <AskMausamMitraCard onOpen={() => setChatOpen(true)} />
      </main>

      {/* A4: Floating chatbot FAB + bottom sheet */}
      <FloatingChatbot
        persona={activePersona}
        currentLocation={liveLocation}
        currentTempC={liveLocation.tempC}
        tempUnit={tempUnit}
        weatherCtx={activeCtx}
        sharedMessages={sharedMessages}
        setSharedMessages={setSharedMessages}
        sharedDraftMap={sharedDraftMap}
        setSharedDraftMap={setSharedDraftMap}
        hidden={!!whyCard || isSettingsOpen || isLocationModalOpen}
        onOpenChange={setChatOpen}
        isOpen={chatOpen}
      />

      <WhySheet
        isOpen={!!whyCard}
        onClose={handleWhyClose}
        card={whyCard}
        personaId={activePersona.id}
        ctx={activeCtx}
        votes={cardVotes}
        onVote={handleVote}
      />

      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        currentLocation={currentLocation}
        tempUnit={tempUnit}
        autoPersona={autoSwitchedMode}
        personaId={activePersona.id}
        onChangeLocation={(loc) => {
          setCurrentLocation(loc);
          onSettingsChange?.({ location: loc });
        }}
        onChangeTempUnit={setTempUnit}
        onChangeAutoPersona={setAutoSwitchedMode}
        onChangePersona={(pid) => {
          const idx = PERSONAS.findIndex((p) => p.id === pid);
          if (idx >= 0) goToPersona(idx, 'tab');
          onSettingsChange?.({ personaId: pid });
        }}
        onLogout={onLogout}
      />
    </div>
  );
}
