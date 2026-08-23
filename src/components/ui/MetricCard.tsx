import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  id?: string;
  title: string;
  value: string | number;
  unit?: string;
  subValue?: string;
  icon?: LucideIcon;
  statusColor?: 'emerald' | 'cyan' | 'amber' | 'purple' | 'slate' | 'rose';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  minMax?: {
    min: number;
    max: number;
    current: number;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  id,
  title,
  value,
  unit,
  subValue,
  icon: Icon,
  statusColor = 'emerald',
  trend,
  minMax,
}) => {
  const borderColors = {
    emerald: 'border-slate-800 hover:border-emerald-500/40',
    cyan: 'border-slate-800 hover:border-cyan-500/40',
    amber: 'border-slate-800 hover:border-amber-500/40',
    purple: 'border-slate-800 hover:border-purple-500/40',
    slate: 'border-slate-800 hover:border-slate-700',
    rose: 'border-slate-800 hover:border-rose-500/40',
  };

  const badgeColors = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const textColors = {
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    slate: 'text-slate-100',
    rose: 'text-rose-400',
  };

  return (
    <div
      id={id}
      className={`p-4 bg-slate-900/90 border ${borderColors[statusColor]} rounded-2xl shadow-xl transition-all duration-200 flex flex-col justify-between relative overflow-hidden group`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={`p-1.5 rounded-lg border ${badgeColors[statusColor]}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
            {title}
          </span>
        </div>

        {trend && (
          <span
            className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
              trend.isPositive
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-2 flex items-baseline gap-1.5">
        <span className={`text-2xl sm:text-3xl font-mono font-black tracking-tight ${textColors[statusColor]}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-slate-400 font-mono uppercase">{unit}</span>}
      </div>

      {/* Footer SubText or Min/Max Progress */}
      {minMax ? (
        <div className="mt-1 space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Min: {minMax.min}</span>
            <span>Max: {minMax.max}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                statusColor === 'emerald' ? 'bg-emerald-400' : statusColor === 'cyan' ? 'bg-cyan-400' : statusColor === 'amber' ? 'bg-amber-400' : 'bg-slate-400'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, ((minMax.current - minMax.min) / (minMax.max - minMax.min || 1)) * 100))}%`,
              }}
            />
          </div>
        </div>
      ) : subValue ? (
        <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 mt-1 truncate">
          {subValue}
        </div>
      ) : null}
    </div>
  );
};
