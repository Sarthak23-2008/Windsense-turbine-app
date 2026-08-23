import React from 'react';

interface GaugeRadialProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  sublabel?: string;
  color?: 'emerald' | 'cyan' | 'amber' | 'purple' | 'rose';
  size?: 'sm' | 'md' | 'lg';
}

export const GaugeRadial: React.FC<GaugeRadialProps> = ({
  value,
  min,
  max,
  unit,
  label,
  sublabel,
  color = 'emerald',
  size = 'md',
}) => {
  // Ensure numeric safety
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const safeMin = typeof min === 'number' && !isNaN(min) ? min : 0;
  const safeMax = typeof max === 'number' && !isNaN(max) && max > safeMin ? max : safeMin + 1;

  // Angle range: -120 deg to +120 deg (total 240 deg arc)
  const clampedValue = Math.max(safeMin, Math.min(safeMax, safeValue));
  const fraction = (clampedValue - safeMin) / (safeMax - safeMin || 1);
  const safeFraction = isNaN(fraction) ? 0 : Math.max(0, Math.min(1, fraction));
  const angle = -120 + safeFraction * 240;

  const colorMap = {
    emerald: { stroke: '#10b981', text: 'text-emerald-400', glow: 'rgba(16, 185, 129, 0.25)' },
    cyan: { stroke: '#06b6d4', text: 'text-cyan-400', glow: 'rgba(6, 182, 212, 0.25)' },
    amber: { stroke: '#f59e0b', text: 'text-amber-400', glow: 'rgba(245, 158, 11, 0.25)' },
    purple: { stroke: '#a855f7', text: 'text-purple-400', glow: 'rgba(168, 85, 247, 0.25)' },
    rose: { stroke: '#f43f5e', text: 'text-rose-400', glow: 'rgba(244, 63, 94, 0.25)' },
  };

  const selectedColor = colorMap[color] || colorMap.emerald;

  // Radial dimensions
  const radius = 54;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  // Arc represents 240/360 = 2/3 of full circle
  const arcLength = circumference * (240 / 360);
  const rawOffset = arcLength * (1 - safeFraction);
  const strokeDashoffset = isNaN(rawOffset) ? arcLength : rawOffset;

  const displayValue = isNaN(safeValue)
    ? '0'
    : Math.abs(safeValue) < 10 && safeValue % 1 !== 0
    ? safeValue.toFixed(1)
    : Math.round(safeValue).toString();

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl relative overflow-hidden group">
      {/* Background ambient radial glow */}
      <div
        className="absolute w-24 h-24 rounded-full blur-2xl pointer-events-none transition-opacity duration-300 opacity-20 group-hover:opacity-40"
        style={{ backgroundColor: selectedColor.stroke }}
      />

      <div className="relative w-36 h-28 flex items-center justify-center">
        <svg viewBox="0 0 140 110" className="w-full h-full overflow-visible">
          <defs>
            <filter id={`glow-${color}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Outer Track Background Arc */}
          <path
            d="M 22 90 A 54 54 0 1 1 118 90"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, idx) => {
            const tickAngle = (-120 + t * 240) * (Math.PI / 180);
            const x1 = 70 + Math.sin(tickAngle) * 44;
            const y1 = 70 - Math.cos(tickAngle) * 44;
            const x2 = 70 + Math.sin(tickAngle) * 38;
            const y2 = 70 - Math.cos(tickAngle) * 38;
            return (
              <line
                key={idx}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#475569"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Active Colored Value Arc */}
          <path
            d="M 22 90 A 54 54 0 1 1 118 90"
            fill="none"
            stroke={selectedColor.stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${color})`}
            className="transition-all duration-300 ease-out"
          />

          {/* Needle Center & Arm */}
          <g transform={`translate(70, 70) rotate(${angle})`}>
            <line x1="0" y1="0" x2="0" y2="-44" stroke="#f8fafc" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="0" cy="0" r="5" fill={selectedColor.stroke} stroke="#0f172a" strokeWidth="2" />
          </g>

          {/* Min & Max Labels */}
          <text x="18" y="104" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
            {safeMin}
          </text>
          <text x="122" y="104" fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="monospace">
            {safeMax}
          </text>
        </svg>

        {/* Central Readout Text */}
        <div className="absolute bottom-1 text-center flex flex-col items-center">
          <span className={`font-mono font-black text-lg sm:text-xl tracking-tight leading-none ${selectedColor.text}`}>
            {displayValue}
          </span>
          <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
            {unit}
          </span>
        </div>
      </div>

      <div className="text-center mt-1">
        <h4 className="text-xs font-bold text-slate-200 tracking-wide">{label}</h4>
        {sublabel && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
};
