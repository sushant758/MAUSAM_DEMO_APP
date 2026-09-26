import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PERSONAS, MOCK_LOCATIONS } from '../data/personaData';
import Header from './Header';
import HeroCard from './HeroCard';
import WhiteCard from './WhiteCard';
import ChatbotSection from './ChatbotSection';
import LocationModal from './LocationModal';
import UserProfileModal from './UserProfileModal';

export default function HomeScreen({ user, onLogout, isPhoneFrame, onTogglePhoneFrame }) {
  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0);
  const [tempUnit, setTempUnit] = useState('C'); // 'C' or 'F'
  const [autoSwitchedMode, setAutoSwitchedMode] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(MOCK_LOCATIONS[0]);
  
  // Modals
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const scrollContainerRef = useRef(null);
  const tabRowRef = useRef(null);
  const tabRefs = useRef([]);

  const activePersona = PERSONAS[currentPersonaIndex];

  // Forcible Scroll-to-Top Helper for main page
  const forceScrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // Helper to change persona and immediately force scroll reset to top
  const changePersonaAndResetScroll = (getNewIndex) => {
    setCurrentPersonaIndex((prevIndex) => {
      const nextIndex = typeof getNewIndex === 'function' ? getNewIndex(prevIndex) : getNewIndex;
      return nextIndex;
    });

    // Immediate & frame-delayed scroll reset
    forceScrollToTop();
    requestAnimationFrame(() => {
      forceScrollToTop();
      setTimeout(forceScrollToTop, 0);
      setTimeout(forceScrollToTop, 30);
    });
  };

  // Handlers for Hero Card swipe gestures & persona tab clicks
  const handleNextPersona = () => {
    changePersonaAndResetScroll((prev) => (prev + 1) % PERSONAS.length);
  };

  const handlePrevPersona = () => {
    changePersonaAndResetScroll((prev) => (prev - 1 + PERSONAS.length) % PERSONAS.length);
  };

  const handleSelectPersona = (index) => {
    changePersonaAndResetScroll(index);
  };

  // LayoutEffect to enforce top scroll on persona index mutation
  useLayoutEffect(() => {
    forceScrollToTop();
    const animationFrameId = requestAnimationFrame(() => {
      forceScrollToTop();
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [currentPersonaIndex]);

  // BUG 2 FIX: Synchronize horizontal scrolling of Persona Tab Row on persona change
  useEffect(() => {
    const activeTabElement = tabRefs.current[currentPersonaIndex];
    if (activeTabElement && tabRowRef.current) {
      activeTabElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentPersonaIndex]);

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
      />

      {/* Main Continuous Vertical Scroll Content */}
      <main className="w-full px-3 sm:px-4 flex flex-col flex-1">
        {/* BUG 2 FIX: Persona Quick Selector Tabs Bar with horizontal scroll ref */}
        <div 
          ref={tabRowRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 mb-1 scroll-smooth"
        >
          {PERSONAS.map((p, idx) => {
            const isActive = idx === currentPersonaIndex;
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
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
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

        {/* Vertical Stack of Persona White Info Cards */}
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

        {/* Chatbot Section at the bottom of continuous vertical scroll */}
        <ChatbotSection
          persona={activePersona}
          currentLocation={currentLocation}
          currentTempC={currentLocation.tempC}
          tempUnit={tempUnit}
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
