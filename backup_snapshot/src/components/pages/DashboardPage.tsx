import React, { useState } from 'react';
import { SimulationState, WindPreset, TurbineParameters } from '../../types/simulation';
import { TurbineVisualizer } from '../visualization/TurbineVisualizer';
import { WindSpeedSimulator } from '../simulation/WindSpeedSimulator';
import { TabId } from '../common/Header';
import { GaugeRadial } from '../ui/GaugeRadial';
import { StatusBadge } from '../ui/StatusBadge';
import { MetricCard } from '../ui/MetricCard';
import { 
  Wind, Zap, Gauge, Compass, ShieldCheck, Activity, 
  ArrowRight, Cog, Scale, Sparkles, ChevronRight
} from 'lucide-react';

interface DashboardPageProps {
  state: SimulationState;
  setWindSpeed: (speed: number | ((prev: number) => number)) => void;
  windDirection?: number;
  setWindDirection?: (dir: number | ((prev: number) => number)) => void;
  params: TurbineParameters;
  setActiveTab: (tab: TabId) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  state,
  setWindSpeed,
  windDirection,
  setWindDirection,
  params,
  setActiveTab,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const presets: WindPreset[] = [
    { id: 'breeze', name: 'Gentle Breeze', speed: 6.0, description: 'Cut-in & low torque regime', iconName: '🍃' },
    { id: 'rated', name: 'Rated Wind', speed: 12.0, description: 'Maximum optimal power generation (10 kW)', iconName: '💨' },
    { id: 'high', name: 'High Wind', speed: 18.0, description: 'Centrifugal governor active feathering', iconName: '🌪️' },
    { id: 'storm', name: 'Storm Cut-out', speed: 26.0, description: 'Passive mechanical lock & stall protection', iconName: '⚡' },
  ];

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* Hero Executive Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge state={state.operationalState} />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
              Mechanically Intelligent Wind Turbine
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Demonstrating passive self-adjusting wind turbine regulation driven entirely by classical centrifugal forces and helical spring balance — operating seamlessly without electronic sensors, microcontrollers, or motorized actuators.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('simulation')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <span>Launch Live Simulation</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-slate-700 transition-all cursor-pointer"
            >
              <span>Physics Formulas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analog/Digital Gauges Telemetry Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GaugeRadial
          label="Rotor RPM"
          sublabel={`λ = ${state.tipSpeedRatio.toFixed(2)}`}
          value={state.rotorRpm}
          min={0}
          max={150}
          unit="RPM"
          color="cyan"
        />

        <GaugeRadial
          label="Power Output"
          sublabel={`Cap: ${(params.ratedPower / 1000).toFixed(0)} kW`}
          value={state.electricalPower / 1000}
          min={0}
          max={12}
          unit="kW"
          color="emerald"
        />

        <GaugeRadial
          label="Blade Pitch Angle"
          sublabel={`Stroke: ${(state.sleeveDisplacement * 1000).toFixed(1)} mm`}
          value={state.pitchAngle}
          min={params.minPitch}
          max={params.maxPitch}
          unit="DEGREES"
          color="amber"
        />

        <GaugeRadial
          label="Centrifugal Force"
          sublabel={`Fs: ${state.springForce.toFixed(0)} N`}
          value={state.centrifugalForce}
          min={0}
          max={2000}
          unit="NEWTONS"
          color="purple"
        />
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="kpi-wind-speed"
          title="Wind Speed"
          value={state.windSpeed.toFixed(1)}
          unit="m/s"
          icon={Wind}
          statusColor="cyan"
          subValue={`Cut-in: ${params.cutInWindSpeed}m/s • Rated: ${params.ratedWindSpeed}m/s`}
        />

        <MetricCard
          id="kpi-electrical-power"
          title="Electrical Power"
          value={(state.electricalPower / 1000).toFixed(2)}
          unit="kW"
          icon={Zap}
          statusColor="emerald"
          subValue={`Aerodynamic Cp: ${(state.powerCoefficient * 100).toFixed(1)}%`}
        />

        <MetricCard
          id="kpi-mechanical-torque"
          title="Aero Torque"
          value={state.aerodynamicTorque.toFixed(1)}
          unit="N·m"
          icon={Gauge}
          statusColor="amber"
          subValue={`Governor Fc: ${state.centrifugalForce.toFixed(0)} N`}
        />

        <MetricCard
          id="kpi-blade-pitch"
          title="Blade Pitch"
          value={`${state.pitchAngle.toFixed(1)}°`}
          unit="θ"
          icon={Compass}
          statusColor="purple"
          subValue={`Dir: ${state.windDirection.toFixed(0)}° • Net Fc: ${state.netGovernorForce.toFixed(1)} N`}
        />
      </div>

      {/* Interactive Wind Speed Quick Controls & Live Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Wind Speed Simulator Controller (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <WindSpeedSimulator
            windSpeed={state.windSpeed}
            setWindSpeed={setWindSpeed}
            windDirection={windDirection}
            setWindDirection={setWindDirection}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            onReset={() => {
              setWindSpeed(12.0);
              if (setWindDirection) setWindDirection(0);
            }}
            showPresets={true}
            showDisclaimer={true}
          />

          {/* Operational Failsafe Status Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Mechanical Protection State</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Fc = Fs</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
              {state.operationalMessage}
            </p>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Centrifugal Force (Fc):</span>
                <span className="font-mono font-bold text-slate-200">{state.centrifugalForce.toFixed(1)} N</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Spring Restoring Force (Fs):</span>
                <span className="font-mono font-bold text-slate-200">{state.springForce.toFixed(1)} N</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Net Force Balance:</span>
                <span className="font-mono font-bold text-amber-400">{state.netGovernorForce.toFixed(1)} N</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Turbine Visualizer (7 cols) */}
        <div className="lg:col-span-7">
          <TurbineVisualizer
            state={state}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onReset={() => setWindSpeed(12.0)}
          />
        </div>
      </div>

      {/* Feature Exploration Modules */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Core System Architecture Modules</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <button
            onClick={() => setActiveTab('simulation')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 text-left transition-all group space-y-2 cursor-pointer shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20">
              <Wind className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm flex items-center justify-between">
              <span>Interactive Simulation</span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-xs text-slate-400 leading-snug">
              Adjust mechanical spring rate, governor weights, and wind gusts with live feedback.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 text-left transition-all group space-y-2 cursor-pointer shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm flex items-center justify-between">
              <span>Performance Graphs</span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-xs text-slate-400 leading-snug">
              Examine power curves, Cp efficiency, and RPM pitch plots across 0 to 30 m/s winds.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('mechanical')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 text-left transition-all group space-y-2 cursor-pointer shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20">
              <Cog className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm flex items-center justify-between">
              <span>Mechanical System</span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-xs text-slate-400 leading-snug">
              Interactive vector schematics detailing flyball weights, helical springs, and swashplate sleeves.
            </p>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-4 text-left transition-all group space-y-2 cursor-pointer shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-slate-200 text-sm flex items-center justify-between">
              <span>System Comparison</span>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </h4>
            <p className="text-xs text-slate-400 leading-snug">
              Compare WindSense mechanical self-regulation against traditional active electronic pitch controls.
            </p>
          </button>

        </div>
      </div>
    </div>
  );
};

