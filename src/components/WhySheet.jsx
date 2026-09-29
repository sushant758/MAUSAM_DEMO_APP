import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FlaskConical, Database, Lightbulb, TrendingUp } from 'lucide-react';

/**
 * WhySheet — A5 "Why this card?" bottom sheet.
 *
 * Props:
 *   isOpen   {boolean}  — whether the sheet is visible
 *   onClose  {fn}       — called when user dismisses
 *   card     {object}   — the ranked card object from ranker.js
 *   personaId {string}  — current persona ID (for persona-specific why text)
 *   ctx      {object}   — weather context (for dynamic why text)
 */
export default function WhySheet({ isOpen, onClose, card, personaId, ctx }) {
  const sheetRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Trap focus inside sheet
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.focus();
    }
  }, [isOpen]);

  if (!card) return null;

  const def = card._def;
  const whyText   = def?.whyText?.(ctx, personaId) ?? 'This card is relevant for your current persona and weather conditions.';
  const formula   = def?.formulaText ?? 'No formula — direct measurement or rule-based.';
  const fields    = def?.dataFields  ?? [];
  const urgencyPct = Math.round((card.urgency ?? 0) * 100);
  const affinityPct = Math.round((card.affinity ?? 0) * 100);

  const urgencyColor = urgencyPct >= 75 ? 'bg-red-500'
                     : urgencyPct >= 50 ? 'bg-orange-400'
                     : urgencyPct >= 30 ? 'bg-amber-400'
                     : 'bg-emerald-400';

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
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto bg-white rounded-t-[2rem] shadow-2xl shadow-slate-900/30 outline-none"
            style={{ maxWidth: 480, margin: '0 auto' }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-2 pb-4">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  Why this card?
                </p>
                <h2 className="text-xl font-bold text-slate-900 leading-tight truncate">
                  {card.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="ml-3 shrink-0 w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Current value badge */}
            {card.statusText && (
              <div className="mx-5 mb-4">
                <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-bold border ${card.statusColor || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                  {card.statusText}
                </div>
              </div>
            )}

            <div className="px-5 pb-8 flex flex-col gap-5">

              {/* Why shown */}
              <Section icon={<Lightbulb className="w-4 h-4" />} label="Why shown now">
                <p className="text-sm text-slate-600 leading-relaxed">{whyText}</p>
              </Section>

              {/* Urgency + affinity bars */}
              <Section icon={<TrendingUp className="w-4 h-4" />} label="Ranking scores">
                <div className="flex flex-col gap-2">
                  <ScoreBar label="Urgency" pct={urgencyPct} color={urgencyColor}
                    tip="How critical is this metric right now? (0% = informational, 100% = emergency-level)" />
                  <ScoreBar label="Persona Affinity" pct={affinityPct} color="bg-indigo-400"
                    tip="How relevant is this card for your current persona? (0% = never shown, 100% = always shown)" />
                  <ScoreBar label="Combined Score" pct={Math.round(card.score * 100)} color="bg-amber-400"
                    tip="urgency × 60% + affinity × 40% — used to order cards on screen." />
                </div>
              </Section>

              {/* Formula */}
              <Section icon={<FlaskConical className="w-4 h-4" />} label="Formula / Method">
                <p className="text-xs text-slate-500 leading-relaxed font-mono bg-slate-50 rounded-xl p-3 border border-slate-100">
                  {formula}
                </p>
              </Section>

              {/* Data fields */}
              {fields.length > 0 && (
                <Section icon={<Database className="w-4 h-4" />} label="Data used">
                  <div className="flex flex-wrap gap-1.5">
                    {fields.map((f, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                        {f}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Disclaimer */}
              <p className="text-[10px] text-slate-400 leading-snug text-center px-4 pt-2 border-t border-slate-100">
                All values are general information only. Not medical, legal, or agricultural advice.
                Data: Open-Meteo (CC BY 4.0).
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
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
}
