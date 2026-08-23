/**
 * WindSense - Simulation Types & Data Structures
 * Strictly deterministic physics simulation for mechanically passive wind turbine control.
 */

export interface TurbineParameters {
  rotorRadius: number; // meters (e.g. 5.0m for small/mid-scale test turbine)
  ratedPower: number; // Watts (e.g. 10,000 W / 10 kW)
  cutInWindSpeed: number; // m/s (e.g. 3.0 m/s)
  ratedWindSpeed: number; // m/s (e.g. 12.0 m/s)
  cutOutWindSpeed: number; // m/s (e.g. 25.0 m/s)
  airDensity: number; // kg/m^3 (standard 1.225 kg/m^3 at sea level)
  generatorEfficiency: number; // fraction (e.g. 0.90 = 90%)
  
  // Mechanical Governor Parameters
  governorMass: number; // kg per weight (e.g. 1.2 kg)
  governorRadiusMin: number; // meters (at rest, e.g. 0.08m)
  governorRadiusMax: number; // meters (fully extended, e.g. 0.22m)
  springConstant: number; // N/m (calibrated spring rate, e.g. 4500 N/m)
  springPreload: number; // N (pre-compression force, e.g. 350 N)
  maxSleeveTravel: number; // meters (e.g. 0.06m)
  
  // Blade Pitch Mechanics
  finePitchAngle: number; // degrees (low wind pitch for max torque, e.g. 2.0°)
  featherPitchAngle: number; // degrees (high wind pitch for protection, e.g. 85.0°)
  linkageRatio: number; // degrees per mm of sleeve displacement
}

export type OperationalState = 
  | 'STILL' 
  | 'CUT_IN' 
  | 'OPTIMAL' 
  | 'PASSIVE_FEATHERING' 
  | 'STORM_CUT_OUT';

export interface SimulationState {
  windSpeed: number; // m/s
  windDirection: number; // degrees (0° to 360°, where 0° = direct headwind)
  rotorRpm: number; // RPM
  tipSpeedRatio: number; // lambda (λ)
  pitchAngle: number; // degrees (θ)
  cpCoefficient: number; // Power coefficient Cp(λ, θ)
  windPower: number; // Watts (kinetic power in swept wind area)
  aerodynamicPower: number; // Watts
  electricalPower: number; // Watts
  aerodynamicTorque: number; // N·m
  
  // Governor mechanical feedback
  centrifugalForce: number; // Newtons
  springForce: number; // Newtons
  netGovernorForce: number; // Newtons
  sleeveDisplacement: number; // meters (0 to maxSleeveTravel)
  governorRadius: number; // meters
  
  // Status
  operationalState: OperationalState;
  operationalMessage: string;
}

export interface WindPreset {
  id: string;
  name: string;
  speed: number; // m/s
  description: string;
  iconName: string;
}

export interface CurvePoint {
  windSpeed: number; // m/s
  windSensePower: number; // kW (usable electrical output)
  electronicPower: number; // kW
  fixedPitchPower: number; // kW
  windSensePitch: number; // degrees
  electronicPitch: number; // degrees
  fixedPitchAngle: number; // degrees
  windSenseRpm: number; // RPM
  cp: number; // Power coefficient
  availableWindPowerKw: number; // kW (kinetic power in swept area)
  aeroPowerKw: number; // kW (simulated aerodynamic power)
  sleeveDisplacementMm: number; // mm
  centrifugalForceN: number; // N
  springForceN: number; // N
}

export interface GovernorRpmCurvePoint {
  rpm: number; // RPM
  sleeveDisplacementMm: number; // mm
  governorRadiusCm: number; // cm
  centrifugalForceN: number; // N
  springForceN: number; // N
  pitchAngleDeg: number; // degrees
}

export interface TimeHistoryPoint {
  step: number; // sequential tick index
  timestampSec: number; // elapsed time in seconds
  timeLabel: string; // e.g. "00:15"
  windSpeed: number; // m/s
  rotorRpm: number; // RPM
  pitchAngle: number; // degrees
  sleeveMm: number; // mm
  availableWindPowerKw: number; // kW
  aeroPowerKw: number; // kW
  elecPowerKw: number; // kW (usable output)
  cpCoefficient: number;
  overallEfficiencyPct: number; // %
}
