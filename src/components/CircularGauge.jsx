import React from 'react';
import { motion } from 'framer-motion';

export default function CircularGauge({
  value = 82,
  max = 100,
  size = 48,
  strokeWidth = 5,
  color = '#f59e0b', // Amber-500 default
  textColor = 'text-slate-800',
  subText = '/100',
  showText = true,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max(value / max, 0), 1);
  const strokeDashoffset = circumference - percentage * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(226, 232, 240, 0.7)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Arc Fill */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className={`text-[11px] font-extrabold tracking-tight ${textColor}`}>
            {value}
          </span>
          {subText && (
            <span className="text-[8px] text-slate-400 font-semibold mt-[1px]">
              {subText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
