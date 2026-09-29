import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, MOCK_LOCATIONS } from '../data/personaData';
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

export default function HomeScreen({ user, onLogout, isPhoneFrame, onTogglePhoneFrame }) {
  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0);

  // F3: persist °C/°F in localStorage
  const [tempUnit, setTempUnit] = useState(() => readLS(LS_UNIT, 'C'));

  // F3: auto-persona toggle — also persist
  const [autoSwitchedMode, setAutoSwitchedMode] = useState(() => readLS(LS_AUTO, true));

  const [currentLocation, setCurrentLocation] = useState(MOCK_LOCATIONS[0]);

  // F6: dismissible auto-switch banner state
  const [autoBannerVisible, setAutoBannerVisible] = useState(false);
  const [autoBannerText, setAutoBannerText] = useState('');
  const prevPersonaIndexRef = useRef(null); // for Undo
  const bannerTimerRef = useRef(null);

  // F8: selectedPersonas — default = first persona; stored as set of ids
  const [selectedPersonas, setSelectedPersonas] = useState(() => [PERSONAS[0].id]);

  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // F9: ONE shared chat store — lifted here so it survives persona swipes
  // shape: { messages: [], draftInputMap: {personaId: string} }
  const [sharedMessages, setSharedMessages] = useState([]);
  const [sharedDraftMap, setSharedDraftMap] = useState({});

  const scrollContainerRef = useRef(null);
  const tabRowRef = useRef(null);
  const tabRefs = useRef([]);

  const activePersona = PERSONAS[currentPersonaIndex];

  // ─── Persist F3 settings ───────────────────────────────────────────────────
  useEffect(() => { writeLS(LS_UNIT, tempUnit); }, [tempUnit]);
  useEffect(() => { writeLS(LS_AUTO, autoSwitchedMode); }, [autoSwitchedMode]);

  // ─── Scroll helpers ────────────────────────────────────────────────────────
  const forceScrollToTop = useCallback(() => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // ─── Core persona change function — used by swipe, tab tap, auto, demo ───
  // source: 'swipe' | 'tab' | 'auto' | 'demo'
  const goToPersona = useCallback((getNewIndex, source = 'tab') => {
    setCurrentPersonaIndex((prevIndex) => {
      const nextIndex = typeof getNewIndex === 'function' ? getNewIndex(prevIndex) : getNewIndex;

      // F6: show banner only when auto-switching
      if (source === 'auto' && nextIndex !== prevIndex) {
        prevPersonaIndexRef.current = prevIndex;
        const nextPersona = PERSONAS[nextIndex];
        const prevPersona = PERSONAS[prevIndex];
        const reason = `Switched to ${nextPersona.name.split(' ')[0]} mode • Based on time of day & conditions`;
        setAutoBannerText(reason);
        setAutoBannerVisible(true);

        // Auto-hide after 6 s
        clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setAutoBannerVisible(false), 6000);
      }

      // F8: if user manually swipes, turn Auto OFF
      if (source === 'swipe') {
        setAutoSwitchedMode(false);
        writeLS(LS_AUTO, false);
      }

      return nextIndex;
    });

    // Scroll reset only on persona change (never on chat, sheet, reorder)
    forceScrollToTop();
    requestAnimationFrame(() => {
      forceScrollToTop();
      setTimeout(forceScrollToTop, 0);
      setTimeout(forceScrollToTop, 30);
    });
  }, [forceScrollToTop]);

  // Swipe handlers
  const handleNextPersona = useCallback(() => {
    goToPersona((prev) => (prev + 1) % PERSONAS.length, 'swipe');
  }, [goToPersona]);

  const handlePrevPersona = useCallback(() => {
    goToPersona((prev) => (prev - 1 + PERSONAS.length) % PERSONAS.length, 'swipe');
  }, [goToPersona]);

  const handleSelectPersona = useCallback((index) => {
    goToPersona(index, 'tab');
  }, [goToPersona]);

  // ─── LayoutEffect: enforce scroll reset on persona index mutation ──────────
  useLayoutEffect(() => {
    forceScrollToTop();
    const id = requestAnimationFrame(() => forceScrollToTop());
    return () => cancelAnimationFrame(id);
  }, [currentPersonaIndex, forceScrollToTop]);

  // ─── Sync tab row horizontal scroll on persona change ─────────────────────
  useEffect(() => {
    const el = tabRefs.current[currentPersonaIndex];
    if (el && tabRowRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentPersonaIndex]);

  // ─── F6: Banner handlers ───────────────────────────────────────────────────
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

  // Cleanup banner timer on unmount
  useEffect(() => () => clearTimeout(bannerTimerRef.current), []);

  return (
    <div 
      ref={scrollContainerRef}
      className="w-full h-full flex flex-col bg-gradient-to-b from-sky-200 via-sky-100/60 to-slate-50 text-slate-800 ios-scroll overflow-y-auto no-scrollbar pb-32 sm:pb-24 min-h-screen"
    >
      {/* Top Header */}
      <Header
        location={currentLocation}
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
        // F6 banner props
        autoBannerVisible={autoBannerVisible}
        autoBannerText={autoBannerText}
        onDismissBanner={handleDismissBanner}
        onUndoBanner={handleUndoBanner}
      />

      {/* Main Continuous Vertical Scroll Content */}
      <main className="w-full px-3 sm:px-4 flex flex-col flex-1">

        {/* F8: Persona Quick Selector Tabs Bar — ★ dot on selected personas */}
        <div 
          ref={tabRowRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 mb-1 scroll-smooth"
        >
          {PERSONAS.map((p, idx) => {
            const isActive = idx === currentPersonaIndex;
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
                {/* Active pulsing dot */}
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                )}
                {/* F8: ★ dot for selected personas (when not the active tab) */}
                {!isActive && isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" aria-label="Selected persona" />
                )}
              </button>
            );
          })}
        </div>

        {/* Hero Card (Weather-psychology gradient swipe area) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePersona.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <HeroCard
              persona={activePersona}
              personaIndex={currentPersonaIndex}
              totalPersonas={PERSONAS.length}
              onNextPersona={handleNextPersona}
              onPrevPersona={handlePrevPersona}
              onSelectPersona={handleSelectPersona}
            />
          </motion.div>
        </AnimatePresence>

        {/* Vertical Stack of Persona Info Cards */}
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
                <WhiteCard key={card.id} card={card} index={idx} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* F9: ONE shared assistant — same messages/draft state across all persona pages */}
        <ChatbotSection
          persona={activePersona}
          currentLocation={currentLocation}
          currentTempC={currentLocation.tempC}
          tempUnit={tempUnit}
          // F9 shared state — passed from HomeScreen so it survives swipes
          sharedMessages={sharedMessages}
          setSharedMessages={setSharedMessages}
          sharedDraftMap={sharedDraftMap}
          setSharedDraftMap={setSharedDraftMap}
        />
      </main>

      {/* Modals */}
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={currentLocation}
        onSelectLocation={setCurrentLocation}
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
