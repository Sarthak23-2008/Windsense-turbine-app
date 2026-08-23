import React from 'react';
import { Wind, Gauge, Activity, Cog, Scale, Info, Zap, Sun, Moon } from 'lucide-react';

export type TabId = 'landing' | 'dashboard' | 'demo' | 'simulation' | 'performance' | 'mechanical' | 'comparison' | 'about';

interface HeaderProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, theme = 'dark', onToggleTheme }) => {
  const navItems: { id: TabId; label: string; icon: React.ReactNode; isSpecial?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Gauge className="w-4 h-4" /> },
    { id: 'simulation', label: 'Simulation', icon: <Wind className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
    { id: 'mechanical', label: 'Mechanical System', icon: <Cog className="w-4 h-4" /> },
    { id: 'comparison', label: 'Comparison', icon: <Scale className="w-4 h-4" /> },
    { id: 'about', label: 'About & Physics', icon: <Info className="w-4 h-4" /> },
    { id: 'demo', label: 'Demo Mode', icon: <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />, isSpecial: true },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 backdrop-blur-md bg-slate-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Hackathon Tag */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 p-0.5 shadow-lg shadow-emerald-950/40 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Wind className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-100 tracking-tight leading-none">
                  WindSense
                </h1>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider hidden sm:inline-block">
                  Zero Electronics
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Mechanically Intelligent Wind Energy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Navigation Links - Hidden on starting/landing page */}
            {activeTab !== 'landing' && (
              <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      id={`nav-btn-${item.id}`}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                        item.isSpecial
                          ? isActive
                            ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-bold shadow-md shadow-amber-950/50'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                          : isActive
                            ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60 font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                id="theme-toggle-btn"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-cyan-600" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar - Hidden on starting/landing page */}
        {activeTab !== 'landing' && (
          <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-800/80 scrollbar-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    item.isSpecial
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : isActive
                        ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
