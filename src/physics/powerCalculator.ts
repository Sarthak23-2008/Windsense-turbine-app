/**
 * Power & Aerodynamics Calculator
 * Computes aerodynamic power coefficient Cp(lambda, theta), rotor torque, and electrical power.
 * Based on empirical wind energy physics models (Betz limit & blade element approximations).
 */

import { TurbineParameters } from '../types/simulation';

export interface AerodynamicResult {
  tipSpeedRatio: number; // λ
  cpCoefficient: number; // Cp
  sweptArea: number; // m^2
  windPower: number; // Watts
  aerodynamicPower: number; // Watts
  electricalPower: number; // Watts
  aerodynamicTorque: number; // N·m
}

/**
 * Standard empirical aerodynamic power coefficient model Cp(lambda, theta)
 * Cp(λ, θ) = c1 * (c2/λ_i - c3*θ - c4) * exp(-c5/λ_i) + c6*λ
 * where 1/λ_i = 1/(λ + 0.08*θ) - 0.035/(θ^3 + 1)
 */
export function calculatePowerCoefficient(lambda: number, pitchDegrees: number): number {
  if (lambda <= 0) return 0;

  const theta = Math.max(0, pitchDegrees);
  
  // Empirical constants for medium horizontal-axis turbine
  const c1 = 0.5176;
  const c2 = 116;
  const c3 = 0.4;
  const c4 = 5;
  const c5 = 21;
  const c6 = 0.0068;

  const invLambdaI = (1 / (lambda + 0.08 * theta)) - (0.035 / (Math.pow(theta, 3) + 1));
  
  if (invLambdaI <= 0) return 0;

  const cp = c1 * (c2 * invLambdaI - c3 * theta - c4) * Math.exp(-c5 * invLambdaI) + c6 * lambda;
  
  // Cp cannot physically exceed Betz limit (0.593) or fall below 0
  return Math.max(0, Math.min(0.593, cp));
}

/**
 * Calculates complete power output and aerodynamic torque for given wind speed, rotor RPM, and pitch angle.
 */
export function calculatePower(
  windSpeed: number,
  rotorRpm: number,
  pitchAngle: number,
  params: TurbineParameters
): AerodynamicResult {
  const sweptArea = Math.PI * Math.pow(params.rotorRadius, 2); // m^2
  
  if (windSpeed <= 0) {
    return {
      tipSpeedRatio: 0,
      cpCoefficient: 0,
      sweptArea,
      windPower: 0,
      aerodynamicPower: 0,
      electricalPower: 0,
      aerodynamicTorque: 0,
    };
  }

  // Tip Speed Ratio λ = (omega * R) / windSpeed
  const omega = (rotorRpm * Math.PI) / 30; // rad/s
  const tipSpeed = omega * params.rotorRadius; // m/s
  const tipSpeedRatio = tipSpeed / windSpeed;

  // Power coefficient Cp
  const cpCoefficient = calculatePowerCoefficient(tipSpeedRatio, pitchAngle);

  // Kinetic power available in wind P = 0.5 * rho * A * v^3
  const windPower = 0.5 * params.airDensity * sweptArea * Math.pow(windSpeed, 3);

  // Aerodynamic power captured by rotor
  let aerodynamicPower = windPower * cpCoefficient;

  // Cap power at rated power cap
  aerodynamicPower = Math.min(params.ratedPower / params.generatorEfficiency, aerodynamicPower);

  // Electrical power
  const electricalPower = Math.min(params.ratedPower, aerodynamicPower * params.generatorEfficiency);

  // Aerodynamic torque T = P / omega
  const aerodynamicTorque = omega > 0 ? aerodynamicPower / omega : 0;

  return {
    tipSpeedRatio,
    cpCoefficient,
    sweptArea,
    windPower,
    aerodynamicPower,
    electricalPower,
    aerodynamicTorque,
  };
}
