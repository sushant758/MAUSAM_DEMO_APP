import React from 'react';
import { 
  MapPin, 
  ChevronDown, 
  CloudSun, 
  Sparkles, 
  Smartphone, 
  Maximize2
} from 'lucide-react';

export default function Header({
  location,
  onOpenLocationModal,
  tempUnit,
  onToggleTempUnit,
  autoSwitchedMode,
  onToggleAutoSwitched,
  currentPersona,
  user,
  onOpenProfile,
  isPhoneFrame,
  onTogglePhoneFrame,
}) {
  const displayTemp = tempUnit === 'C' 
    ? `${location.tempC}°` 
    : `${location.tempF}°`;

  return (
    <header className="w-full pt-3 pb-2 px-4 flex flex-col gap-3">
      {/* Top Bar Controls (Desktop frame toggle & profile) */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2">
          {/* User profile button */}
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-1.5 bg-white/70 hover:bg-white text-slate-700 px-2.5 py-1 rounded-full shadow-2xs border border-slate-200/80 transition-all"
          >
            <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold">
              {user.name ? user.name[0].toUpperCase() : 'M'}
            </div>
            <span className="truncate max-w-[90px]">{user.name || 'Profile'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* C° / F° Toggle button */}
          <button
            onClick={onToggleTempUnit}
            className="bg-white/80 hover:bg-white text-slate-700 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200/80 shadow-2xs transition-all"
            title="Toggle Temperature Unit"
          >
            °{tempUnit}
          </button>

          {/* Desktop Frame Viewport Toggle */}
          <button
            onClick={onTogglePhoneFrame}
            className="hidden md:flex items-center gap-1 bg-slate-800 text-white hover:bg-slate-700 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-sm"
            title="Toggle Phone Frame Container"
          >
            {isPhoneFrame ? (
              <>
                <Maximize2 className="w-3 h-3 text-amber-400" />
                <span>Full View</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3 h-3 text-amber-400" />
                <span>Phone Frame</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Primary Visual Header Row:
          Top row: location pin icon + "Current Location" with dropdown chevron, 
          on the right a blue rounded toggle switch
      */}
      <div className="flex items-center justify-between">
        {/* Location Dropdown Trigger */}
        <button
          onClick={onOpenLocationModal}
          className="flex items-center gap-2 text-slate-800 hover:text-amber-600 transition-colors group text-left"
        >
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform shadow-2xs">
            <MapPin className="w-4 h-4 fill-amber-500/20" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Location
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:translate-y-0.5 transition-transform" />
            </div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-none">
              {location.name}
            </h1>
          </div>
        </button>

        {/* Blue Rounded Toggle Switch */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
            Auto Mode
          </span>
          <button
            onClick={onToggleAutoSwitched}
            className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 shadow-inner flex items-center ${
              autoSwitchedMode ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
            title="Toggle Auto-Switched Location Mode"
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
          </button>
        </div>
      </div>

      {/* Main Temperature & Weather Info */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex items-center gap-3">
          <span className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-none">
            {displayTemp}
          </span>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-amber-500 font-bold text-sm">
              <CloudSun className="w-6 h-6 stroke-[2.2] animate-bounce" />
              <span>{location.condition || 'Partly Sunny'}</span>
            </div>
            <span className="text-xs font-semibold text-slate-500 mt-0.5">
              High {tempUnit === 'C' ? '28°' : '82°'} • Low {tempUnit === 'C' ? '16°' : '61°'}
            </span>
          </div>
        </div>
      </div>

      {/* Rounded white "auto-switched mode" info pill with a location icon */}
      <div className="w-full bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/70 shadow-xs flex items-center justify-between gap-2.5 h-auto min-h-[38px] transition-all">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 self-center" />
          <span className="text-xs font-semibold text-slate-700 leading-snug break-words">
            Auto-switched to {currentPersona.name} Mode — tailored for {currentPersona.name} in {location.name}
          </span>
        </div>
        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 self-center">
          Active
        </span>
      </div>
    </header>
  );
}
