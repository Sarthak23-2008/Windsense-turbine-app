import React from 'react';
import { OperationalState } from '../../types/simulation';

interface StatusBadgeProps {
  state: OperationalState;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ state, showIcon = true }) => {
  const stateConfigs: Record<
    OperationalState,
    { label: string; bg: string; text: string; border: string; pulse: string; desc: string }
  > = {
    STILL: {
      label: 'STILL / PARKED',
      bg: 'bg-slate-900',
      text: 'text-slate-400',
      border: 'border-slate-700',
      pulse: 'bg-slate-500',
      desc: 'Wind below cut-in threshold (3.0 m/s). Rotor stationary.',
    },
    CUT_IN: {
      label: 'CUT-IN REGION',
      bg: 'bg-cyan-950/60',
      text: 'text-cyan-400',
      border: 'border-cyan-800/60',
      pulse: 'bg-cyan-400',
      desc: 'Rotor accelerating; mechanical governor preparing engagement.',
    },
    OPTIMAL: {
      label: 'OPTIMAL OPERATION',
      bg: 'bg-emerald-950/60',
      text: 'text-emerald-400',
      border: 'border-emerald-800/60',
      pulse: 'bg-emerald-400',
      desc: 'Governor maintaining optimal aerodynamic angle for peak power.',
    },
    PASSIVE_FEATHERING: {
      label: 'PASSIVE FEATHERING',
      bg: 'bg-amber-950/60',
      text: 'text-amber-400',
      border: 'border-amber-800/60',
      pulse: 'bg-amber-400',
      desc: 'Centrifugal forces driving flyweights out, auto-feathering blades to shed aerodynamic load.',
    },
    STORM_CUT_OUT: {
      label: 'STORM CUT-OUT',
      bg: 'bg-rose-950/60',
      text: 'text-rose-400',
      border: 'border-rose-800/60',
      pulse: 'bg-rose-500',
      desc: 'Full mechanical feathering active (82° pitch). Rotor aerodynamically stalled/braked.',
    },
  };

  const config = stateConfigs[state] || stateConfigs.STILL;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${config.bg} ${config.text} ${config.border} shadow-inner transition-all duration-300`}
      title={config.desc}
    >
      {showIcon && (
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulse} opacity-75`}
          />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.pulse}`} />
        </span>
      )}
      <span className="font-mono text-xs font-bold tracking-wider uppercase">{config.label}</span>
    </div>
  );
};
