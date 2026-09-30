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

  // B6: "Because" reason — derive from urgency + context boost for top cards
  const getBecauseReason = () => {
    if (!card.urgency && !card.contextBoost) return null;
    const urgency = card.urgency ?? 0;
    const boost   = card.contextBoost ?? 1;
    if (card.isWarning) return lang === 'hi' ? '⚠️ अत्यंत जरूरी — तत्काल कार्रवाई जरूरी' : '⚠️ Critical — action needed now';
    if (urgency >= 0.7)  return lang === 'hi' ? 'उच्च स्कोर — आज आपके लिए सबसे प्रासंगिक' : 'High urgency — most relevant for you today';
    if (boost > 1.2)     return lang === 'hi' ? 'आज की परिस्थिति से मेल खाता है' : 'Matches current conditions';
    if (urgency >= 0.4)  return lang === 'hi' ? 'मध्यम महत्व — आज नज़र रखने योग्य' : 'Moderate priority — worth watching today';
    return lang === 'hi' ? 'आपके persona पर आधारित' : 'Relevant to your persona';
  };
  const becauseText = index <= 1 ? getBecauseReason() : null;

  // ── SourceChip logic ────────────────────────────────────────────────────────
  // "Mock data" prefix in card.tag → always-mock card (tide, traffic, pollen, etc.)
  // "Formula:" prefix → formula-based card (green if live ctx was used)
  // Anything else → live Open-Meteo field
  const isAlwaysMock = card.tag?.toLowerCase().startsWith('mock');
  const isFormula    = card.tag?.startsWith('Formula:');
  // Show green chip when: API is live AND this card is not intentionally always-mock
  const showLiveChip = isLive && !isAlwaysMock;

  // Provider: first segment before " • " (e.g. "Open-Meteo Marine API", "Open-Meteo")
  // B7: gauge/OCI cards always show "Formula" as provider
  const chipProvider = isFormula
    ? 'Formula'
    : (!isAlwaysMock && card.tag)
    ? card.tag.split(' • ')[0].trim()
    : 'Open-Meteo';

  // Note under the chip (A7: translate known mock notes; formula notes stay English per spec)
  const rawNote = isFormula
    ? card.tag.replace(/^Formula:\s*/, '').trim()
    : isAlwaysMock
    ? card.tag.replace(/^Mock data •?\s*/i, '').trim() || undefined
    : undefined;

  // Map raw English note → i18n key (only for known mock notes)
  const CHIP_NOTE_KEYS = {
    'No pollen feed for India in prototype': 'chip.note.pollen',
    'IMD warning feed planned':              'chip.note.imd',
    'Tide feed planned (INCOIS)':            'chip.note.tide',
  };
  const chipNote = rawNote
    ? (CHIP_NOTE_KEYS[rawNote] ? t(CHIP_NOTE_KEYS[rawNote]) : rawNote)
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

      {/* B6: "Because" reason chip — only on top 2 ranked cards */}
      {becauseText && (
        <div className="mt-2 flex">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-600 leading-tight">
            <Sparkles className="w-2.5 h-2.5 shrink-0" />
            {lang === 'hi' ? 'क्योंकि: ' : 'Because: '}{becauseText}
          </span>
        </div>
      )}

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
