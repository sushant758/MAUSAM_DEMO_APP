import React from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Heart, 
  Plane, 
  Sprout, 
  Footprints, 
  Compass, 
  Wheat, 
  HeartHandshake, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Zap,
  Bus
} from 'lucide-react';
import CircularGauge from './CircularGauge';
import { useLanguage } from '../i18n/LanguageContext';

const ICON_MAP = {
  Activity,
  Heart,
  Plane,
  Sprout,
  Footprints,
  Compass,
  Wheat,
  HeartHandshake,
  Zap,
  Bus
};

// Short label fallbacks so "HEALTH-CONSCIOUS MODE" never wraps
const SHORT_NAME = {
  'Health-Conscious': 'HEALTH',
  'Fitness Enthusiast': 'FITNESS',
  'Beachgoer / Surfer': 'BEACH',
  'Traveller': 'TRAVEL',
  'Parent / Family': 'FAMILY',
  'Farmer / Gardener': 'FARMER',
  'Commuter': 'COMMUTER',
  'Event Planner': 'EVENTS',
};

export default function HeroCard({
  persona,
  personaIndex,
  totalPersonas,
  onNextPersona,
  onPrevPersona,
  onSelectPersona,
}) {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0.8, 1, 0.8]);
  const rotate = useTransform(x, [-200, 200], [-6, 6]);

  const handleDragEnd = (event, info) => {
    const swipeThreshold = 50;
    const velocityThreshold = 200;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      onNextPersona();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      onPrevPersona();
    }
  };

  const IconComponent = ICON_MAP[persona.hero.icon] || Sparkles;
  const { t } = useLanguage();
  // A7: translated persona name; fallback to static name
  const personaName = t(`persona.${persona.id}`, persona.name);
  const shortLabel = personaName.split(' ')[0].toUpperCase();

  return (
    <div className="relative w-full my-3 px-1">
      {/* Persona Name Label Pill — single line, never wraps */}
      <div className="flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-slate-900 font-extrabold tracking-tight text-xs sm:text-sm whitespace-nowrap truncate">
            {personaName}
          </span>
        </div>
        <span className="text-[10px] bg-slate-200/90 text-slate-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ml-2">
          {personaIndex + 1} of {totalPersonas}
        </span>
      </div>

      {/* Swipe Container Card */}
      <motion.div
        style={{ x, opacity, rotate }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.25}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: 'grabbing', scale: 0.98 }}
        className={`relative overflow-hidden rounded-[2rem] p-5 sm:p-6 text-white shadow-xl transition-shadow duration-500 border border-white/25 select-none cursor-grab active:cursor-grabbing ${persona.hero.shadowColor || 'shadow-orange-500/25'}`}
      >
        {/* Animated Background Gradient Overlay for Smooth Crossfade */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={persona.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className={`absolute inset-0 bg-gradient-to-br ${persona.hero.bgGradient}`}
          />
        </AnimatePresence>

        {/* Ambient lighting accents */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/20 blur-2xl pointer-events-none z-0" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-black/10 blur-xl pointer-events-none z-0" />

        <div className="relative z-10 flex flex-col justify-between min-h-[160px]">
          {/* Top Row: Icon Badge + Mode label (single line) */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`shrink-0 w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md ${persona.hero.badgeTextColor || 'text-orange-600'}`}>
              <IconComponent className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              {/* F2 fix: whitespace-nowrap + text-[11px] so it never wraps */}
              <span className="block whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-white/90 drop-shadow-xs truncate">
                {shortLabel} MODE
              </span>
              <h3 className="text-sm font-semibold text-white/90 leading-tight drop-shadow-xs truncate">
                {persona.title}
              </h3>
            </div>
            {/* Quick chevrons — desktop */}
            <div className="flex items-center gap-1 text-white/90 shrink-0">
              <button 
                onClick={onPrevPersona}
                className="w-7 h-7 rounded-full bg-black/15 hover:bg-white/30 flex items-center justify-center transition-colors"
                title="Previous Persona"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={onNextPersona}
                className="w-7 h-7 rounded-full bg-black/15 hover:bg-white/30 flex items-center justify-center transition-colors"
                title="Next Persona"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Middle: Headline Text & Gauge Arc */}
          <div className="my-4 flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* F2 fix: max 2 lines via line-clamp-2 */}
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug drop-shadow-md line-clamp-2">
                {persona.hero.headline}
              </h2>
            </div>

            {/* Gauge — shrink-0, never in the body text flow */}
            <div className="shrink-0 flex flex-col items-center justify-center bg-black/15 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-inner">
              <CircularGauge
                value={persona.hero.score}
                max={100}
                size={52}
                strokeWidth={5}
                color="#ffffff"
                textColor="text-white"
                subText="SCORE"
              />
              <span className="text-[9px] font-bold text-white/90 tracking-wider uppercase mt-1 drop-shadow-xs">
                {persona.hero.scoreLabel}
              </span>
            </div>
          </div>

          {/* Bottom: Pagination dots — centered inside card, no overflow */}
          <div className="pt-2 border-t border-white/20">
            {/* F2 fix: dots moved here, centered row, container max-w-full overflow-hidden */}
            <div className="flex justify-center items-center gap-1.5 max-w-full overflow-hidden">
              {Array.from({ length: totalPersonas }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPersona(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === personaIndex
                      ? 'w-[18px] bg-white shadow-sm'
                      : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Go to persona ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
