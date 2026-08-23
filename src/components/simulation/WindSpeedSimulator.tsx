import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Wind, Sparkles, AlertCircle, Zap, ShieldAlert, Activity, Compass } from 'lucide-react';

export interface WindClassification {
  label: string;
  category: 'very-low' | 'low-moderate' | 'normal' | 'high' | 'extreme';
  rangeLabel: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  description: string;
  impactText: string;
}

export function classifyWindSpeed(speed: number): WindClassification {
  if (speed < 3.0) {
    return {
      label: 'Very Low Wind',
      category: 'very-low',
      rangeLabel: '< 3.0 m/s',
      badgeBg: 'bg-slate-800/80',
      badgeText: 'text-slate-300',
      borderColor: 'border-slate-700',
      description: 'Wind speed is below the cut-in threshold (3.0 m/s). Aerodynamic lift is insufficient to overcome bearing friction.',
      impactText: 'Rotor stationary or idling; 0 kW power generated.',
    };
  } else if (speed < 7.0) {
    return {
      label: 'Low / Moderate Wind',
      category: 'low-moderate',
      rangeLabel: '3.0 – 7.0 m/s',
      badgeBg: 'bg-cyan-950/80',
      badgeText: 'text-cyan-300',
      borderColor: 'border-cyan-800/80',
      description: 'Cut-in region where aerodynamic torque accelerates the rotor. Helical spring holds blades at fine pitch (2°) for maximum lift.',
      impactText: 'Rotor accelerating; partial power generation.',
    };
  } else if (speed < 14.0) {
    return {
      label: 'Normal Operating Region',
      category: 'normal',
      rangeLabel: '7.0 – 14.0 m/s',
      badgeBg: 'bg-emerald-950/80',
      badgeText: 'text-emerald-300',
      borderColor: 'border-emerald-800/80',
      description: 'Optimal power production zone. Governor centrifugal forces approach spring pre-load balance, maximizing efficiency (Cp ≈ 0.45).',
      impactText: 'Peak power generation; optimal tip-speed ratio.',
    };
  } else if (speed < 22.0) {
    return {
      label: 'High Wind Region',
      category: 'high',
      rangeLabel: '14.0 – 22.0 m/s',
      badgeBg: 'bg-amber-950/80',
      badgeText: 'text-amber-300',
      borderColor: 'border-amber-800/80',
      description: 'Centrifugal forces overpower helical spring preload. Flyweights move outward, sliding swashplate to passively feather blades (15°–45°).',
      impactText: 'Passive pitch regulation active; shedding excess aerodynamic torque.',
    };
  } else {
    return {
      label: 'Very High / Extreme Wind',
      category: 'extreme',
      rangeLabel: '≥ 22.0 m/s',
      badgeBg: 'bg-rose-950/80',
      badgeText: 'text-rose-300',
      borderColor: 'border-rose-800/80',
      description: 'Storm condition. Centrifugal governor reaches maximum mechanical stroke (60mm), feathering blades to near-stall pitch (82°).',
      impactText: 'Storm protection engaged; aerodynamic stall braking rotor.',
    };
  }
}

interface WindSpeedSimulatorProps {
  windSpeed: number;
  setWindSpeed: (speed: number | ((prev: number) => number)) => void;
  windDirection?: number;
  setWindDirection?: (dir: number | ((prev: number) => number)) => void;
  isPaused: boolean;
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>;
  onReset: () => void;
  showPresets?: boolean;
  showDisclaimer?: boolean;
}

function getCardinalDirection(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  if (norm >= 337.5 || norm < 22.5) return 'N (Headwind)';
  if (norm >= 22.5 && norm < 67.5) return 'NE';
  if (norm >= 67.5 && norm < 112.5) return 'E (Crosswind)';
  if (norm >= 112.5 && norm < 157.5) return 'SE';
  if (norm >= 157.5 && norm < 202.5) return 'S (Tailwind)';
  if (norm >= 202.5 && norm < 247.5) return 'SW';
  if (norm >= 247.5 && norm < 292.5) return 'W (Crosswind)';
  if (norm >= 292.5 && norm < 337.5) return 'NW';
  return 'N (Headwind)';
}

export const WindSpeedSimulator: React.FC<WindSpeedSimulatorProps> = ({
  windSpeed,
  setWindSpeed,
  windDirection,
  setWindDirection,
  isPaused,
  setIsPaused,
  onReset,
  showPresets = true,
  showDisclaimer = true,
}) => {
  const [gustMode, setGustMode] = useState(false);
  const classification = classifyWindSpeed(windSpeed);

  // Live turbulence / gust fluctuation simulation effect
  useEffect(() => {
    if (!gustMode || isPaused) return;

    const interval = setInterval(() => {
      setWindSpeed((prev) => {
        // Subtle random gust drift around current value (+/- 0.8 m/s)
        const delta = (Math.random() - 0.5) * 0.8;
        const next = Math.max(0, Math.min(30, prev + delta));
        return parseFloat(next.toFixed(1));
      });
    }, 400);

    return () => clearInterval(interval);
  }, [gustMode, isPaused, setWindSpeed]);

  const presets = [
    { label: 'Calm', speed: 2.0, color: 'hover:border-slate-500 text-slate-300', desc: 'Below Cut-in (2 m/s)' },
    { label: 'Normal', speed: 10.0, color: 'hover:border-emerald-500 text-emerald-400', desc: 'Rated Power (10 m/s)' },
    { label: 'Strong Wind', speed: 18.0, color: 'hover:border-amber-500 text-amber-400', desc: 'Feathering Zone (18 m/s)' },
    { label: 'Extreme Wind', speed: 26.0, color: 'hover:border-rose-500 text-rose-400', desc: 'Storm Cut-out (26 m/s)' },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Wind className={`w-5 h-5 ${!isPaused && windSpeed > 0 ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Live Wind-Speed & Direction Simulator</span>
              {isPaused && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PAUSED
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Simulate changing environmental wind velocity and direction inputs for the digital twin model.
            </p>
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isPaused
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              onReset();
              if (setWindDirection) setWindDirection(0);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset Simulation Inputs to Default (12 m/s, 0° Headwind)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Wind Speed Slider Readout */}
      <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between">
          <label htmlFor="wind-slider-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-cyan-400" />
            <span>Environmental Wind Speed</span>
            <span className="text-[10px] text-slate-500 font-mono">(0.0 – 30.0 m/s)</span>
          </label>

          <div className="flex items-baseline gap-1 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <span className="text-2xl font-mono font-black text-cyan-400">{windSpeed.toFixed(1)}</span>
            <span className="text-xs font-mono text-slate-400 font-bold uppercase">m/s</span>
            <span className="text-[10px] text-slate-500 font-mono ml-1">
              ({(windSpeed * 2.23694).toFixed(1)} mph)
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <input
            id="wind-slider-input"
            type="range"
            min="0"
            max="30"
            step="0.1"
            value={windSpeed}
            onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
            className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />

          <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
            <span>0 m/s (Calm)</span>
            <span>3 m/s (Cut-In)</span>
            <span>12 m/s (Rated)</span>
            <span>22 m/s (Feather)</span>
            <span>30 m/s (Gale)</span>
          </div>
        </div>

        {/* Fine Tune Adjusters */}
        <div className="flex items-center justify-between pt-1 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWindSpeed((s) => Math.max(0, parseFloat((s - 0.5).toFixed(1))))}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
            >
              -0.5 m/s
            </button>
            <button
              onClick={() => setWindSpeed((s) => Math.min(30, parseFloat((s + 0.5).toFixed(1))))}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
            >
              +0.5 m/s
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={gustMode}
              onChange={(e) => setGustMode(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/40"
            />
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Turbulent Gusts Mode</span>
            </span>
          </label>
        </div>
      </div>

      {/* Main Interactive Wind Direction Slider Readout (Directly Below Wind Speed Input) */}
      {setWindDirection !== undefined && (
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <label htmlFor="wind-dir-slider-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Environmental Wind Direction</span>
              <span className="text-[10px] text-slate-500 font-mono">(0° – 360°)</span>
            </label>

            <div className="flex items-baseline gap-1 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
              <span className="text-2xl font-mono font-black text-amber-400">{(windDirection ?? 0).toFixed(0)}</span>
              <span className="text-xs font-mono text-slate-400 font-bold uppercase">°</span>
              <span className="text-[10px] text-slate-400 font-mono ml-1 font-semibold">
                ({getCardinalDirection(windDirection ?? 0)})
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <input
              id="wind-dir-slider-input"
              type="range"
              min="0"
              max="360"
              step="1"
              value={windDirection ?? 0}
              onChange={(e) => setWindDirection(parseFloat(e.target.value))}
              className="w-full h-3 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
              <span>0° (Headwind / N)</span>
              <span>90° (Crosswind / E)</span>
              <span>180° (Tailwind / S)</span>
              <span>270° (Crosswind / W)</span>
              <span>360° (Headwind / N)</span>
            </div>
          </div>

          {/* Fine Tune Adjusters & Quick Direction Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWindDirection((d) => (((d - 15) % 360) + 360) % 360)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
              >
                -15°
              </button>
              <button
                onClick={() => setWindDirection((d) => (((d + 15) % 360) + 360) % 360)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-xs cursor-pointer"
              >
                +15°
              </button>
            </div>

            <div className="flex items-center gap-1">
              {[
                { label: '0° N', angle: 0 },
                { label: '45° NE', angle: 45 },
                { label: '90° E', angle: 90 },
                { label: '180° S', angle: 180 },
              ].map((dir) => (
                <button
                  key={dir.label}
                  onClick={() => setWindDirection(dir.angle)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer ${
                    Math.abs((windDirection ?? 0) - dir.angle) < 1
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {dir.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Wind Condition Classification Box */}
      <div className={`p-4 rounded-xl border ${classification.badgeBg} ${classification.borderColor} space-y-2 transition-all duration-300`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${classification.badgeBg} ${classification.badgeText} ${classification.borderColor}`}>
              {classification.rangeLabel}
            </span>
            <h4 className={`text-sm font-bold tracking-wide ${classification.badgeText}`}>
              {classification.label}
            </h4>
          </div>

          <span className="text-[10px] text-slate-400 font-mono italic">
            Simulation calibration region
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {classification.description}
        </p>

        <div className="text-xs font-semibold text-slate-200 border-t border-slate-800/60 pt-2 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Expected System Behavior: {classification.impactText}</span>
        </div>
      </div>

      {/* Preset Buttons */}
      {showPresets && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Wind Environment Presets
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => setWindSpeed(p.speed)}
                className={`p-2.5 rounded-xl border border-slate-800 bg-slate-950 text-left transition-all cursor-pointer ${p.color} ${
                  Math.abs(windSpeed - p.speed) < 0.2
                    ? 'ring-2 ring-cyan-500/60 bg-slate-900'
                    : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="text-xs font-bold">{p.label}</div>
                <div className="text-[11px] font-mono text-slate-400 font-semibold">{p.speed} m/s</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Non-Electronic Sensor Clarification Callout */}
      {showDisclaimer && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs flex items-start gap-2.5 text-slate-400">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong className="text-slate-200">Simulation Input Notice:</strong> This wind slider provides environmental test inputs for evaluating the digital twin model. The physical WindSense turbine operates entirely on passive mechanical principles and requires <strong className="text-emerald-400">zero electronic wind sensors</strong> or microcontrollers.
          </p>
        </div>
      )}
    </div>
  );
};
