import React, { useState, useEffect, useRef } from 'react';
import {
  UncontrolledModelParams,
  UncontrolledState,
  DEFAULT_UNCONTROLLED_PARAMS,
  calculateUncontrolledPhysicsStep,
  generateUncontrolledCurves,
  calculateRotorInertia,
} from '../../physics/uncontrolledPhysics';
import { WindSpeedSimulator } from '../simulation/WindSpeedSimulator';
import { GaugeRadial } from '../ui/GaugeRadial';
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
  ReferenceDot,
} from 'recharts';
import {
  Activity,
  Zap,
  Sliders,
  RotateCcw,
  Info,
  AlertCircle,
  Gauge,
  Wind,
  Layers,
  Flame,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

interface UncontrolledPhysicsModelProps {
  initialWindSpeed?: number;
  onWindSpeedChange?: (speed: number) => void;
}

export const UncontrolledPhysicsModel: React.FC<UncontrolledPhysicsModelProps> = ({
  initialWindSpeed = 12.0,
  onWindSpeedChange,
}) => {
  const [windSpeed, setWindSpeed] = useState<number>(initialWindSpeed);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [params, setParams] = useState<UncontrolledModelParams>(DEFAULT_UNCONTROLLED_PARAMS);
  const [showParamPanel, setShowParamPanel] = useState<boolean>(true);

  // Live rotational state kept in ref to step continuously with RAF
  const omegaRef = useRef<number>(12.0); // Initial angular velocity (~115 RPM)
  const [liveState, setLiveState] = useState<UncontrolledState>(() =>
    calculateUncontrolledPhysicsStep(initialWindSpeed, 12.0, 0.05, DEFAULT_UNCONTROLLED_PARAMS)
  );

  // Sync with initialWindSpeed when parent updates it
  useEffect(() => {
    setWindSpeed(initialWindSpeed);
  }, [initialWindSpeed]);

  // Notify parent component when local windSpeed changes
  useEffect(() => {
    if (onWindSpeedChange && windSpeed !== initialWindSpeed) {
      onWindSpeedChange(windSpeed);
    }
  }, [windSpeed, onWindSpeedChange, initialWindSpeed]);

  // Handle setting wind speed locally
  const handleSetWindSpeed = (action: number | ((prev: number) => number)) => {
    setWindSpeed(action);
  };

  // Real-time Rotational Inertia Integration Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000); // Frame delta time in seconds
      lastTime = currentTime;

      if (!isPaused && dt > 0) {
        // Step the dynamic differential equation: d(omega)/dt = (T_aero - T_load) / J
        const updated = calculateUncontrolledPhysicsStep(windSpeed, omegaRef.current, dt, params);
        omegaRef.current = updated.angularVelocity;
        setLiveState(updated);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [windSpeed, isPaused, params]);

  // Generate steady-state comparison curves for charts
  const curveData = generateUncontrolledCurves(params);

  // Calculate swept area and inertia for live panel display
  const sweptArea = Math.PI * Math.pow(params.rotorRadius, 2);
  const calculatedJ = calculateRotorInertia(params);

  const resetParameters = () => {
    setParams(DEFAULT_UNCONTROLLED_PARAMS);
    setWindSpeed(12.0);
    omegaRef.current = 12.0;
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1.5 relative z-10">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 px-3 py-0.5 rounded-full text-xs font-semibold text-cyan-400">
            <Activity className="w-3.5 h-3.5" />
            <span>First Physics Model • Uncontrolled Baseline</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Fundamental Wind & Rotational Physics Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Models aerodynamic power extraction (P_wind = 0.5 × ρ × A × V³), aerodynamic torque (T_aero), and rotational acceleration (α = T_net / J) with rotor inertia lag — before any governor or pitch control is applied.
          </p>
        </div>
      </div>

      {/* Live Wind Speed Simulator Controller */}
      <WindSpeedSimulator
        windSpeed={windSpeed}
        setWindSpeed={handleSetWindSpeed}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        onReset={() => {
          setWindSpeed(12.0);
          omegaRef.current = 12.0;
        }}
        showPresets={true}
        showDisclaimer={true}
      />

      {/* Simulation Parameters & Assumptions Panel (Display-Only) */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Simulation Parameters & Assumptions
            </h3>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800 font-bold">
            Fixed Physical Assumptions
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Parameter: Rotor Radius */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Rotor Radius (r)</span>
              <span className="font-mono font-bold text-cyan-400">{params.rotorRadius.toFixed(1)} m</span>
            </div>
            <div className="text-[10px] text-slate-500 flex justify-between font-mono pt-1 border-t border-slate-900">
              <span>Area A = {sweptArea.toFixed(1)} m²</span>
              <span>Dia = {(params.rotorRadius * 2).toFixed(1)} m</span>
            </div>
          </div>

          {/* Parameter: Number of Blades */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Blade Count (N)</span>
              <span className="font-mono font-bold text-cyan-400">{params.numBlades} blades</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Rotor Inertia J ≈ {calculatedJ.toFixed(1)} kg·m²
            </div>
          </div>

          {/* Parameter: Air Density */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Air Density (ρ)</span>
              <span className="font-mono font-bold text-cyan-400">{params.airDensity.toFixed(3)} kg/m³</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Sea Level Std = 1.225 kg/m³
            </div>
          </div>

          {/* Parameter: Power Coefficient Cp */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Power Coeff. (Cp)</span>
              <span className="font-mono font-bold text-cyan-400">{params.cpCoefficient.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Betz Limit Ceiling = 0.593
            </div>
          </div>

          {/* Parameter: Generator Efficiency */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Generator Eff. (η)</span>
              <span className="font-mono font-bold text-emerald-400">
                {(params.generatorEfficiency * 100).toFixed(0)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Mechanical & Copper Losses
            </div>
          </div>

          {/* Parameter: Blade Mass */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Blade Mass (m)</span>
              <span className="font-mono font-bold text-amber-400">{params.bladeMass.toFixed(1)} kg</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Per Blade Mass
            </div>
          </div>

          {/* Parameter: Generator Load Constant */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Load Coeff. (c_gen)</span>
              <span className="font-mono font-bold text-purple-400">{params.generatorLoadConstant.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Electromagnetic Damping
            </div>
          </div>

          {/* Parameter: Friction Torque */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Friction Torque (T_fric)</span>
              <span className="font-mono font-bold text-rose-400">{params.mechanicalFriction.toFixed(1)} N·m</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
              Bearing & Seal Friction
            </div>
          </div>
        </div>
      </div>

      {/* Live Physics Dynamic State Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Live Aerodynamic & Load Torque Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider font-mono">Aerodynamic Torque</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-cyan-400">
              {liveState.aerodynamicTorque.toFixed(1)}
            </span>
            <span className="text-xs font-mono text-slate-400 uppercase">N·m</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
            <span>Load T_gen: {liveState.loadTorque.toFixed(1)} N·m</span>
            <span className={liveState.netTorque >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              Net: {liveState.netTorque > 0 ? `+${liveState.netTorque}` : liveState.netTorque} N·m
            </span>
          </div>
        </div>

        {/* Live Acceleration & Inertia Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider font-mono">Angular Acceleration</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-mono font-black ${
                liveState.angularAcceleration > 0.05
                  ? 'text-emerald-400'
                  : liveState.angularAcceleration < -0.05
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {liveState.angularAcceleration > 0 ? `+${liveState.angularAcceleration}` : liveState.angularAcceleration}
            </span>
            <span className="text-xs font-mono text-slate-400 uppercase">rad/s²</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
            <span>Rotor Inertia J: {liveState.rotorInertia.toFixed(1)} kg·m²</span>
            <span>dt: 50ms</span>
          </div>
        </div>

        {/* Live Power Output Comparison Card */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold uppercase tracking-wider font-mono">Captured Power P_turbine</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-black text-emerald-400">
              {liveState.turbinePower.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-emerald-500 uppercase">kW</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
            <span>Available Wind P_wind: {liveState.windPower.toFixed(1)} kW</span>
            <span>P_elec: {liveState.electricalPower.toFixed(1)} kW</span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: Wind Speed vs Rotor RPM Graph */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>Wind Speed vs Uncontrolled Rotor RPM</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Shows basic theoretical equilibrium curve without governor pitch regulation.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400 font-bold bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Live: {liveState.rotorRpm} RPM
            </span>
          </div>

          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curveData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="windSpeed"
                  stroke="#64748b"
                  label={{ value: 'Wind Speed V (m/s)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#64748b"
                  label={{ value: 'Rotor RPM', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                />
                <Legend verticalAlign="top" height={32} />
                <Line
                  type="monotone"
                  dataKey="equilibriumRpm"
                  name="Equilibrium Uncontrolled RPM"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                />
                <ReferenceDot
                  x={Number(windSpeed.toFixed(1))}
                  y={liveState.rotorRpm}
                  r={7}
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth={2}
                  name="Current Live Operating Point"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Wind Speed vs Available Power Graph */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Wind Speed vs Available Power (kW)</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                P_wind ($0.5 \rho A V^3$) vs P_turbine ($C_p P_{'{'}wind{'}'}$) vs Electrical Output.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Cp = {params.cpCoefficient.toFixed(2)}
            </span>
          </div>

          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curveData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="windPowerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="turbinePowerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="windSpeed"
                  stroke="#64748b"
                  label={{ value: 'Wind Speed V (m/s)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#64748b"
                  label={{ value: 'Power (kW)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
                />
                <Legend verticalAlign="top" height={32} />
                <Area
                  type="monotone"
                  dataKey="windPowerKw"
                  name="Available Kinetic Wind Power P_wind (kW)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#windPowerGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="turbinePowerKw"
                  name="Captured Mechanical Power P_turbine (kW)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#turbinePowerGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Assumptions & Educational Physics Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Info className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-slate-100">
            Model Assumptions & Fundamental Physics Equations
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
            <h4 className="font-bold text-cyan-300 uppercase tracking-wider text-[11px] font-mono">
              1. Aerodynamic Power Extraction
            </h4>
            <p className="text-slate-300">
              The kinetic energy flux passing through the swept disc area $A = \pi r^2$ is governed by:
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-cyan-400 text-center font-bold">
              P_wind = 0.5 × ρ × A × V³
            </div>
            <p className="text-slate-400 text-[11px]">
              The fraction of wind energy converted into mechanical shaft power is defined by the power coefficient $C_p$:
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-emerald-400 text-center font-bold">
              P_turbine = C_p × P_wind
            </div>
            <p className="text-slate-400 text-[11px]">
              By Betz's law, the theoretical upper limit for any unshielded wind turbine is $C_p \le 0.593$.
            </p>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-2">
            <h4 className="font-bold text-purple-300 uppercase tracking-wider text-[11px] font-mono">
              2. Rotational Dynamics & Inertia Lag
            </h4>
            <p className="text-slate-300">
              Rotor speed does not instantly jump with wind changes. Rotational acceleration $\alpha$ is governed by Newton's second law for rotation:
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-purple-300 text-center font-bold">
              α = (T_aero - T_load) / J
            </div>
            <p className="text-slate-400 text-[11px]">
              where J is the total rotor inertia (J = N × ⅓ × m_blade × r² + J_hub) and T_aero = P_turbine / ω.
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 font-mono text-amber-300 text-center font-bold">
              ω_next = max(0, ω + α × Δt)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
