import React from 'react';
import { ShieldCheck, Code2, Wind } from 'lucide-react';
import { TabId } from './Header';

interface FooterProps {
  activeTab?: TabId;
}

export const Footer: React.FC<FooterProps> = ({ activeTab }) => {
  const isLanding = activeTab === 'landing';

  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Info Grid - Removed on starting/landing page */}
        {!isLanding && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs">
            <div>
              <div className="flex items-center gap-2 text-slate-200 font-semibold mb-2">
                <Wind className="w-4 h-4 text-emerald-400" />
                <span>WindSense — Concept Summary</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                An innovative renewable energy concept engineered to self-adjust blade pitch and regulate rotor speeds using passive mechanical principles (centrifugal governor, spring balance, swashplate linkage) without electronic components.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-slate-200 font-semibold mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero-Electronics Physical Rules</span>
              </div>
              <ul className="text-slate-400 space-y-1">
                <li>• No electronic sensors or microcontrollers</li>
                <li>• No digital feedback loops or electric actuators</li>
                <li>• No batteries for pitch control</li>
                <li>• 100% mechanical physics-driven self-regulation</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-slate-200 font-semibold mb-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Digital Simulation Foundation</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                This web application acts as a digital twin simulation and interactive engineering workbench. The software serves purely to visualize, compute, and demonstrate the mechanical physics of the physical concept.
              </p>
            </div>
          </div>
        )}

        <div className={`${!isLanding ? 'border-t border-slate-800/80 pt-4' : ''} flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2`}>
          <p>© {new Date().getFullYear()} WindSense Project</p>
          <p className="font-mono text-[11px] text-slate-400">
            Mechanically Intelligent Energy
          </p>
        </div>
      </div>
    </footer>
  );
};
