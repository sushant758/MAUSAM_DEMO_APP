import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudSun, 
  Sun, 
  MapPin, 
  Phone, 
  Lock, 
  User, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  Navigation,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function AuthScreen({ onLoginSuccess }) {
  const [tab, setTab] = useState('signup'); // 'signup' or 'login'

  // Form states
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male'); // Male / Female / Other
  const [age, setAge] = useState('26');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [locationName, setLocationName] = useState('Indiranagar, Bengaluru');
  const [isLocating, setIsLocating] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

  // Trigger browser geolocation
  const handleRequestLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setLocationGranted(true);
        // Set detected location name with GPS label
        const coords = `${position.coords.latitude.toFixed(2)}°N, ${position.coords.longitude.toFixed(2)}°E`;
        setLocationName(`Current GPS (${coords})`);
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error.message);
        alert('Could not retrieve exact location. Defaulting to Indiranagar, Bengaluru.');
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Trigger celebratory confetti on login/signup!
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch (err) {}

    const userData = {
      name: name.trim() || (tab === 'signup' ? 'Runner Sushant' : 'Mausam User'),
      gender,
      age: age || '26',
      phone: phone.trim() || '+91 9876543210',
      location: locationName,
    };

    onLoginSuccess(userData);
  };

  // Quick Preset Demo Logins
  const handleQuickDemo = (personaName, defaultName) => {
    const demoData = {
      name: defaultName,
      gender: 'Male',
      age: '28',
      phone: '+91 98765 43210',
      location: 'Indiranagar, Bengaluru',
    };
    onLoginSuccess(demoData);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-200 via-sky-100 to-slate-50 flex flex-col items-center justify-between p-4 sm:p-6 ios-scroll overflow-y-auto">
      {/* Background Decorative Weather Shapes */}
      <div className="absolute top-6 left-6 w-32 h-32 rounded-full bg-white/40 blur-2xl pointer-events-none" />
      <div className="absolute top-20 right-8 w-44 h-44 rounded-full bg-amber-300/30 blur-3xl pointer-events-none" />

      {/* Top App Branding */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mt-4 text-center z-10"
      >
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-xl shadow-orange-500/30 mb-3 border border-white/40">
          <CloudSun className="w-10 h-10 stroke-[2.2]" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Mausam <span className="text-amber-500">मौसम</span>
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1 max-w-xs">
          Personalized Mobile Weather & Persona Intelligence
        </p>
      </motion.div>

      {/* Main Auth Form Container Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl shadow-slate-200/80 border border-white/60 my-6 z-10"
      >
        {/* Log In / Sign Up Segmented Control Tab */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200/60">
          <button
            type="button"
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-sm shadow-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-sm shadow-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Log In
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {tab === 'signup' ? (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-3.5"
              >
                {/* Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sushant Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Gender Segmented Control */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Gender
                  </label>
                  <div className="flex gap-2">
                    {['Male', 'Female', 'Other'].map((g) => (
                      <button
                        type="button"
                        key={g}
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          gender === g
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age & Phone Number */}
                <div className="flex gap-3">
                  <div className="w-1/3">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Age
                    </label>
                    <input
                      type="number"
                      required
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="26"
                      min="10"
                      max="100"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Location Access Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleRequestLocation}
                    disabled={isLocating}
                    className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                      locationGranted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                        <span>Detecting GPS Location...</span>
                      </>
                    ) : locationGranted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="truncate">{locationName}</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 text-amber-500" />
                        <span>Allow Location Access</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="login-fields"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-3.5"
              >
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:opacity-95 text-white font-bold text-sm shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all"
          >
            <span>{tab === 'signup' ? 'Create Account & Continue' : 'Log In to Mausam'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Preset Button */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Or Instant Prototype Demo
          </span>
          <button
            type="button"
            onClick={() => handleQuickDemo('Runner', 'Alex Morgan')}
            className="w-full py-2 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Demo Login (Skip Form)</span>
          </button>
        </div>
      </motion.div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] font-semibold text-slate-400 z-10 pb-2">
        Mausam iOS Weather Platform • Built for India & Beyond
      </div>
    </div>
  );
}
