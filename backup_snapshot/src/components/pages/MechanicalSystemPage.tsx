import React from 'react';
import { SimulationState } from '../../types/simulation';
import { CentrifugalGovernorModel } from '../physics/CentrifugalGovernorModel';
import { GovernorMechanicalDiagram } from '../visualization/GovernorMechanicalDiagram';
import { Cog, ShieldCheck, Compass, CheckCircle2, Wrench } from 'lucide-react';

interface MechanicalSystemPageProps {
  state: SimulationState;
}

export const MechanicalSystemPage: React.FC<MechanicalSystemPageProps> = ({ state }) => {
  const bomItems = [
    {
      item: 'Centrifugal Flyweight Subassembly',
      qty: '2x or 3x Symmetrical Weights',
      spec: 'Calibrated brass / steel masses (1.25 kg each) pivoted on hardened stainless pins.',
      role: 'Senses rotor angular velocity (RPM) directly through inertia without hall-effect sensors.',
    },
    {
      item: 'Calibrated Helical Compression Spring',
      qty: '1x Central Hub Spring',
      spec: 'High-fatigue spring steel (k = 4.8 kN/m, 380 N pre-compression load).',
      role: 'Establishes force equilibrium and resists weight expansion until rated RPM is reached.',
    },
    {
      item: 'Axial Swashplate & Sliding Sleeve',
      qty: '1x Machined Sleeve',
      spec: 'Bronze-bushed linear sliding collar with 60mm total stroke travel.',
      role: 'Translates radial weight displacement into clean axial displacement along drive shaft.',
    },
    {
      item: 'Blade Pitch Bell-Crank Linkages',
      qty: '3x Pushrod Levers',
      spec: 'Adjustable ball-joint linkages connected to blade root bearings.',
      role: 'Converts linear axial sleeve travel into angular blade twist (θ = 2° to 82°).',
    },
    {
      item: 'Mechanical End-Stops & Feather Lock',
      qty: '2x Hardened Stops',
      spec: 'Polyurethane padded mechanical bumpers at 2° (fine) and 82° (feather).',
      role: 'Prevents over-rotation and provides physical mechanical locking in gale storms.',
    },
  ];

  return (
    <div id="mechanical-view" className="space-y-6">
      
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cog className="w-5 h-5 text-amber-400 animate-spin-slow" />
            <h2 className="text-xl font-bold text-slate-100">
              Mechanical System & Centrifugal Governor Kinematics
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Comprehensive mechanical design breakdown and interactive physics model of the passive centrifugal flyweight governor.
          </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Electronics • 100% Mechanical Physics</span>
        </div>
      </div>

      {/* Standalone Centrifugal Governor Physics Model */}
      <CentrifugalGovernorModel initialRpm={state.rotorRpm} />

      {/* Interactive Governor Vector Schematic */}
      <GovernorMechanicalDiagram state={state} />

      {/* Kinematics & Mathematical Equations Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Force Balance Equations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span>Force Balance Equations</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between font-mono font-bold text-amber-400">
                <span>1. Centrifugal Radial Force</span>
                <span>Fc = m · r · ω²</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                As wind speed accelerates the rotor, angular velocity ω (rad/s) creates radial outward force proportional to the square of RPM and current radial distance r.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between font-mono font-bold text-cyan-400">
                <span>2. Spring Restoring Force</span>
                <span>Fs = F_preload + k · x</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The helical compression spring exerts a linear restoring force resisting sleeve displacement x. Below pre-load (380N), the sleeve remains fully retracted at x=0.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between font-mono font-bold text-emerald-400">
                <span>3. Sleeve Displacement Equilibrium</span>
                <span>x = (m · r_min · ω² - F_preload) / (k - m · ω² · Δr/Δx)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Continuous physical relationship deriving mechanical displacement x from angular velocity ω without step jumps or software if/else triggers.
              </p>
            </div>
          </div>
        </div>

        {/* Structural Advantages over Electronics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Why Mechanical Outperforms Electronics Off-Grid</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">Zero Control Power Draw:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Electronic pitch systems require battery banks or grid power to drive pitch motors. WindSense consumes 0W for control logic.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">Immune to Severe Weather & EMPs:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  No anemometer sensors or microprocessors to burn out from lightning strikes, salt corrosion, freezing temperatures, or power surges.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-200">Instantaneous Physical Response:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  No sensor latency, polling delays, or software crash risks. Physics reacts immediately as rotor angular momentum changes.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Component Bill of Materials Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">Mechanical System Bill of Materials (BOM)</h3>
          </div>
          <span className="text-xs text-slate-400">Physical Concept Specification</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Subassembly</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Physical Specification</th>
                <th className="py-2.5 px-3">Functional Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {bomItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-100">{item.item}</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">{item.qty}</td>
                  <td className="py-2.5 px-3 text-slate-300">{item.spec}</td>
                  <td className="py-2.5 px-3 text-slate-400">{item.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
