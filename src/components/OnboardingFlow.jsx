import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, ChevronRight, Check, Sparkles,
  Activity, Bike, Baby, Navigation, Waves, Plane, Wheat, PartyPopper, Heart,
} from 'lucide-react';
import { PERSONAS, MOCK_LOCATIONS } from '../data/personaData';
import { useLanguage } from '../i18n/LanguageContext';

// ─── Persona icon map ─────────────────────────────────────────────────────────
const PERSONA_ICONS = {
  health: Heart, fitness: Bike, parent: Baby, commuter: Navigation,
  beachgoer: Waves, traveller: Plane, farmer: Wheat, eventplanner: PartyPopper,
};

// ─── Step indicators ──────────────────────────────────────────────────────────
function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 24 : 8, opacity: i <= current ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
          className={`h-2 rounded-full ${i === current ? 'bg-amber-500' : 'bg-slate-300'}`}
        />
      ))}
    </div>
  );
}

// ─── OnboardingFlow ───────────────────────────────────────────────────────────
/**
 * A 3-step wizard shown once after first login.
 * Step 2 allows MULTI-SELECT of personas (minimum 1).
 * Emits onComplete({ location, personaId, personaIds, tempUnit, autoPersona })
 */
export default function OnboardingFlow({ user, onComplete }) {
  const { t, lang, setLang } = useLanguage();
  const [step, setStep] = useState(0);
  const [location, setLocation] = useState(MOCK_LOCATIONS[0]);
  // A7 fix: multi-select — array of selected persona IDs (min 1)
  const [personaIds, setPersonaIds] = useState(['health']);
  const [tempUnit, setTempUnit] = useState('C');
  const [autoPersona, setAutoPersona] = useState(true);

  const next = () => setStep((s) => Math.min(s + 1, 2));

  const togglePersona = (id) => {
    setPersonaIds((prev) => {
      if (prev.includes(id)) {
        // Never deselect the last one
        return prev.length === 1 ? prev : prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  };

  const finish = () => onComplete({
    location,
    personaId: personaIds[0],   // primary persona
    personaIds,                  // all selected
    tempUnit,
    autoPersona,
  });

  const welcomeName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 overflow-y-auto">

      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        key="onboarding-card"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl shadow-black/40 overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 64px)' }}
      >
        {/* Amber top accent */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 shrink-0" />

        <div className="p-6 overflow-y-auto flex-1">
          {/* A7: language toggle in onboarding */}
          <div className="flex justify-end mb-1">
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="text-[11px] font-bold text-slate-400 hover:text-amber-600 transition-colors px-2 py-1 rounded-lg hover:bg-amber-50"
            >
              {lang === 'en' ? 'हिंदी' : 'English'}
            </button>
          </div>

          {/* Welcome header */}
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-[1.4rem] bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/30">
              <Sparkles className="w-7 h-7 text-white stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {step === 0
                ? (lang === 'en' ? `Welcome, ${welcomeName}! 👋` : `स्वागत है, ${welcomeName}! 👋`)
                : step === 1 ? t('ob.step2.title')
                : t('ob.step3.title')}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {step === 0 ? t('ob.step1.title')
                : step === 1 ? t('ob.step2.hint')
                : t('ob.step3.hint')}
            </p>
          </div>

          <StepDots total={3} current={step} />

          <AnimatePresence mode="wait">

            {/* ── Step 0: Location ─────────────────────────────────────────── */}
            {step === 0 && (
              <StepPanel key="loc">
                <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                  {MOCK_LOCATIONS.map((loc) => (
                    <LocationRow key={loc.id} loc={loc} selected={location.id === loc.id} onSelect={setLocation} />
                  ))}
                </div>
                <PrimaryButton onClick={next}>{t('ob.continue')} <ChevronRight className="w-4 h-4" /></PrimaryButton>
              </StepPanel>
            )}

            {/* ── Step 1: Personas (MULTI-SELECT) ─────────────────────────── */}
            {step === 1 && (
              <StepPanel key="persona">
                {/* Grid scrolls; button is in sticky footer outside this area */}
                <div className="grid grid-cols-2 gap-2 mb-3 max-h-56 overflow-y-auto pr-0.5">
                  {PERSONAS.map((p) => {
                    const Icon = PERSONA_ICONS[p.id] || Activity;
                    const isSelected = personaIds.includes(p.id);
                    const isLast = isSelected && personaIds.length === 1;
                    return (
                      <motion.button
                        key={p.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => togglePersona(p.id)}
                        disabled={isLast}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-center transition-colors ${
                          isSelected
                            ? 'border-amber-400 bg-amber-50'
                            : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                        } ${isLast ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                        }`}>
                          <Icon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <span className={`text-[11px] font-bold leading-tight ${
                          isSelected ? 'text-amber-700' : 'text-slate-600'
                        }`}>
                          {t(`persona.${p.id}`, p.name.split(' ')[0])}
                        </span>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                <p className="text-center text-[11px] text-slate-400">
                  {personaIds.length} {lang === 'en' ? 'selected' : 'चुने गए'}
                </p>
              </StepPanel>
            )}


            {/* ── Step 2: Preferences ──────────────────────────────────────── */}
            {step === 2 && (
              <StepPanel key="prefs">
                {/* Temp unit */}
                <div className="mb-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {t('temp.unit')}
                  </p>
                  <div className="flex gap-2">
                    {['C', 'F'].map((u) => (
                      <button
                        key={u}
                        onClick={() => setTempUnit(u)}
                        className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors ${
                          tempUnit === u
                            ? 'border-amber-400 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        °{u} {u === 'C' ? '(Celsius)' : '(Fahrenheit)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-persona */}
                <div className="mb-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {t('auto.switch')}
                  </p>
                  <button
                    onClick={() => setAutoPersona((v) => !v)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${
                      autoPersona ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="text-left">
                      <p className={`text-sm font-bold ${autoPersona ? 'text-amber-800' : 'text-slate-600'}`}>
                        {t('auto.switch')}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{t('auto.switch.hint')}</p>
                    </div>
                    <div className={`w-11 h-6 rounded-full flex items-center transition-colors px-0.5 ${
                      autoPersona ? 'bg-amber-500' : 'bg-slate-300'
                    }`}>
                      <motion.div
                        animate={{ x: autoPersona ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-5 h-5 bg-white rounded-full shadow"
                      />
                    </div>
                  </button>
                </div>

                <PrimaryButton onClick={finish}>
                  <Sparkles className="w-4 h-4" /> {t('ob.start')}
                </PrimaryButton>
              </StepPanel>
            )}
          </AnimatePresence>
        </div>

        {/* A2: Sticky footer — visible for step 1 (persona selection) */}
        {step === 1 && (
          <div className="shrink-0 px-6 pb-6 pt-2 border-t border-slate-100 bg-white">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={next}
              disabled={personaIds.length === 0}
              id="ob-persona-continue"
              className={`w-full font-bold text-sm flex items-center justify-center gap-2 rounded-2xl shadow-lg transition-all
                ${personaIds.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed py-3.5'
                  : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-400 text-white shadow-orange-500/30 hover:shadow-orange-500/50 py-3.5 min-h-[52px]'
                }`}
            >
              <ChevronRight className="w-4 h-4" />
              {lang === 'hi' ? 'आगे बढ़ें' : 'Continue'}
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Skip */}
      <button onClick={finish} className="mt-4 text-slate-500 text-xs font-semibold hover:text-slate-300 transition-colors">
        {t('ob.skip')}
      </button>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StepPanel({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}

function PrimaryButton({ onClick, children }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-shadow"
    >
      {children}
    </motion.button>
  );
}

function LocationRow({ loc, selected, onSelect }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(loc)}
      className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-colors ${
        selected ? 'border-amber-400 bg-amber-50' : 'border-slate-100 hover:border-slate-200 bg-white'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
        selected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
      }`}>
        <MapPin className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold truncate ${selected ? 'text-amber-800' : 'text-slate-700'}`}>{loc.name}</p>
        <p className="text-[10px] text-slate-400">{loc.country} · {loc.tempC}°C</p>
      </div>
      {selected && <Check className="w-4 h-4 text-amber-500 shrink-0 stroke-[2.5]" />}
    </motion.button>
  );
}
