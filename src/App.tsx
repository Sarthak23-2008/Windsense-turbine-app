/**
 * WindSense - Mechanically Intelligent Wind Energy
 * Digital Twin Simulation & Engineering Visualization Shell
 */

import React, { useState } from 'react';
import { Header, TabId } from './components/common/Header';
import { LandingPage } from './components/pages/LandingPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { HackathonDemoPage } from './components/pages/HackathonDemoPage';
import { SimulationPage } from './components/pages/SimulationPage';
import { PerformancePage } from './components/pages/PerformancePage';
import { MechanicalSystemPage } from './components/pages/MechanicalSystemPage';
import { ComparisonPage } from './components/pages/ComparisonPage';
import { AboutPage } from './components/pages/AboutPage';

import { DEFAULT_TURBINE_PARAMS, evaluateWindSenseState } from './physics/turbinePhysics';
import { TurbineParameters } from './types/simulation';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('landing');
  const [windSpeed, setWindSpeed] = useState<number>(12.0); // 12 m/s rated default
  const [windDirection, setWindDirection] = useState<number>(0); // 0° default headwind
  const [params] = useState<TurbineParameters>(DEFAULT_TURBINE_PARAMS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [simulationSubMode, setSimulationSubMode] = useState<'uncontrolled' | 'feedback' | 'windsense'>('uncontrolled');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTabChange = (tab: TabId) => {
    if (tab === 'simulation') {
      setSimulationSubMode('uncontrolled');
    }
    setActiveTab(tab);
  };

  // Evaluate live physics state for current wind speed, turbine params, and wind direction
  const state = evaluateWindSenseState(windSpeed, params, windDirection);

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'light bg-slate-100 text-slate-900' : 'bg-slate-950 text-slate-100'} flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 transition-colors duration-200`}>
      
      {/* Header Navigation */}
      <Header activeTab={activeTab} setActiveTab={handleTabChange} theme={theme} onToggleTheme={toggleTheme} />

      {/* Main Page View Content */}
      <main className={`flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${activeTab === 'landing' ? 'py-1 sm:py-3 flex flex-col justify-center' : 'py-6'}`}>
        {activeTab === 'landing' && (
          <LandingPage
            state={state}
            windSpeed={windSpeed}
            setWindSpeed={setWindSpeed}
            params={params}
            onLaunchDashboard={() => handleTabChange('dashboard')}
            setActiveTab={handleTabChange}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage
            state={state}
            setWindSpeed={setWindSpeed}
            windDirection={windDirection}
            setWindDirection={setWindDirection}
            params={params}
            setActiveTab={handleTabChange}
            onLaunchLiveSimulation={() => {
              setSimulationSubMode('windsense');
              setActiveTab('simulation');
            }}
          />
        )}

        {activeTab === 'demo' && (
          <HackathonDemoPage
            onSetWindSpeed={setWindSpeed}
            params={params}
          />
        )}

        {activeTab === 'simulation' && (
          <SimulationPage
            initialState={state}
            initialParams={params}
            initialSubMode={simulationSubMode}
          />
        )}

        {activeTab === 'performance' && (
          <PerformancePage
            state={state}
            windSpeed={windSpeed}
            setWindSpeed={setWindSpeed}
            params={params}
          />
        )}

        {activeTab === 'mechanical' && (
          <MechanicalSystemPage state={state} />
        )}

        {activeTab === 'comparison' && (
          <ComparisonPage />
        )}

        {activeTab === 'about' && (
          <AboutPage
            state={state}
            windSpeed={windSpeed}
            params={params}
            setActiveTab={handleTabChange}
          />
        )}
      </main>
    </div>
  );
}
