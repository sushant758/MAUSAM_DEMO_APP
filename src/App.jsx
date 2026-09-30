import React, { useState, useCallback } from 'react';
import PhoneFrame from './components/PhoneFrame';
import AuthScreen from './components/AuthScreen';
import OnboardingFlow from './components/OnboardingFlow';
import HomeScreen from './components/HomeScreen';
import DemoControls, { DEMO_SCENARIOS } from './components/DemoControls';
import { MOCK_LOCATIONS } from './data/personaData';
import { LanguageProvider } from './i18n/LanguageContext';

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

// A8: Show demo controls when ?demo=1 is in the URL (or in dev mode)
const IS_DEMO_MODE =
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).get('demo') === '1' ||
   import.meta.env.DEV);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Auth state
  const [user, setUser] = useState(() => readLS(LS_USER, null));

  // Onboarding: show only once per user session
  const [onboarded, setOnboarded] = useState(() => readLS(LS_ONBOARDED, false));

  // Settings (A1): initialised from localStorage, updated by onboarding + SettingsSheet
  const [settings, setSettings] = useState(() => readLS(LS_SETTINGS, {
    location:       MOCK_LOCATIONS[0],
    personaId:      'health',
    personaIds:     ['health'],
    tempUnit:       'C',
    autoPersona:    true,
  }));

  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // A8: Demo override — synthetic weather ctx injected by DemoControls
  const [demoCtx, setDemoCtx]     = useState(null);
  const [demoId, setDemoId]       = useState(null);   // active scenario id

  const handleDemoOverride = useCallback((ctx) => {
    if (ctx) {
      const match = DEMO_SCENARIOS.find((s) => s.ctx.locationName === ctx.locationName);
      setDemoCtx(ctx);
      setDemoId(match?.id ?? null);
    } else {
      setDemoCtx(null);
      setDemoId(null);
    }
  }, []);

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
  const handleOnboardingComplete = useCallback(({ location, personaId, personaIds, tempUnit, autoPersona }) => {
    const newSettings = { location, personaId, personaIds: personaIds ?? [personaId], tempUnit, autoPersona };
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
    <LanguageProvider>
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
            initialLocation={settings.location}
            initialPersonaId={settings.personaId}
            initialPersonaIds={settings.personaIds ?? [settings.personaId ?? 'health']}
            initialTempUnit={settings.tempUnit}
            initialAutoPersona={settings.autoPersona}
            onSettingsChange={updateSettings}
            // A8: inject synthetic weather ctx from demo controls (null = use real API data)
            demoCtx={demoCtx}
          />
        </PhoneFrame>
      )}

      {/* A8: Demo scenario panel — only visible in dev mode or ?demo=1 */}
      {screen === 'home' && IS_DEMO_MODE && (
        <DemoControls
          onOverride={handleDemoOverride}
          activeId={demoId}
        />
      )}
    </div>
  </LanguageProvider>
  );
}
