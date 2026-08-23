import React, { useState, useEffect, useRef } from 'react';
import {
  SimulationState,
  TurbineParameters,
  TimeHistoryPoint,
} from '../../types/simulation';
import {
  generateComparisonCurves,
  generateGovernorRpmCurves,
  DEFAULT_TURBINE_PARAMS,
  evaluateWindSenseState,
} from '../../physics/turbinePhysics';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  Activity,
  Zap,
  Compass,
  Gauge,
  ShieldCheck,
  Table,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Wind,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Info,
  X,
  TrendingUp,
  Award,
} from 'lucide-react';

interface PerformancePageProps {
  state?: SimulationState;
  windSpeed?: number;
  setWindSpeed?: (v: number) => void;
  params?: TurbineParameters;
}

export const PerformancePage: React.FC<PerformancePageProps> = ({
  state: externalState,
  windSpeed: externalWindSpeed = 12.0,
  setWindSpeed: externalSetWindSpeed,
  params = DEFAULT_TURBINE_PARAMS,
}) => {
  // Local state controls if not provided externally
  const [internalWindSpeed, setInternalWindSpeed] = useState<number>(externalWindSpeed);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<number>(1); // 1x, 2x, 5x

  // Navigation / Tab states for charts & drawers
  const [activeChartTab, setActiveChartTab] = useState<
    'all' | 'rpm' | 'pitch' | 'power_comp' | 'governor' | 'time_series'
  >('all');
  const [timeWindow, setTimeWindow] = useState<'30s' | '60s' | 'full'>('30s');
  const [isPhysicsDrawerOpen, setIsPhysicsDrawerOpen] = useState<boolean>(false);

  // Synchronized simulation state evaluation
  const activeWindSpeed = externalWindSpeed ?? internalWindSpeed;
  const state = externalState ?? evaluateWindSenseState(activeWindSpeed, params);

  // Cumulative energy & history time-series state
  const [timeHistory, setTimeHistory] = useState<TimeHistoryPoint[]>([]);
  const [cumulativeEnergyKwh, setCumulativeEnergyKwh] = useState<number>(0);
  const [peakRpm, setPeakRpm] = useState<number>(state.rotorRpm);
  const [peakPowerKw, setPeakPowerKw] = useState<number>(state.electricalPower / 1000);
  const [regulationSeconds, setRegulationSeconds] = useState<number>(0);
  const [totalSimSeconds, setTotalSimSeconds] = useState<number>(0);

  const stepCounterRef = useRef<number>(0);

  // Pre-calculated deterministic curves across 0 to 30 m/s wind velocities
  const comparisonData = generateComparisonCurves(params);
  const governorRpmData = generateGovernorRpmCurves(params);

  // Handle Wind Speed update
  const handleWindSpeedChange = (newSpeed: number) => {
    if (externalSetWindSpeed) {
      externalSetWindSpeed(newSpeed);
    } else {
      setInternalWindSpeed(newSpeed);
    }
  };

  // Live Timer Loop for Time-Series Recording & Energy Accumulation
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      stepCounterRef.current += 1;
      const step = stepCounterRef.current;
      const elapsedSec = step;

      // Energy delta in 1 second: E = (P_kW * 1s) / 3600
      const currentPowerKw = state.electricalPower / 1000;
      const energyDeltaKwh = (currentPowerKw * 1) / 3600;

      setCumulativeEnergyKwh((prev) => prev + energyDeltaKwh);
      setTotalSimSeconds((prev) => prev + 1);

      if (state.windSpeed >= 12.0) {
        setRegulationSeconds((prev) => prev + 1);
      }

      setPeakRpm((prev) => Math.max(prev, state.rotorRpm));
      setPeakPowerKw((prev) => Math.max(prev, currentPowerKw));

      // Calculate efficiency
      const availableKw = state.windPower / 1000;
      const overallEff = availableKw > 0 ? (currentPowerKw / availableKw) * 100 : 0;

      const mins = Math.floor(elapsedSec / 60);
      const secs = elapsedSec % 60;
      const timeLabel = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      const newPoint: TimeHistoryPoint = {
        step,
        timestampSec: elapsedSec,
        timeLabel,
        windSpeed: Number(state.windSpeed.toFixed(1)),
        rotorRpm: Math.round(state.rotorRpm),
        pitchAngle: Number(state.pitchAngle.toFixed(1)),
        sleeveMm: Number((state.sleeveDisplacement * 1000).toFixed(1)),
        availableWindPowerKw: Number(availableKw.toFixed(2)),
        aeroPowerKw: Number((state.aerodynamicPower / 1000).toFixed(2)),
        elecPowerKw: Number(currentPowerKw.toFixed(2)),
        cpCoefficient: Number(state.cpCoefficient.toFixed(3)),
        overallEfficiencyPct: Number(overallEff.toFixed(1)),
      };

      setTimeHistory((prev) => {
        // Keep max 300 points (5 minutes of history)
        const updated = [...prev, newPoint];
        return updated.length > 300 ? updated.slice(updated.length - 300) : updated;
      });
    }, 1000 / simSpeedMultiplier);

    return () => clearInterval(interval);
  }, [isPaused, state, simSpeedMultiplier]);

  // Reset simulation stats
  const handleReset = () => {
    setTimeHistory([]);
    setCumulativeEnergyKwh(0);
    setPeakRpm(state.rotorRpm);
    setPeakPowerKw(state.electricalPower / 1000);
    setRegulationSeconds(0);
    setTotalSimSeconds(0);
    stepCounterRef.current = 0;
  };

  // Filter time history according to selected time window
  const filteredTimeHistory = React.useMemo(() => {
    if (timeHistory.length === 0) return [];
    if (timeWindow === '30s') return timeHistory.slice(-30);
    if (timeWindow === '60s') return timeHistory.slice(-60);
    return timeHistory;
  }, [timeHistory, timeWindow]);

  // Derived metrics
  const availableWindPowerKw = state.windPower / 1000;
  const aeroPowerKw = state.aerodynamicPower / 1000;
  const elecPowerKw = state.electricalPower / 1000;
  const overallEfficiencyPct =
    availableWindPowerKw > 0 ? (elecPowerKw / availableWindPowerKw) * 100 : 0;
  const regulationPercent =
    totalSimSeconds > 0 ? ((regulationSeconds / totalSimSeconds) * 100).toFixed(1) : '0.0';

  return (
    <div id="performance-analytics-view" className="space-y-6">
      
      {/* 1. HEADER & LIVE SIMULATION CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Performance & Energy Analytics Engine
              </span>
              <span className="text-slate-400 text-xs">• Centralized Physics Twin</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100">
              WindSense Power, Aerodynamics & Mechanical Governor Analytics
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 max-w-3xl">
              Real-time energy capture evaluation, aerodynamic power conversion, and centrifugal speed regulation response derived from the centralized mechanical physics model.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsPhysicsDrawerOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Physics Model Equations</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Counters</span>
            </button>
          </div>
        </div>

        {/* Live Controller Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
          
          {/* Slider Controls (6 cols) */}
          <div className="md:col-span-6 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                Live Wind Speed:
              </span>
              <span className="font-mono font-bold text-slate-100 text-sm">
                {activeWindSpeed.toFixed(1)} <span className="text-slate-400 text-xs font-normal">m/s</span>
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="30"
              step="0.5"
              value={activeWindSpeed}
              onChange={(e) => handleWindSpeedChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />

            {/* Quick Wind Velocity Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-mono">Presets:</span>
              {[
                { label: 'Cut-In (3m/s)', speed: 3.0 },
                { label: 'Rated (12m/s)', speed: 12.0 },
                { label: 'High (18m/s)', speed: 18.0 },
                { label: 'Storm (26m/s)', speed: 26.0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleWindSpeedChange(preset.speed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all cursor-pointer ${
                    activeWindSpeed === preset.speed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Play/Pause & Speed Multiplier (6 cols) */}
          <div className="md:col-span-6 flex flex-wrap items-center justify-between md:justify-end gap-3 pt-2 md:pt-0">
            {/* Play/Pause */}
            <button
              onClick={() => setIsPaused((prev) => !prev)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isPaused
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/40'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              <span>{isPaused ? 'Resume Simulation' : 'Pause Live Data'}</span>
            </button>

            {/* Sim Speed */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400 ml-1" />
              {[1, 2, 5].map((mult) => (
                <button
                  key={mult}
                  onClick={() => setSimSpeedMultiplier(mult)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    simSpeedMultiplier === mult
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mult}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. CORE METRICS DISPLAY (ITEMS 1 THROUGH 9) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>Centralized Live Physics State Metrics</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">9 Key Performance Parameters</span>
        </div>

        {/* Grid of 9 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          
          {/* 1. Available Wind Power */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                1. Available Wind Power
              </span>
              <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                THEORETICAL
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-cyan-300">
                {availableWindPowerKw.toFixed(2)}
              </p>
              <span className="text-xs text-slate-400 font-mono">kW</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Total kinetic energy flux in swept air stream: <code className="text-cyan-400 font-mono">P = 0.5·ρ·A·v³</code>
            </p>
          </div>

          {/* 2. Aerodynamic Turbine Power */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                2. Aerodynamic Power
              </span>
              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                Cp EXTRACTED
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-amber-300">
                {aeroPowerKw.toFixed(2)}
              </p>
              <span className="text-xs text-slate-400 font-mono">kW</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Power converted by rotor blades: <code className="text-amber-400 font-mono">P_aero = Cp·P_wind</code> (Cp = {state.cpCoefficient.toFixed(3)})
            </p>
          </div>

          {/* 3. Estimated Usable Output */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                3. Usable Electrical Output
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded">
                SIMULATED OUTPUT
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-emerald-400">
                {elecPowerKw.toFixed(2)}
              </p>
              <span className="text-xs text-slate-400 font-mono">kW</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Net electrical output delivered after generator losses (η_gen = {(params.generatorEfficiency * 100).toFixed(0)}%)
            </p>
          </div>

          {/* 4. Rotor RPM */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                4. Rotor RPM
              </span>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-slate-100">
                {Math.round(state.rotorRpm)}
              </p>
              <span className="text-xs text-slate-400 font-mono">RPM</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Rotor rotational speed (Tip Speed Ratio λ = {state.tipSpeedRatio.toFixed(2)})
            </p>
          </div>

          {/* 5. Blade Pitch */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                5. Blade Pitch Angle
              </span>
              <Compass className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-amber-300">
                {state.pitchAngle.toFixed(1)}°
              </p>
              <span className="text-xs text-slate-400 font-mono">θ</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Passive centrifugal feathering angle (Fine: {params.finePitchAngle}°, Feathered: {params.featherPitchAngle}°)
            </p>
          </div>

          {/* 6. Governor Position */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                6. Governor Position
              </span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-purple-300">
                {(state.sleeveDisplacement * 1000).toFixed(1)}
              </p>
              <span className="text-xs text-slate-400 font-mono">mm stroke</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Flyweight extension: {(state.governorRadius * 100).toFixed(1)} cm (Fc = {state.centrifugalForce.toFixed(0)} N vs Fs = {state.springForce.toFixed(0)} N)
            </p>
          </div>

          {/* 7. Wind Speed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                7. Wind Velocity
              </span>
              <Wind className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-cyan-300">
                {state.windSpeed.toFixed(1)}
              </p>
              <span className="text-xs text-slate-400 font-mono">m/s</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Operational Regime: <span className="font-semibold text-emerald-400">{state.operationalState.replace(/_/g, ' ')}</span>
            </p>
          </div>

          {/* 8. Estimated Efficiency */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                8. Overall Efficiency
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-emerald-300">
                {overallEfficiencyPct.toFixed(1)}%
              </p>
              <span className="text-xs text-slate-400 font-mono">η_overall</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              P_elec / P_wind ratio (Bounded by Betz limit Cp_max = 59.3%)
            </p>
          </div>

          {/* 9. Energy Captured over Simulation Time */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2 relative overflow-hidden border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                9. Energy Captured
              </span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-mono font-bold text-emerald-400">
                {cumulativeEnergyKwh.toFixed(4)}
              </p>
              <span className="text-xs text-slate-400 font-mono">kWh</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Simulated cumulative energy integration: <code className="text-emerald-400 font-mono">E = ∫ P_elec dt</code> ({totalSimSeconds}s total sim time)
            </p>
          </div>

        </div>

        {/* Distinction & Model Disclaimer Callout Banner */}
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-200">
                CLEAR POWER CATEGORY DISTINCTIONS
              </p>
              <p className="text-slate-400 leading-relaxed">
                <strong className="text-cyan-300">1. Available Wind Power (P_wind)</strong> represents raw kinetic wind energy passing through the rotor disc area.&nbsp;
                <strong className="text-amber-300">2. Simulated Aerodynamic Power (P_aero)</strong> is power captured by the blades based on the aerodynamic coefficient Cp(λ,θ).&nbsp;
                <strong className="text-emerald-300">3. Usable Electrical Output (P_elec)</strong> reflects net generated output after generator mechanical/electrical losses.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. LIVE CHARTS SUITE (CHARTS A, B, C, D, E) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        
        {/* Chart Header & Navigation Switcher */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Interactive Centralized Simulation Physics Charts</span>
            </h3>
            <p className="text-xs text-slate-400">
              All curves and time series update live from the same centralized simulation physics state.
            </p>
          </div>

          {/* Chart Tab Switcher */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveChartTab('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeChartTab === 'all'
                  ? 'bg-slate-800 text-slate-100 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Charts Grid
            </button>

            <button
              onClick={() => setActiveChartTab('rpm')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeChartTab === 'rpm'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              A. Wind vs RPM
            </button>

            <button
              onClick={() => setActiveChartTab('pitch')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeChartTab === 'pitch'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              B. Wind vs Pitch
            </button>

            <button
              onClick={() => setActiveChartTab('power_comp')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeChartTab === 'power_comp'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              C. Power Levels
            </button>

            <button
              onClick={() => setActiveChartTab('governor')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeChartTab === 'governor'
                  ? 'bg-slate-800 text-purple-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              D. RPM vs Governor
            </button>

            <button
              onClick={() => setActiveChartTab('time_series')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeChartTab === 'time_series'
                  ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              E. Power over Time
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CHART E: TIME-SERIES SPECIFIC CONTROL BAR (If selected)   */}
        {/* ======================================================== */}
        {(activeChartTab === 'time_series' || activeChartTab === 'all') && (
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs">
            <span className="text-slate-400 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              Live Streaming History Time Window:
            </span>

            <div className="flex items-center gap-1.5 font-mono">
              {[
                { id: '30s', label: 'Last 30 seconds' },
                { id: '60s', label: 'Last 60 seconds' },
                { id: 'full', label: 'Full Simulation' },
              ].map((tw) => (
                <button
                  key={tw.id}
                  onClick={() => setTimeWindow(tw.id as '30s' | '60s' | 'full')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    timeWindow === tw.id
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tw.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CHARTS RENDER CONTAINER                                  */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* CHART A: Wind Speed vs RPM */}
          {(activeChartTab === 'all' || activeChartTab === 'rpm') && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  Chart A: Wind Speed vs Rotor RPM
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">RPM Self-Regulation</span>
              </div>
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="windSpeed" stroke="#64748b" label={{ value: 'Wind Speed (m/s)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#64748b" label={{ value: 'RPM', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={28} />
                    <Line type="monotone" dataKey="windSenseRpm" name="WindSense Rotor RPM" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHART B: Wind Speed vs Blade Pitch */}
          {(activeChartTab === 'all' || activeChartTab === 'pitch') && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  Chart B: Wind Speed vs Blade Pitch θ
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Passive Feathering</span>
              </div>
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="windSpeed" stroke="#64748b" label={{ value: 'Wind Speed (m/s)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#64748b" label={{ value: 'Pitch θ (°)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={28} />
                    <Line type="monotone" dataKey="windSensePitch" name="Blade Pitch Angle θ (°)" stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHART C: Wind Speed vs Power Levels */}
          {(activeChartTab === 'all' || activeChartTab === 'power_comp') && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  Chart C: Wind Speed vs Power Levels (Theoretical vs Aero vs Output)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Betz Limit & Efficiency Gap</span>
              </div>
              <div className="w-full h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={comparisonData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="elecGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="aeroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="windSpeed" stroke="#64748b" label={{ value: 'Wind Speed (m/s)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis stroke="#64748b" label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={28} />
                    <Line type="monotone" dataKey="availableWindPowerKw" name="1. Theoretical Wind Power (kW)" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Area type="monotone" dataKey="aeroPowerKw" name="2. Aerodynamic Turbine Power (kW)" stroke="#f59e0b" strokeWidth={2} fill="url(#aeroGrad)" />
                    <Area type="monotone" dataKey="windSensePower" name="3. Usable Electrical Output (kW)" stroke="#10b981" strokeWidth={2.5} fill="url(#elecGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHART D: RPM vs Governor Position */}
          {(activeChartTab === 'all' || activeChartTab === 'governor') && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Chart D: Rotor RPM vs Governor Position & Forces
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Centrifugal Force Equilibrium</span>
              </div>
              <div className="w-full h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={governorRpmData} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="rpm" stroke="#64748b" label={{ value: 'Rotor RPM', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis yAxisId="left" stroke="#a855f7" label={{ value: 'Sleeve (mm)', angle: -90, position: 'insideLeft', fill: '#a855f7', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" label={{ value: 'Force (N)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px' }} />
                    <Legend verticalAlign="top" height={28} />
                    <Line yAxisId="left" type="monotone" dataKey="sleeveDisplacementMm" name="Sleeve Stroke (mm)" stroke="#a855f7" strokeWidth={2.5} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="centrifugalForceN" name="Centrifugal Fc (N)" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="springForceN" name="Spring Fs (N)" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CHART E: Power over Time (Live Time-Series) */}
          {(activeChartTab === 'all' || activeChartTab === 'time_series') && (
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-300" />
                  Chart E: Power & Telemetry over Simulation Time
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">Live Time-Series Window ({timeWindow})</span>
              </div>
              <div className="w-full h-[260px]">
                {filteredTimeHistory.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
                    <Clock className="w-6 h-6 mb-2 text-slate-600 animate-spin" />
                    <span>Collecting time-series data points...</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredTimeHistory} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="timeLabel" stroke="#64748b" label={{ value: 'Time (MM:SS)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis stroke="#64748b" label={{ value: 'kW / m/s', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px' }} />
                      <Legend verticalAlign="top" height={28} />
                      <Line type="monotone" dataKey="elecPowerKw" name="Usable Power (kW)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="aeroPowerKw" name="Aero Power (kW)" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="windSpeed" name="Wind Velocity (m/s)" stroke="#38bdf8" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 4. PERFORMANCE SUMMARY: MECHANICAL REGULATION RESPONSE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Performance Summary: Mechanical Regulation Response
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Centralized Simulation Report</span>
        </div>

        {/* 5 Summary Stat Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-center">
          
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase">REGULATION START POINT</p>
            <p className="text-lg font-mono font-bold text-amber-300 mt-1">12.0 m/s</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Threshold: 180 RPM</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase">MAX SIMULATED RPM</p>
            <p className="text-lg font-mono font-bold text-cyan-300 mt-1">{Math.round(peakRpm)} RPM</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Peak speed recorded</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase">MAX SIMULATED POWER</p>
            <p className="text-lg font-mono font-bold text-emerald-400 mt-1">{peakPowerKw.toFixed(2)} kW</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Peak usable output</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
            <p className="text-[10px] text-emerald-400 font-bold uppercase">ENERGY CAPTURED</p>
            <p className="text-lg font-mono font-bold text-emerald-300 mt-1">{cumulativeEnergyKwh.toFixed(4)} kWh</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Simulated integral</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase">TIME IN REGULATION</p>
            <p className="text-lg font-mono font-bold text-purple-300 mt-1">{regulationSeconds}s <span className="text-xs text-slate-400 font-normal">({regulationPercent}%)</span></p>
            <p className="text-[10px] text-slate-500 mt-0.5">Wind speed ≥ 12 m/s</p>
          </div>

        </div>
      </div>

      {/* 5. MODEL LIMITATIONS SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-200">
            Physics Model Limitations & Engineering Scope
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <p className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Simplified Quasi-Steady Physics Simulation
            </p>
            <p className="text-slate-400">
              This digital twin employs quasi-steady 1D mechanical equilibrium models and standard empirical aerodynamic power coefficient polynomials $C_p(\lambda, \theta)$ derived from momentum theory.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <p className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Approximated Aerodynamics & Unmodeled Dynamics
            </p>
            <p className="text-slate-400">
              3D Computational Fluid Dynamics (CFD), dynamic stall hysteresis, tower shadow wake effects, blade aeroelastic flutter, dynamic gust turbulence intensity, and mechanical fatigue stress are not fully modeled in this simulation.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <p className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Engineering Validation Requirement
            </p>
            <p className="text-slate-400">
              Physical wind turbine commissioning requires rigorous wind tunnel testing, blade element momentum (BEM) code validation, structural FEA stress analysis, and full field prototype testing prior to commercial deployment.
            </p>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <p className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              No Fabricated Experimental Validation
            </p>
            <p className="text-slate-400">
              This application strictly presents mathematical simulation predictions based on classical governor mechanics. It makes no claim of measured real-world field test performance or empirical experimental validation.
            </p>
          </div>
        </div>
      </div>

      {/* 6. PHYSICS MODEL DRAWER / COLLAPSIBLE SECTION */}
      {isPhysicsDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 shadow-2xl space-y-6">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-slate-100">
                  Physics Model Equations & Assumptions
                </h3>
              </div>

              <button
                onClick={() => setIsPhysicsDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Equations */}
            <div className="space-y-5 text-xs text-slate-300">
              
              {/* Equation 1 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-cyan-300 uppercase tracking-wider">
                    1. Betz Limit & Kinetic Wind Power
                  </h4>
                  <span className="font-mono text-[10px] text-slate-500">AERODYNAMICS</span>
                </div>
                <p className="text-slate-400">
                  The total kinetic energy flux passing through the swept rotor disc area A = π·R² is given by:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-cyan-300 text-center text-sm font-bold">
                  P_wind = 0.5 · ρ · (π · R²) · v³
                </div>
                <p className="text-slate-400 text-[11px]">
                  According to Betz's law, no wind turbine can extract more than 16/27 ≈ 59.3% of the wind's kinetic power (Cp_max = 0.593).
                </p>
              </div>

              {/* Equation 2 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-300 uppercase tracking-wider">
                    2. Power Coefficient Cp(λ, θ) Polynomial
                  </h4>
                  <span className="font-mono text-[10px] text-slate-500">BLADE AERODYNAMICS</span>
                </div>
                <p className="text-slate-400">
                  Aerodynamic power captured by the rotor depends on Tip Speed Ratio $\lambda = (\omega \cdot R)/v$ and blade pitch angle $\theta$:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-amber-300 text-center text-xs font-bold leading-relaxed">
                  Cp(λ, θ) = c1 · (c2/λ_i - c3·θ - c4) · exp(-c5/λ_i) + c6·λ
                  <br />
                  1/λ_i = 1/(λ + 0.08·θ) - 0.035/(θ³ + 1)
                </div>
                <p className="text-slate-400 text-[11px]">
                  Where constants $c_1=0.5176$, $c_2=116$, $c_3=0.4$, $c_4=5$, $c_5=21$, $c_6=0.0068$.
                </p>
              </div>

              {/* Equation 3 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-purple-300 uppercase tracking-wider">
                    3. Centrifugal Governor Force Equilibrium
                  </h4>
                  <span className="font-mono text-[10px] text-slate-500">MECHANICAL GOVERNOR</span>
                </div>
                <p className="text-slate-400">
                  Rotational motion generates centrifugal force $F_c$ opposing the helical spring pre-loaded restoring force $F_s$:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-purple-300 text-center text-xs font-bold leading-relaxed">
                  F_c = m · r · ω²
                  <br />
                  F_s = F_preload + k · x
                  <br />
                  Equilibrium: m · r · ω² = F_preload + k · x  ⇒  x = (m · r · ω² - F_preload) / k
                </div>
              </div>

              {/* Equation 4 */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-emerald-300 uppercase tracking-wider">
                    4. Linkage Coupling & Electrical Output
                  </h4>
                  <span className="font-mono text-[10px] text-slate-500">POWER GENERATION</span>
                </div>
                <p className="text-slate-400">
                  Sleeve displacement $x$ rotates the blade roots through mechanical bell-crank linkages:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-emerald-300 text-center text-xs font-bold leading-relaxed">
                  θ(x) = θ_fine + (θ_feather - θ_fine) · (x / x_max)
                  <br />
                  P_elec = min(P_rated, η_gen · P_aero)
                </div>
              </div>

            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-800 pt-4 flex justify-end">
              <button
                onClick={() => setIsPhysicsDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer transition-all"
              >
                Close Physics Reference
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
