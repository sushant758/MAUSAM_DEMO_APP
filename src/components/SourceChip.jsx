import React from 'react';

/**
 * SourceChip — shows data provenance on every card.
 *
 * Variants:
 *   live   → green dot · "Live • Open-Meteo • X min ago"
 *   mock   → grey dot  · "Mock data"
 *   imd    → star      · "IMD-style sample warning"
 *   formula→ fn symbol · "Formula: <text>"
 *
 * Props:
 *   isLive     {boolean}  — whether the data came from a live API
 *   fetchedAt  {number}   — unix ms when data was fetched (for "X min ago")
 *   provider   {string}   — e.g. "Open-Meteo", "CPCB" (default "Open-Meteo")
 *   note       {string}   — optional extra note below the chip (e.g. formula text)
 */
export default function SourceChip({ isLive, fetchedAt, provider = 'Open-Meteo', note }) {
  const minsAgo = fetchedAt
    ? Math.round((Date.now() - fetchedAt) / 60_000)
    : null;

  const agoLabel = minsAgo === null
    ? ''
    : minsAgo < 1
    ? '< 1 min ago'
    : `${minsAgo} min ago`;

  return (
    <div className="flex flex-col gap-0.5">
      {isLive ? (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          {/* Green dot */}
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[200px]">
            Live · {provider}{agoLabel ? ` · ${agoLabel}` : ''}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          {/* Grey dot */}
          <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" aria-hidden="true" />
          <span className="truncate max-w-[200px]">Mock data</span>
        </div>
      )}
      {/* Optional note — formula text or production note */}
      {note && (
        <p className="text-[10px] text-slate-400 leading-snug pl-3.5 truncate max-w-[220px]">
          {note}
        </p>
      )}
    </div>
  );
}
