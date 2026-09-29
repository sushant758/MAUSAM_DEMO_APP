import React, { useState, useCallback } from 'react';
import PhoneFrame from './components/PhoneFrame';
import AuthScreen from './components/AuthScreen';
import OnboardingFlow from './components/OnboardingFlow';
import HomeScreen from './components/HomeScreen';
import { MOCK_LOCATIONS } from './data/personaData';

// ─── localStorage helpers ─────────────────────────────────────────────────────
const LS_USER        = 'mausam_user';
const LS_ONBOARDED   = 'mausam.onboarded';
const LS_SETTINGS    = 'mausam.settings';

function readLS(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function writeLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Auth state
  const [user, setUser] = useState(() => readLS(LS_USER, null));

  // Onboarding: show only once per user session
  const [onboarded, setOnboarded] = useState(() => readLS(LS_ONBOARDED, false));

  // Settings (A1): initialised from localStorage, updated by onboarding + SettingsSheet
  const [settings, setSettings] = useState(() => readLS(LS_SETTINGS, {
    location:    MOCK_LOCATIONS[0],
    personaId:   'health',
    tempUnit:    'C',
    autoPersona: true,
  }));

  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // ── Auth handlers ────────────────────────────────────────────────────────
  const handleLoginSuccess = useCallback((userData) => {
    setUser(userData);
    writeLS(LS_USER, userData);
    // Reset onboarded flag so new users see onboarding
    const alreadyOnboarded = readLS(LS_ONBOARDED, false);
    if (!alreadyOnboarded) setOnboarded(false);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setOnboarded(false);
    localStorage.removeItem(LS_USER);
    localStorage.removeItem(LS_ONBOARDED);
    // Keep settings so they persist across sessions
  }, []);

  // ── Onboarding complete ──────────────────────────────────────────────────
  const handleOnboardingComplete = useCallback(({ location, personaId, tempUnit, autoPersona }) => {
    const newSettings = { location, personaId, tempUnit, autoPersona };
    setSettings(newSettings);
    writeLS(LS_SETTINGS, newSettings);
    setOnboarded(true);
    writeLS(LS_ONBOARDED, true);
  }, []);

  // ── Settings update (from SettingsSheet) ─────────────────────────────────
  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeLS(LS_SETTINGS, next);
      return next;
    });
  }, []);

  // ── Determine which screen to render ─────────────────────────────────────
  const screen = !user ? 'auth'
               : !onboarded ? 'onboarding'
               : 'home';

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans text-slate-900">
      {screen === 'auth' && (
        <PhoneFrame isPhoneFrame={isPhoneFrame} onToggleFrame={() => setIsPhoneFrame((p) => !p)}>
          <AuthScreen onLoginSuccess={handleLoginSuccess} />
        </PhoneFrame>
      )}

      {screen === 'onboarding' && (
        <PhoneFrame isPhoneFrame={isPhoneFrame} onToggleFrame={() => setIsPhoneFrame((p) => !p)}>
          <OnboardingFlow user={user} onComplete={handleOnboardingComplete} />
        </PhoneFrame>
      )}

      {screen === 'home' && (
        <PhoneFrame isPhoneFrame={isPhoneFrame} onToggleFrame={() => setIsPhoneFrame((p) => !p)}>
          <HomeScreen
            user={user}
            onLogout={handleLogout}
            isPhoneFrame={isPhoneFrame}
            onTogglePhoneFrame={() => setIsPhoneFrame((p) => !p)}
            // A1: settings props
            initialLocation={settings.location}
            initialPersonaId={settings.personaId}
            initialTempUnit={settings.tempUnit}
            initialAutoPersona={settings.autoPersona}
            onSettingsChange={updateSettings}
          />
        </PhoneFrame>
      )}
    </div>
  );
}
