import React, { useState } from 'react';
import { SimulationState, TurbineParameters } from '../../types/simulation';
import { DEFAULT_TURBINE_PARAMS, evaluateWindSenseState } from '../../physics/turbinePhysics';
import { SystemArchitectureFlow } from '../visualization/SystemArchitectureFlow';
import { TabId } from '../common/Header';
import {
  Award,
  ShieldAlert,
  BookOpen,
  Calculator,
  Cog,
  CheckCircle2,
  Layers,
  Sparkles,
  Zap,
  Activity,
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sliders,
  X,
  FileText,
  Presentation,
  Check,
  Table,
  Wrench,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

interface AboutPageProps {
  state?: SimulationState;
  windSpeed?: number;
  params?: TurbineParameters;
  setActiveTab?: (tab: TabId) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({
  state: externalState,
  windSpeed = 12.0,
  params = DEFAULT_TURBINE_PARAMS,
  setActiveTab,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'architecture' | 'tech_docs'>('architecture');

  // Active live simulation state
  const liveState = externalState ?? evaluateWindSenseState(windSpeed, params);

  // 10 Mandatory Parameter Definitions
  const parameterDefinitions = [
    { symbol: 'm', name: 'Flyweight Mass', unit: 'kg', defaultVal: `${params.governorMass} kg`, desc: 'Symmetrical brass/steel weights mounted in hub rotor.' },
    { symbol: 'k', name: 'Spring Stiffness', unit: 'N/m', defaultVal: `${params.springConstant} N/m`, desc: 'Helical compression spring restoring rate.' },
    { symbol: 'Fs_preload', name: 'Spring Preload Force', unit: 'N', defaultVal: `${params.springPreload} N`, desc: 'Initial spring bias holding blades at fine pitch.' },
    { symbol: 'r0', name: 'Initial Flyweight Radius', unit: 'm', defaultVal: `${params.governorRadiusMin} m`, desc: 'Radial distance of flyweights at rest.' },
    { symbol: 'R', name: 'Rotor Radius', unit: 'm', defaultVal: `${params.rotorRadius} m`, desc: 'Total aerodynamic blade radius from hub center.' },
    { symbol: 'A', name: 'Swept Area', unit: 'm²', defaultVal: `${(Math.PI * Math.pow(params.rotorRadius, 2)).toFixed(1)} m²`, desc: 'Total circular area swept by rotating blades.' },
    { symbol: 'ρ', name: 'Air Mass Density', unit: 'kg/m³', defaultVal: '1.225 kg/m³', desc: 'Standard sea-level air density.' },
    { symbol: 'θ_fine', name: 'Fine Pitch Angle', unit: 'deg (°)', defaultVal: `${params.finePitchAngle}°`, desc: 'Optimal blade angle for light-wind lift capture.' },
    { symbol: 'θ_feather', name: 'Feather Pitch Angle', unit: 'deg (°)', defaultVal: `${params.featherPitchAngle}°`, desc: 'Maximum blade angle for high-wind shedding.' },
    { symbol: 'x_max', name: 'Max Sleeve Stroke', unit: 'm', defaultVal: `${(params.maxSleeveTravel * 1000).toFixed(0)} mm`, desc: 'Maximum axial displacement of governor sleeve.' },
  ];

  return (
    <div id="about-and-tech-docs-view" className="space-y-6">
      
      {/* 1. PAGE TITLE & SUB-NAV TABS */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-4">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            WindSense: Smart Renewable Energy Without Electronics
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
            Replacing failure-prone electronic sensors and electric pitch motors with classical mechanical governor force equilibrium for 100% passive wind speed regulation.
          </p>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setActiveSubTab('architecture')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'architecture'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/40 font-extrabold'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. System Architecture (10-Node Flow)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tech_docs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'tech_docs'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/40 font-extrabold'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Technical Documentation & Equations</span>
          </button>
        </div>
      </div>

      {/* 2. SUB-TAB CONTENT RENDERING */}

      {/* SUB-TAB 1: SYSTEM ARCHITECTURE FLOW */}
      {activeSubTab === 'architecture' && (
        <div className="space-y-6">
          <SystemArchitectureFlow state={liveState} />
        </div>
      )}

      {/* SUB-TAB 2: TECHNICAL DOCUMENTATION & EQUATIONS */}
      {activeSubTab === 'tech_docs' && (
        <div className="space-y-6">
          
          {/* Governing Math Equations */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span>Governing Equations & Mechanics</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-sans">Available Wind Kinetic Power</span>
                <p className="text-emerald-400 font-bold text-sm">P_wind = 0.5 · ρ · A · v³</p>
                <p className="text-slate-400 font-sans text-[11px]">
                  ρ = 1.225 kg/m³, A = π·R² swept area (40.7 m²), v = wind velocity (m/s).
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-sans">Centrifugal Radial Force</span>
                <p className="text-amber-400 font-bold text-sm">F_c = m · (2π·RPM/60)² · r</p>
                <p className="text-slate-400 font-sans text-[11px]">
                  Flyweight mass m = 1.25 kg, r = current radial arm distance.
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-sans">Helical Spring Restoring Force</span>
                <p className="text-cyan-400 font-bold text-sm">F_s = F_preload + k · x</p>
                <p className="text-slate-400 font-sans text-[11px]">
                  F_preload = 380 N, spring stiffness k = 4800 N/m, x = axial sleeve stroke (m).
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-sans">Blade Pitch Angle Kinematics</span>
                <p className="text-purple-400 font-bold text-sm">θ(x) = θ_fine + arcsin(x / L_link)</p>
                <p className="text-slate-400 font-sans text-[11px]">
                  Pinion linkage arm transforms linear axial stroke x into blade pitch twist.
                </p>
              </div>

            </div>
          </div>

          {/* 10 Parameter Definitions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>Turbine & Governor Parameter Definitions</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Symbol</th>
                    <th className="py-2.5 px-3">Parameter Name</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Default Value</th>
                    <th className="py-2.5 px-3">Physical Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono">
                  {parameterDefinitions.map((p) => (
                    <tr key={p.symbol} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-bold text-amber-400">{p.symbol}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200 font-sans">{p.name}</td>
                      <td className="py-2.5 px-3 text-cyan-300">{p.unit}</td>
                      <td className="py-2.5 px-3 text-emerald-400">{p.defaultVal}</td>
                      <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mechanical Mechanism Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Mechanics Breakdown */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                <Cog className="w-4 h-4 text-amber-400" />
                <span>Mechanical Mechanism Explanation</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-amber-300">1. Symmetrical Flyweights</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Brass/steel weights mounted in the rotating hub directly sense rotor RPM via inertial centrifugal radial acceleration.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-cyan-300">2. Central Helical Preload Spring</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Spring preload (Fs = 380 N) keeps blades locked at 0° fine pitch below rated wind speed (10 m/s), preventing unnecessary pitch movement in light winds.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-purple-300">3. Sliding Sleeve & Bell-Crank Linkage</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Axial swashplate sleeve translates linear motion to mechanical pushrods connected to blade root bearings, rotating blades smoothly toward feather.
                  </p>
                </div>
              </div>
            </div>

            {/* Assumptions & Limitations */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Assumptions, Limitations & Prototype Roadmap</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-cyan-300">Simulation Assumptions</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Constant sea-level air density (ρ = 1.225 kg/m³), rigid linkage kinematics, and quasi-steady aerodynamic Cp(λ, θ) lookup tables.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-amber-300">Simulation Limitations</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Simplified 2D planar kinematics without high-frequency turbulent wind gusts or aeroelastic blade flutter modeling.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-emerald-300">Future Physical Prototype Requirements</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Dynamic rotational balancing, 1:5 scale wind tunnel testing, FEA stress/fatigue analysis of linkage joints, and environmental icing/salt spray testing.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
