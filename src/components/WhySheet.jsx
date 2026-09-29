import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, Database, Lightbulb, TrendingUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { RANKING_FORMULA, WARNING_THRESHOLD, LEARNED_WEIGHT } from '../engine/ranker';

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
export default function WhySheet({ isOpen, onClose, card, personaId, ctx, votes = {}, onVote }) {
  const sheetRef = useRef(null);

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
  const whyText    = def?.whyText?.(ctx, personaId) ?? 'This card is relevant for your current persona and weather conditions.';
  const formulaText = def?.formulaText ?? 'No formula — direct measurement or rule-based.';
  const fields      = def?.dataFields  ?? [];

  // Scores
  const urgencyPct  = Math.round((card.urgency ?? 0) * 100);
  const affinityPct = Math.round((card.affinity ?? 0) * 100);
  const learnedW    = card.learnedWeight ?? LEARNED_WEIGHT;
  // A2 formula: score = affinity × (0.5 + 0.5 × urgency) × learnedWeight
  const scoreVal = (card.affinity ?? 0) * (0.5 + 0.5 * (card.urgency ?? 0)) * learnedW;
  const scorePct = Math.round(scoreVal * 100);

  const urgencyColor = urgencyPct >= 75 ? 'bg-red-500'
                     : urgencyPct >= 50 ? 'bg-orange-400'
                     : urgencyPct >= 30 ? 'bg-amber-400'
                     : 'bg-emerald-400';

  // Source from tag
  const isAlwaysMock = card.tag?.toLowerCase().startsWith('mock');
  const isFormula    = card.tag?.startsWith('Formula:');
  const sourceLabel  = isAlwaysMock ? 'Mock data (no live feed)'
                     : isFormula    ? `Formula (${card.tag?.replace('Formula:', '').split('•')[0]?.trim() ?? 'computed'})`
                     : (card.tag ?? 'Open-Meteo');

  // Votes
  const currentVote = votes[card.id] ?? null;
  const handleVote = (vote) => {
    if (!onVote) return;
    // Toggle off if same vote clicked again
    onVote(card.id, currentVote === vote ? null : vote);
  };

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
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
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
            aria-label={`Why this card: ${card.title}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[88vh] overflow-y-auto bg-white rounded-t-[2rem] shadow-2xl shadow-slate-900/30 outline-none"
            style={{ maxWidth: 480, margin: '0 auto' }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-2 pb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Why this card?
                </p>
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  {card.title}
                </h2>
                {/* Warning badge */}
                {card.isWarning && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                    ⚠️ Pinned by Safety Gate · Live data
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-3 shrink-0 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Current value badge */}
            {card.statusText && (
              <div className="mx-5 mb-3">
                <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold border ${card.statusColor || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                  {card.statusText}
                </div>
              </div>
            )}

            <div className="px-5 pb-6 flex flex-col gap-5">

              {/* Why shown */}
              <Section icon={<Lightbulb className="w-4 h-4" />} label="Why shown now">
                <p className="text-sm text-slate-600 leading-relaxed">{whyText}</p>
              </Section>

              {/* Source */}
              <Section icon={<Database className="w-4 h-4" />} label="Data source">
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

              {/* Formula */}
              <Section icon={<FlaskConical className="w-4 h-4" />} label="Formula / Method">
                <p className="text-xs text-slate-500 leading-relaxed font-mono bg-slate-50 rounded-xl p-3 border border-slate-100 whitespace-pre-wrap">
                  {formulaText}
                </p>
              </Section>

              {/* Ranking scores */}
              <Section icon={<TrendingUp className="w-4 h-4" />} label="Ranking scores">
                {/* Formula label */}
                <p className="text-[10px] text-slate-400 font-mono mb-2">
                  {RANKING_FORMULA}  {/* "score = affinity × (0.5 + 0.5 × urgency) × learnedWeight" */}
                </p>
                <div className="flex flex-col gap-2">
                  <ScoreBar label="Urgency" pct={urgencyPct} color={urgencyColor}
                    tip={`How critical is this metric right now? ${urgencyPct >= 75 ? '≥75% → Warning (pinned at top when live data confirms)' : 'Below warning threshold.'}`} />
                  <ScoreBar label={`Persona Affinity (${personaId})`} pct={affinityPct} color="bg-indigo-400"
                    tip={`How relevant is this card for ${personaId}? 100% = always shown, 0% = never shown.`} />
                  <ScoreBar label={`learnedWeight = ${learnedW.toFixed(1)}`} pct={100} color="bg-slate-300"
                    tip="Multiplier from user feedback data. Currently 1.0 for all cards (Phase A8 will tune this)." />
                  <ScoreBar label="Combined Score" pct={scorePct} color="bg-amber-400"
                    tip={`affinity (${affinityPct}%) × (0.5 + 0.5 × urgency(${urgencyPct}%)) × ${learnedW} = ${(scoreVal).toFixed(3)}`} />
                </div>
              </Section>

              {/* Thumbs up/down (A5 feedback) */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Was this card useful?
                </p>
                <div className="flex gap-3">
                  <VoteButton
                    icon={<ThumbsUp className="w-4 h-4" />}
                    label="Yes, useful"
                    active={currentVote === 'up'}
                    activeClass="bg-emerald-50 text-emerald-700 border-emerald-300"
                    onClick={() => handleVote('up')}
                  />
                  <VoteButton
                    icon={<ThumbsDown className="w-4 h-4" />}
                    label="Not relevant"
                    active={currentVote === 'down'}
                    activeClass="bg-red-50 text-red-700 border-red-300"
                    onClick={() => handleVote('down')}
                  />
                </div>
                {currentVote && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    {currentVote === 'up'
                      ? 'Thanks! This card will be prioritized for you. (Phase A8)'
                      : 'Noted. This card will rank lower for you. (Phase A8)'}
                  </p>
                )}
              </div>

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 leading-snug text-center px-4 border-t border-slate-100 pt-3">
                General information only — not medical, legal, or agricultural advice.
                Weather data: Open-Meteo (CC BY 4.0).
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
