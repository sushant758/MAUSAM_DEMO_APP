import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, MapPin, Calendar, LogOut, Sparkles, ShieldCheck } from 'lucide-react';

export default function UserProfileModal({ isOpen, onClose, user, onLogout }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full max-w-sm bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl z-10 border border-slate-100"
        >
          {/* Top grab line */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 sm:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-slate-800">
                User Persona Profile
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Avatar & Name */}
          <div className="flex flex-col items-center my-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 mb-2">
              {user.name ? user.name[0].toUpperCase() : 'M'}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Active Persona Member
            </span>
          </div>

          {/* Details List */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 mb-5 border border-slate-200/60">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-2 text-slate-400">
                <User className="w-4 h-4 text-slate-500" /> Gender:
              </span>
              <span className="font-bold text-slate-800">{user.gender || 'Not specified'}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-2 text-slate-400">
                <Calendar className="w-4 h-4 text-slate-500" /> Age:
              </span>
              <span className="font-bold text-slate-800">{user.age || '26'} yrs</span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-2 text-slate-400">
                <Phone className="w-4 h-4 text-slate-500" /> Phone:
              </span>
              <span className="font-bold text-slate-800">{user.phone}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-slate-500" /> Default Location:
              </span>
              <span className="font-bold text-slate-800 truncate max-w-[150px]">{user.location}</span>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="w-full py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Prototype</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
