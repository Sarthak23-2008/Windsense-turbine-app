import React, { useState } from 'react';
import { SimulationState } from '../../types/simulation';
import { Cog, Compass, Info, ArrowUpRight, Lock, CheckCircle2 } from 'lucide-react';

interface GovernorMechanicalDiagramProps {
  state: SimulationState;
}

export const GovernorMechanicalDiagram: React.FC<GovernorMechanicalDiagramProps> = ({ state }) => {
  const [activePart, setActivePart] = useState<string | null>('flyweights');

  const sleeveMm = (state.sleeveDisplacement * 1000).toFixed(1);
  const fcN = state.centrifugalForce.toFixed(1);
  const fsN = state.springForce.toFixed(1);

  const parts = [
    {
      id: 'flyweights',
      title: 'Centrifugal Flyweights (2x)',
      description: 'Precision brass weights mounted on pivoted arms. As rotor RPM increases, radial centrifugal force (F_c = m·ω²·r) pulls weights outward.',
      forceVal: `${fcN} N Centrifugal Force`,
      icon: '⚙️',
    },
    {
      id: 'spring',
      title: 'Calibrated Helical Spring',
      description: 'Heavy-duty linear spring with pre-load force F_preload = 380N. Resists weight extension below rated speed, establishing passive cut-in and power thresholds.',
      forceVal: `${fsN} N Spring Restoring Force`,
      icon: '🌀',
    },
    {
      id: 'sleeve',
      title: 'Axial Swashplate Sleeve',
      description: 'Sliding collar guided along central drive shaft. Translates radial weight expansion into axial displacement (x = 0 to 60mm).',
      forceVal: `${sleeveMm} mm Displacement`,
      icon: '📏',
    },
    {
      id: 'linkage',
      title: 'Blade Pitch Bell-Crank Linkage',
      description: 'Pure mechanical pushrod levers connected to blade root bearings. Converts axial sleeve travel into longitudinal blade twist (θ = 2° to 82°).',
      forceVal: `${state.pitchAngle.toFixed(1)}° Pitch Twist`,
      icon: '🔗',
    },
  ];

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cog className="w-5 h-5 text-amber-400 animate-spin-slow" />
            <h3 className="text-base font-bold text-slate-100">
              Passive Mechanical Governor Schematic
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-Electronics Centrifugal & Spring Balance Hub Assembly
          </p>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-xs font-medium text-amber-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Mechanically Failsafe (F_c = F_s)</span>
        </div>
      </div>

      {/* Interactive Vector SVG Schematic */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        <svg viewBox="0 0 500 240" className="w-full h-auto">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
            </marker>
            <marker id="springArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Central Rotor Shaft */}
          <rect x="20" y="110" width="460" height="20" fill="#334155" rx="3" stroke="#475569" strokeWidth="1" />
          <text x="250" y="124" fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">
            CENTRAL DRIVE SHAFT (ROTATING AT {Math.round(state.rotorRpm)} RPM)
          </text>

          {/* Sliding Swashplate Sleeve */}
          <g
            className="cursor-pointer transition-transform duration-300"
            onClick={() => setActivePart('sleeve')}
            transform={`translate(${state.sleeveDisplacement * 500}, 0)`}
          >
            <rect x="200" y="90" width="60" height="60" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" rx="6" />
            <text x="230" y="125" fill="#f59e0b" fontSize="9" textAnchor="middle" fontWeight="bold">
              SLEEVE
            </text>

            {/* Linkage Arms to Blades */}
            <line x1="230" y1="90" x2="160" y2="40" stroke="#fbbf24" strokeWidth="3" strokeDasharray={activePart === 'linkage' ? 'none' : '4 2'} />
            <line x1="230" y1="150" x2="160" y2="200" stroke="#fbbf24" strokeWidth="3" strokeDasharray={activePart === 'linkage' ? 'none' : '4 2'} />
          </g>

          {/* Helical Spring */}
          <g className="cursor-pointer" onClick={() => setActivePart('spring')}>
            <rect x="80" y="98" width="120" height="44" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" rx="4" />
            <path d="M 85,120 Q 95,102 105,120 T 125,120 T 145,120 T 165,120 T 185,120 T 195,120" fill="none" stroke="#38bdf8" strokeWidth="3" />
            <text x="140" y="112" fill="#38bdf8" fontSize="9" textAnchor="middle" fontWeight="bold">
              HELICAL SPRING (k = 4.8 kN/m)
            </text>
            {/* Spring Restoring Force Arrow */}
            <line x1="180" y1="132" x2="100" y2="132" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#springArrow)" />
            <text x="140" y="140" fill="#38bdf8" fontSize="8" textAnchor="middle">
              Fs = {fsN} N
            </text>
          </g>

          {/* Flyball Weights & Linkage Arms */}
          <g className="cursor-pointer" onClick={() => setActivePart('flyweights')}>
            {/* Top Weight */}
            <line x1="280" y1="110" x2="340" y2="40" stroke="#cbd5e1" strokeWidth="3" />
            <circle cx="340" cy="40" r="16" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
            <text x="340" y="44" fill="#78350f" fontSize="9" textAnchor="middle" fontWeight="bold">
              m
            </text>
            {/* Fc Vector Arrow */}
            <line x1="340" y1="40" x2="340" y2="10" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow)" />
            <text x="350" y="22" fill="#fbbf24" fontSize="8" fontWeight="bold">
              Fc = {fcN} N
            </text>

            {/* Bottom Weight */}
            <line x1="280" y1="130" x2="340" y2="200" stroke="#cbd5e1" strokeWidth="3" />
            <circle cx="340" cy="200" r="16" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
            <text x="340" y="204" fill="#78350f" fontSize="9" textAnchor="middle" fontWeight="bold">
              m
            </text>
            {/* Fc Vector Arrow */}
            <line x1="340" y1="200" x2="340" y2="230" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow)" />
          </g>

          {/* Blade Root Pivot (Top & Bottom) */}
          <g className="cursor-pointer" onClick={() => setActivePart('linkage')}>
            <rect x="130" y="20" width="60" height="30" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="4" />
            <text x="160" y="38" fill="#38bdf8" fontSize="9" textAnchor="middle" fontWeight="bold">
              BLADE ROOT
            </text>

            <rect x="130" y="190" width="60" height="30" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" rx="4" />
            <text x="160" y="208" fill="#38bdf8" fontSize="9" textAnchor="middle" fontWeight="bold">
              BLADE ROOT
            </text>
          </g>
        </svg>

        <p className="text-[11px] text-slate-400 text-center mt-2">
          Click on any component above to inspect its physical function and governing equations.
        </p>
      </div>

      {/* Component Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {parts.map((p) => {
          const isSelected = activePart === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActivePart(p.id)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800 border-amber-500/60 shadow-md ring-1 ring-amber-500/40'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-lg">{p.icon}</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {p.forceVal}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200">{p.title}</h4>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-tight">
                {p.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Part Deep Dive Box */}
      {activePart && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 text-sm">
              {parts.find((p) => p.id === activePart)?.title}
            </span>
            <span className="text-emerald-400 font-mono text-xs">
              {parts.find((p) => p.id === activePart)?.forceVal}
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {parts.find((p) => p.id === activePart)?.description}
          </p>
        </div>
      )}
    </div>
  );
};
