import React from 'react';
import { motion } from 'framer-motion';
import {
  Smile,
  Wind,
  Sun,
  Shirt,
  Droplets,
  Bus,
  Umbrella,
  ShieldCheck,
  Trees,
  Briefcase,
  Globe,
  Eye,
  MapPin,
  CloudRain,
  ShieldAlert,
  ThermometerSun,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  Check
} from 'lucide-react';
import CircularGauge from './CircularGauge';

const BADGE_ICONS = {
  Smile,
  Wind,
  Sun,
  Shirt,
  Droplets,
  Bus,
  Umbrella,
  ShieldCheck,
  Trees,
  Briefcase,
  Globe,
  Eye,
  MapPin,
  CloudRain,
  ShieldAlert,
  ThermometerSun,
};

export default function WhiteCard({ card, index = 0 }) {
  const IconComp = BADGE_ICONS[card.badgeIcon] || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className="w-full bg-white/95 backdrop-blur-md rounded-[1.75rem] p-4 sm:p-5 shadow-sm shadow-slate-200/60 border border-slate-100/90 hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Pastel Badge + Title + Subtext */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${card.badgeColor || 'bg-amber-100 text-amber-600 border-amber-200'}`}>
            <IconComp className="w-5 h-5 stroke-[2.2]" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-slate-800 tracking-tight leading-snug">
              {card.title}
            </h4>
            <p className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
              {card.subtext}
            </p>
          </div>
        </div>

        {/* Right Side Element: Gauge OR Checkmark OR Status Pill */}
        <div className="shrink-0 flex items-center justify-center ml-1">
          {card.type === 'gauge' && (
            <CircularGauge
              value={card.gaugeValue || 82}
              max={100}
              size={48}
              strokeWidth={4.5}
              color="#f59e0b"
              textColor="text-slate-800"
              subText="/100"
            />
          )}

          {card.type === 'check' && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
              <span>{card.statusText || 'Optimal'}</span>
            </div>
          )}

          {card.type === 'status' && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${card.statusColor || 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {card.statusText}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tag Pill */}
      {card.tag && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="truncate">{card.tag}</span>
        </div>
      )}
    </motion.div>
  );
}
