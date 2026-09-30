import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, Database, Lightbulb, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { RANKING_FORMULA, WARNING_THRESHOLD, LEARNED_WEIGHT } from '../engine/ranker';
import { useLanguage } from '../i18n/LanguageContext';
import { getTranslatedStatusText } from '../i18n/cardI18n';

/**
 * WhySheet — A5 "Why this card?" bottom sheet.
 *
 * Props:
 *   isOpen    {boolean}  — whether the sheet is visible
 *   onClose   {fn}       — called when user dismisses
 *   card      {object}   — the ranked card object from ranker.js
 *   personaId {string}   — current persona ID
 *   ctx       {object}   — weather context
 *   votes     {object}   — { [cardId]: 'up' | 'down' | null } lifted to HomeScreen
 *   onVote    {fn}       — (cardId, 'up' | 'down') → void
 */
export default function WhySheet({ isOpen, onClose, card, personaId, ctx, votes = {}, onVote, isPhoneFrame = false }) {
  const sheetRef = useRef(null);
  const { lang, t, tp } = useLanguage();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus sheet on open
  useEffect(() => {
    if (isOpen && sheetRef.current) sheetRef.current.focus();
  }, [isOpen]);

  if (!card) return null;

  const def = card._def;
  // WhyText and formulaText are intentionally kept in English (technical spec content).
  // Per spec: "formula text (0.35×heat + ...)" stays English.
  const whyText    = def?.whyText?.(ctx, personaId) ?? 'This card is relevant for your current persona and weather conditions.';
  const formulaText = def?.formulaText ?? 'No formula — direct measurement or rule-based.';
  const fields      = def?.dataFields  ?? [];

  // Scores
  const urgencyPct  = Math.round((card.urgency ?? 0) * 100);
  const affinityPct = Math.round((card.affinity ?? 0) * 100);
  const learnedW    = card.learnedWeight ?? LEARNED_WEIGHT;
  const scoreVal = (card.affinity ?? 0) * (0.5 + 0.5 * (card.urgency ?? 0)) * learnedW;
  const scorePct = Math.round(scoreVal * 100);

  const urgencyColor = urgencyPct >= 75 ? 'bg-red-500'
                     : urgencyPct >= 50 ? 'bg-orange-400'
                     : urgencyPct >= 30 ? 'bg-amber-400'
                     : 'bg-emerald-400';

  // Source from tag
  const isAlwaysMock = card.tag?.toLowerCase().startsWith('mock');
  const isFormula    = card.tag?.startsWith('Formula:');
  const sourceLabelEN = isAlwaysMock ? 'Mock data (no live feed)'
                     : isFormula    ? `Formula (${card.tag?.replace('Formula:', '').split('•')[0]?.trim() ?? 'computed'})`
                     : (card.tag ?? 'Open-Meteo');
  // A7: mock label translated, formula/Open-Meteo kept English per spec
  const sourceLabel = isAlwaysMock ? t('why.mock_src') : sourceLabelEN;

  // Votes
  const currentVote = votes[card.id] ?? null;
  const handleVote = (vote) => {
    if (!onVote) return;
    onVote(card.id, currentVote === vote ? null : vote);
  };

  // A7: translated card title
  const cardTitle = t(`card.${card.id}`, card.title);

  // A7: translated statusText for badge in sheet header
  const statusBadge = getTranslatedStatusText(card, lang, t);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="why-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`${isPhoneFrame ? 'absolute' : 'fixed'} inset-0 z-50 bg-black/40 backdrop-blur-sm`}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="why-sheet"
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`${t('why.title')}: ${cardTitle}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`${isPhoneFrame ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-2xl shadow-slate-900/30 outline-none flex flex-col`}
            style={{ maxHeight: isPhoneFrame ? '85%' : '85dvh', maxWidth: 480, margin: '0 auto' }}
          >
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white z-10 rounded-t-[2rem] border-b border-slate-100 shrink-0">
              {/* Grab handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1 rounded-full bg-slate-200" />
              </div>

              {/* Header content */}
              <div className="flex items-start justify-between px-5 pt-2 pb-3">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                    {t('why.title')}
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 leading-tight">
                    {cardTitle}
                  </h2>
                  {/* Warning badge */}
                  {card.isWarning && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                      {t('why.pinned')}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className="shrink-0 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Scrollable content inside sheet */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 no-scrollbar">
              {/* Current value badge */}
              {card.statusText && (
                <div>
                  <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold border ${card.statusColor || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                    {statusBadge}
                  </div>
                </div>
              )}

              {/* Why shown — whyText is kept English (technical content per spec) */}
              <Section icon={<Lightbulb className="w-4 h-4" />} label={t('why.shown_now')}>
                <p className="text-sm text-slate-600 leading-relaxed">{whyText}</p>
              </Section>

              {/* Source */}
              <Section icon={<Database className="w-4 h-4" />} label={t('why.data_source')}>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                    isAlwaysMock
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAlwaysMock ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                    {sourceLabel}
                  </span>
                </div>
                {fields.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {fields.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-semibold">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              {/* Formula — kept English per spec */}
              <Section icon={<FlaskConical className="w-4 h-4" />} label={t('why.formula')}>
                <p className="text-xs text-slate-500 leading-relaxed font-mono bg-slate-50 rounded-xl p-3 border border-slate-100 whitespace-pre-wrap">
                  {formulaText}
                </p>
              </Section>

              {/* Ranking scores */}
              <Section icon={<TrendingUp className="w-4 h-4" />} label={t('why.ranking')}>
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  {RANKING_FORMULA}
                </p>
                <div className="flex flex-col gap-2">
                  <ScoreBar
                    label={t('why.urgency')}
                    pct={urgencyPct}
                    color={urgencyColor}
                    tip={`${t('why.urgency')}: ${urgencyPct >= 75 ? t('why.urgency.warn') : t('why.urgency.ok')}`}
                  />
                  <ScoreBar
                    label={tp('why.affinity', { pid: personaId })}
                    pct={affinityPct}
                    color="bg-indigo-400"
                    tip={`${affinityPct}% — 100% = always shown, 0% = never shown.`}
                  />
                  <ScoreBar
                    label={tp('why.learned', { w: learnedW.toFixed(1) })}
                    pct={100}
                    color="bg-slate-300"
                    tip="Multiplier from user feedback data. Currently 1.0 for all cards (Phase A8 will tune this)."
                  />
                  <ScoreBar
                    label={t('why.score')}
                    pct={scorePct}
                    color="bg-amber-400"
                    tip={`affinity (${affinityPct}%) × (0.5 + 0.5 × urgency(${urgencyPct}%)) × ${learnedW} = ${scoreVal.toFixed(3)}`}
                  />
                </div>
              </Section>

              {/* Thumbs up/down (A5 feedback) */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {t('why.feedback')}
                </p>
                <div className="flex gap-3">
                  <VoteButton
                    icon={<ThumbsUp className="w-4 h-4" />}
                    label={t('why.vote.up')}
                    active={currentVote === 'up'}
                    activeClass="bg-emerald-50 text-emerald-700 border-emerald-300"
                    onClick={() => handleVote('up')}
                  />
                  <VoteButton
                    icon={<ThumbsDown className="w-4 h-4" />}
                    label={t('why.vote.down')}
                    active={currentVote === 'down'}
                    activeClass="bg-red-50 text-red-700 border-red-300"
                    onClick={() => handleVote('down')}
                  />
                </div>
                {currentVote && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    {currentVote === 'up' ? t('why.thanks.up') : t('why.thanks.down')}
                  </p>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 leading-snug text-center px-4 border-t border-slate-100 pt-3 whitespace-pre-line">
                {t('why.disclaimer')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-amber-500">{icon}</span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ScoreBar({ label, pct, color, tip }) {
  return (
    <div title={tip}>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span className="text-xs font-bold text-slate-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

function VoteButton({ icon, label, active, activeClass, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
        active
          ? activeClass
          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}
