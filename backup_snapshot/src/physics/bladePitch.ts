/**
 * Mechanical Blade Pitch Module
 * Transforms mechanical displacement of the governor sleeve into blade pitch angle adjustment via mechanical linkages.
 * 
 * Mechanism: Swashplate / Bell-crank linkage translates axial sleeve motion x into rotational blade twist theta.
 */

import { TurbineParameters } from '../types/simulation';

export interface LinkageConfig {
  minimumPitch: number; // degrees (e.g. 2.0° fine pitch for max power capture)
  maximumPitch: number; // degrees (e.g. 85.0° feather pitch for stall/protection)
  nominalPitch: number; // degrees (e.g. 2.0° resting pitch)
  linkageRatio: number; // leverage factor (e.g. 1.0x)
  maxSleeveTravel: number; // meters (e.g. 0.06m = 60mm)
}

export interface LinkageResult {
  sleeveDisplacementMm: number;
  linkageDisplacementMm: number;
  pitchAngleDeg: number;
  pitchFraction: number;
}

/**
 * Calculates blade pitch angle from governor sleeve displacement with configurable mechanical linkage ratio.
 * 
 * @param sleeveDisplacement - Axial displacement in meters (0 to maxSleeveTravel)
 * @param params - Turbine mechanical parameters or explicit LinkageConfig
 * @returns Pitch angle in degrees continuously bounded within [minimumPitch, maximumPitch]
 */
export function calculateBladePitch(
  sleeveDisplacement: number,
  params: TurbineParameters | LinkageConfig
): number {
  const minPitch = 'finePitchAngle' in params ? params.finePitchAngle : params.minimumPitch;
  const maxPitch = 'featherPitchAngle' in params ? params.featherPitchAngle : params.maximumPitch;
  const nominalPitch = 'nominalPitch' in params ? params.nominalPitch : minPitch;
  const ratio = 'linkageRatio' in params ? (params.linkageRatio > 10 ? 1.0 : params.linkageRatio) : 1.0;
  const maxTravel = params.maxSleeveTravel > 0 ? params.maxSleeveTravel : 0.06;

  // Mechanical displacement fraction adjusted by linkage ratio
  const rawFraction = (sleeveDisplacement / maxTravel) * ratio;
  const clampedFraction = Math.max(0, Math.min(1, rawFraction));

  // Continuous linear mechanical transformation
  const pitchRange = maxPitch - minPitch;
  const pitchAngle = nominalPitch + clampedFraction * pitchRange;

  // Strictly enforce realistic physical limits
  return Math.max(minPitch, Math.min(maxPitch, pitchAngle));
}

/**
 * Detailed linkage evaluation returning displacements and pitch angles.
 */
export function evaluateMechanicalLinkage(
  sleeveDisplacementMeters: number,
  config: LinkageConfig
): LinkageResult {
  const sleeveDisplacementMm = Math.max(0, sleeveDisplacementMeters * 1000);
  const maxTravelMm = Math.max(1, config.maxSleeveTravel * 1000);

  // Mechanical linkage transformation (leverage multiplication)
  const linkageDisplacementMm = sleeveDisplacementMm * config.linkageRatio;
  const pitchFraction = Math.max(0, Math.min(1, linkageDisplacementMm / maxTravelMm));

  const pitchRange = config.maximumPitch - config.minimumPitch;
  const rawAngle = config.nominalPitch + pitchFraction * pitchRange;
  const pitchAngleDeg = Math.max(config.minimumPitch, Math.min(config.maximumPitch, rawAngle));

  return {
    sleeveDisplacementMm,
    linkageDisplacementMm,
    pitchAngleDeg,
    pitchFraction,
  };
}

