import React, { useState, useEffect, useRef } from 'react';
import {
  CentrifugalGovernorParams,
  StandaloneGovernorState,
  DEFAULT_GOVERNOR_PARAMS,
  calculateGovernorStep,
  generateGovernorCurves,
} from '../../physics/mechanicalGovernor';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from 'recharts';
import {
  Cog,
  Sliders,
  Zap,
  ShieldCheck,
  Compass,
  Activity,
  Layers,
  Gauge,
} from 'lucide-react';

interface CentrifugalGovernorModelProps {
  initialRpm?: number;
}

export const CentrifugalGovernorModel: React.FC<CentrifugalGovernorModelProps> = ({
  initialRpm = 180,
}) => {
  const [rotorRpm, setRotorRpm] = useState<number>(initialRpm > 0 ? initialRpm : 180);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [params] = useState<CentrifugalGovernorParams>(DEFAULT_GOVERNOR_PARAMS);

  // Smooth displacement state ref for differential dynamic update loop
  const displacementRef = useRef<number>(0);
  const [liveState, setLiveState] = useState<StandaloneGovernorState>(() =>
    calculateGovernorStep(initialRpm > 0 ? initialRpm : 180, 0, 0.05, DEFAULT_GOVERNOR_PARAMS)
  );

  // Sync with turbine simulation state RPM
  useEffect(() => {
    if (initialRpm !== undefined) {
      setRotorRpm(initialRpm);
    }
  }, [initialRpm]);

  // Continuous animation loop stepping mechanical ODE dx/dt = (x_eq - x) / tau
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      if (dt > 0) {
        const step = calculateGovernorStep(rotorRpm, displacementRef.current, dt, params);
        displacementRef.current = step.currentDisplacement;
        setLiveState(step);

        // Update visual shaft rotation angle based on live RPM
        setRotationAngle((prev) => (prev + (rotorRpm * 360 * dt) / 60) % 360);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [rotorRpm, params]);

  // Generate continuous equilibrium curve data for RPM vs Governor Position graph
  const curveData = generateGovernorCurves(params);

  // State color mapping
  const getStateBadgeStyle = (category: string) => {
    switch (category) {
      case 'At Rest (0 RPM)':
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 'Active (Preload Equilibrium)':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Active (Engaging)':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Active (Regulating)':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Active (Max Travel Limit)':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  // Visual SVG positions based on live displacement
  const xRatio = Math.max(0, Math.min(1, liveState.governorPositionPct / 100)); // 0 to 1
  const sleeveOffsetY = xRatio * 60; // 0 to 60px sleeve sliding travel
  const flyweightRadiusX = 40 + xRatio * 70; // 40px (min) to 110px (max) radial expansion

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-0.5 rounded-full text-xs font-semibold text-amber-400">
            <Cog className="w-3.5 h-3.5 animate-spin-slow" />
            <span>Central Innovation • Passive Centrifugal Governor</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Independent Centrifugal Mechanical Governor Model
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Converts rotational kinetic speed into physical sleeve displacement via centrifugal force (F_c = m × r × ω²) opposed by a calibrated spring (F_s = F_preload + k × x). Pure mechanical intelligence — driven live by the simulation environment.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0 bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800">
          <Gauge className="w-4 h-4 text-amber-400" />
          <div className="text-right">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Simulation Speed</div>
            <div className="text-base font-mono font-bold text-amber-400">{rotorRpm.toFixed(0)} RPM</div>
          </div>
        </div>
      </div>

      {/* Fixed Governor Mechanical Parameters & Limits (Display Only) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Governor Mechanical Parameters & Limits
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 font-bold">
            Calibrated Wind Turbine Specs
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Flyweight Mass */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Flyweight Mass (m)</span>
              <span className="font-mono font-bold text-amber-400">{params.flyweightMass.toFixed(2)} kg</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Total = {(params.flyweightMass * params.numFlyweights).toFixed(2)} kg ({params.numFlyweights}x masses)
            </div>
          </div>

          {/* Spring Stiffness */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Spring Stiffness (k)</span>
              <span className="font-mono font-bold text-cyan-400">{params.springStiffness} N/m</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Helical Compression Rate
            </div>
          </div>

          {/* Spring Preload Force */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Spring Preload (F_preload)</span>
              <span className="font-mono font-bold text-cyan-400">{params.springPreload} N</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Restoring Pre-load Threshold
            </div>
          </div>

          {/* Minimum Radius */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Min Radius (r_min)</span>
              <span className="font-mono font-bold text-purple-400">{(params.minRadius * 1000).toFixed(0)} mm</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              At-Rest Flyweight Distance
            </div>
          </div>

          {/* Maximum Radius */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Max Radius (r_max)</span>
              <span className="font-mono font-bold text-purple-400">{(params.maxRadius * 1000).toFixed(0)} mm</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Full-Extension Radial Stop
            </div>
          </div>

          {/* Mechanical Travel Limit */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Max Travel (x_max)</span>
              <span className="font-mono font-bold text-emerald-400 font-bold">{(params.maxTravel * 1000).toFixed(0)} mm</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Sleeve Mechanical Stroke Limit
            </div>
          </div>

          {/* Response Damping Time */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Response Damping (τ)</span>
              <span className="font-mono font-bold text-rose-400">{(params.responseDampingTime * 1000).toFixed(0)} ms</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Mechanical Inertia Smoothing Time
            </div>
          </div>
        </div>
      </div>

      {/* Main Display: Live Animated Governor Schematic + Primary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Animated Centrifugal Governor Schematic (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Cog
                className={`w-5 h-5 text-amber-400 ${rotorRpm > 0 ? 'animate-spin' : ''}`}
                style={{ animationDuration: `${Math.max(0.3, 60 / Math.max(1, rotorRpm))}s` }}
              />
              <h3 className="text-sm font-bold text-slate-100">
                Live Centrifugal Flyball Governor Kinematics
              </h3>
            </div>
            <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${getStateBadgeStyle(liveState.governorState)}`}>
              {liveState.governorState}
            </span>
          </div>

          {/* Animated SVG Diagram */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex items-center justify-center min-h-[340px] relative">
            <svg viewBox="0 0 450 320" className="w-full h-auto max-h-[360px]">
              <defs>
                <marker id="forceFc" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
                <marker id="forceFs" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
                <linearGradient id="shaftGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#475569" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
              </defs>

              {/* Central Drive Shaft */}
              <rect x="215" y="20" width="20" height="280" fill="url(#shaftGrad)" rx="4" stroke="#64748b" strokeWidth="1.5" />
              
              {/* Dynamic Rotation Stripes on Shaft */}
              {rotorRpm > 0 && (
                <g opacity="0.6">
                  {[-40, 0, 40, 80, 120, 160, 200, 240].map((baseY, i) => {
                    const yPos = 30 + ((baseY + (rotationAngle * 0.5)) % 250);
                    return (
                      <line
                        key={i}
                        x1="216"
                        y1={yPos}
                        x2="234"
                        y2={yPos + 8}
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}

              {/* Shaft Centerline */}
              <line x1="225" y1="10" x2="225" y2="310" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />

              {/* Top Fixed Shaft Collar */}
              <rect x="185" y="40" width="80" height="24" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" rx="4" />
              <text x="225" y="56" fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">
                FIXED COLLAR
              </text>

              {/* Dynamic Sliding Swashplate / Sleeve */}
              <g transform={`translate(0, ${sleeveOffsetY})`}>
                <rect x="180" y="200" width="90" height="28" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" rx="5" />
                <text x="225" y="218" fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">
                  SLIDING SLEEVE
                </text>

                {/* Sleeve Stroke Travel Indicator Arrow */}
                <line x1="280" y1="200" x2="280" y2="228" stroke="#10b981" strokeWidth="2" />
                <text x="305" y="218" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="start">
                  x = {liveState.displacementMm.toFixed(1)} mm
                </text>
              </g>

              {/* Helical Spring around Drive Shaft */}
              {/* Draws compressed helical spring coils between Y=64 and Y=(200 + sleeveOffsetY) */}
              {(() => {
                const springStartY = 64;
                const springEndY = 200 + sleeveOffsetY;
                const numCoils = 8;
                const pathPoints: string[] = [];
                for (let i = 0; i <= numCoils; i++) {
                  const y = springStartY + (i / numCoils) * (springEndY - springStartY);
                  const x = i % 2 === 0 ? 210 : 240;
                  pathPoints.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`);
                }
                return (
                  <path
                    d={pathPoints.join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })()}

              {/* Symmetrical Centrifugal Flyweight Arms & Masses */}
              {/* Left Weight */}
              {(() => {
                const leftX = 225 - flyweightRadiusX;
                const leftY = 120 + sleeveOffsetY * 0.4;
                const arrowLen = Math.max(15, Math.min(50, liveState.centrifugalForce * 0.3));
                return (
                  <g>
                    {/* Top Arm */}
                    <line x1="225" y1="52" x2={leftX} y2={leftY} stroke="#cbd5e1" strokeWidth="3.5" />
                    {/* Bottom Linkage to Sleeve */}
                    <line x1={leftX} y1={leftY} x2="225" y2={214 + sleeveOffsetY} stroke="#94a3b8" strokeWidth="3" />
                    {/* Flyweight Mass Circle */}
                    <circle cx={leftX} cy={leftY} r="18" fill="#f59e0b" stroke="#78350f" strokeWidth="2.5" />
                    <text x={leftX} y={leftY + 4} fill="#78350f" fontSize="10" textAnchor="middle" fontWeight="bold">
                      m
                    </text>
                    {/* Fc Vector Arrow (Left Outward) */}
                    <line x1={leftX} y1={leftY} x2={leftX - arrowLen} y2={leftY} stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#forceFc)" />
                    <text x={leftX - arrowLen - 6} y={leftY - 8} fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="end">
                      Fc = {liveState.centrifugalForce.toFixed(0)} N
                    </text>
                  </g>
                );
              })()}

              {/* Right Weight */}
              {(() => {
                const rightX = 225 + flyweightRadiusX;
                const rightY = 120 + sleeveOffsetY * 0.4;
                const arrowLen = Math.max(15, Math.min(50, liveState.centrifugalForce * 0.3));
                return (
                  <g>
                    {/* Top Arm */}
                    <line x1="225" y1="52" x2={rightX} y2={rightY} stroke="#cbd5e1" strokeWidth="3.5" />
                    {/* Bottom Linkage to Sleeve */}
                    <line x1={rightX} y1={rightY} x2="225" y2={214 + sleeveOffsetY} stroke="#94a3b8" strokeWidth="3" />
                    {/* Flyweight Mass Circle */}
                    <circle cx={rightX} cy={rightY} r="18" fill="#f59e0b" stroke="#78350f" strokeWidth="2.5" />
                    <text x={rightX} y={rightY + 4} fill="#78350f" fontSize="10" textAnchor="middle" fontWeight="bold">
                      m
                    </text>
                    {/* Fc Vector Arrow (Right Outward) */}
                    <line x1={rightX} y1={rightY} x2={rightX + arrowLen} y2={rightY} stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#forceFc)" />
                    <text x={rightX + arrowLen + 6} y={rightY - 8} fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="start">
                      r = {liveState.radiusMm.toFixed(0)} mm
                    </text>
                  </g>
                );
              })()}

              {/* Mechanical Stop Bumper Indicators */}
              <line x1="165" y1="200" x2="285" y2="200" stroke="#64748b" strokeWidth="1" strokeDasharray="3 3" />
              <text x="135" y="204" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="end">
                Resting (0mm)
              </text>

              <line x1="165" y1="260" x2="285" y2="260" stroke="#e11d48" strokeWidth="1" strokeDasharray="3 3" />
              <text x="135" y="264" fill="#e11d48" fontSize="8" fontFamily="monospace" textAnchor="end">
                Max Stop ({(params.maxTravel * 1000).toFixed(0)}mm)
              </text>
            </svg>
          </div>

          <div className="text-[11px] text-slate-400 text-center font-mono bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            Rotor Speed = <span className="text-amber-400 font-bold">{rotorRpm.toFixed(0)} RPM</span> • Flyweight Radius = <span className="text-purple-400 font-bold">{liveState.radiusMm.toFixed(0)} mm</span> • Sleeve Stroke = <span className="text-emerald-400 font-bold">{liveState.displacementMm.toFixed(1)} mm</span> ({liveState.governorPositionPct.toFixed(1)}%)
          </div>
        </div>

        {/* Right Column: Live Readouts & Governor Status (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Main Primary Metric: Governor Position (%) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span className="font-bold uppercase tracking-wider font-mono">Governor Position</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStateBadgeStyle(liveState.governorState)}`}>
                {liveState.governorState}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-mono font-black text-amber-400">
                {liveState.governorPositionPct.toFixed(1)}%
              </span>
              <span className="text-sm font-mono text-slate-400">
                ({liveState.displacementMm.toFixed(1)} / {(params.maxTravel * 1000).toFixed(0)} mm)
              </span>
            </div>

            {/* Travel Limits Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-emerald-400 to-cyan-400 rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(2, liveState.governorPositionPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 mm (Rest)</span>
                <span>{(params.maxTravel * 500).toFixed(0)} mm (Mid)</span>
                <span>{(params.maxTravel * 1000).toFixed(0)} mm (Limit Stop)</span>
              </div>
            </div>
          </div>

          {/* Force Equilibrium Readout Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
              <span>Mechanical Force Balance</span>
              <Compass className="w-4 h-4 text-cyan-400" />
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px]">Centrifugal Force F_c</span>
                <div className="text-lg font-mono font-bold text-amber-400">
                  {liveState.centrifugalForce.toFixed(1)} N
                </div>
                <div className="text-[10px] text-slate-500">
                  m · r · ω² ({params.numFlyweights}x masses)
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-slate-400 text-[11px]">Spring Restoring F_s</span>
                <div className="text-lg font-mono font-bold text-cyan-400">
                  {liveState.springForce.toFixed(1)} N
                </div>
                <div className="text-[10px] text-slate-500">
                  {params.springPreload}N + {params.springStiffness}x
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
              <span className="text-slate-300 font-semibold">Net Dynamic Force:</span>
              <span className={`font-mono font-bold text-sm ${liveState.netForce >= 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {liveState.netForce > 0 ? `+${liveState.netForce.toFixed(1)}` : liveState.netForce.toFixed(1)} N
              </span>
            </div>
          </div>

          {/* Physical Travel Limits & Stop Verification */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Hard Mechanical Stops Verified</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Displacement $x$ is strictly bounded within $[0, {(params.maxTravel * 1000).toFixed(0)}\text{' mm'}]$ by hardened mechanical bumpers, preventing binding or physical over-travel during gale wind spikes.
            </p>
          </div>

        </div>
      </div>

      {/* Dedicated "Mechanical Intelligence" Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-slate-100">
            Dedicated Mechanical Intelligence Principle
          </h3>
        </div>

        <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 p-4 rounded-xl border border-amber-500/30 text-amber-200 text-sm font-semibold leading-relaxed">
          "The simulated governor converts rotational speed into mechanical displacement using centrifugal force."
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Activity className="w-4 h-4" />
              <span>1. Angular Velocity Sensing</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Rotor rotation directly creates flyweight radial acceleration without Hall-effect sensors, encoders, or power supplies.
            </p>
            <div className="font-mono text-amber-300 font-bold bg-slate-900 p-2 rounded text-center">
              F_c = m × r × ω²
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Compass className="w-4 h-4" />
              <span>2. Continuous Force Equilibrium</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Centrifugal force continuously competes against spring stiffness k and preload F_preload, establishing smooth equilibrium.
            </p>
            <div className="font-mono text-cyan-300 font-bold bg-slate-900 p-2 rounded text-center">
              F_s = F_preload + k × x
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Layers className="w-4 h-4" />
              <span>3. Smooth Damped Displacement</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Rotational inertia and arm geometry ensure continuous, smooth movement (dx/dt = (x_eq - x) / τ) without digital step jumping.
            </p>
            <div className="font-mono text-emerald-300 font-bold bg-slate-900 p-2 rounded text-center">
              x_eq = (m ω² r_min - F_preload) / (k - m ω² Δr/Δx)
            </div>
          </div>
        </div>
      </div>

      {/* Live Graph: RPM vs Governor Position (%) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>RPM vs Governor Position Curve (%)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Continuous physical relation showing governor stroke % as rotor speed increases from 0 to 350 RPM.
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            Live: {liveState.governorPositionPct.toFixed(1)}% at {rotorRpm.toFixed(0)} RPM ({liveState.governorState})
          </span>
        </div>

        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="rpm"
                stroke="#64748b"
                label={{ value: 'Rotor Speed (RPM)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
              />
              <YAxis
                stroke="#64748b"
                domain={[0, 100]}
                label={{ value: 'Governor Position (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
              />
              <Legend verticalAlign="top" height={32} />
              <Line
                type="monotone"
                dataKey="positionPct"
                name="Equilibrium Governor Position (%)"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={false}
              />
              <ReferenceDot
                x={Number(rotorRpm.toFixed(0))}
                y={liveState.governorPositionPct}
                r={7}
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth={2}
                name="Live Governor Operating Point"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
