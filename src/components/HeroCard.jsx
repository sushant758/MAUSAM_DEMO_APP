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

  return (
    <div className="relative w-full my-3 px-1">
      {/* Persona Name Label Pill Right Above Hero Rectangle */}
      <div className="flex items-center justify-between px-2 mb-2 text-xs font-bold text-slate-800">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-slate-900 font-extrabold tracking-tight text-xs sm:text-sm">
            {persona.name} Mode
          </span>
        </div>
        <span className="text-[10px] bg-slate-200/90 text-slate-700 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
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
          {/* Top Row: White Icon Badge & Persona Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md ${persona.hero.badgeTextColor || 'text-orange-600'}`}>
                <IconComponent className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white/90 drop-shadow-xs">
                  {persona.name} Mode
                </span>
                <h3 className="text-sm font-semibold text-white/90 leading-tight drop-shadow-xs">
                  {persona.title}
                </h3>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/15">
              {Array.from({ length: totalPersonas }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectPersona(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === personaIndex
                      ? 'w-5 bg-white shadow-sm'
                      : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Go to persona ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Middle: Headline Text & Gauge Arc */}
          <div className="my-4 flex items-end justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug drop-shadow-md">
                {persona.hero.headline}
              </h2>
            </div>

            {/* Bottom-Right Gauge Arc */}
            <div className="flex flex-col items-center justify-center bg-black/15 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-inner">
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

          {/* Bottom: Rounded "personalized for you" tag pill */}
          <div className="pt-2 border-t border-white/20 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium border border-white/25 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" />
              <span className="drop-shadow-xs truncate max-w-[200px] sm:max-w-none">{persona.hero.tag}</span>
            </div>
            
            {/* Quick Arrow Chevrons for desktop clickers */}
            <div className="flex items-center gap-1 text-white/90">
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
        </div>
      </motion.div>
    </div>
  );
}
