import React, { useState } from 'react';
import { SimulationState } from '../../types/simulation';
import {
  Wind,
  Compass,
  RotateCcw,
  Zap,
  Activity,
  Layers,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Sliders,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SystemArchitectureFlowProps {
  state?: SimulationState;
  showDetailsToggle?: boolean;
}

export const SystemArchitectureFlow: React.FC<SystemArchitectureFlowProps> = ({
  state,
  showDetailsToggle = true,
}) => {
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number | null>(null);
  const [showTechnicalMath, setShowTechnicalMath] = useState<boolean>(false);

  // Fallback defaults if state is not provided
  const liveWind = state?.windSpeed ?? 12.0;
  const liveRpm = state?.rotorRpm ?? 180;
  const liveFc = state?.centrifugalForce ?? 450;
  const liveFs = state?.springForce ?? 380;
  const liveSleeve = state?.sleeveDisplacement ?? 0.012; // meters
  const livePitch = state?.pitchAngle ?? 8.5; // degrees
  const liveCp = state?.cpCoefficient ?? 0.38;
  const livePower = state ? state.electricalPower / 1000 : 10.0; // kW

  // 10 Mandatory System Architecture Nodes in sequence
  const architectureNodes = [
    {
      id: 'environment',
      title: '1. ENVIRONMENT',
      category: 'Boundary Condition',
      value: 'Standard Atmosphere',
      symbol: 'ρ = 1.225 kg/m³',
      description:
        'Ambient atmospheric boundary conditions supplying ambient air mass density, terrain roughness, and unconstrained kinetic wind flux.',
      color: 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
      icon: <Compass className="w-4 h-4 text-cyan-400" />,
      equation: 'P_wind = 0.5 · ρ · A · v³',
    },
    {
      id: 'wind',
      title: '2. WIND',
      category: 'Kinetic Energy Input',
      value: `${liveWind.toFixed(1)} m/s`,
      symbol: 'v (Velocity)',
      description:
        'Fluid air stream moving through the rotor swept plane (Swept Area A = 40.7 m² across R = 3.6m radius).',
      color: 'border-cyan-400/50 bg-cyan-950/40 text-cyan-200',
      badgeColor: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/30',
      icon: <Wind className="w-4 h-4 text-cyan-300" />,
      equation: 'E_k = 0.5 · m · v²',
    },
    {
      id: 'rotor',
      title: '3. ROTOR',
      category: 'Aerodynamic Capture',
      value: `${(liveWind * 0.85).toFixed(1)} kN Torque`,
      symbol: 'T_aero (Aerodynamic Torque)',
      description:
        'Three-blade aerodynamic rotor converting fluid kinetic energy into rotational torque through airfoil lift and drag dynamics.',
      color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: <RotateCcw className="w-4 h-4 text-emerald-400" />,
      equation: 'T_aero = P_aero / ω',
    },
    {
      id: 'rpm',
      title: '4. RPM',
      category: 'Kinetic Angular Velocity',
      value: `${Math.round(liveRpm)} RPM`,
      symbol: 'ω = 2π·RPM / 60',
      description:
        'Rotor shaft angular velocity resulting from aerodynamic drive torque vs generator electrical load torque.',
      color: 'border-emerald-400/50 bg-emerald-950/40 text-emerald-200',
      badgeColor: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
      icon: <Activity className="w-4 h-4 text-emerald-300" />,
      equation: 'dω/dt = (T_aero - T_load) / J',
    },
    {
      id: 'governor',
      title: '5. CENTRIFUGAL GOVERNOR',
      category: 'Mechanical Intelligence Core',
      value: `Fc: ${liveFc.toFixed(0)} N | Fs: ${liveFs.toFixed(0)} N`,
      symbol: 'Fc = m · r · ω²',
      description:
        'Dual flyweights mounted inside hub expand radially under centrifugal force Fc, opposing preloaded bias spring force Fs = F_preload + k·x.',
      color: 'border-amber-500/60 bg-amber-950/40 text-amber-300',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Layers className="w-4 h-4 text-amber-400" />,
      equation: 'Fc - Fs = m_eff · d²x/dt²',
    },
    {
      id: 'linkage',
      title: '6. MECHANICAL LINKAGE',
      category: 'Kinematic Translation',
      value: `Sleeve: ${(liveSleeve * 1000).toFixed(1)} mm`,
      symbol: 'Δx (Axial Stroke)',
      description:
        'Axial swashplate sliding sleeve and bell-crank pushrod levers convert axial translation into blade root pivot torque.',
      color: 'border-purple-500/50 bg-purple-950/30 text-purple-300',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: <Sliders className="w-4 h-4 text-purple-400" />,
      equation: 'θ = θ_fine + arcsin(x / L_link)',
    },
    {
      id: 'pitch',
      title: '7. BLADE PITCH',
      category: 'Aerodynamic Adjustment',
      value: `${livePitch.toFixed(1)}° Feather`,
      symbol: 'θ (Pitch Angle)',
      description:
        'Blades rotate on root bearing axes, twisting from 0° fine pitch toward 25° feather pitch to reduce angle of attack.',
      color: 'border-purple-400/50 bg-purple-950/40 text-purple-200',
      badgeColor: 'bg-purple-400/10 text-purple-300 border-purple-400/30',
      icon: <RefreshCw className="w-4 h-4 text-purple-300" />,
      equation: 'θ_feather = 25.0° Max',
    },
    {
      id: 'aerodynamic',
      title: '8. AERODYNAMIC RESPONSE',
      category: 'Efficiency Modulation',
      value: `Cp = ${liveCp.toFixed(3)}`,
      symbol: 'Cp(λ, θ)',
      description:
        'Power coefficient Cp drops dynamically as pitch increases, shedding aerodynamic lift and capping rotor power capture.',
      color: 'border-indigo-500/50 bg-indigo-950/30 text-indigo-300',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      equation: 'Cp(λ,θ) = c1·(c2/λi - c3·θ - c4)·e^(-c5/λi)',
    },
    {
      id: 'power',
      title: '9. POWER',
      category: 'Controlled Electrical Output',
      value: `${livePower.toFixed(2)} kW`,
      symbol: 'P_elec (Regulated Output)',
      description:
        'Electrical output capped smoothly at 10.0 kW rating despite surging wind velocities up to 30 m/s.',
      color: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <Zap className="w-4 h-4 text-emerald-400" />,
      equation: 'P_elec = P_aero · η_gen',
    },
    {
      id: 'feedback',
      title: '10. FEEDBACK TO ROTOR',
      category: 'Passive Self-Regulation Loop',
      value: 'Torque Equilibrium',
      symbol: '↺ Closed Loop',
      description:
        'Reduced aerodynamic torque counteracts overspeed acceleration, pulling rotor speed back down to equilibrium limit (180 RPM) without electronics.',
      color: 'border-amber-400/60 bg-amber-950/50 text-amber-200',
      badgeColor: 'bg-amber-400/20 text-amber-200 border-amber-400/40',
      icon: <RotateCcw className="w-4 h-4 text-amber-300" />,
      equation: 'T_aero(θ) = T_load (Equilibrium)',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              COMPLETE SYSTEM ARCHITECTURE
            </span>
            <span className="text-slate-400 text-xs font-mono">• 10-Node Control Cascade</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
            <span>WindSense Physical Control Pipeline</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Deterministic physics transfer flow driving zero-electronics mechanical self-regulation from ambient wind energy down to closed-loop rotor speed feedback.
          </p>
        </div>

        {/* Toggle Math Details */}
        {showDetailsToggle && (
          <button
            onClick={() => setShowTechnicalMath((prev) => !prev)}
            className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto hover:text-emerald-400"
          >
            <Info className="w-4 h-4 text-emerald-400" />
            <span>{showTechnicalMath ? 'Hide Math Equations' : 'Show Math Equations'}</span>
          </button>
        )}
      </div>

      {/* 10-NODE SEQUENTIAL CASCADE FLOW CHART */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {architectureNodes.map((node, index) => {
            const isSelected = selectedNodeIndex === index;
            const isGovernorCore = node.id === 'governor' || node.id === 'feedback';

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNodeIndex(isSelected ? null : index)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                  node.color
                } ${
                  isSelected
                    ? 'ring-2 ring-emerald-400 scale-[1.03] shadow-xl z-20'
                    : 'hover:border-slate-600 hover:scale-[1.01]'
                }`}
              >
                {/* Node Top Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      {node.icon}
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${node.badgeColor}`}>
                      {node.category}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    #{index + 1}
                  </span>
                </div>

                {/* Title & Live Metric Value */}
                <div>
                  <h4 className="text-xs font-black tracking-tight uppercase leading-snug">
                    {node.title.split('. ')[1]}
                  </h4>
                  <div className="mt-1.5 bg-slate-950/90 p-2 rounded-xl border border-slate-800/80 font-mono text-center">
                    <span className="text-xs font-bold text-slate-100 block">
                      {node.value}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {node.symbol}
                    </span>
                  </div>
                </div>

                {/* Description snippet */}
                <p className="text-[10px] text-slate-300 leading-tight">
                  {node.description}
                </p>

                {/* Show Math Equation if toggled */}
                {showTechnicalMath && (
                  <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-300 font-bold">
                    {node.equation}
                  </div>
                )}

                {/* Directional Down/Right Arrow Connector */}
                {index < architectureNodes.length - 1 && (
                  <div className="hidden lg:flex items-center justify-center absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-slate-950 border border-slate-800 rounded-full text-slate-400 shadow">
                    <ArrowRight className="w-3 h-3 text-emerald-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Closed Feedback Loop Return Bar */}
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-emerald-950/40 border border-amber-500/40 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <RotateCcw className="w-4 h-4 animate-spin-slow" />
            </div>
            <div>
              <span className="text-amber-300 font-bold text-xs uppercase block">
                CLOSED PASSIVE FEEDBACK LOOP: [FEEDBACK TO ROTOR → ROTOR]
              </span>
              <span className="text-slate-400 text-[11px] font-sans block">
                Reduced aerodynamic power coefficient Cp(λ, θ) limits rotor drive torque, stabilizing RPM at 180 RPM without electronic sensors or software.
              </span>
            </div>
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-emerald-400 font-bold text-[11px] shrink-0">
            ✓ 0 Sensors • 0 Microcontrollers
          </div>
        </div>
      </div>

    </div>
  );
};
