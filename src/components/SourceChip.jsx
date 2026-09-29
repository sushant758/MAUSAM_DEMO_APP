import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

/**
 * SourceChip — shows data provenance on every card.
 *
 * Variants:
 *   live   → green dot · "Live • Open-Meteo • X min ago"  (HI: "लाइव · Open-Meteo · X मिनट पहले")
 *   mock   → grey dot  · "Mock data"                       (HI: "नमूना डेटा (Mock)")
 *
 * Props:
 *   isLive     {boolean}  — whether the data came from a live API
 *   fetchedAt  {number}   — unix ms when data was fetched (for "X min ago")
 *   provider   {string}   — e.g. "Open-Meteo", "CPCB" (default "Open-Meteo")
 *   note       {string}   — optional extra note below the chip (e.g. formula text)
 */
export default function SourceChip({ isLive, fetchedAt, provider = 'Open-Meteo', note }) {
  const { lang, t } = useLanguage();

  const minsAgo = fetchedAt
    ? Math.round((Date.now() - fetchedAt) / 60_000)
    : null;

  // A7: "< 1 min ago" → "< 1 मिनट पहले"  |  "3 min ago" → "3 मिनट पहले"
  const agoLabel = minsAgo === null
    ? ''
    : minsAgo < 1
    ? t('chip.min_ago.one')
    : t('chip.min_ago').replace('{n}', minsAgo);

  // "Live" and "Mock data" labels — provider name kept English per spec
  const liveLabel  = t('chip.live');   // "Live" / "लाइव"
  const mockLabel  = t('chip.mock');   // "Mock data" / "नमूना डेटा (Mock)"

  return (
    <div className="flex flex-col gap-0.5">
      {isLive ? (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          {/* Green dot */}
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[200px]">
            {liveLabel} · {provider}{agoLabel ? ` · ${agoLabel}` : ''}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          {/* Grey dot */}
          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[200px]">{mockLabel}</span>
        </div>
      )}
      {/* Optional note — formula text or production note (kept English per spec) */}
      {note && (
        <p className="text-[10px] text-slate-400 leading-snug pl-3.5 truncate max-w-[220px]">
          {note}
        </p>
      )}
    </div>
  );
}
