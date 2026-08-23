import React from 'react';
import { generateComparisonCurves, DEFAULT_TURBINE_PARAMS } from '../../physics/turbinePhysics';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Scale, ShieldCheck, AlertTriangle, Zap, Check, X, Minus, Cpu, HelpCircle } from 'lucide-react';

export const ComparisonPage: React.FC = () => {
  const curveData = generateComparisonCurves(DEFAULT_TURBINE_PARAMS);

  const comparisonMatrix = [
    {
      feature: 'Control Mechanism',
      windSense: 'Passive Centrifugal & Spring Governor',
      electronic: 'Active Servos, Microcontroller & PLC',
      fixedPitch: 'None (Fixed Blade Angle)',
    },
    {
      feature: 'Electronics & Sensors',
      windSense: '0% (Zero Sensors, Zero Microcontrollers)',
      electronic: '100% (Anemometer, Encoder, PLC, Driver)',
      fixedPitch: '0%',
    },
    {
      feature: 'Control Power Consumption',
      windSense: '0 Watts (Pure Mechanical Energy)',
      electronic: '200W - 1500W Continuous Motor Power',
      fixedPitch: '0 Watts',
    },
    {
      feature: 'High Wind Storm Failsafe',
      windSense: 'Automatic Mechanical Feathering (F_c > F_s)',
      electronic: 'Vulnerable to Power Loss / Sensor Failure',
      fixedPitch: 'Poor (Aerodynamic Stall or Over-speed Risk)',
    },
    {
      feature: 'Lightning & Surge Resilience',
      windSense: 'Complete Immunity (Solid Metallic Mechanics)',
      electronic: 'High Failure Rate (Burnt Boards & Sensors)',
      fixedPitch: 'Complete Immunity',
    },
    {
      feature: 'Maintenance & Lifespan',
      windSense: 'Low Maintenance (Standard Lubrication)',
      electronic: 'Frequent Sensor Calibration & Motor Repairs',
      fixedPitch: 'Low Maintenance (Degraded Energy Yield)',
    },
    {
      feature: 'Remote Off-Grid Suitability',
      windSense: 'Ideal for Harsh Rural / Marine Environments',
      electronic: 'Requires Reliable Backup Battery & Servicing',
      fixedPitch: 'Moderate (Low Power Output)',
    },
  ];

  return (
    <div id="comparison-view" className="space-y-6">
      
      {/* Title Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold text-slate-100">
              Technology System Comparison
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Evaluating WindSense Passive Mechanical Regulation against Active Electronic Pitch and Fixed Pitch Wind Turbines.
          </p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 px-3.5 py-2 rounded-xl text-xs font-semibold text-purple-300 flex items-center gap-2">
          <span>Benchmarked Across 0 - 30 m/s Winds</span>
        </div>
      </div>

      {/* Comparative Power Output Graph */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200">
              Power Generation Profiles Across Wind Speeds (kW)
            </h3>
            <p className="text-xs text-slate-400">
              Comparing power output curves of all three wind turbine control architectures.
            </p>
          </div>
        </div>

        <div className="w-full h-[360px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curveData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="windSpeed" stroke="#64748b" label={{ value: 'Wind Speed (m/s)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }} />
              <YAxis stroke="#64748b" label={{ value: 'Power Output (kW)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }} />
              <Legend verticalAlign="top" height={36} />
              
              <Line
                type="monotone"
                dataKey="windSensePower"
                name="WindSense Passive Mechanical (10 kW)"
                stroke="#10b981"
                strokeWidth={3.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="electronicPower"
                name="Active Electronic Pitch Control"
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="fixedPitchPower"
                name="Fixed Pitch Uncontrolled Turbine"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
              <Check className="w-4 h-4" /> WindSense Mechanical
            </span>
            <p className="text-slate-400 text-[11px]">
              Smoothly self-regulates at 10kW above 12m/s and enters passive mechanical feathering during high storm winds without dropping offline.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30">
            <span className="font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
              <Cpu className="w-4 h-4" /> Active Electronic
            </span>
            <p className="text-slate-400 text-[11px]">
              Provides high efficiency, but requires continuous grid/battery power and cuts off abruptly if sensors or actuators fail during storms.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-red-500/30">
            <span className="font-bold text-red-400 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4" /> Fixed Pitch
            </span>
            <p className="text-slate-400 text-[11px]">
              Lacks pitch adjustability. Suffers aerodynamic stall in high winds, leading to drastic power drops and extreme mechanical vibration.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Comparison Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-200">Architecture Feature Comparison Matrix</h3>
          <span className="text-xs text-slate-400 font-mono">3-Way Architecture Matrix</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">System Feature</th>
                <th className="py-3 px-3 text-emerald-400 bg-emerald-950/20">WindSense (Passive Mechanical)</th>
                <th className="py-3 px-3 text-cyan-400">Active Electronic Pitch</th>
                <th className="py-3 px-3 text-slate-400">Fixed Pitch Uncontrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {comparisonMatrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-200">{row.feature}</td>
                  <td className="py-3 px-3 font-medium text-emerald-300 bg-emerald-950/10 border-x border-slate-800/80">
                    {row.windSense}
                  </td>
                  <td className="py-3 px-3 text-slate-300">{row.electronic}</td>
                  <td className="py-3 px-3 text-slate-400">{row.fixedPitch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
