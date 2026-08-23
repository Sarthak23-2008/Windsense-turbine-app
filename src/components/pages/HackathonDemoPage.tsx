import React, { useState, useEffect, useRef } from 'react';
import {
  SimulationState,
  TurbineParameters,
} from '../../types/simulation';
import {
  DEFAULT_TURBINE_PARAMS,
  evaluateWindSenseState,
} from '../../physics/turbinePhysics';
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  Wind,
  Layers,
  ChevronRight,
  ChevronLeft,
  Cpu,
  X,
  Clock,
  Activity,
  Scale,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface HackathonDemoPageProps {
  onSetWindSpeed?: (speed: number) => void;
  params?: TurbineParameters;
}

// Scenario Definition Interface
export interface DemoScenario {
  id: number;
  title: string;
  subtitle: string;
  targetWindSpeed: number;
  durationSec: number;
  activeStepIndex: number; // 0..6 corresponding to 7 Cause->Effect steps
  judgeTalkingPoint: string;
  keyPhysicsHighlight: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 1,
    title: 'SCENARIO 1 — NORMAL WIND',
    subtitle: 'Demonstrate Stable Energy Generation in Below-Rated Winds',
    targetWindSpeed: 10.0,
    durationSec: 20,
    activeStepIndex: 1, // Rotor responds / stable baseline
    judgeTalkingPoint:
      'Under standard operating wind speeds (10 m/s), the flyweight centrifugal force Fc is fully balanced by the preloaded bias spring Fs. The governor sleeve remains at 0 mm displacement, keeping blades locked at 0° fine pitch for maximum energy capture.',
    keyPhysicsHighlight: 'Fc ≤ Fs (Preload Equilibrium) → Governor Stroke = 0.0 mm → Fine Pitch = 0.0°',
  },
  {
    id: 2,
    title: 'SCENARIO 2 — WIND INCREASE',
    subtitle: 'Demonstrate Step-by-Step Mechanical Speed Regulation Cascade',
    targetWindSpeed: 18.0,
    durationSec: 30,
    activeStepIndex: 3, // Governor moves / pitch changes
    judgeTalkingPoint:
      'When wind speed surges to 18 m/s, the rotor accelerates past 180 RPM. Centrifugal force Fc = m·ω²·r overcomes the spring preload, driving the flyweights outward. The governor sleeve translates 20+ mm, pivoting the mechanical linkage to feather the blades and regulate power to 10 kW.',
    keyPhysicsHighlight: 'Wind Surge → RPM > 180 → Fc > Fs → Sleeve 20.4 mm → Pitch 15.3° → Power Regulated',
  },
  {
    id: 3,
    title: 'SCENARIO 3 — WIND DECREASE',
    subtitle: 'Demonstrate Reverse Mechanical Response & Spring Recovery',
    targetWindSpeed: 7.0,
    durationSec: 20,
    activeStepIndex: 4, // Linkage / Spring returns
    judgeTalkingPoint:
      'As wind speed drops back to 7 m/s, rotor aerodynamic torque decreases and RPM falls below 180. Internal spring force Fs now exceeds centrifugal force Fc, smoothly retracting the flyweights and pulling blades back to fine pitch (0°) to restore lift in light winds.',
    keyPhysicsHighlight: 'Wind Drops → RPM < 180 → Fs > Fc → Sleeve Retracts → Pitch Returns to 0.0°',
  },
  {
    id: 4,
    title: 'SCENARIO 4 — HIGH WIND EVENT',
    subtitle: 'Simulated High-Wind Regulation & Maximum Mechanical Feathering',
    targetWindSpeed: 26.0,
    durationSec: 25,
    activeStepIndex: 6, // Aerodynamic response / full feather
    judgeTalkingPoint:
      'During extreme storm gusts (26 m/s), the governor reaches maximum stroke (25.0 mm), driving blades to full feather pitch (25.0°). Aerodynamic power coefficient Cp drops sharply, limiting rotor torque and preventing overspeed purely through mechanical feedback.',
    keyPhysicsHighlight: 'Simulated High-Wind Regulation → Full Sleeve Stroke 25.0 mm → Max Feather Pitch 25.0°',
  },
];

export const HackathonDemoPage: React.FC<HackathonDemoPageProps> = ({
  onSetWindSpeed,
  params = DEFAULT_TURBINE_PARAMS,
}) => {
  // Demo State
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simulatedWindSpeed, setSimulatedWindSpeed] = useState<number>(10.0);
  const [elapsedDemoTimeSec, setElapsedDemoTimeSec] = useState<number>(0);
  const [scenarioProgressPct, setScenarioProgressPct] = useState<number>(0);
  const [activeCauseEffectStep, setActiveCauseEffectStep] = useState<number>(0);

  const scenarioIndexRef = useRef(currentScenarioIndex);
  scenarioIndexRef.current = currentScenarioIndex;

  const elapsedSecRef = useRef(0);

  // Sync current scenario
  const currentScenario = DEMO_SCENARIOS[currentScenarioIndex] || DEMO_SCENARIOS[0];

  // Evaluate current live state
  const liveState: SimulationState = evaluateWindSenseState(simulatedWindSpeed, params);

  // Synchronize parent state if provided
  useEffect(() => {
    if (onSetWindSpeed) {
      onSetWindSpeed(simulatedWindSpeed);
    }
  }, [simulatedWindSpeed, onSetWindSpeed]);

  // Reset timing counters when scenario changes manually or automatically
  useEffect(() => {
    elapsedSecRef.current = 0;
    setElapsedDemoTimeSec(0);
    setScenarioProgressPct(0);
    const activeSc = DEMO_SCENARIOS[currentScenarioIndex] || DEMO_SCENARIOS[0];
    setActiveCauseEffectStep(activeSc.activeStepIndex);
  }, [currentScenarioIndex]);

  // Main Demo Animation Loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTimeMs = 100; // 10 updates per sec
    const timer = setInterval(() => {
      const idx = scenarioIndexRef.current;
      const activeScenario = DEMO_SCENARIOS[idx] || DEMO_SCENARIOS[0];
      const duration = activeScenario.durationSec;
      const targetWind = activeScenario.targetWindSpeed;

      elapsedSecRef.current += 0.1;
      const currentSec = elapsedSecRef.current;

      // Smoothly interpolate current simulated wind speed toward scenario target wind speed
      setSimulatedWindSpeed((prevWind) => {
        const delta = targetWind - prevWind;
        if (Math.abs(delta) < 0.1) return targetWind;
        return prevWind + delta * 0.08;
      });

      // Scenario Progress
      const progress = Math.min(100, (currentSec / duration) * 100);
      setScenarioProgressPct(progress);
      setElapsedDemoTimeSec(currentSec);

      // Dynamically compute active Cause -> Effect step (0 to 6) based on progress
      const stepIndex = Math.min(6, Math.floor((progress / 100) * 7));
      setActiveCauseEffectStep(stepIndex);

      // Auto-advance scenario if completed
      if (currentSec >= duration) {
        if (idx < DEMO_SCENARIOS.length - 1) {
          const nextIdx = idx + 1;
          scenarioIndexRef.current = nextIdx;
          elapsedSecRef.current = 0;
          setCurrentScenarioIndex(nextIdx);
        } else {
          // Loop back or pause at end of Scenario 4
          setIsPlaying(false);
        }
      }
    }, intervalTimeMs);

    return () => clearInterval(timer);
  }, [isPlaying]);

  // Handle Jump to Scenario
  const jumpToScenario = (scenarioIdx: number) => {
    const safeIdx = Math.max(0, Math.min(DEMO_SCENARIOS.length - 1, scenarioIdx));
    const targetScenario = DEMO_SCENARIOS[safeIdx] || DEMO_SCENARIOS[0];
    scenarioIndexRef.current = safeIdx;
    elapsedSecRef.current = 0;
    setCurrentScenarioIndex(safeIdx);
    setElapsedDemoTimeSec(0);
    setScenarioProgressPct(0);
    setSimulatedWindSpeed(targetScenario.targetWindSpeed);
    setActiveCauseEffectStep(targetScenario.activeStepIndex);
    setIsPlaying(true);
  };

  // Instant Restart
  const handleInstantRestart = () => {
    jumpToScenario(0);
  };

  // 7 Cause -> Effect Steps definitions
  const causeEffectSteps = [
    {
      step: 1,
      title: 'WIND CHANGES',
      subtitle: 'Aerodynamic Energy Surge',
      value: `${simulatedWindSpeed.toFixed(1)} m/s`,
      detail: 'Kinetic energy flux P_wind = 0.5·ρ·A·v³ changes with wind velocity',
      isTriggered: liveState.windSpeed >= 3.0,
      highlightColor: 'border-cyan-500 text-cyan-300 bg-cyan-950/40',
    },
    {
      step: 2,
      title: 'ROTOR RESPONDS',
      subtitle: 'Rotational Speed Shift',
      value: `${Math.round(liveState.rotorRpm)} RPM`,
      detail: `Rotor torque shifts angular velocity ω (Rated limit: 180 RPM)`,
      isTriggered: liveState.rotorRpm > 0,
      highlightColor: 'border-cyan-400 text-cyan-300 bg-cyan-950/40',
    },
    {
      step: 3,
      title: 'CENTRIFUGAL FORCE CHANGES',
      subtitle: 'Fc = m · ω² · r',
      value: `${liveState.centrifugalForce.toFixed(0)} N`,
      detail: `Flyweights generate radial force vs spring preload Fs (${liveState.springForce.toFixed(0)} N)`,
      isTriggered: liveState.rotorRpm >= 180,
      highlightColor: 'border-amber-500 text-amber-300 bg-amber-950/40',
    },
    {
      step: 4,
      title: 'GOVERNOR MOVES',
      subtitle: 'Axial Sleeve Stroke',
      value: `${(liveState.sleeveDisplacement * 1000).toFixed(1)} mm`,
      detail: `Force equilibrium Fc = Fs translates sleeve along shaft axis`,
      isTriggered: liveState.sleeveDisplacement > 0.001,
      highlightColor: 'border-purple-500 text-purple-300 bg-purple-950/40',
    },
    {
      step: 5,
      title: 'LINKAGE RESPONDS',
      subtitle: 'Pushrod Angular Transfer',
      value: `${(liveState.sleeveDisplacement * 1000 * 1.0).toFixed(1)} mm stroke`,
      detail: 'Mechanical bellcrank turns axial translation into blade root rotation',
      isTriggered: liveState.sleeveDisplacement > 0.001,
      highlightColor: 'border-indigo-500 text-indigo-300 bg-indigo-950/40',
    },
    {
      step: 6,
      title: 'BLADE PITCH CHANGES',
      subtitle: 'Passive Feathering θ',
      value: `${liveState.pitchAngle.toFixed(1)}°`,
      detail: `Blades pivot from fine pitch (${params.finePitchAngle}°) toward feather (${params.featherPitchAngle}°)`,
      isTriggered: liveState.pitchAngle > 0,
      highlightColor: 'border-amber-400 text-amber-300 bg-amber-950/40',
    },
    {
      step: 7,
      title: 'AERODYNAMIC RESPONSE',
      subtitle: 'Cp Power Regulation',
      value: `${(liveState.electricalPower / 1000).toFixed(2)} kW`,
      detail: `Power coefficient Cp adjust (${liveState.cpCoefficient.toFixed(3)}) maintaining stable output`,
      isTriggered: liveState.electricalPower > 0,
      highlightColor: 'border-emerald-500 text-emerald-300 bg-emerald-950/40',
    },
  ];

  return (
    <div
      id="hackathon-demo-mode-view"
      className="space-y-6 transition-all"
    >
      {/* 1. DEMO HEADER & CONTROL BAR */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
        {/* Glow ambient background accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-slate-400 text-xs font-mono">Interactive Mechanical Twin</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-slate-100 flex items-center gap-2">
              <span>WindSense Mechanical Intelligence Demo</span>
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Demonstrating zero-electronics wind speed regulation through purely mechanical centrifugal governor force feedback in 4 guided scenarios.
            </p>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Instant Restart Button */}
            <button
              onClick={handleInstantRestart}
              className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer hover:text-emerald-400"
            >
              <RotateCcw className="w-4 h-4 text-emerald-400" />
              <span>Instant Restart</span>
            </button>
          </div>
        </div>

        {/* Scenario Navigation Timeline Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {DEMO_SCENARIOS.map((sc, idx) => {
            const isActive = currentScenarioIndex === idx;
            return (
              <button
                key={sc.id}
                onClick={() => jumpToScenario(idx)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isActive
                    ? 'bg-slate-800 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-800/50 text-slate-400'
                }`}
              >
                {isActive && (
                  <div
                    className="absolute top-0 left-0 bottom-0 bg-emerald-500/15 transition-all duration-200 pointer-events-none z-0"
                    style={{ width: `${scenarioProgressPct}%` }}
                  />
                )}
                <div className="relative z-10 flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isActive ? 'text-emerald-400 font-extrabold' : 'text-slate-500'
                    }`}
                  >
                    Scenario {sc.id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">{sc.durationSec}s</span>
                </div>
                <p
                  className={`relative z-10 text-xs font-bold mt-1 line-clamp-1 ${
                    isActive ? 'text-slate-100' : 'text-slate-300'
                  }`}
                >
                  {sc.title.split('—')[1]?.trim() || sc.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Playback Control Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 text-xs">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'Pause Demo' : 'Play Scenario'}</span>
            </button>

            <button
              onClick={() => {
                if (currentScenarioIndex > 0) jumpToScenario(currentScenarioIndex - 1);
              }}
              disabled={currentScenarioIndex === 0}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-slate-300 font-bold">
              {currentScenarioIndex + 1} / {DEMO_SCENARIOS.length}
            </span>

            <button
              onClick={() => {
                if (currentScenarioIndex < DEMO_SCENARIOS.length - 1)
                  jumpToScenario(currentScenarioIndex + 1);
              }}
              disabled={currentScenarioIndex === DEMO_SCENARIOS.length - 1}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Live Wind Speed Indicator */}
          <div className="flex items-center gap-3 bg-slate-900 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <Wind className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-slate-400 font-medium">Target Wind:</span>
            <span className="font-mono font-bold text-cyan-300 text-sm">
              {simulatedWindSpeed.toFixed(1)} m/s
            </span>
          </div>

          {/* Scenario Timer Progress */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Time:</span>
            <span className="text-emerald-400 font-bold">
              {elapsedDemoTimeSec.toFixed(1)}s / {currentScenario.durationSec}s
            </span>
          </div>
        </div>
      </div>

      {/* 2. LARGE CENTRAL "CAUSE → EFFECT" VISUALIZATION (7 STEPS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Central 7-Step Cause → Effect Mechanical Cascade</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live deterministic mechanical force transfer pipeline triggered by wind velocity changes.
            </p>
          </div>

          <span className="bg-slate-950 text-slate-300 border border-slate-800 text-[10px] font-mono px-2.5 py-1 rounded-lg">
            Step {activeCauseEffectStep + 1} of 7 Active
          </span>
        </div>

        {/* 7-Step Pipeline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2.5 relative">
          {causeEffectSteps.map((stepItem, idx) => {
            const isStepActive = activeCauseEffectStep === idx;
            return (
              <div
                key={stepItem.step}
                onClick={() => setActiveCauseEffectStep(idx)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 relative ${
                  isStepActive
                    ? 'bg-slate-800 border-2 border-emerald-400 shadow-xl shadow-emerald-950/50 scale-[1.02]'
                    : stepItem.isTriggered
                    ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600'
                }`}
              >
                {/* Step Index Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center ${
                      isStepActive
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {stepItem.step}
                  </span>
                  {isStepActive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>

                <div>
                  <p
                    className={`text-[11px] font-bold tracking-tight uppercase leading-snug ${
                      isStepActive ? 'text-emerald-300' : 'text-slate-200'
                    }`}
                  >
                    {stepItem.title}
                  </p>
                  <p className="text-[10px] text-slate-400 leading-none mt-0.5">
                    {stepItem.subtitle}
                  </p>
                </div>

                {/* Live Value Box */}
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-center">
                  <span
                    className={`text-xs font-bold ${
                      isStepActive ? 'text-emerald-400 text-sm' : 'text-cyan-300'
                    }`}
                  >
                    {stepItem.value}
                  </span>
                </div>

                <p className="text-[9px] text-slate-400 leading-tight">
                  {stepItem.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. LIVE 2D INTERACTIVE MECHANICAL TWIN VISUALIZER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Animated Visual Canvas Twin (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              Interactive Mechanical Twin Visualizer
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real-Time Physics Rendering</span>
          </div>

          {/* SVG Animated Twin */}
          <div className="w-full h-[320px] bg-slate-950 rounded-xl border border-slate-800/80 relative overflow-hidden flex items-center justify-center p-4">
            
            <svg viewBox="0 0 500 300" className="w-full h-full">
              {/* Grid Background Lines */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                <linearGradient id="windFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
                </linearGradient>
              </defs>

              <rect width="500" height="300" fill="#020617" />
              <rect width="500" height="300" fill="url(#grid)" />

              {/* Animated Wind Arrows */}
              <g className="opacity-40">
                {[40, 90, 140, 190, 240].map((y, i) => (
                  <path
                    key={i}
                    d={`M 10 ${y} Q 100 ${y + (i % 2 === 0 ? 5 : -5)} 200 ${y}`}
                    stroke="url(#windFlow)"
                    strokeWidth={1.5 + (liveState.windSpeed / 10)}
                    strokeDasharray="8 6"
                    fill="none"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="100"
                      to="0"
                      dur={`${Math.max(0.2, 3 - liveState.windSpeed / 8)}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                ))}
              </g>

              {/* Tower & Nacelle Base */}
              <rect x="235" y="160" width="30" height="130" fill="#1e293b" rx="2" stroke="#334155" />
              <rect x="180" y="125" width="140" height="40" fill="#0f172a" rx="8" stroke="#334155" strokeWidth="2" />
              <text x="250" y="148" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                NACELLE
              </text>

              {/* Centrifugal Governor Flyweight Mechanics (Center x: 250, y: 145) */}
              {/* Shaft */}
              <line x1="130" y1="145" x2="220" y2="145" stroke="#64748b" strokeWidth="6" />

              {/* Governor Sleeve (Slides left/right based on sleeveDisplacement) */}
              {/* Max stroke 25mm mapped to 30px visual shift */}
              {(() => {
                const sleeveShiftPx = (liveState.sleeveDisplacement * 1000) * 1.2;
                const flyweightAngleRad = (liveState.sleeveDisplacement * 1000 / 25) * 0.6;
                const fwX = 160 + Math.sin(flyweightAngleRad) * 20;
                const fwYUpper = 145 - 20 - Math.cos(flyweightAngleRad) * 25;
                const fwYLower = 145 + 20 + Math.cos(flyweightAngleRad) * 25;

                return (
                  <g>
                    {/* Fixed collar */}
                    <rect x="135" y="132" width="10" height="26" fill="#38bdf8" rx="2" />

                    {/* Sliding Sleeve */}
                    <rect
                      x={160 + sleeveShiftPx}
                      y="132"
                      width="12"
                      height="26"
                      fill="#a855f7"
                      rx="2"
                      stroke="#c084fc"
                    />

                    {/* Spring coil between fixed collar and sleeve */}
                    <path
                      d={`M 145 145 C 148 138, 152 152, 155 145 C 158 138, ${158 + sleeveShiftPx / 2} 152, ${160 + sleeveShiftPx} 145`}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />

                    {/* Linkage arms & Flyweights */}
                    {/* Upper Arm */}
                    <line x1="140" y1="145" x2={fwX + sleeveShiftPx / 2} y2={fwYUpper} stroke="#cbd5e1" strokeWidth="2" />
                    <line x1={fwX + sleeveShiftPx / 2} y1={fwYUpper} x2={166 + sleeveShiftPx} y2="145" stroke="#cbd5e1" strokeWidth="2" />
                    <circle cx={fwX + sleeveShiftPx / 2} cy={fwYUpper} r="8" fill="#f59e0b" stroke="#000" />

                    {/* Lower Arm */}
                    <line x1="140" y1="145" x2={fwX + sleeveShiftPx / 2} y2={fwYLower} stroke="#cbd5e1" strokeWidth="2" />
                    <line x1={fwX + sleeveShiftPx / 2} y1={fwYLower} x2={166 + sleeveShiftPx} y2="145" stroke="#cbd5e1" strokeWidth="2" />
                    <circle cx={fwX + sleeveShiftPx / 2} cy={fwYLower} r="8" fill="#f59e0b" stroke="#000" />

                    {/* Pushrod to Blade Hub */}
                    <line
                      x1={166 + sleeveShiftPx}
                      y1="145"
                      x2="110"
                      y2="145"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray="4 2"
                    />
                  </g>
                );
              })()}

              {/* Rotor Hub & Blades (Left side x: 110, y: 145) */}
              <g transform={`translate(110, 145)`}>
                {/* Rotating Blade Disk effect */}
                <circle cx="0" cy="0" r="95" fill="none" stroke="#10b981" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />

                {/* Hub */}
                <circle cx="0" cy="0" r="16" fill="#0f172a" stroke="#10b981" strokeWidth="3" />

                {/* Blade 1 (Upper) with Pitch Angle Visual Twist */}
                <g transform={`rotate(${0 + (liveState.rotorRpm * 0.2)})`}>
                  <rect
                    x="-4"
                    y="-90"
                    width={8 - Math.sin((liveState.pitchAngle * Math.PI) / 180) * 4}
                    height="80"
                    fill="#10b981"
                    rx="3"
                    opacity="0.85"
                  />
                  <line x1="0" y1="0" x2="0" y2="-90" stroke="#047857" strokeWidth="1" />
                </g>

                {/* Blade 2 (Lower Right) */}
                <g transform={`rotate(${120 + (liveState.rotorRpm * 0.2)})`}>
                  <rect
                    x="-4"
                    y="-90"
                    width={8 - Math.sin((liveState.pitchAngle * Math.PI) / 180) * 4}
                    height="80"
                    fill="#10b981"
                    rx="3"
                    opacity="0.85"
                  />
                </g>

                {/* Blade 3 (Lower Left) */}
                <g transform={`rotate(${240 + (liveState.rotorRpm * 0.2)})`}>
                  <rect
                    x="-4"
                    y="-90"
                    width={8 - Math.sin((liveState.pitchAngle * Math.PI) / 180) * 4}
                    height="80"
                    fill="#10b981"
                    rx="3"
                    opacity="0.85"
                  />
                </g>
              </g>

              {/* Real-time Visual Overlay Labels */}
              <g className="font-mono" fontSize="10">
                <rect x="10" y="10" width="140" height="40" fill="#0f172a" rx="6" stroke="#334155" />
                <text x="20" y="26" fill="#38bdf8" fontWeight="bold">WIND: {simulatedWindSpeed.toFixed(1)} m/s</text>
                <text x="20" y="40" fill="#10b981">ROTOR: {Math.round(liveState.rotorRpm)} RPM</text>

                <rect x="350" y="10" width="140" height="40" fill="#0f172a" rx="6" stroke="#334155" />
                <text x="360" y="26" fill="#a855f7" fontWeight="bold">SLEEVE: {(liveState.sleeveDisplacement * 1000).toFixed(1)} mm</text>
                <text x="360" y="40" fill="#f59e0b">PITCH θ: {liveState.pitchAngle.toFixed(1)}°</text>
              </g>
            </svg>
          </div>
        </div>

        {/* 4. "WHY NO ELECTRONICS?" ARCHITECTURE PANEL (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              "Why No Electronics?" Control Loop Comparison
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparing active electronic feedback against WindSense direct kinetic physics coupling.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            {/* Conventional Control Box */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-red-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-400 flex items-center gap-1.5 uppercase">
                  <X className="w-4 h-4" /> Conventional Electronic Control
                </span>
                <span className="text-[10px] text-red-400/80 font-mono">3-STAGE DELAY</span>
              </div>

              {/* Flowchart */}
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
                <span>Sensor</span>
                <ArrowRight className="w-3 h-3 text-red-400" />
                <span>Controller (PLC)</span>
                <ArrowRight className="w-3 h-3 text-red-400" />
                <span>Actuator Servo</span>
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed">
                Requires continuous power, firmware code, sensor calibration, and battery backups. Vulnerable to sensor drift, lightning surges, and actuator gear failure.
              </p>
            </div>

            {/* WindSense Concept Box */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                  <CheckCircle2 className="w-4 h-4" /> WindSense Mechanical Concept
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">ZERO DELAY</span>
              </div>

              {/* Flowchart */}
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-emerald-500/30 font-mono text-[11px] text-emerald-300 font-bold">
                <span>Rotor Motion</span>
                <ArrowRight className="w-3 h-3 text-emerald-400" />
                <span>Governor</span>
                <ArrowRight className="w-3 h-3 text-emerald-400" />
                <span>Linkage</span>
                <ArrowRight className="w-3 h-3 text-emerald-400" />
                <span>Blade Pitch</span>
              </div>

              <p className="text-slate-300 text-[11px] leading-relaxed">
                Direct mechanical kinetic coupling. Centrifugal force F_c = m·ω²·r directly opposes spring rate F_s = k·Δx. Zero standby energy draw, zero software bugs, and instant force equilibrium.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* 5. SYSTEM COMPARISON MATRIX SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-400" />
              <span>Comprehensive System Comparison Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluating key trade-offs between active electronic pitch control and WindSense mechanical regulation.
            </p>
          </div>
          <span className="bg-purple-500/10 text-purple-300 border border-purple-500/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
            BALANCED ENGINEERING ANALYSIS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Evaluation Axis</th>
                <th className="py-3 px-3 text-emerald-400 bg-emerald-950/20">WindSense Concept (Mechanical)</th>
                <th className="py-3 px-3 text-cyan-400">Active Electronic Pitch Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-200">Electronic Dependency</td>
                <td className="py-3 px-3 font-semibold text-emerald-300 bg-emerald-950/10">
                  Zero (0 sensors, 0 microcontrollers, 0 software)
                </td>
                <td className="py-3 px-3 text-slate-300">
                  High (Anemometers, rotary encoders, PLC, driver ICs)
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-200">Mechanical Complexity</td>
                <td className="py-3 px-3 font-semibold text-emerald-300 bg-emerald-950/10">
                  Integrated passive governor & spring linkage
                </td>
                <td className="py-3 px-3 text-slate-300">
                  Active motorized gear pitch drives & slip ring couplings
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-200">Maintenance Considerations</td>
                <td className="py-3 px-3 font-semibold text-emerald-300 bg-emerald-950/10">
                  Visual mechanical inspection & periodic lubrication
                </td>
                <td className="py-3 px-3 text-slate-300">
                  Electronic diagnostics, sensor calibration & motor service
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-200">Control Philosophy</td>
                <td className="py-3 px-3 font-semibold text-emerald-300 bg-emerald-950/10">
                  Direct physics equilibrium (Fc vs Fs force balance)
                </td>
                <td className="py-3 px-3 text-slate-300">
                  Active closed-loop feedback algorithms (PID / state-space)
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-200">Adaptability</td>
                <td className="py-3 px-3 font-semibold text-emerald-300 bg-emerald-950/10">
                  Calibrated spring rate (k) & flyweight mass (m) tuning
                </td>
                <td className="py-3 px-3 text-slate-300">
                  Software re-programming & parameter flashing
                </td>
              </tr>

              <tr className="hover:bg-slate-800/40">
                <td className="py-3 px-3 font-bold text-slate-200">Sustainability Considerations</td>
                <td className="py-3 px-3 font-semibold text-emerald-300 bg-emerald-950/10">
                  High recyclability (Steel, brass, and aluminum parts)
                </td>
                <td className="py-3 px-3 text-slate-300">
                  Requires e-waste handling for PCBs & lithium backup batteries
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-400 italic bg-slate-950 p-3 rounded-xl border border-slate-800">
          * Engineering Note: Both architectures possess distinct advantages. Active electronics provide precise dynamic optimization across complex grid requirements, while WindSense provides reliable mechanical self-regulation ideal for remote or high-maintenance environments.
        </p>
      </div>

    </div>
  );
};
