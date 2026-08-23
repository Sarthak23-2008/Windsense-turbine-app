import React, { useEffect, useState, useRef } from 'react';
import { SimulationState } from '../../types/simulation';
import { Turbine3DSimulation } from './Turbine3DSimulation';
import {
  Wind,
  ShieldCheck,
  Gauge,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Layers,
  Activity,
  Compass,
  Sliders,
  List,
  Clock,
  Trash2,
  Sparkles,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface TurbineVisualizerProps {
  state: SimulationState;
  showDetails?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
  onReset?: () => void;
}

export interface SimulationEventLog {
  id: string;
  timestamp: string;
  category: 'wind' | 'rotor' | 'governor' | 'pitch' | 'state';
  message: string;
  badge: string;
  level: 'info' | 'warn' | 'success' | 'alert';
}

export const TurbineVisualizer: React.FC<TurbineVisualizerProps> = ({
  state,
  showDetails = true,
  isPaused: externalIsPaused = false,
  onTogglePause,
  onReset,
}) => {
  // Viewing & Control States
  const [viewMode, setViewMode] = useState<'operation' | 'mechanism'>('operation');
  const [explodedView, setExplodedView] = useState<boolean>(false);
  const [isInternalPaused, setIsInternalPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1.0); // 1.0x, 0.5x, 0.25x
  const [showLogPanel, setShowLogPanel] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Dynamic Event Log state
  const [events, setEvents] = useState<SimulationEventLog[]>([]);
  const prevStateRef = useRef<SimulationState | null>(null);

  const isPaused = externalIsPaused || isInternalPaused;

  // Real State-Change Triggered Event Log Generator
  useEffect(() => {
    const prev = prevStateRef.current;
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });

    // Initial setup log on mount
    if (!prev) {
      const initialLogs: SimulationEventLog[] = [
        {
          id: `init-1-${Date.now()}`,
          timestamp: timeStr,
          category: 'state',
          message: `Digital Twin initialized in ${state.operationalState.replace(/_/g, ' ')} mode`,
          badge: 'SYSTEM',
          level: 'info',
        },
        {
          id: `init-2-${Date.now()}`,
          timestamp: timeStr,
          category: 'wind',
          message: `Baseline wind speed set to ${state.windSpeed.toFixed(1)} m/s`,
          badge: 'WIND',
          level: 'info',
        },
        {
          id: `init-3-${Date.now()}`,
          timestamp: timeStr,
          category: 'governor',
          message: `Centrifugal force at ${state.centrifugalForce.toFixed(0)} N vs spring force ${state.springForce.toFixed(0)} N`,
          badge: 'GOVERNOR',
          level: 'info',
        },
        {
          id: `init-4-${Date.now()}`,
          timestamp: timeStr,
          category: 'pitch',
          message: `Blade pitch steady state at ${state.pitchAngle.toFixed(1)}°`,
          badge: 'PITCH',
          level: 'success',
        },
      ];
      setEvents(initialLogs);
      prevStateRef.current = state;
      return;
    }

    const newLogs: SimulationEventLog[] = [];

    // Check Wind Speed Delta
    if (Math.abs(state.windSpeed - prev.windSpeed) >= 0.4) {
      const direction = state.windSpeed > prev.windSpeed ? 'increased' : 'decreased';
      const level = state.windSpeed > 20 ? 'warn' : 'info';
      newLogs.push({
        id: `wind-${Date.now()}`,
        timestamp: timeStr,
        category: 'wind',
        message: `Wind speed ${direction} (${prev.windSpeed.toFixed(1)} → ${state.windSpeed.toFixed(1)} m/s)`,
        badge: 'WIND',
        level,
      });
    }

    // Check Wind Direction Delta
    if (prev.windDirection !== undefined && Math.abs(state.windDirection - prev.windDirection) >= 5) {
      newLogs.push({
        id: `wind-dir-${Date.now()}`,
        timestamp: timeStr,
        category: 'wind',
        message: `Wind direction adjusted (${prev.windDirection.toFixed(0)}° → ${state.windDirection.toFixed(0)}°) — Pitch & axial velocity recalculated`,
        badge: 'WIND DIR',
        level: 'info',
      });
    }

    // Check Rotor RPM Delta
    if (Math.abs(state.rotorRpm - prev.rotorRpm) >= 4) {
      const action = state.rotorRpm > prev.rotorRpm ? 'acceleration detected' : 'deceleration detected';
      newLogs.push({
        id: `rpm-${Date.now()}`,
        timestamp: timeStr,
        category: 'rotor',
        message: `Rotor ${action} (${Math.round(prev.rotorRpm)} → ${Math.round(state.rotorRpm)} RPM)`,
        badge: 'ROTOR',
        level: state.rotorRpm > 180 ? 'warn' : 'info',
      });
    }

    // Check Governor Sleeve Displacement
    const prevSleeveMm = prev.sleeveDisplacement * 1000;
    const currSleeveMm = state.sleeveDisplacement * 1000;
    if (Math.abs(currSleeveMm - prevSleeveMm) >= 2.0) {
      newLogs.push({
        id: `sleeve-${Date.now()}`,
        timestamp: timeStr,
        category: 'governor',
        message: `Governor sleeve displacement updated (${prevSleeveMm.toFixed(1)}mm → ${currSleeveMm.toFixed(1)}mm)`,
        badge: 'GOVERNOR',
        level: currSleeveMm > 20 ? 'success' : 'info',
      });
    }

    // Check Blade Pitch Delta
    if (Math.abs(state.pitchAngle - prev.pitchAngle) >= 1.0) {
      const action = state.pitchAngle > prev.pitchAngle ? 'feathering angle increased' : 'returning to fine pitch';
      newLogs.push({
        id: `pitch-${Date.now()}`,
        timestamp: timeStr,
        category: 'pitch',
        message: `Blade pitch adjusted (${prev.pitchAngle.toFixed(1)}° → ${state.pitchAngle.toFixed(1)}°) — ${action}`,
        badge: 'PITCH',
        level: state.pitchAngle > 30 ? 'warn' : 'success',
      });
    }

    // Check Operational State Transition
    if (state.operationalState !== prev.operationalState) {
      const isFeathering = state.operationalState === 'PASSIVE_FEATHERING';
      const isStorm = state.operationalState === 'STORM_CUT_OUT';
      newLogs.push({
        id: `state-${Date.now()}`,
        timestamp: timeStr,
        category: 'state',
        message: `Mechanical regulation state transitioned to ${state.operationalState.replace(/_/g, ' ')}`,
        badge: 'STATE',
        level: isStorm ? 'alert' : isFeathering ? 'warn' : 'success',
      });
    }

    if (newLogs.length > 0) {
      setEvents((prevEvents) => [...newLogs, ...prevEvents].slice(0, 30));
    }

    prevStateRef.current = state;
  }, [state]);

  const clearLog = () => {
    setEvents([]);
  };

  const handleReset = () => {
    if (onReset) onReset();
  };

  const handleTogglePlayPause = () => {
    if (onTogglePause) {
      onTogglePause();
    } else {
      setIsInternalPaused((prev) => !prev);
    }
  };

  return (
    <div
      id="turbine-engineering-visualizer"
      className={`relative bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl' : 'p-4 sm:p-5'
      }`}
    >
      {/* 1. TOP HEADER TOOLBAR & SIMULATION BADGE */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        
        {/* Title & Live Status Badge */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Simulation Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border transition-all ${
              !isPaused
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                !isPaused ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span>{!isPaused ? 'LIVE SIMULATION ACTIVE' : 'SIMULATION PAUSED'}</span>
          </div>

          <span className="text-slate-400 text-xs font-mono">• 3D Real-Time Digital Twin</span>

          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              state.operationalState === 'PASSIVE_FEATHERING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : state.operationalState === 'STORM_CUT_OUT'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : state.operationalState === 'OPTIMAL'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {state.operationalState.replace(/_/g, ' ')}
          </span>
        </div>

        {/* View Mode & Exploded Toggle Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          
          {/* View Mode Buttons */}
          <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('operation')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'operation'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>3D Operation View</span>
            </button>

            <button
              onClick={() => setViewMode('mechanism')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'mechanism'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mechanism Cutaway</span>
            </button>
          </div>

          {/* Exploded View Toggle Button */}
          <button
            onClick={() => setExplodedView((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              explodedView
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Exploded 3D Mechanism</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. FAST 10-SECOND CAUSAL FEEDBACK CHAIN BAR */}
      <div className="my-3 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Mechanical Feedback Chain (Zero Microcontrollers)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">10-Sec Visual Sequence</span>
        </div>

        {/* Causal Sequence Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
          
          <div className="bg-slate-950 p-2 rounded-xl border border-cyan-500/30">
            <p className="text-[9px] text-cyan-400 font-bold">1. WIND FLOW</p>
            <p className="font-mono font-bold text-slate-100 text-sm">{state.windSpeed.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">m/s</span></p>
          </div>

          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <p className="text-[9px] text-slate-400 font-bold">2. ROTOR SPEED</p>
            <p className="font-mono font-bold text-slate-100 text-sm">{Math.round(state.rotorRpm)} <span className="text-[10px] text-slate-400 font-normal">RPM</span></p>
          </div>

          <div className={`bg-slate-950 p-2 rounded-xl border transition-all ${
            state.centrifugalForce > state.springForce ? 'border-amber-500/40 shadow-sm shadow-amber-500/10' : 'border-slate-800'
          }`}>
            <p className="text-[9px] text-amber-400 font-bold">3. GOVERNOR Fc</p>
            <p className="font-mono font-bold text-amber-300 text-sm">{state.centrifugalForce.toFixed(0)} <span className="text-[10px] text-amber-400/70 font-normal">N</span></p>
          </div>

          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <p className="text-[9px] text-amber-400 font-bold">4. SLEEVE SHIFT</p>
            <p className="font-mono font-bold text-amber-400 text-sm">{(state.sleeveDisplacement * 1000).toFixed(1)} <span className="text-[10px] text-amber-400/70 font-normal">mm</span></p>
          </div>

          <div className={`bg-slate-950 p-2 rounded-xl border transition-all ${
            state.pitchAngle > 15 ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-slate-800'
          }`}>
            <p className="text-[9px] text-emerald-300 font-bold">5. BLADE PITCH θ</p>
            <p className="font-mono font-bold text-emerald-300 text-sm">{state.pitchAngle.toFixed(1)}°</p>
          </div>

          <div className="bg-slate-950 p-2 rounded-xl border border-cyan-500/30">
            <p className="text-[9px] text-cyan-300 font-bold">6. POWER OUTPUT</p>
            <p className="font-mono font-bold text-emerald-400 text-sm">{(state.electricalPower / 1000).toFixed(2)} <span className="text-[10px] text-emerald-400/70 font-normal">kW</span></p>
          </div>
        </div>
      </div>

      {/* 3. MAIN THREE.JS 3D SIMULATION CANVAS & ENGINE */}
      <div className="relative w-full aspect-[16/9] min-h-[380px] max-h-[520px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
        
        {/* Real Three.js 3D Simulation Canvas */}
        <Turbine3DSimulation
          state={state}
          isPaused={isPaused}
          simSpeed={simSpeed}
          viewMode={viewMode}
          setViewMode={setViewMode}
          explodedView={explodedView}
          setExplodedView={setExplodedView}
        />

        {/* Live Overlay Banner at Bottom of Canvas */}
        <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400">Rotor Speed:</span>
            <span className="font-mono font-bold text-slate-100">{Math.round(state.rotorRpm)} RPM</span>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Power:</span>
            <span className="font-mono font-bold text-emerald-400">{(state.electricalPower / 1000).toFixed(2)} kW</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Wind Dir:</span>
            <span className="font-mono font-bold text-amber-300">{state.windDirection.toFixed(0)}°</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Cp Efficiency:</span>
            <span className="font-mono font-bold text-cyan-300">{state.cpCoefficient.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* 4. ANIMATION CONTROLS, SPEED SELECTOR & EVENT LOG DRAWER */}
      <div className="mt-4 space-y-3">
        
        {/* Playback Controls & Speed Selector Row */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Play, Pause, Reset Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePlayPause}
              className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isPaused
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-950/40'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              <span>{isPaused ? 'Resume Simulation' : 'Pause'}</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Simulation Animation Speed Multiplier */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 font-medium">Anim Speed:</span>
            <div className="flex items-center gap-1">
              {[1.0, 0.5, 0.25].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setSimSpeed(speed)}
                  className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] transition-all cursor-pointer ${
                    simSpeed === speed
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed === 1.0 ? '1x (Normal)' : speed === 0.5 ? '0.5x' : '0.25x (Slow)'}
                </button>
              ))}
            </div>
          </div>

          {/* Log Toggle Button */}
          <button
            onClick={() => setShowLogPanel((prev) => !prev)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <List className="w-3.5 h-3.5 text-emerald-400" />
            <span>Event Log ({events.length})</span>
            {showLogPanel ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>
        </div>

        {/* 5. DYNAMIC STATE-TRIGGERED EVENT LOG STREAM */}
        {showLogPanel && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 transition-all">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Live Simulation Physical Event Stream
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Real-time physics state changes
                </span>
                <button
                  onClick={clearLog}
                  className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-all"
                  title="Clear Log"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Event List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono">
              {events.length === 0 ? (
                <p className="text-slate-500 text-center py-4 text-xs font-sans">
                  No events logged yet. Adjust wind speed or simulation parameters to trigger live physical state changes.
                </p>
              ) : (
                events.map((evt) => (
                  <div
                    key={evt.id}
                    className={`p-2 rounded-xl border flex items-start justify-between gap-3 text-[11px] leading-tight transition-all ${
                      evt.level === 'alert'
                        ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                        : evt.level === 'warn'
                        ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                        : evt.level === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-500 text-[10px] font-mono">{evt.timestamp}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          evt.category === 'wind'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : evt.category === 'rotor'
                            ? 'bg-purple-500/20 text-purple-300'
                            : evt.category === 'governor'
                            ? 'bg-amber-500/20 text-amber-300'
                            : evt.category === 'pitch'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {evt.badge}
                      </span>
                    </div>

                    <p className="flex-1 font-sans text-xs">{evt.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
