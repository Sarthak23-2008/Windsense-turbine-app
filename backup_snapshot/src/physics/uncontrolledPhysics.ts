/**
 * Uncontrolled First Physics Model Engine
 * 
 * Implements fundamental aerodynamic and rotational inertia physics:
 * 1. Available Wind Power: P_wind = 0.5 * rho * A * V^3
 * 2. Captured Turbine Power: P_turbine = Cp * P_wind
 * 3. Aerodynamic Torque: T_aero = P_turbine / omega
 * 4. Rotor Inertia: J = N * (1/3) * m_blade * r^2 + J_hub
 * 5. Dynamic Rotation: d(omega)/dt = (T_aero - T_load) / J
 */

export interface UncontrolledModelParams {
  rotorRadius: number; // m (e.g., 4.5m)
  numBlades: number; // count (e.g., 3 blades)
  airDensity: number; // kg/m^3 (e.g., 1.225)
  cpCoefficient: number; // Cp fraction (e.g., 0.42)
  generatorEfficiency: number; // fraction (e.g., 0.90)
  bladeMass: number; // kg per blade (e.g., 18 kg)
  generatorLoadConstant: number; // N·m·s/rad (e.g., 0.8)
  mechanicalFriction: number; // N·m (e.g., 5.0)
}

export interface UncontrolledState {
  windSpeed: number; // m/s
  rotorRpm: number; // RPM
  angularVelocity: number; // rad/s (omega)
  sweptArea: number; // m^2
  windPower: number; // kW
  turbinePower: number; // kW
  electricalPower: number; // kW
  aerodynamicTorque: number; // N·m
  loadTorque: number; // N·m
  netTorque: number; // N·m
  rotorInertia: number; // kg·m^2 (J)
  angularAcceleration: number; // rad/s^2 (alpha)
}

export interface UncontrolledCurvePoint {
  windSpeed: number; // m/s
  windPowerKw: number; // kW
  turbinePowerKw: number; // kW
  electricalPowerKw: number; // kW
  equilibriumRpm: number; // RPM
  aerodynamicTorqueNm: number; // N·m
}

export const DEFAULT_UNCONTROLLED_PARAMS: UncontrolledModelParams = {
  rotorRadius: 4.5,
  numBlades: 3,
  airDensity: 1.225,
  cpCoefficient: 0.42,
  generatorEfficiency: 0.90,
  bladeMass: 18.0,
  generatorLoadConstant: 0.85,
  mechanicalFriction: 6.0,
};

/**
 * Calculates total rotor moment of inertia J = N * (1/3) * m_blade * r^2 + J_hub
 */
export function calculateRotorInertia(params: UncontrolledModelParams): number {
  const r = Math.max(0.1, params.rotorRadius);
  const m = Math.max(0.1, params.bladeMass);
  const n = Math.max(1, params.numBlades);
  
  // Hub inertia approximation (approx 12 kg·m^2)
  const hubInertia = 12.0;
  
  // Moment of inertia for thin rod rotating about one end = 1/3 * m * L^2
  const bladesInertia = n * (1 / 3) * m * Math.pow(r, 2);
  
  return bladesInertia + hubInertia;
}

/**
 * Calculates instantaneous static physics state from wind speed and current angular velocity
 */
export function calculateUncontrolledPhysicsStep(
  windSpeed: number,
  currentOmega: number, // rad/s
  dt: number, // time step in seconds (e.g. 0.05s)
  params: UncontrolledModelParams = DEFAULT_UNCONTROLLED_PARAMS
): UncontrolledState {
  // Ensure non-negative inputs
  const safeV = Math.max(0, isNaN(windSpeed) ? 0 : windSpeed);
  const safeOmega = Math.max(0, isNaN(currentOmega) ? 0 : currentOmega);
  const safeDt = Math.max(0.001, isNaN(dt) ? 0.05 : dt);

  const r = Math.max(0.1, params.rotorRadius);
  const rho = Math.max(0.1, params.airDensity);
  const cp = Math.max(0, Math.min(0.593, params.cpCoefficient)); // Bounded by Betz limit
  const genEff = Math.max(0, Math.min(1, params.generatorEfficiency));

  // 1. Swept Area A = pi * r^2 (m^2)
  const sweptArea = Math.PI * Math.pow(r, 2);

  // 2. Available Wind Power P_wind = 0.5 * rho * A * V^3 (Watts)
  const windPowerWatts = 0.5 * rho * sweptArea * Math.pow(safeV, 3);
  const windPowerKw = windPowerWatts / 1000;

  // 3. Captured Turbine Power P_turbine = Cp * P_wind (Watts)
  const turbinePowerWatts = cp * windPowerWatts;
  const turbinePowerKw = turbinePowerWatts / 1000;

  // 4. Electrical Power P_elec = eta_gen * P_turbine (Watts)
  const electricalPowerWatts = turbinePowerWatts * genEff;
  const electricalPowerKw = electricalPowerWatts / 1000;

  // 5. Aerodynamic Torque T_aero
  let aerodynamicTorque = 0;
  if (safeV > 0) {
    if (safeOmega < 0.5) {
      // Near zero RPM starting torque approximation using Cp / lambda_opt
      const lambdaOpt = 7.0; // Typical optimal tip speed ratio
      const staticTorqueCoeff = cp / lambdaOpt;
      aerodynamicTorque = 0.5 * rho * sweptArea * Math.pow(safeV, 2) * r * staticTorqueCoeff;
    } else {
      aerodynamicTorque = turbinePowerWatts / safeOmega;
    }
  }

  // 6. Load Torque T_load = c_gen * omega + T_fric
  let loadTorque = 0;
  if (safeOmega > 0 || aerodynamicTorque > params.mechanicalFriction) {
    loadTorque = params.generatorLoadConstant * safeOmega + params.mechanicalFriction;
  } else {
    // Static friction prevents motion if aerodynamic torque is below break-away threshold
    loadTorque = aerodynamicTorque;
  }

  // 7. Net Torque T_net = T_aero - T_load
  const netTorque = aerodynamicTorque - loadTorque;

  // 8. Rotor Inertia J
  const J = calculateRotorInertia(params);

  // 9. Angular Acceleration alpha = T_net / J (rad/s^2)
  const angularAcceleration = netTorque / J;

  // 10. Update omega with Euler integration: omega_next = max(0, omega + alpha * dt)
  const nextOmega = Math.max(0, safeOmega + angularAcceleration * safeDt);
  const rotorRpm = (nextOmega * 60) / (2 * Math.PI);

  return {
    windSpeed: safeV,
    rotorRpm: isNaN(rotorRpm) ? 0 : parseFloat(rotorRpm.toFixed(2)),
    angularVelocity: isNaN(nextOmega) ? 0 : parseFloat(nextOmega.toFixed(3)),
    sweptArea: parseFloat(sweptArea.toFixed(2)),
    windPower: parseFloat(windPowerKw.toFixed(3)),
    turbinePower: parseFloat(turbinePowerKw.toFixed(3)),
    electricalPower: parseFloat(electricalPowerKw.toFixed(3)),
    aerodynamicTorque: parseFloat(aerodynamicTorque.toFixed(2)),
    loadTorque: parseFloat(loadTorque.toFixed(2)),
    netTorque: parseFloat(netTorque.toFixed(2)),
    rotorInertia: parseFloat(J.toFixed(2)),
    angularAcceleration: parseFloat(angularAcceleration.toFixed(3)),
  };
}

/**
 * Generates steady-state response curves across a wind range (0 to 30 m/s)
 * for the uncontrolled baseline turbine model (where T_aero = T_load).
 */
export function generateUncontrolledCurves(
  params: UncontrolledModelParams = DEFAULT_UNCONTROLLED_PARAMS
): UncontrolledCurvePoint[] {
  const points: UncontrolledCurvePoint[] = [];

  const r = Math.max(0.1, params.rotorRadius);
  const rho = Math.max(0.1, params.airDensity);
  const cp = Math.max(0, Math.min(0.593, params.cpCoefficient));
  const genEff = Math.max(0, Math.min(1, params.generatorEfficiency));
  const sweptArea = Math.PI * Math.pow(r, 2);
  const cGen = Math.max(0.01, params.generatorLoadConstant);
  const tFric = Math.max(0, params.mechanicalFriction);

  for (let v = 0; v <= 30; v += 0.5) {
    const windPowerW = 0.5 * rho * sweptArea * Math.pow(v, 3);
    const turbinePowerW = cp * windPowerW;
    const electricalPowerW = turbinePowerW * genEff;

    // Steady state equilibrium condition: T_aero = T_load
    // P_turbine / omega = cGen * omega + tFric => cGen * omega^2 + tFric * omega - P_turbine = 0
    let omegaEq = 0;
    let tAeroEq = 0;

    if (v > 0 && turbinePowerW > 0) {
      // Quadratic formula: (-b + sqrt(b^2 - 4ac)) / (2a)
      const discriminant = Math.pow(tFric, 2) + 4 * cGen * turbinePowerW;
      if (discriminant >= 0) {
        omegaEq = (-tFric + Math.sqrt(discriminant)) / (2 * cGen);
        omegaEq = Math.max(0, omegaEq);
      }
      tAeroEq = omegaEq > 0 ? turbinePowerW / omegaEq : 0;
    }

    const rpmEq = (omegaEq * 60) / (2 * Math.PI);

    points.push({
      windSpeed: Number(v.toFixed(1)),
      windPowerKw: Number((windPowerW / 1000).toFixed(3)),
      turbinePowerKw: Number((turbinePowerW / 1000).toFixed(3)),
      electricalPowerKw: Number((electricalPowerW / 1000).toFixed(3)),
      equilibriumRpm: Number(rpmEq.toFixed(1)),
      aerodynamicTorqueNm: Number(tAeroEq.toFixed(1)),
    });
  }

  return points;
}
