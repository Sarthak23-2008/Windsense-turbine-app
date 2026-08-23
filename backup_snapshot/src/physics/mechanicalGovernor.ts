/**
 * Standalone Centrifugal Mechanical Governor Physics Engine
 * 
 * Implements classical Newtonian mechanics for a passive centrifugal flyball governor:
 * - Rotor RPM -> Angular velocity omega = (2 * pi * RPM) / 60
 * - Flyweight Centrifugal Force: F_c = m * r * omega^2
 * - Helical Spring Restoring Force: F_s = F_preload + k * x
 * - Mechanical Equilibrium & Damped Dynamic Trajectory
 * - Hard Travel Limits: x in [0, x_max]
 */

export interface CentrifugalGovernorParams {
  flyweightMass: number; // kg per mass (e.g., 1.25 kg)
  numFlyweights: number; // count (e.g., 2)
  springStiffness: number; // N/m (k, e.g., 4800 N/m)
  springPreload: number; // N (F_preload, e.g., 380 N)
  minRadius: number; // meters (r_min, e.g., 0.08 m)
  maxRadius: number; // meters (r_max, e.g., 0.22 m)
  maxTravel: number; // meters (x_max, e.g., 0.06 m or 60 mm)
  responseDampingTime: number; // seconds (tau, e.g., 0.12s for smooth movement)
}

export type GovernorStateCategory = 'Resting' | 'Engaging' | 'Regulating' | 'Near Maximum Travel';

export interface StandaloneGovernorState {
  rotorRpm: number; // RPM
  angularVelocity: number; // rad/s (omega)
  equilibriumDisplacement: number; // meters (x_eq)
  currentDisplacement: number; // meters (x_dyn)
  displacementMm: number; // mm
  governorPositionPct: number; // 0% to 100%
  currentRadius: number; // meters (r)
  radiusMm: number; // mm
  centrifugalForce: number; // N (F_c)
  springForce: number; // N (F_s)
  netForce: number; // N (F_c - F_s)
  governorState: GovernorStateCategory;
}

export interface GovernorCurvePoint {
  rpm: number; // RPM
  angularVelocity: number; // rad/s
  positionPct: number; // %
  displacementMm: number; // mm
  radiusMm: number; // mm
  centrifugalForceN: number; // N
  springForceN: number; // N
}

export const DEFAULT_GOVERNOR_PARAMS: CentrifugalGovernorParams = {
  flyweightMass: 1.25,
  numFlyweights: 2,
  springStiffness: 4800,
  springPreload: 380,
  minRadius: 0.08,
  maxRadius: 0.22,
  maxTravel: 0.06,
  responseDampingTime: 0.12,
};

/**
 * Derives the visual Governor State category from continuous position percentage.
 */
export function determineGovernorStateCategory(positionPct: number): GovernorStateCategory {
  if (positionPct <= 2.0) return 'Resting';
  if (positionPct < 25.0) return 'Engaging';
  if (positionPct <= 90.0) return 'Regulating';
  return 'Near Maximum Travel';
}

/**
 * Calculates static equilibrium displacement x_eq for a given rotor RPM
 */
export function calculateEquilibriumDisplacement(
  rotorRpm: number,
  params: CentrifugalGovernorParams = DEFAULT_GOVERNOR_PARAMS
): number {
  const safeRpm = Math.max(0, isNaN(rotorRpm) ? 0 : rotorRpm);
  const omega = (safeRpm * Math.PI) / 30; // rad/s
  const omegaSq = omega * omega;

  const totalMass = Math.max(0.1, params.flyweightMass * params.numFlyweights);
  const rMin = Math.max(0.01, params.minRadius);
  const rMax = Math.max(rMin + 0.01, params.maxRadius);
  const xMax = Math.max(0.005, params.maxTravel);
  const k = Math.max(100, params.springStiffness);
  const F_preload = Math.max(0, params.springPreload);

  // Radial arm rate of change dr/dx
  const dr_dx = (rMax - rMin) / xMax;

  // Static centrifugal force at minimum radius
  const Fc_min = totalMass * omegaSq * rMin;

  // Resting phase boundary: 2% of stroke travel represents resting seating & compliance (x_rest = 0.02 * xMax)
  const x_rest = 0.02 * xMax;

  if (Fc_min <= F_preload) {
    // Resting phase: Governor position responds continuously to centrifugal force buildup F_c / F_preload
    const preloadRatio = F_preload > 0 ? Fc_min / F_preload : 0;
    return x_rest * Math.min(1.0, preloadRatio);
  }

  const numerator = Fc_min - F_preload;
  const denominator = k - totalMass * omegaSq * dr_dx;

  if (denominator <= 0) {
    // Instability threshold -> fully extended to travel limit
    return xMax;
  }

  const x_main = numerator / denominator;
  // Smoothly blend from resting phase into full regulating travel
  const x_eq = x_rest + (xMax - x_rest) * Math.min(1.0, Math.max(0, x_main / xMax));

  // Hard mechanical stops clamp x between 0 and xMax
  return Math.max(0, Math.min(xMax, x_eq));
}

/**
 * Calculates instantaneous dynamic governor state with continuous response damping
 */
export function calculateGovernorStep(
  rotorRpm: number,
  previousDisplacement: number, // current x in meters
  dt: number, // delta time in seconds
  params: CentrifugalGovernorParams = DEFAULT_GOVERNOR_PARAMS
): StandaloneGovernorState {
  const safeRpm = Math.max(0, isNaN(rotorRpm) ? 0 : rotorRpm);
  const safePrevX = Math.max(0, Math.min(params.maxTravel, isNaN(previousDisplacement) ? 0 : previousDisplacement));
  const safeDt = Math.max(0.001, isNaN(dt) ? 0.05 : dt);

  const omega = (safeRpm * Math.PI) / 30;
  const omegaSq = omega * omega;

  const totalMass = Math.max(0.1, params.flyweightMass * params.numFlyweights);
  const rMin = Math.max(0.01, params.minRadius);
  const rMax = Math.max(rMin + 0.01, params.maxRadius);
  const xMax = Math.max(0.005, params.maxTravel);
  const k = Math.max(100, params.springStiffness);
  const F_preload = Math.max(0, params.springPreload);

  // 1. Static Equilibrium Displacement x_eq
  const x_eq = calculateEquilibriumDisplacement(safeRpm, params);

  // 2. Smooth exponential decay filter towards equilibrium: dx/dt = (x_eq - x) / tau
  const tau = Math.max(0.01, params.responseDampingTime);
  const alpha = 1 - Math.exp(-safeDt / tau);
  const currentDisplacement = safePrevX + (x_eq - safePrevX) * alpha;

  // Clamped by hard mechanical travel stops
  const xClamped = Math.max(0, Math.min(xMax, currentDisplacement));

  // 3. Current Effective Radius r = r_min + (x / x_max) * (r_max - r_min)
  const currentRadius = rMin + (xClamped / xMax) * (rMax - rMin);

  // 4. Centrifugal Force F_c = m * r * omega^2
  const centrifugalForce = totalMass * currentRadius * omegaSq;

  // 5. Spring Restoring Force F_s = F_preload + k * x
  const springForce = F_preload + k * xClamped;

  // 6. Net Force
  const netForce = centrifugalForce - springForce;

  // 7. Derived Metrics
  const displacementMm = xClamped * 1000;
  const radiusMm = currentRadius * 1000;
  const governorPositionPct = (xClamped / xMax) * 100;
  const governorState = determineGovernorStateCategory(governorPositionPct);

  return {
    rotorRpm: parseFloat(safeRpm.toFixed(1)),
    angularVelocity: parseFloat(omega.toFixed(2)),
    equilibriumDisplacement: parseFloat(x_eq.toFixed(5)),
    currentDisplacement: parseFloat(xClamped.toFixed(5)),
    displacementMm: parseFloat(displacementMm.toFixed(2)),
    governorPositionPct: parseFloat(governorPositionPct.toFixed(1)),
    currentRadius: parseFloat(currentRadius.toFixed(4)),
    radiusMm: parseFloat(radiusMm.toFixed(1)),
    centrifugalForce: parseFloat(centrifugalForce.toFixed(1)),
    springForce: parseFloat(springForce.toFixed(1)),
    netForce: parseFloat(netForce.toFixed(1)),
    governorState,
  };
}

/**
 * Generates continuous equilibrium curves across RPM range (0 to 350 RPM)
 */
export function generateGovernorCurves(
  params: CentrifugalGovernorParams = DEFAULT_GOVERNOR_PARAMS
): GovernorCurvePoint[] {
  const points: GovernorCurvePoint[] = [];

  const totalMass = Math.max(0.1, params.flyweightMass * params.numFlyweights);
  const rMin = Math.max(0.01, params.minRadius);
  const rMax = Math.max(rMin + 0.01, params.maxRadius);
  const xMax = Math.max(0.005, params.maxTravel);
  const k = Math.max(100, params.springStiffness);
  const F_preload = Math.max(0, params.springPreload);

  for (let rpm = 0; rpm <= 350; rpm += 5) {
    const omega = (rpm * Math.PI) / 30;
    const omegaSq = omega * omega;

    const x_eq = calculateEquilibriumDisplacement(rpm, params);
    const radius = rMin + (x_eq / xMax) * (rMax - rMin);

    const Fc = totalMass * radius * omegaSq;
    const Fs = F_preload + k * x_eq;
    const positionPct = (x_eq / xMax) * 100;

    points.push({
      rpm,
      angularVelocity: Number(omega.toFixed(2)),
      positionPct: Number(positionPct.toFixed(1)),
      displacementMm: Number((x_eq * 1000).toFixed(1)),
      radiusMm: Number((radius * 1000).toFixed(1)),
      centrifugalForceN: Number(Fc.toFixed(1)),
      springForceN: Number(Fs.toFixed(1)),
    });
  }

  return points;
}

// Legacy export compatibility for existing code
export interface GovernorResult {
  centrifugalForce: number;
  springForce: number;
  netForce: number;
  sleeveDisplacement: number;
  governorRadius: number;
}

export function calculateGovernorState(
  rotorRpm: number,
  params: {
    governorMass: number;
    governorRadiusMin: number;
    governorRadiusMax: number;
    springConstant: number;
    springPreload: number;
    maxSleeveTravel: number;
  }
): GovernorResult {
  const p: CentrifugalGovernorParams = {
    flyweightMass: params.governorMass,
    numFlyweights: 2,
    springStiffness: params.springConstant,
    springPreload: params.springPreload,
    minRadius: params.governorRadiusMin,
    maxRadius: params.governorRadiusMax,
    maxTravel: params.maxSleeveTravel,
    responseDampingTime: 0.1,
  };

  const x_eq = calculateEquilibriumDisplacement(rotorRpm, p);
  const radius = p.minRadius + (x_eq / p.maxTravel) * (p.maxRadius - p.minRadius);
  const omega = (rotorRpm * Math.PI) / 30;
  const totalMass = p.flyweightMass * p.numFlyweights;

  const centrifugalForce = totalMass * radius * omega * omega;
  const springForce = p.springPreload + p.springStiffness * x_eq;
  const netForce = centrifugalForce - springForce;

  return {
    centrifugalForce,
    springForce,
    netForce,
    sleeveDisplacement: x_eq,
    governorRadius: radius,
  };
}
