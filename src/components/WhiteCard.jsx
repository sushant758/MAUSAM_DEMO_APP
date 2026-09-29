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
} from 'lucide-react';
import CircularGauge from './CircularGauge';
import SourceChip from './SourceChip';
import { useLanguage } from '../i18n/LanguageContext';
import { getTranslatedCardBody, getTranslatedStatusText } from '../i18n/cardI18n';

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

/**
 * WhiteCard — 3-zone info card (F1 layout fix).
 *
 * Props from personaData:
 *   card   {object}  — static card data (title, subtext, type, …)
 *   index  {number}  — stagger animation index
 *
 * Props from weather context (A4):
 *   isLive      {boolean}  — whether weatherCtx is from a live API
 *   fetchedAt   {number}   — unix ms when data was fetched
 *   liveOverride {object}  — optional { subtext, statusText, gaugeValue, statusColor }
 *                            computed from real ctx values; overrides static card data
 */
export default function WhiteCard({ card, index = 0, isLive = false, fetchedAt, onWhyClick }) {
  const IconComp = BADGE_ICONS[card.badgeIcon] || Sparkles;
  const { lang, t } = useLanguage();
  // A7: translated card title
  const cardTitle = t(`card.${card.id}`, card.title);
  // A7: translated body + statusText (render-time, no catalog changes)
  const translatedSubtext     = getTranslatedCardBody(card, lang, t);
  const translatedStatusText  = getTranslatedStatusText(card, lang, t);

  // Values come pre-computed from the A2 ranker (catalog.compute())
  const subtext     = translatedSubtext;
  const statusText  = translatedStatusText;
  const gaugeValue  = card.gaugeValue;
  const statusColor = card.statusColor;

  // ── SourceChip logic ────────────────────────────────────────────────────────
  // "Mock data" prefix in card.tag → always-mock card (tide, traffic, pollen, etc.)
  // "Formula:" prefix → formula-based card (green if live ctx was used)
  // Anything else → live Open-Meteo field
  const isAlwaysMock = card.tag?.toLowerCase().startsWith('mock');
  const isFormula    = card.tag?.startsWith('Formula:');
  // Show green chip when: API is live AND this card is not intentionally always-mock
  const showLiveChip = isLive && !isAlwaysMock;

  // Provider: first segment before " • " (e.g. "Open-Meteo Marine API", "Open-Meteo")
  const chipProvider = (!isAlwaysMock && !isFormula && card.tag)
    ? card.tag.split(' • ')[0].trim()
    : 'Open-Meteo';

  // Note under the chip
  const chipNote = isFormula
    ? card.tag.replace(/^Formula:\s*/, '').trim()
    : isAlwaysMock
    ? card.tag.replace(/^Mock data •?\s*/i, '').trim() || undefined
    : undefined;


  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className="w-full bg-white/95 backdrop-blur-md rounded-[1.75rem] p-4 sm:p-5 shadow-sm shadow-slate-200/60 border border-slate-100/90 hover:shadow-md transition-shadow duration-300"
    >
      {/* ── Zone 1: Header Row ─────────────────────────────────────────────── */}
      {/* icon (shrink-0) | title (flex-1 min-w-0) | badge/gauge (shrink-0)   */}
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center border ${card.badgeColor || 'bg-amber-100 text-amber-600 border-amber-200'}`}>
          <IconComp className="w-5 h-5 stroke-[2.2]" />
        </div>

        <h3 className="min-w-0 flex-1 text-base font-bold text-slate-800 tracking-tight leading-snug">
          {cardTitle}
        </h3>

        {/* Right badge — shrink-0, never pushes title */}
        <div className="shrink-0 flex items-center justify-center ml-1">
          {card.type === 'gauge' && (
            <CircularGauge
              value={gaugeValue || 82}
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
              <span>{statusText || 'Optimal'}</span>
            </div>
          )}
          {card.type === 'status' && (
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs ${statusColor || 'bg-amber-50 text-amber-700 border-amber-200'}`}>
              {statusText}
            </div>
          )}
        </div>
      </div>

      {/* ── Zone 2: Body — full width below header ─────────────────────────── */}
      {subtext && (
        <p className="mt-3 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
          {subtext}
        </p>
      )}

      {/* ── Zone 3: Footer — SourceChip + info button ──────────────────────── */}
      <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2">
        <SourceChip
          isLive={showLiveChip}
          fetchedAt={fetchedAt}
          provider={chipProvider}
          note={chipNote}
        />

        {/* Why this card? — 44×44 tap target (A5 sheet trigger) */}
        <button
          onClick={onWhyClick}
          aria-label="Why this card?"
          className="h-11 w-11 -mr-2 grid place-items-center text-slate-400 hover:text-amber-500 transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
