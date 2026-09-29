import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, Thermometer, Zap, LogOut, ChevronRight, Check,
  RotateCcw, Info, ShieldCheck, Heart, Bike, Baby, Navigation,
  Waves, Plane, Wheat, PartyPopper, Activity, User, Sparkles,
} from 'lucide-react';
import { PERSONAS, MOCK_LOCATIONS } from '../data/personaData';

const PERSONA_ICONS = {
  health: Heart, fitness: Bike, parent: Baby, commuter: Navigation,
  beachgoer: Waves, traveller: Plane, farmer: Wheat, eventplanner: PartyPopper,
};

// ─── SettingsSheet ────────────────────────────────────────────────────────────
/**
 * Full-featured settings bottom sheet (A1).
 *
 * Props:
 *   isOpen         {boolean}
 *   onClose        {fn}
 *   user           {object}
 *   currentLocation {object}
 *   tempUnit       {'C'|'F'}
 *   autoPersona    {boolean}
 *   personaId      {string}     current active persona
 *   onChangeLocation  {fn(loc)}
 *   onChangeTempUnit  {fn('C'|'F')}
 *   onChangeAutoPersona {fn(bool)}
 *   onChangePersona    {fn(personaId)}
 *   onLogout       {fn}
 */
export default function SettingsSheet({
  isOpen, onClose,
  user, currentLocation, tempUnit, autoPersona, personaId,
  onChangeLocation, onChangeTempUnit, onChangeAutoPersona, onChangePersona,
  onLogout,
}) {
  const [section, setSection] = useState(null); // null | 'location' | 'persona'

  const handleClose = () => { setSection(null); onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            key="settings-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto bg-white rounded-t-[2rem] shadow-2xl"
            style={{ maxWidth: 480, margin: '0 auto' }}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black text-slate-900">Settings</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* User avatar */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-orange-400/30">
                {user?.name?.[0]?.toUpperCase() || 'M'}
              </div>
              <div>
                <p className="font-bold text-slate-900">{user?.name || 'Mausam User'}</p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  {user?.phone || 'Demo account'}
                </p>
              </div>
            </div>

            <div className="px-5 py-4 flex flex-col gap-1">

              {/* ── Location ──────────────────────────────────────────────── */}
              <SectionHeader label="Location" />

              <SettingRow
                icon={<MapPin className="w-4 h-4" />}
                iconBg="bg-sky-100 text-sky-600"
                label="Current location"
                value={currentLocation?.name?.split(',')[0] ?? '—'}
                onClick={() => setSection(section === 'location' ? null : 'location')}
                expanded={section === 'location'}
              />

              <AnimatePresence>
                {section === 'location' && (
                  <ExpandPanel key="loc-panel">
                    <div className="flex flex-col gap-1.5">
                      {MOCK_LOCATIONS.map((loc) => (
                        <button
                          key={loc.id}
                          onClick={() => { onChangeLocation(loc); setSection(null); }}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                            currentLocation?.id === loc.id
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <MapPin className={`w-3.5 h-3.5 shrink-0 ${currentLocation?.id === loc.id ? 'text-amber-500' : 'text-slate-400'}`} />
                          <div className="text-left flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{loc.name}</p>
                            <p className="text-[10px] text-slate-400">{loc.country} · {loc.tempC}°C</p>
                          </div>
                          {currentLocation?.id === loc.id && <Check className="w-3.5 h-3.5 text-amber-500 stroke-[2.5] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </ExpandPanel>
                )}
              </AnimatePresence>

              {/* ── Persona ───────────────────────────────────────────────── */}
              <SectionHeader label="Persona" />

              <SettingRow
                icon={<Activity className="w-4 h-4" />}
                iconBg="bg-violet-100 text-violet-600"
                label="Default persona"
                value={PERSONAS.find((p) => p.id === personaId)?.name?.split(' ')[0] ?? '—'}
                onClick={() => setSection(section === 'persona' ? null : 'persona')}
                expanded={section === 'persona'}
              />

              <AnimatePresence>
                {section === 'persona' && (
                  <ExpandPanel key="persona-panel">
                    <div className="grid grid-cols-2 gap-2">
                      {PERSONAS.map((p) => {
                        const Icon = PERSONA_ICONS[p.id] || Activity;
                        const sel = personaId === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { onChangePersona(p.id); setSection(null); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                              sel ? 'border-amber-300 bg-amber-50' : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${sel ? 'text-amber-500' : 'text-slate-400'}`} />
                            <span className={`text-xs font-bold truncate ${sel ? 'text-amber-700' : 'text-slate-600'}`}>
                              {p.name.split(' ')[0]}
                            </span>
                            {sel && <Check className="w-3 h-3 text-amber-500 stroke-[3] ml-auto shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </ExpandPanel>
                )}
              </AnimatePresence>

              {/* ── Display ───────────────────────────────────────────────── */}
              <SectionHeader label="Display" />

              {/* Temp unit toggle */}
              <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                  <Thermometer className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-700 flex-1">Temperature unit</span>
                <div className="flex gap-1 bg-slate-200 rounded-xl p-0.5">
                  {['C', 'F'].map((u) => (
                    <button
                      key={u}
                      onClick={() => onChangeTempUnit(u)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        tempUnit === u ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      °{u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-persona toggle */}
              <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-slate-50 border border-slate-100 mt-1">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">Auto-switch persona</p>
                  <p className="text-[10px] text-slate-400">Based on time of day &amp; conditions</p>
                </div>
                <motion.button
                  onClick={() => onChangeAutoPersona(!autoPersona)}
                  className={`relative w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${
                    autoPersona ? 'bg-amber-500' : 'bg-slate-300'
                  }`}
                >
                  <motion.div
                    animate={{ x: autoPersona ? 20 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-5 h-5 bg-white rounded-full shadow-sm"
                  />
                </motion.button>
              </div>

              {/* ── About ─────────────────────────────────────────────────── */}
              <SectionHeader label="About" />
              <div className="px-3 py-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Mausam Mark 2 · Weather data: Open-Meteo (CC BY 4.0) · Air quality: Open-Meteo AQ API.
                  This is a prototype — not for safety-critical decisions.
                  Persona cards are informational only, not medical, legal, or agricultural advice.
                </p>
              </div>

              {/* ── Logout ────────────────────────────────────────────────── */}
              <div className="mt-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={onLogout}
                  className="w-full py-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out of prototype
                </motion.button>
              </div>

              <div className="pb-safe h-4" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }) {
  return (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 pt-3 pb-1">
      {label}
    </p>
  );
}

function SettingRow({ icon, iconBg, label, value, onClick, expanded }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-2xl border transition-colors ${
        expanded ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <span className="text-sm font-semibold text-slate-700 flex-1 text-left">{label}</span>
      <span className={`text-xs font-bold ${expanded ? 'text-amber-600' : 'text-slate-400'}`}>{value}</span>
      <motion.div
        animate={{ rotate: expanded ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronRight className={`w-4 h-4 ${expanded ? 'text-amber-500' : 'text-slate-300'}`} />
      </motion.div>
    </motion.button>
  );
}

function ExpandPanel({ children }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="px-1 pb-2 pt-1">{children}</div>
    </motion.div>
  );
}
