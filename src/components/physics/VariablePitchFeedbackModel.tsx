import React, { useState, useEffect, useRef } from 'react';
import { calculateGovernorState } from '../../physics/mechanicalGovernor';
import { evaluateMechanicalLinkage, LinkageConfig } from '../../physics/bladePitch';
import { calculatePower } from '../../physics/powerCalculator';
import { TurbineParameters, SimulationState } from '../../types/simulation';
import { DEFAULT_TURBINE_PARAMS } from '../../physics/turbinePhysics';
import { Turbine3DSimulation } from '../visualization/Turbine3DSimulation';
import {
  Wind,
  Gauge,
  Sliders,
  ShieldCheck,
  AlertCircle,
  Activity,
  Zap,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Cog,
  Compass,
} from 'lucide-react';

export const VariablePitchFeedbackModel: React.FC = () => {
  // Mechanical Linkage Configuration
  const [linkageConfig, setLinkageConfig] = useState<LinkageConfig>({
    minimumPitch: 2.0,
    maximumPitch: 82.0,
    nominalPitch: 2.0,
    linkageRatio: 1.0,
    maxSleeveTravel: 0.06, // 60mm
  });

  // Governor Physical Parameters
  const [governorMass, setGovernorMass] = useState<number>(1.25); // kg per weight
  const [springConstant, setSpringConstant] = useState<number>(4800); // N/m
  const [springPreload, setSpringPreload] = useState<number>(380); // N
  const [rotorInertia, setRotorInertia] = useState<number>(120); // kg·m^2

  // Environmental & Dynamic Simulation State
  const [windSpeed, setWindSpeed] = useState<number>(12.0); // m/s
  const [targetWindSpeed, setTargetWindSpeed] = useState<number>(12.0); // m/s
  const [rotorRpm, setRotorRpm] = useState<number>(175); // live RPM
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1.0);

  // Time-series history for live oscilloscope graph
  const [history, setHistory] = useState<
    Array<{
      time: number;
      wind: number;
      rpm: number;
      pitch: number;
      torque: number;
      cp: number;
    }>
  >([]);

  const timeRef = useRef<number>(0);

  // Current turbine parameter object
  const params: TurbineParameters = {
    ...DEFAULT_TURBINE_PARAMS,
    governorMass,
    springConstant,
    springPreload,
    maxSleeveTravel: linkageConfig.maxSleeveTravel,
    finePitchAngle: linkageConfig.minimumPitch,
    featherPitchAngle: linkageConfig.maximumPitch,
    linkageRatio: linkageConfig.linkageRatio,
  };

  // 1. Calculate Governor Sleeve Displacement from current RPM
  const governorState = calculateGovernorState(rotorRpm, params);

  // 2. Calculate Mechanical Linkage & Blade Pitch Angle
  const linkageState = evaluateMechanicalLinkage(governorState.sleeveDisplacement, linkageConfig);

  // 3. Calculate Aerodynamic Response (Cp, Power, Aerodynamic Torque)
  const powerState = calculatePower(windSpeed, rotorRpm, linkageState.pitchAngleDeg, params);

  // 4. Determine Operational State & Construct Real-Time Simulation State for 3D Master Simulation
  let operationalState: import('../../types/simulation').OperationalState = 'OPTIMAL';
  let operationalMessage = 'Stable power generation';
  if (windSpeed < params.cutInWindSpeed) {
    operationalState = 'STILL';
    operationalMessage = 'Below cut-in speed';
  } else if (windSpeed >= params.cutOutWindSpeed) {
    operationalState = 'STORM_CUT_OUT';
    operationalMessage = 'High wind feather protection';
  } else if (linkageState.pitchAngleDeg > 20) {
    operationalState = 'PASSIVE_FEATHERING';
    operationalMessage = 'Passive aerodynamic feathering active';
  }

  const sweptArea = Math.PI * Math.pow(params.rotorRadius, 2);
  const windPower = 0.5 * params.airDensity * sweptArea * Math.pow(windSpeed, 3);
  const tsr = windSpeed > 0 ? ((rotorRpm * 2 * Math.PI * params.rotorRadius) / 60) / windSpeed : 0;

  const currentSimState: SimulationState = {
    windSpeed,
    windDirection: 0,
    rotorRpm,
    tipSpeedRatio: tsr,
    pitchAngle: linkageState.pitchAngleDeg,
    cpCoefficient: powerState.cpCoefficient,
    windPower,
    aerodynamicPower: powerState.aerodynamicPower,
    electricalPower: powerState.electricalPower,
    aerodynamicTorque: powerState.aerodynamicTorque,
    centrifugalForce: governorState.centrifugalForce,
    springForce: governorState.springForce,
    netGovernorForce: governorState.netForce,
    sleeveDisplacement: governorState.sleeveDisplacement,
    governorRadius: governorState.governorRadius,
    operationalState,
    operationalMessage,
  };

  // Mechanical Feedback Activity Threshold: active when governor moves sleeve past 1mm
  const isFeedbackActive = linkageState.sleeveDisplacementMm > 1.0;

  // Closed-loop dynamic simulation loop (Euler integration)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      timeRef.current += 0.1 * simulationSpeed;

      // Smoothly approach target wind speed (simulates wind gust inertia / ramping)
      setWindSpeed((currentWind) => {
        const diff = targetWindSpeed - currentWind;
        if (Math.abs(diff) < 0.05) return targetWindSpeed;
        return currentWind + diff * 0.15;
      });

      setRotorRpm((currentRpm) => {
        // Calculate instantaneous aerodynamic torque at current RPM & pitch
        const currentPower = calculatePower(windSpeed, currentRpm, linkageState.pitchAngleDeg, params);
        const omega = Math.max(0.1, (currentRpm * Math.PI) / 30);
        const T_aero = currentPower.aerodynamicTorque;

        // Generator / mechanical friction load torque curve
        // Load torque matches rated torque at rated RPM, plus electromagnetic drag
        const T_load = Math.min(650, 80 + Math.pow(currentRpm / 180, 2) * 450);

        // Rotor angular acceleration alpha = (T_aero - T_load) / J
        const netTorque = T_aero - T_load;
        const alpha = netTorque / Math.max(20, rotorInertia); // rad/s^2

        // Convert alpha to RPM delta (1 rad/s = 9.549 RPM)
        const dRpm = alpha * 9.549 * 0.1 * simulationSpeed;

        // Target idle spin if wind is zero
        if (windSpeed < 2.5) {
          const idleRpm = (windSpeed / 2.5) * 30;
          return currentRpm + (idleRpm - currentRpm) * 0.1;
        }

        // Bounded physically realistic RPM range (10 to 300 RPM)
        const nextRpm = Math.max(10, Math.min(290, currentRpm + dRpm));
        return nextRpm;
      });

      // Update oscilloscope history
      setHistory((prev) => {
        const nextPoint = {
          time: Number(timeRef.current.toFixed(1)),
          wind: Number(windSpeed.toFixed(1)),
          rpm: Math.round(rotorRpm),
          pitch: Number(linkageState.pitchAngleDeg.toFixed(1)),
          torque: Math.round(powerState.aerodynamicTorque),
          cp: Number(powerState.cpCoefficient.toFixed(3)),
        };
        const updated = [...prev, nextPoint];
        return updated.slice(-40); // keep last 40 samples
      });
    }, 100);

    return () => clearInterval(interval);
  }, [
    isSimulating,
    simulationSpeed,
    windSpeed,
    targetWindSpeed,
    rotorRpm,
    linkageState.pitchAngleDeg,
    rotorInertia,
    params,
  ]);

  // Visual blade rotation angle
  const [bladeRotation, setBladeRotation] = useState(0);
  useEffect(() => {
    if (!isSimulating || rotorRpm <= 0) return;
    const interval = setInterval(() => {
      setBladeRotation((prev) => (prev + rotorRpm * 0.6) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isSimulating, rotorRpm]);

  // Visual pitch geometry calculation
  const pitchRad = (linkageState.pitchAngleDeg * Math.PI) / 180;
  const bladeVisualWidth = Math.max(4, 34 * Math.cos(pitchRad));

  return (
    <div id="variable-pitch-feedback-model" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {/* Feedback Active Badge */}
            <div
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isFeedbackActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  isFeedbackActive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                }`}
              />
              <span>
                {isFeedbackActive ? 'Mechanical Feedback Active' : 'Passive Resting State'}
              </span>
            </div>

            <span className="text-slate-400 text-xs font-mono">• Closed-Loop Model</span>
          </div>

          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Variable-Pitch Mechanical Feedback Loop
          </h2>

          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Continuous mechanical linkage model: Governor displacement translates directly into blade twist (θ), changing aerodynamic torque and moderating rotor acceleration. Zero digital microcontrollers or software if/else triggers.
          </p>
        </div>

        {/* Disclaimer Callout Box */}

        <div className="bg-slate-950 border border-amber-500/30 px-3.5 py-2.5 rounded-xl text-right shrink-0">
          <div className="text-[11px] font-bold text-amber-400 flex items-center justify-end gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Simulated mechanical regulation</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Software models physical mechanics. Does not replace site physical testing.
          </p>
        </div>
      </div>

      {/* Live Interactive Causal Chain Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Live Mechanical Causal Flow Chain</span>
          </h3>
          <span className="text-[11px] text-slate-400">Continuous Physics Equilibrium</span>
        </div>

        {/* Causal Chain Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {/* Node 1: WIND */}
          <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30 flex flex-col justify-between space-y-1 relative group hover:border-cyan-400 transition-all">
            <div className="flex justify-between text-[10px] text-cyan-400 font-bold uppercase">
              <span>1. WIND</span>
              <Wind className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-mono font-bold text-slate-100">{windSpeed.toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">m/s</span></p>
            <p className="text-[9px] text-slate-500">Kinetic energy input</p>
          </div>

          {/* Node 2: ROTOR SPEED */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between space-y-1 hover:border-slate-700 transition-all">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
              <span>2. ROTOR SPEED</span>
              <Gauge className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-lg font-mono font-bold text-slate-100">{Math.round(rotorRpm)} <span className="text-[10px] text-slate-400 font-normal">RPM</span></p>
            <p className="text-[9px] text-slate-500">Angular velocity ω</p>
          </div>

          {/* Node 3: CENTRIFUGAL FORCE */}
          <div className={`bg-slate-950 p-3 rounded-xl border flex flex-col justify-between space-y-1 transition-all ${
            governorState.centrifugalForce > params.springPreload
              ? 'border-amber-500/40 shadow-sm shadow-amber-500/10'
              : 'border-slate-800'
          }`}>
            <div className="flex justify-between text-[10px] text-amber-400 font-bold uppercase">
              <span>3. CENTRIFUGAL</span>
              <Cog className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-mono font-bold text-amber-300">{governorState.centrifugalForce.toFixed(0)} <span className="text-[10px] text-amber-400/70 font-normal">N</span></p>
            <p className="text-[9px] text-slate-500">Fc = m · r · ω²</p>
          </div>

          {/* Node 4: GOVERNOR */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between space-y-1 hover:border-slate-700 transition-all">
            <div className="flex justify-between text-[10px] text-amber-400 font-bold uppercase">
              <span>4. GOVERNOR</span>
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-mono font-bold text-amber-400">{linkageState.sleeveDisplacementMm.toFixed(1)} <span className="text-[10px] text-amber-400/70 font-normal">mm</span></p>
            <p className="text-[9px] text-slate-500">Sleeve travel x</p>
          </div>

          {/* Node 5: LINKAGE */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between space-y-1 hover:border-slate-700 transition-all">
            <div className="flex justify-between text-[10px] text-emerald-400 font-bold uppercase">
              <span>5. LINKAGE</span>
              <Compass className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-mono font-bold text-emerald-400">{linkageState.linkageDisplacementMm.toFixed(1)} <span className="text-[10px] text-emerald-400/70 font-normal">mm</span></p>
            <p className="text-[9px] text-slate-500">Ratio: {linkageConfig.linkageRatio.toFixed(1)}x</p>
          </div>

          {/* Node 6: BLADE PITCH */}
          <div className={`bg-slate-950 p-3 rounded-xl border flex flex-col justify-between space-y-1 transition-all ${
            linkageState.pitchAngleDeg > 15
              ? 'border-emerald-500/50 bg-emerald-950/20 shadow-md shadow-emerald-500/10'
              : 'border-slate-800'
          }`}>
            <div className="flex justify-between text-[10px] text-emerald-300 font-bold uppercase">
              <span>6. BLADE PITCH</span>
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-mono font-bold text-emerald-300">{linkageState.pitchAngleDeg.toFixed(1)}°</p>
            <p className="text-[9px] text-slate-500">Angle θ</p>
          </div>

          {/* Node 7: AERODYNAMIC RESPONSE */}
          <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30 flex flex-col justify-between space-y-1 hover:border-cyan-400 transition-all">
            <div className="flex justify-between text-[10px] text-cyan-300 font-bold uppercase">
              <span>7. AERO RESPONSE</span>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <p className="text-lg font-mono font-bold text-cyan-300">{Math.round(powerState.aerodynamicTorque)} <span className="text-[10px] text-cyan-300/70 font-normal">N·m</span></p>
            <p className="text-[9px] text-slate-500">Cp: {powerState.cpCoefficient.toFixed(3)}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Visual Turbine Canvas & Test Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Turbine & Blade Geometry Render (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col items-center relative overflow-hidden">
            
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between mb-2 text-xs z-10">
              <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400">Wind Velocity:</span>
                <span className="text-emerald-400 font-mono font-bold">{windSpeed.toFixed(1)} m/s</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-400">Pitch State:</span>
                <span className="font-mono font-bold text-emerald-400">{linkageState.pitchAngleDeg.toFixed(1)}°</span>
                <span className="text-[10px] text-slate-500">
                  {linkageState.pitchAngleDeg > 45 ? '(Feathering)' : '(Power Capture)'}
                </span>
              </div>
            </div>

            {/* Master Three.js 3D Interactive Visualizer */}
            <div className="relative w-full aspect-[4/3] max-h-[380px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <Turbine3DSimulation
                state={currentSimState}
                isPaused={!isSimulating}
                simSpeed={simulationSpeed}
                className="w-full h-full min-h-[320px]"
              />

              {/* Bottom Live Stats Bar */}
              <div className="absolute bottom-3 left-3 right-3 bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs backdrop-blur-md z-10 pointer-events-none">
                <div>
                  <span className="text-slate-400 text-[10px]">Rotor Speed</span>
                  <p className="font-mono font-bold text-slate-100">{Math.round(rotorRpm)} RPM</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Sleeve Travel</span>
                  <p className="font-mono font-bold text-amber-400">{linkageState.sleeveDisplacementMm.toFixed(1)} mm</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Aero Torque</span>
                  <p className="font-mono font-bold text-cyan-300">{Math.round(powerState.aerodynamicTorque)} N·m</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Power Output</span>
                  <p className="font-mono font-bold text-emerald-400">{(powerState.electricalPower / 1000).toFixed(2)} kW</p>
                </div>
              </div>
            </div>
          </div>

          {/* Time-Series Graph / History Trace */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Live Dynamic Closed-Loop Oscilloscope</span>
              </h3>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Wind (m/s)
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> RPM
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Pitch (°)
                </span>
              </div>
            </div>

            {/* SVG Multi-Line Chart */}
            <div className="h-32 w-full bg-slate-950 rounded-xl border border-slate-800 p-2 relative overflow-hidden">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                {/* Horizontal Gridlines */}
                <line x1="0" y1="25" x2="300" y2="25" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="0" y1="50" x2="300" y2="50" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="0" y1="75" x2="300" y2="75" stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />

                {history.length > 1 && (
                  <>
                    {/* Wind Line (Cyan) */}
                    <path
                      d={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 300;
                          const y = 100 - (pt.wind / 30) * 90;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />

                    {/* RPM Line (Amber) */}
                    <path
                      d={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 300;
                          const y = 100 - (pt.rpm / 250) * 90;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.5"
                    />

                    {/* Pitch Line (Emerald) */}
                    <path
                      d={history
                        .map((pt, i) => {
                          const x = (i / (history.length - 1)) * 300;
                          const y = 100 - (pt.pitch / 90) * 90;
                          return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ')}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="2"
                    />
                  </>
                )}
              </svg>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Real-time response demonstrating smooth pitch transition without chaotic oscillations or numerical instability.
            </p>
          </div>
        </div>

        {/* Right Column: Controls & Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Mechanical Linkage Parameter Display */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Linkage & Pitch Geometry Parameters</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold">
                Fixed Parameters
              </span>
            </div>

            {/* Min Pitch Display */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Minimum Fine Pitch (θ_min)</span>
                <span className="font-mono font-bold text-emerald-400">{linkageConfig.minimumPitch.toFixed(1)}°</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">Fine pitch for maximum low-wind lift & power capture.</p>
            </div>

            {/* Max Pitch Display */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Maximum Feather Pitch (θ_max)</span>
                <span className="font-mono font-bold text-amber-400">{linkageConfig.maximumPitch.toFixed(1)}°</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">Feathering angle for aerodynamic torque shedding.</p>
            </div>

            {/* Linkage Ratio Display */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Linkage Leverage Ratio (k_link)</span>
                <span className="font-mono font-bold text-cyan-400">{linkageConfig.linkageRatio.toFixed(2)}x</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">Bell-crank lever arm mechanical advantage factor.</p>
            </div>

            {/* Manual Wind Speed Control */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex justify-between text-xs">
                <label className="text-slate-300 font-medium">Manual Simulated Wind Speed</label>
                <span className="font-mono font-bold text-cyan-300">{targetWindSpeed.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.5"
                value={targetWindSpeed}
                onChange={(e) => setTargetWindSpeed(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
