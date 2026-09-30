// ─── FloatingChatbot.jsx ─────────────────────────────────────────────────────
// A4: Persistent floating button (bottom-right) that opens a bottom-sheet
//     containing the EXISTING ChatbotSection unchanged.
//
// Rules:
//  - ONE button for ALL personas (follows active persona prop)
//  - 16px from right, ~88px from bottom  (above safe area + home indicator)
//  - Custom cloud+sparkle SVG in sky-blue→indigo gradient
//  - Idle: subtle float+rotate animation (Framer Motion); paused when open
//  - Opening/closing does NOT scroll the page
//  - Hidden when whyOpen || settingsOpen || onboarding is active
//  - "Ask Mausam Mitra" small card at the bottom of the feed also opens it
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { X } from 'lucide-react';
import ChatbotSection from './ChatbotSection';
import { useLanguage } from '../i18n/LanguageContext';

// ── Custom cloud-sparkle SVG icon ─────────────────────────────────────────────
function ChatbotIcon({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cbi-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      {/* Cloud bubble */}
      <path
        d="M4 20C4 14.5 8.5 10 14 10h4c5.5 0 10 4.5 10 10s-4.5 10-10 10H6l-2 2V20z"
        fill="url(#cbi-grad)"
        opacity="0.95"
      />
      {/* Sparkle top-right */}
      <path
        d="M22 5l.5 1.5 1.5.5-1.5.5L22 9l-.5-1.5-1.5-.5 1.5-.5L22 5z"
        fill="#FCD34D"
        strokeLinecap="round"
      />
      {/* Mini cloud dots */}
      <circle cx="11" cy="20" r="1.5" fill="white" opacity="0.85" />
      <circle cx="16" cy="20" r="1.5" fill="white" opacity="0.85" />
      <circle cx="21" cy="20" r="1.5" fill="white" opacity="0.85" />
    </svg>
  );
}

// ── FloatingChatbot ────────────────────────────────────────────────────────────
/**
 * Props:
 *   persona, currentLocation, currentTempC, tempUnit, weatherCtx  — forwarded to ChatbotSection
 *   sharedMessages, setSharedMessages, sharedDraftMap, setSharedDraftMap
 *   hidden {bool}  — hides the FAB when WhySheet/Settings/Onboarding is open
 *   onOpenChange {fn}  — (isOpen) => void — lets parent track state (to scroll-lock etc.)
 */
export default function FloatingChatbot({
  persona,
  currentLocation,
  currentTempC,
  tempUnit,
  weatherCtx,
  sharedMessages,
  setSharedMessages,
  sharedDraftMap,
  setSharedDraftMap,
  hidden = false,
  onOpenChange,
  isOpen: isOpenProp,  // controlled: if provided, parent drives open state
  isPhoneFrame = false,
}) {
  const [isOpenLocal, setIsOpenLocal] = React.useState(false);
  // Use controlled prop if provided, otherwise use local state
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenLocal;
  const { lang, t } = useLanguage();
  const floatControls = useAnimationControls();

  // Idle float animation — pauses while sheet is open
  useEffect(() => {
    if (isOpen) {
      floatControls.stop();
      floatControls.set({ y: 0, rotate: 0 });
    } else {
      floatControls.start({
        y: [0, -4, 0, -2, 0],
        rotate: [0, 1.5, 0, -1.5, 0],
        transition: {
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      });
    }
  }, [isOpen, floatControls]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  const open  = () => { setIsOpenLocal(true);  onOpenChange?.(true); };
  const close = () => { setIsOpenLocal(false); onOpenChange?.(false); };

  const label = lang === 'hi' ? 'मौसम मित्र' : 'Mausam Mitra';

  return (
    <>
      {/* ── Floating Action Button ──────────────────────────────────────────── */}
      <AnimatePresence>
        {!hidden && !isOpen && (
          <motion.div
            key="fab"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className={`${isPhoneFrame ? 'absolute' : 'fixed'} z-50`}
            style={{ bottom: 90, right: 16 }}
          >
            <motion.div animate={floatControls}>
              <button
                id="fab-mausam-mitra"
                onClick={open}
                aria-label={label}
                className="flex flex-col items-center gap-0.5 focus:outline-none"
              >
                {/* Circle icon */}
                <div className="w-14 h-14 rounded-[1.4rem] bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-[0_6px_24px_rgba(99,102,241,0.4)] border-2 border-white/40 active:scale-95 transition-transform">
                  <ChatbotIcon size={30} />
                </div>
                {/* Label under button */}
                <span className="text-[9px] font-black text-slate-600 tracking-tight leading-tight text-center max-w-[56px]">
                  {label}
                </span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Sheet ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className={`${isPhoneFrame ? 'absolute' : 'fixed'} inset-0 z-[55] bg-black/40 backdrop-blur-[2px]`}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 36, mass: 0.9 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.15}
              onDragEnd={(_, info) => { if (info.offset.y > 90) close(); }}
              className={`${isPhoneFrame ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 z-[56] bg-white rounded-t-[2rem] shadow-2xl flex flex-col`}
              style={{ maxHeight: isPhoneFrame ? '85%' : '85dvh' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>

              {/* Sheet header */}
              <div className="flex items-center justify-between px-5 pb-3 shrink-0 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[0.85rem] bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow-md">
                    <ChatbotIcon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 leading-tight">
                      {lang === 'hi' ? 'मौसम मित्र' : 'Mausam Mitra'}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {lang === 'hi'
                        ? `${persona.name} · सहायक`
                        : `${persona.name} · Assistant`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="shrink-0 w-10 h-10 min-w-[40px] min-h-[40px] rounded-full bg-slate-100 hover:bg-slate-200 active:scale-95 flex items-center justify-center text-slate-500 transition-all"
                  aria-label={t('common.close')}
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>

              {/* Existing ChatbotSection — unchanged */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <ChatbotSection
                  persona={persona}
                  currentLocation={currentLocation}
                  currentTempC={currentTempC}
                  tempUnit={tempUnit}
                  weatherCtx={weatherCtx}
                  sharedMessages={sharedMessages}
                  setSharedMessages={setSharedMessages}
                  sharedDraftMap={sharedDraftMap}
                  setSharedDraftMap={setSharedDraftMap}
                  // Compact mode: remove top header since we render our own
                  embeddedMode
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── "Ask Mausam Mitra" trigger card ───────────────────────────────────────────
// Rendered at the bottom of each persona feed as a lightweight card.
export function AskMausamMitraCard({ onOpen }) {
  const { lang } = useLanguage();
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onOpen}
      id="ask-mausam-mitra-card"
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[1.5rem] bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-sky-200/60 shadow-sm hover:shadow-md transition-all mb-4"
    >
      <div className="w-10 h-10 rounded-[0.85rem] bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center shadow">
        <ChatbotIcon size={22} />
      </div>
      <div className="text-left flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 leading-tight">
          {lang === 'hi' ? 'मौसम मित्र से पूछें' : 'Ask Mausam Mitra'}
        </p>
        <p className="text-[11px] text-slate-500 leading-tight">
          {lang === 'hi' ? 'कोई भी मौसम सवाल पूछें' : 'Ask any weather question'}
        </p>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M6 12l4-4-4-4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}
