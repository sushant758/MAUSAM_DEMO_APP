import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, Check, Navigation, Loader2 } from 'lucide-react';
import { MOCK_LOCATIONS } from '../data/personaData';

export default function LocationModal({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  tempUnit,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  if (!isOpen) return null;

  const filteredLocations = MOCK_LOCATIONS.filter((loc) =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUseCurrentGPS = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const gpsLoc = {
          id: 'gps-live',
          name: `GPS Location (${position.coords.latitude.toFixed(2)}°, ${position.coords.longitude.toFixed(2)}°)`,
          country: 'Live GPS',
          tempC: 25,
          tempF: 77,
          condition: 'Clear Sky',
          humidity: '50%',
          wind: '7 km/h',
        };
        onSelectLocation(gpsLoc);
        onClose();
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        alert('Could not access GPS location. Selecting default location.');
      },
      { timeout: 8000 }
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] p-5 shadow-2xl z-10 border border-slate-100 max-h-[85vh] flex flex-col"
        >
          {/* Top Grab Handle on mobile */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-800">
                Select Location
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative my-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city or country..."
              className="w-full bg-slate-100/90 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white"
            />
          </div>

          {/* Use GPS Button */}
          <button
            onClick={handleUseCurrentGPS}
            disabled={isLocating}
            className="w-full py-2.5 px-4 mb-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-white/20" />
                <span>Use Current Browser GPS</span>
              </>
            )}
          </button>

          {/* Preset Locations List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar my-1">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => {
                const isSelected = loc.id === currentLocation.id;
                const tempDisplay = tempUnit === 'C' ? `${loc.tempC}°C` : `${loc.tempF}°F`;

                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? 'bg-amber-50 border-amber-300 shadow-2xs'
                        : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-amber-500 text-white' : 'bg-slate-200/70 text-slate-600'}`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">
                          {loc.name}
                        </h4>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {loc.country} • {loc.condition}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-800">
                        {tempDisplay}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-600 stroke-[3]" />
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 font-semibold">
                No matching location found. Try searching for another city.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
