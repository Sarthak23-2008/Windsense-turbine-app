import React from 'react';
import { Wind, Cog, Zap } from 'lucide-react';
import { SimulationState, TurbineParameters } from '../../types/simulation';
import { TabId } from '../common/Header';

interface LandingPageProps {
  state?: SimulationState;
  windSpeed?: number;
  setWindSpeed?: (speed: number | ((prev: number) => number)) => void;
  params?: TurbineParameters;
  onLaunchDashboard: () => void;
  setActiveTab?: (tab: TabId) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchDashboard }) => {
  return (
    <div id="landing-page-view" className="relative min-h-[82vh] sm:min-h-[85vh] flex flex-col justify-between overflow-hidden bg-[#030712] rounded-3xl border border-slate-800/80 p-6 sm:p-10 lg:p-12 shadow-2xl my-2">
      
      {/* Component Isolated CSS Animations */}
      <style>{`
        @keyframes turbineBladeSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gearSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gearSpinCounter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes windFlowDash1 {
          0% { stroke-dashoffset: 1000; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes windFlowDash2 {
          0% { stroke-dashoffset: 1200; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-turbine-spin {
          animation: turbineBladeSpin 7s linear infinite;
          transform-origin: 150px 150px;
        }
        .animate-gear-cw {
          animation: gearSpinClockwise 25s linear infinite;
          transform-origin: center;
        }
        .animate-gear-ccw {
          animation: gearSpinCounter 20s linear infinite;
          transform-origin: center;
        }
        .animate-wind-path-1 {
          stroke-dasharray: 80 120;
          animation: windFlowDash1 12s linear infinite;
        }
        .animate-wind-path-2 {
          stroke-dasharray: 100 150;
          animation: windFlowDash2 16s linear infinite;
        }
        .animate-wind-path-3 {
          stroke-dasharray: 60 90;
          animation: windFlowDash1 9s linear infinite;
        }
      `}</style>

      {/* 1. BACKGROUND GLOW & WIND-FLOW ANIMATED LINES */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Soft Ambient Radial Light Spots */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />

        {/* Animated Horizontal Wind Flow SVG Curves */}
        <svg className="w-full h-full min-w-[800px]" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="windFlowGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
              <stop offset="30%" stopColor="#06b6d4" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="windFlowGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
              <stop offset="50%" stopColor="#10b981" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Flowing curved path lines passing horizontally and bending around turbine zone */}
          <path
            d="M -100,120 C 150,80 300,180 600,100 C 900,20 1200,140 1600,90"
            fill="none"
            stroke="url(#windFlowGradient1)"
            strokeWidth="2.5"
            className="animate-wind-path-1"
          />
          <path
            d="M -100,260 C 200,220 380,340 700,240 C 1000,140 1300,300 1700,220"
            fill="none"
            stroke="url(#windFlowGradient2)"
            strokeWidth="3"
            className="animate-wind-path-2"
          />
          <path
            d="M -100,420 C 180,480 350,380 650,440 C 950,500 1250,380 1600,420"
            fill="none"
            stroke="url(#windFlowGradient1)"
            strokeWidth="2"
            className="animate-wind-path-3"
          />
          <path
            d="M -100,550 C 250,500 420,600 750,530 C 1050,460 1350,580 1700,520"
            fill="none"
            stroke="url(#windFlowGradient2)"
            strokeWidth="2.5"
            className="animate-wind-path-1"
          />
        </svg>
      </div>

      {/* 2. TOP-LEFT WINDSENSE BRANDING */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Wind className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Wind<span className="text-emerald-400">Sense</span>
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 uppercase tracking-wider shadow-sm">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            ZERO ELECTRONICS
          </span>

          <span className="hidden lg:inline-block text-slate-600 font-light">|</span>

          <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">
            Mechanically Intelligent Wind Energy
          </p>
        </div>
      </div>

      {/* 3. HERO CONTENT & LEFT WIND TURBINE INTEGRATION */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-8">
        
        {/* LEFT WIND TURBINE VISUAL ANIMATION */}
        <div className="lg:col-span-4 flex justify-center lg:justify-start items-center relative min-h-[260px] sm:min-h-[320px]">
          {/* Subtle Glow behind turbine */}
          <div className="absolute w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <svg className="w-64 h-80 sm:w-80 sm:h-96 relative z-10" viewBox="0 0 300 380" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="towerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="60%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Turbine Tower */}
            <polygon points="144,150 156,150 162,370 138,370" fill="url(#towerGrad)" stroke="#334155" strokeWidth="1" />
            
            {/* Ground Stand Base */}
            <rect x="125" y="365" width="50" height="8" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />

            {/* Nacelle Housing */}
            <rect x="130" y="136" width="40" height="26" rx="6" fill="#334155" stroke="#10b981" strokeWidth="1.5" />
            <circle cx="170" cy="149" r="6" fill="#10b981" />

            {/* Centrifugal Mechanical Gear Accent behind rotor hub */}
            <g transform="translate(150, 150)" className="animate-gear-ccw opacity-40">
              <circle cx="0" cy="0" r="28" fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="6 4" />
              <circle cx="0" cy="0" r="18" fill="none" stroke="#10b981" strokeWidth="1" />
            </g>

            {/* ROTATING ROTOR & 3 BLADES */}
            <g className="animate-turbine-spin" filter="url(#emeraldGlow)">
              {/* Hub Center */}
              <circle cx="150" cy="150" r="12" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
              
              {/* Blade 1 (Top) */}
              <g transform="translate(150, 150) rotate(0)">
                <path d="M -4,-12 C -6,-50 -10,-90 0,-125 C 10,-90 6,-50 4,-12 Z" fill="url(#bladeGrad)" stroke="#34d399" strokeWidth="0.5" />
              </g>

              {/* Blade 2 (Bottom Right 120deg) */}
              <g transform="translate(150, 150) rotate(120)">
                <path d="M -4,-12 C -6,-50 -10,-90 0,-125 C 10,-90 6,-50 4,-12 Z" fill="url(#bladeGrad)" stroke="#34d399" strokeWidth="0.5" />
              </g>

              {/* Blade 3 (Bottom Left 240deg) */}
              <g transform="translate(150, 150) rotate(240)">
                <path d="M -4,-12 C -6,-50 -10,-90 0,-125 C 10,-90 6,-50 4,-12 Z" fill="url(#bladeGrad)" stroke="#34d399" strokeWidth="0.5" />
              </g>

              {/* Nose Cap */}
              <circle cx="150" cy="150" r="6" fill="#34d399" />
            </g>
          </svg>
        </div>

        {/* CENTERED MAIN HEADING, DESCRIPTION & ONE BUTTON */}
        <div className="lg:col-span-8 flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          
          {/* Main Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-100 tracking-tight leading-[1.12]">
            <span className="bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-200 bg-clip-text text-transparent drop-shadow-sm">
              Mechanically Intelligent Wind Turbine
            </span>
          </h1>

          {/* Description */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl font-normal">
            Demonstrating passive self-adjusting wind turbine regulation driven entirely by classical centrifugal forces and revealing a complex, elegant mechanic sensors, microcontrollers, or motorized actuators.
          </p>

          {/* EXACTLY ONE BUTTON: Launch Live Dashboard → */}
          <div className="pt-6 relative inline-flex items-center justify-center">
            {/* Mechanical Gear Elements framing the button */}
            <div className="absolute -left-10 -top-6 text-emerald-500/25 animate-gear-cw pointer-events-none">
              <Cog className="w-16 h-16" />
            </div>
            <div className="absolute -right-10 -bottom-6 text-cyan-500/25 animate-gear-ccw pointer-events-none">
              <Cog className="w-20 h-20" />
            </div>
            
            {/* Glowing Backdrop Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 sm:w-80 h-16 sm:h-20 bg-emerald-500/30 rounded-full blur-2xl pointer-events-none animate-pulse" />

            {/* The One & Only Action Button */}
            <button
              id="cta-launch-dashboard"
              onClick={onLaunchDashboard}
              className="relative z-10 px-8 py-4 sm:px-10 sm:py-5 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base sm:text-xl shadow-[0_0_35px_rgba(16,185,129,0.5)] hover:shadow-[0_0_55px_rgba(16,185,129,0.8)] hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer group border border-emerald-200/60"
            >
              <Cog className="w-6 h-6 text-slate-950 group-hover:rotate-180 transition-transform duration-700 shrink-0" />
              <span className="tracking-wide">Launch Live Dashboard →</span>
            </button>
          </div>

        </div>

      </div>

      {/* Bottom Subtle Footer Spacing Bar */}
      <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-4 text-[11px] font-mono text-slate-500">
        <span>WindSense Governor Simulation Engine</span>
        <span>100% Passive Mechanical Control</span>
      </div>

    </div>
  );
};

