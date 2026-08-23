import React, { useState } from 'react';
import { SimulationState, TurbineParameters } from '../../types/simulation';
import { TurbineVisualizer } from '../visualization/TurbineVisualizer';
import { WindSpeedSimulator } from '../simulation/WindSpeedSimulator';
import { UncontrolledPhysicsModel } from '../physics/UncontrolledPhysicsModel';
import { VariablePitchFeedbackModel } from '../physics/VariablePitchFeedbackModel';
import { evaluateWindSenseState } from '../../physics/turbinePhysics';
import { Activity, Wind, Compass } from 'lucide-react';

interface SimulationPageProps {
  initialState: SimulationState;
  initialParams: TurbineParameters;
  initialSubMode?: 'uncontrolled' | 'feedback' | 'windsense';
}

export const SimulationPage: React.FC<SimulationPageProps> = ({
  initialState,
  initialParams,
  initialSubMode = 'uncontrolled',
}) => {
  const [params, setParams] = useState<TurbineParameters>(initialParams);
  const [windSpeed, setWindSpeed] = useState<number>(initialState.windSpeed);
  const [windDirection, setWindDirection] = useState<number>(initialState.windDirection ?? 0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeSubMode, setActiveSubMode] = useState<'uncontrolled' | 'feedback' | 'windsense'>(initialSubMode);

  React.useEffect(() => {
    if (initialSubMode) {
      setActiveSubMode(initialSubMode);
    }
  }, [initialSubMode]);

  // Re-evaluate simulation physics state whenever user adjusts parameters, wind speed, or wind direction
  const simState = evaluateWindSenseState(windSpeed, params, windDirection);

  const resetParams = () => {
    setParams(initialParams);
    setWindSpeed(12.0);
    setWindDirection(0);
    setIsPaused(false);
  };

  return (
    <div id="simulation-view" className="space-y-6">
      
      {/* Title & Introduction Header with Simulation Mode Sub-Navigation Menu */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">
              Interactive Physics Lab
            </span>
            <span className="text-slate-400 text-xs">• Classical Mechanics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">
            WindSense Physics Simulation & Control Lab
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Test individual physical stages: from raw uncontrolled aerodynamics to mechanical pitch feedback and full digital twin.
          </p>
        </div>

        {/* Model Selector Sub-Tabs Menu */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveSubMode('uncontrolled')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubMode === 'uncontrolled'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-md'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>1. Uncontrolled Physics</span>
          </button>

          <button
            onClick={() => setActiveSubMode('feedback')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubMode === 'feedback'
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-md'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>2. Variable Pitch Feedback Loop</span>
          </button>

          <button
            onClick={() => setActiveSubMode('windsense')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSubMode === 'windsense'
                ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-md'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <Wind className="w-4 h-4 text-cyan-300" />
            <span>3. Full Integrated Twin</span>
          </button>
        </div>
      </div>

      {/* Render Selected Sub-Mode */}
      {activeSubMode === 'uncontrolled' && (
        <UncontrolledPhysicsModel
          initialWindSpeed={windSpeed}
          onWindSpeedChange={setWindSpeed}
        />
      )}

      {activeSubMode === 'feedback' && (
        <VariablePitchFeedbackModel />
      )}

      {activeSubMode === 'windsense' && (
        <div className="space-y-6">
          {/* Main Live Wind-Speed & Direction Simulator Bar */}
          <WindSpeedSimulator
            windSpeed={windSpeed}
            setWindSpeed={setWindSpeed}
            windDirection={windDirection}
            setWindDirection={setWindDirection}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            onReset={() => {
              setWindSpeed(12.0);
              setWindDirection(0);
            }}
            showPresets={true}
            showDisclaimer={true}
          />

          <TurbineVisualizer
            state={simState}
            isPaused={isPaused}
            onTogglePause={() => setIsPaused(!isPaused)}
            onReset={() => {
              setWindSpeed(12.0);
              setWindDirection(0);
            }}
          />
        </div>
      )}
    </div>
  );
};
