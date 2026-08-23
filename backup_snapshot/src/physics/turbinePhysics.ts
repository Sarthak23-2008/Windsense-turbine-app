/**
 * Turbine Physics Master Module
 * Coordinates mechanical governor, blade pitch, aerodynamics, and operational status.
 * Provides deterministic simulation state for WindSense and comparative models.
 */

import { TurbineParameters, SimulationState, OperationalState, CurvePoint } from '../types/simulation';
import { calculateGovernorState } from './mechanicalGovernor';
import { calculateBladePitch } from './bladePitch';
import { calculatePower } from './powerCalculator';

export const DEFAULT_TURBINE_PARAMS: TurbineParameters = {
  rotorRadius: 4.5, // 9m rotor diameter
  ratedPower: 10000, // 10 kW generator
  cutInWindSpeed: 3.0, // 3 m/s
  ratedWindSpeed: 12.0, // 12 m/s
  cutOutWindSpeed: 25.0, // 25 m/s
  airDensity: 1.225, // kg/m^3
  generatorEfficiency: 0.90, // 90% efficiency
  
  // Mechanical Governor Specs
  governorMass: 1.25, // kg flyweight
  governorRadiusMin: 0.08, // 8cm at rest
  governorRadiusMax: 0.24, // 24cm max extension
  springConstant: 4800, // 4.8 kN/m helical spring rate
  springPreload: 380, // 380 N pre-compression
  maxSleeveTravel: 0.06, // 6cm sleeve stroke
  
  // Pitch Specs
  finePitchAngle: 2.0, // 2° optimal low-wind pitch
  featherPitchAngle: 82.0, // 82° max feathering pitch
  linkageRatio: 1333.3, // deg/m
};

/**
 * Predicts steady-state equilibrium rotor RPM for a given wind speed and mechanical governor system.
 */
export function estimateRotorRpm(windSpeed: number, params: TurbineParameters): number {
  if (windSpeed < params.cutInWindSpeed) {
    return (windSpeed / params.cutInWindSpeed) * 35; // idle slow spin
  }
  
  if (windSpeed >= params.cutOutWindSpeed) {
    // Failsafe passive mechanical lock / aerodynamic brake state
    return 15; 
  }

  // Below rated wind speed (3 to 12 m/s), RPM ramps up naturally with wind speed
  if (windSpeed <= params.ratedWindSpeed) {
    const fraction = (windSpeed - params.cutInWindSpeed) / (params.ratedWindSpeed - params.cutInWindSpeed);
    return 40 + fraction * (180 - 40); // 40 RPM at cut-in to 180 RPM at rated
  }

  // In over-speed regime (> 12 m/s), passive governor feathers blades, keeping RPM self-regulated around 180-195 RPM!
  const overSpeedExcess = windSpeed - params.ratedWindSpeed;
  return 180 + Math.min(15, overSpeedExcess * 1.2); 
}

/**
 * Evaluates full simulation state for WindSense turbine at a specific wind speed and wind direction.
 */
export function evaluateWindSenseState(
  windSpeed: number,
  params: TurbineParameters = DEFAULT_TURBINE_PARAMS,
  windDirection: number = 0
): SimulationState {
  // Normalize wind direction angle to [0, 360)
  const normDir = ((windDirection % 360) + 360) % 360;

  // Calculate shortest yaw misalignment angle from direct headwind (0° / 360°)
  const yawOffsetDeg = Math.min(normDir, 360 - normDir);
  const yawOffsetRad = (yawOffsetDeg * Math.PI) / 180;

  // Effective axial wind velocity component acting on the rotor plane
  const effectiveWindSpeed = windSpeed * Math.abs(Math.cos(yawOffsetRad));

  // 1. Calculate rotor RPM based on effective axial wind speed
  const rotorRpm = estimateRotorRpm(effectiveWindSpeed, params);

  // 2. Calculate governor force equilibrium and sleeve position
  const governor = calculateGovernorState(rotorRpm, params);

  // 3. Calculate base passive pitch angle from governor sleeve displacement
  const basePitchAngle = calculateBladePitch(governor.sleeveDisplacement, params);

  // 4. Directional pitch response:
  // As wind direction deviates from headwind (0°), crosswind flow component adds dynamic angle-of-attack offset.
  // The passive blade pitch mechanism feathers the blades proportionally to crosswind misalignment (up to +18° at 90° crosswind).
  const directionPitchOffset = Math.pow(Math.sin(yawOffsetRad), 2) * 18.0;
  const pitchAngle = Math.min(params.featherPitchAngle, Math.max(params.finePitchAngle, basePitchAngle + directionPitchOffset));

  // 5. Calculate aerodynamic & electrical power using effective wind speed & updated pitch angle
  const power = calculatePower(effectiveWindSpeed, rotorRpm, pitchAngle, params);

  // 6. Determine operational state
  let operationalState: OperationalState = 'STILL';
  let operationalMessage = 'Wind speed below cut-in threshold (3.0 m/s). Rotor idling.';

  if (windSpeed >= params.cutOutWindSpeed) {
    operationalState = 'STORM_CUT_OUT';
    operationalMessage = 'Storm wind speed reached (≥25 m/s). Mechanical governor fully feathered blades for passive aerodynamic stall & survival.';
  } else if (windSpeed >= 13.5 || pitchAngle >= 15.0) {
    operationalState = 'PASSIVE_FEATHERING';
    operationalMessage = 'High wind or crosswind regime. Centrifugal governor & mechanical pitch actively feather blades to shed excess torque and maintain rated stability.';
  } else if (windSpeed >= params.cutInWindSpeed) {
    operationalState = 'OPTIMAL';
    operationalMessage = 'Normal generation regime. Blades at optimal pitch angle for maximum energy capture.';
  } else if (windSpeed > 0) {
    operationalState = 'CUT_IN';
    operationalMessage = 'Approaching cut-in wind speed. Mechanical pre-load spring holds blades in maximum starting torque pitch.';
  }

  return {
    windSpeed,
    windDirection: normDir,
    rotorRpm,
    tipSpeedRatio: power.tipSpeedRatio,
    pitchAngle,
    cpCoefficient: power.cpCoefficient,
    windPower: power.windPower,
    aerodynamicPower: power.aerodynamicPower,
    electricalPower: power.electricalPower,
    aerodynamicTorque: power.aerodynamicTorque,
    
    centrifugalForce: governor.centrifugalForce,
    springForce: governor.springForce,
    netGovernorForce: governor.netForce,
    sleeveDisplacement: governor.sleeveDisplacement,
    governorRadius: governor.governorRadius,
    
    operationalState,
    operationalMessage,
  };
}

/**
 * Generates smooth comparison curves for WindSense vs Electronic vs Fixed Pitch
 * over a wind range of 0 to 30 m/s.
 */
export function generateComparisonCurves(
  params: TurbineParameters = DEFAULT_TURBINE_PARAMS
): CurvePoint[] {
  const points: CurvePoint[] = [];

  for (let v = 0; v <= 30; v += 0.5) {
    // 1. WindSense Mechanical Passive State
    const wsState = evaluateWindSenseState(v, params);

    // 2. Electronic Active Pitch Model
    // Electronic pitch uses ideal sensor feedback to maintain exact 10kW above 12m/s,
    // but cuts off abruptly at 25m/s or suffers sensor delay/failure risk.
    let elecPitch = params.finePitchAngle;
    let elecPowerWatts = 0;
    let elecRpm = wsState.rotorRpm;

    if (v >= params.cutInWindSpeed && v < params.cutOutWindSpeed) {
      if (v <= params.ratedWindSpeed) {
        elecPitch = params.finePitchAngle;
        elecPowerWatts = wsState.electricalPower;
      } else {
        // Electronic pitch ramps pitch up precisely to hold rated power
        const excess = (v - params.ratedWindSpeed) / (params.cutOutWindSpeed - params.ratedWindSpeed);
        elecPitch = params.finePitchAngle + excess * (params.featherPitchAngle - params.finePitchAngle);
        elecPowerWatts = params.ratedPower;
      }
    } else {
      elecPowerWatts = 0;
      elecPitch = 90;
    }

    // 3. Fixed Pitch Turbine Model
    // Fixed pitch has 0° dynamic pitch capability.
    // In high winds, power spikes then drastically drops due to stall or overspeeds into structural failure!
    const fixedPitch = params.finePitchAngle;
    let fixedPowerWatts = 0;
    
    if (v >= params.cutInWindSpeed) {
      if (v <= 13.0) {
        // Normal rise
        const fixedPowerCalc = calculatePower(v, Math.min(220, 30 + v * 15), fixedPitch, params);
        fixedPowerWatts = fixedPowerCalc.electricalPower;
      } else if (v <= 20.0) {
        // Deep aerodynamic stall / overspeed turbulence
        const fixedPowerCalc = calculatePower(v, Math.min(260, 40 + v * 14), fixedPitch, params);
        fixedPowerWatts = fixedPowerCalc.electricalPower * 0.65; // degraded due to violent stall
      } else {
        // Structural hazard / cut-out shutdown
        fixedPowerWatts = 0;
      }
    }

    points.push({
      windSpeed: Number(v.toFixed(1)),
      windSensePower: Number((wsState.electricalPower / 1000).toFixed(2)),
      electronicPower: Number((elecPowerWatts / 1000).toFixed(2)),
      fixedPitchPower: Number((fixedPowerWatts / 1000).toFixed(2)),
      windSensePitch: Number(wsState.pitchAngle.toFixed(1)),
      electronicPitch: Number(elecPitch.toFixed(1)),
      fixedPitchAngle: Number(fixedPitch.toFixed(1)),
      windSenseRpm: Math.round(wsState.rotorRpm),
      cp: Number(wsState.cpCoefficient.toFixed(3)),
      availableWindPowerKw: Number((wsState.windPower / 1000).toFixed(2)),
      aeroPowerKw: Number((wsState.aerodynamicPower / 1000).toFixed(2)),
      sleeveDisplacementMm: Number((wsState.sleeveDisplacement * 1000).toFixed(1)),
      centrifugalForceN: Number(wsState.centrifugalForce.toFixed(0)),
      springForceN: Number(wsState.springForce.toFixed(0)),
    });
  }

  return points;
}

/**
 * Generates Governor Position & Force curves across rotor RPM range (0 to 220 RPM)
 */
export function generateGovernorRpmCurves(
  params: TurbineParameters = DEFAULT_TURBINE_PARAMS
): import('../types/simulation').GovernorRpmCurvePoint[] {
  const points: import('../types/simulation').GovernorRpmCurvePoint[] = [];

  for (let rpm = 0; rpm <= 220; rpm += 5) {
    const gov = calculateGovernorState(rpm, params);
    const pitch = calculateBladePitch(gov.sleeveDisplacement, params);

    points.push({
      rpm,
      sleeveDisplacementMm: Number((gov.sleeveDisplacement * 1000).toFixed(1)),
      governorRadiusCm: Number((gov.governorRadius * 100).toFixed(1)),
      centrifugalForceN: Number(gov.centrifugalForce.toFixed(0)),
      springForceN: Number(gov.springForce.toFixed(0)),
      pitchAngleDeg: Number(pitch.toFixed(1)),
    });
  }

  return points;
}
