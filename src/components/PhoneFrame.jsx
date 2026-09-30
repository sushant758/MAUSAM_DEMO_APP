import React, { useState, useEffect } from 'react';
import { Smartphone, Maximize2, Wifi, Battery, Signal, Sparkles } from 'lucide-react';

export default function PhoneFrame({ children, isPhoneFrame, onToggleFrame }) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!isPhoneFrame) {
    // Mobile viewport full screen view
    return <div className="w-full min-h-screen bg-slate-950 flex justify-center">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-6 select-none relative overflow-x-hidden">
      {/* Ambient background glowing dots */}
      <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full bg-sky-500/10 blur-[120px] pointer-events-none" />

      {/* Desktop Top Control Banner */}
      <div className="mb-4 z-20 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 text-xs font-semibold text-slate-300 shadow-xl">
        <span className="flex items-center gap-1.5 text-amber-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Mausam iPhone Preview</span>
        </span>
        <span className="text-slate-600">|</span>
        <button
          onClick={onToggleFrame}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <Maximize2 className="w-3 h-3 text-slate-400" />
          <span>Toggle Fullscreen</span>
        </button>
      </div>

      {/* iPhone 16 Pro Frame Shell */}
      <div className="relative w-full max-w-[410px] h-[860px] max-h-[95vh] bg-slate-900 rounded-[3.2rem] p-3 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8)] border-[6px] border-slate-700/80 ring-1 ring-slate-600/50 flex flex-col overflow-hidden">
        {/* Side Hardware Buttons */}
        <div className="absolute -left-[9px] top-28 w-[3px] h-10 bg-slate-700 rounded-l-sm" /> {/* Volume Up */}
        <div className="absolute -left-[9px] top-42 w-[3px] h-10 bg-slate-700 rounded-l-sm" /> {/* Volume Down */}
        <div className="absolute -right-[9px] top-32 w-[3px] h-14 bg-slate-700 rounded-r-sm" /> {/* Power Button */}

        {/* Screen Bezel Box */}
        <div className="relative w-full h-full bg-gradient-to-b from-sky-200 via-sky-100 to-slate-50 rounded-[2.5rem] overflow-hidden flex flex-col border border-black/10">
          
          {/* iOS Top Status Bar + Dynamic Island */}
          <div className="w-full pt-3 px-7 flex items-center justify-between z-30 shrink-0 select-none text-slate-900">
            {/* Clock */}
            <span className="text-xs font-extrabold tracking-tight">
              {currentTime || '9:41'}
            </span>

            {/* Dynamic Island Notch */}
            <div className="w-24 h-5 bg-black rounded-full flex items-center justify-end px-2 gap-1.5 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-blue-900/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
            </div>

            {/* Status Icons */}
            <div className="flex items-center gap-1.5 text-slate-900">
              <Signal className="w-3.5 h-3.5 stroke-[2.5]" />
              <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
              <Battery className="w-4 h-4 stroke-[2.5] fill-slate-900" />
            </div>
          </div>

          {/* Phone Screen App Content */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {children}
          </div>

          {/* iOS Bottom Home Bar Indicator */}
          <div className="w-full py-2 flex items-center justify-center shrink-0 z-30 pointer-events-none">
            <div className="w-32 h-1 bg-slate-900/80 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
