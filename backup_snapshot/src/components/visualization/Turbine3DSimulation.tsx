import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SimulationState } from '../../types/simulation';
import {
  Maximize2,
  Minimize2,
  Eye,
  Layers,
  Sparkles,
  Camera,
  Compass,
  RotateCcw,
  Sliders,
  Wind,
  Zap,
  Gauge,
  ShieldCheck,
} from 'lucide-react';

interface Turbine3DSimulationProps {
  state: SimulationState;
  isPaused?: boolean;
  simSpeed?: number;
  viewMode?: 'operation' | 'mechanism';
  setViewMode?: (mode: 'operation' | 'mechanism') => void;
  explodedView?: boolean;
  setExplodedView?: (exploded: boolean | ((prev: boolean) => boolean)) => void;
  className?: string;
  showCameraControls?: boolean;
  showHud?: boolean;
}

// Custom Airfoil Cross-Section Shape Builder
function createAirfoilShape(): THREE.Shape {
  const shape = new THREE.Shape();
  // NACA-like cambered airfoil curve
  shape.moveTo(0, 0); // Leading edge
  shape.bezierCurveTo(0.2, 0.18, 0.6, 0.22, 1.2, 0.15); // Upper surface
  shape.bezierCurveTo(2.0, 0.08, 3.2, 0.02, 4.0, 0.0);  // Trailing edge
  shape.bezierCurveTo(3.2, -0.02, 2.0, -0.04, 1.2, -0.08); // Lower surface
  shape.bezierCurveTo(0.6, -0.12, 0.2, -0.1, 0, 0);   // Return to LE
  return shape;
}

// Custom Helical Spring Curve
class HelixCurve extends THREE.Curve<THREE.Vector3> {
  radius: number;
  pitch: number;
  turns: number;

  constructor(radius = 0.35, pitch = 0.2, turns = 7) {
    super();
    this.radius = radius;
    this.pitch = pitch;
    this.turns = turns;
  }

  getPoint(t: number, optionalTarget = new THREE.Vector3()): THREE.Vector3 {
    const angle = t * Math.PI * 2 * this.turns;
    const x = this.radius * Math.cos(angle);
    const y = this.radius * Math.sin(angle);
    const z = (t - 0.5) * this.pitch * this.turns;
    return optionalTarget.set(x, y, z);
  }
}

export const Turbine3DSimulation: React.FC<Turbine3DSimulationProps> = ({
  state,
  isPaused = false,
  simSpeed = 1.0,
  viewMode: controlledViewMode,
  setViewMode: controlledSetViewMode,
  explodedView: controlledExplodedView,
  setExplodedView: controlledSetExplodedView,
  className,
  showCameraControls = true,
  showHud = true,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'operation' | 'mechanism'>('operation');
  const [internalExplodedView, setInternalExplodedView] = useState<boolean>(false);

  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = controlledSetViewMode || setInternalViewMode;
  const explodedView = controlledExplodedView !== undefined ? controlledExplodedView : internalExplodedView;
  const setExplodedView = controlledSetExplodedView || setInternalExplodedView;

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Dynamic 3D Object references
  const rotorGroupRef = useRef<THREE.Group | null>(null);
  const yawGroupRef = useRef<THREE.Group | null>(null);
  const bladeGroupsRef = useRef<THREE.Group[]>([]);
  const bladeMeshHoldersRef = useRef<THREE.Group[]>([]);
  const flyballArmsRef = useRef<{ arm: THREE.Mesh; ball: THREE.Mesh; sign: number }[]>([]);
  const sleeveMeshRef = useRef<THREE.Mesh | null>(null);
  const springMeshRef = useRef<THREE.Mesh | null>(null);
  const pitchRodsRef = useRef<THREE.Mesh[]>([]);
  const nacelleShellRef = useRef<THREE.Mesh | null>(null);
  const spinnerMeshRef = useRef<THREE.Mesh | null>(null);
  const hubShellRef = useRef<THREE.Mesh | null>(null);
  const explodedGuidesGroupRef = useRef<THREE.Group | null>(null);
  const windParticlesRef = useRef<THREE.Points | null>(null);

  // State & Camera Targets
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(14, 20, 24));
  const targetCamLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 15, 0));
  const currentRotationAngleRef = useRef<number>(0);
  const explodedFactorRef = useRef<number>(0);

  // Latest props ref for 60fps RAF loop
  const latestPropsRef = useRef({
    state,
    isPaused,
    simSpeed,
    viewMode,
    explodedView,
  });
  latestPropsRef.current = {
    state,
    isPaused,
    simSpeed,
    viewMode,
    explodedView,
  };

  // UI Local overlay state
  const [activeCameraAngle, setActiveCameraAngle] = useState<'iso' | 'front' | 'side' | 'macro' | 'top'>('iso');

  // Handle Preset Camera Transitions
  const setCameraPreset = useCallback((preset: 'iso' | 'front' | 'side' | 'macro' | 'top') => {
    setActiveCameraAngle(preset);
    if (preset === 'iso') {
      targetCamPosRef.current.set(16, 21, 26);
      targetCamLookRef.current.set(0, 16, 0);
    } else if (preset === 'front') {
      targetCamPosRef.current.set(0, 18, 32);
      targetCamLookRef.current.set(0, 18, 0);
    } else if (preset === 'side') {
      targetCamPosRef.current.set(32, 18, 2);
      targetCamLookRef.current.set(0, 18, 2);
    } else if (preset === 'macro') {
      targetCamPosRef.current.set(2.5, 18.8, 6.5);
      targetCamLookRef.current.set(0, 18, 3.2);
    } else if (preset === 'top') {
      targetCamPosRef.current.set(0, 36, 1);
      targetCamLookRef.current.set(0, 18, 0);
    }
  }, []);

  // Synchronize preset camera when viewMode changes
  useEffect(() => {
    if (viewMode === 'mechanism') {
      setCameraPreset('macro');
    } else {
      setCameraPreset('iso');
    }
  }, [viewMode, setCameraPreset]);

  // Main Three.js Scene Initialization
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 450;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Subtle atmospheric fog
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.012);

    // 2. CAMERA SETUP
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
    camera.position.copy(targetCamPosRef.current);
    cameraRef.current = camera;

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Canvas DOM mount
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. ORBIT CONTROLS SETUP
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // allow near ground level
    controls.minDistance = 2.0;
    controls.maxDistance = 75.0;
    controls.target.copy(targetCamLookRef.current);
    controlsRef.current = controls;

    // 5. LIGHTING RIG
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Main Sun Key Light
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    sunLight.position.set(25, 45, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -20;
    sunLight.shadow.camera.right = 20;
    sunLight.shadow.camera.top = 20;
    sunLight.shadow.camera.bottom = -20;
    scene.add(sunLight);

    // Subtle Cyan Rim Light
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.9);
    rimLight.position.set(-25, 20, -25);
    scene.add(rimLight);

    // Internal Nacelle / Hub Accent Light
    const hubPointLight = new THREE.PointLight(0xf59e0b, 1.2, 10);
    hubPointLight.position.set(0, 18, 3.5);
    scene.add(hubPointLight);

    // 6. ENVIRONMENT: TECH GROUND GRID & COMPASS RING
    const groundGroup = new THREE.Group();
    
    // Polar Tech Grid
    const polarGrid = new THREE.PolarGridHelper(32, 16, 8, 64, 0x334155, 0x1e293b);
    polarGrid.position.y = 0.02;
    groundGroup.add(polarGrid);

    // Circular base plane with soft shadow receiver
    const groundGeo = new THREE.CircleGeometry(32, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x070d19,
      roughness: 0.85,
      metalness: 0.2,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundGroup.add(groundMesh);

    // Compass Orientation Ring
    const ringGeo = new THREE.RingGeometry(18, 18.25, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, opacity: 0.4, transparent: true, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.03;
    groundGroup.add(ringMesh);

    scene.add(groundGroup);

    // 7. TURBINE TOWER & FOUNDATION (Stationary Group)
    const towerGroup = new THREE.Group();

    // Foundation Base Plinth
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.8, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.4;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    towerGroup.add(baseMesh);

    // Main Tapered Monopile Tower (y = 0.8 to y = 17.5)
    const towerGeo = new THREE.CylinderGeometry(0.7, 1.5, 17, 32);
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.35,
      metalness: 0.5,
    });
    const towerMesh = new THREE.Mesh(towerGeo, towerMat);
    towerMesh.position.y = 9.3;
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    towerGroup.add(towerMesh);

    // Flange Rings on Tower
    [4.5, 9.0, 13.5].forEach((yPos) => {
      const flangeGeo = new THREE.TorusGeometry(0.75 + (17.5 - yPos) * 0.045, 0.04, 16, 32);
      const flangeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
      const flange = new THREE.Mesh(flangeGeo, flangeMat);
      flange.rotation.x = Math.PI / 2;
      flange.position.y = yPos;
      towerGroup.add(flange);
    });

    // Yaw Bearing Top Cap (y = 17.8)
    const yawCapGeo = new THREE.CylinderGeometry(0.85, 0.75, 0.6, 32);
    const yawCapMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.8 });
    const yawCapMesh = new THREE.Mesh(yawCapGeo, yawCapMat);
    yawCapMesh.position.y = 17.8;
    towerGroup.add(yawCapMesh);

    scene.add(towerGroup);

    // 8. NACELLE & YAW ROTATING ASSEMBLY (Pivot at (0, 18, 0))
    const yawGroup = new THREE.Group();
    yawGroup.position.set(0, 18, 0);
    yawGroupRef.current = yawGroup;

    // Aerodynamic Nacelle Shell
    const nacelleLength = 4.2;
    const nacelleGeo = new THREE.CapsuleGeometry(0.95, nacelleLength, 16, 32);
    const nacelleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.95,
    });
    const nacelleMesh = new THREE.Mesh(nacelleGeo, nacelleMat);
    nacelleMesh.rotation.x = Math.PI / 2;
    nacelleMesh.position.set(0, 0.3, 0.2);
    nacelleMesh.castShadow = true;
    nacelleShellRef.current = nacelleMesh;
    yawGroup.add(nacelleMesh);

    // Internal Generator & Mechanical Housing
    const genGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 24);
    const genMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.85 });
    const genMesh = new THREE.Mesh(genGeo, genMat);
    genMesh.rotation.x = Math.PI / 2;
    genMesh.position.set(0, 0.3, -0.4);
    yawGroup.add(genMesh);

    // Generator Cooling Fins
    const finGeo = new THREE.BoxGeometry(1.6, 0.04, 1.6);
    const finMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, metalness: 0.9 });
    for (let f = 0; f < 5; f++) {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(0, 0.3, -1.0 + f * 0.3);
      yawGroup.add(fin);
    }

    // Rear Wind Vane & Anemometer on Nacelle Roof
    const vanePostGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 12);
    const vanePostMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const vanePost = new THREE.Mesh(vanePostGeo, vanePostMat);
    vanePost.position.set(0, 1.4, -1.5);
    yawGroup.add(vanePost);

    const vaneFinGeo = new THREE.ConeGeometry(0.18, 0.4, 8);
    const vaneFinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const vaneFin = new THREE.Mesh(vaneFinGeo, vaneFinMat);
    vaneFin.rotation.z = -Math.PI / 2;
    vaneFin.position.set(0, 1.7, -1.5);
    yawGroup.add(vaneFin);

    // Main Drive Shaft Bearing Block (front of nacelle)
    const bearingGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.6, 24);
    const bearingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
    const bearingMesh = new THREE.Mesh(bearingGeo, bearingMat);
    bearingMesh.rotation.x = Math.PI / 2;
    bearingMesh.position.set(0, 0.3, 2.2);
    yawGroup.add(bearingMesh);

    // 9. ROTATING ROTOR ASSEMBLY (Spins around Z-axis at (0, 0.3, 2.7))
    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 0.3, 2.7);
    rotorGroupRef.current = rotorGroup;
    yawGroup.add(rotorGroup);

    // Main Drive Shaft passing through hub
    const shaftGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.2, 24);
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftMesh.rotation.x = Math.PI / 2;
    shaftMesh.position.set(0, 0, 0.3);
    rotorGroup.add(shaftMesh);

    // Central Rotor Hub Casting
    const hubGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.9, 32);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 });
    const hubMesh = new THREE.Mesh(hubGeo, hubMat);
    hubMesh.rotation.x = Math.PI / 2;
    hubMesh.position.set(0, 0, 0.5);
    hubMesh.castShadow = true;
    hubShellRef.current = hubMesh;
    rotorGroup.add(hubMesh);

    // Aerodynamic Spinner Nose Cone (Offset forward)
    const spinnerGeo = new THREE.ConeGeometry(0.85, 1.4, 32);
    const spinnerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.8,
    });
    const spinnerMesh = new THREE.Mesh(spinnerGeo, spinnerMat);
    spinnerMesh.rotation.x = Math.PI / 2;
    spinnerMesh.position.set(0, 0, 1.6);
    spinnerMesh.castShadow = true;
    spinnerMeshRef.current = spinnerMesh;
    rotorGroup.add(spinnerMesh);

    // 10. CENTRIFUGAL MECHANICAL GOVERNOR (Centrifugal Flyweights, Helical Spring, Sliding Sleeve)
    // Dynamic Helical Spring
    const helixCurve = new HelixCurve(0.32, 0.08, 6);
    const springGeo = new THREE.TubeGeometry(helixCurve, 64, 0.045, 12, false);
    const springMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.15,
    });
    const springMesh = new THREE.Mesh(springGeo, springMat);
    springMesh.position.set(0, 0, 0.3);
    springMeshRef.current = springMesh;
    rotorGroup.add(springMesh);

    // Swashplate Sliding Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.5, 24);
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25,
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeveMesh.rotation.x = Math.PI / 2;
    sleeveMesh.position.set(0, 0, 0.7);
    sleeveMeshRef.current = sleeveMesh;
    rotorGroup.add(sleeveMesh);

    // Flyweight Scissor Arms & Brass Flyball Masses (2 opposing flyballs)
    const flyballPairs: { arm: THREE.Mesh; ball: THREE.Mesh; sign: number }[] = [];
    [-1, 1].forEach((sign) => {
      const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 12);
      const armMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9 });
      const armMesh = new THREE.Mesh(armGeo, armMat);
      armMesh.position.set(0, sign * 0.45, 0.7);

      const ballGeo = new THREE.SphereGeometry(0.18, 24, 24);
      const ballMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.95,
        roughness: 0.1,
      });
      const ballMesh = new THREE.Mesh(ballGeo, ballMat);
      ballMesh.position.set(0, sign * 0.85, 0.7);
      ballMesh.castShadow = true;

      rotorGroup.add(armMesh);
      rotorGroup.add(ballMesh);
      flyballPairs.push({ arm: armMesh, ball: ballMesh, sign });
    });
    flyballArmsRef.current = flyballPairs;

    // Pitch Linkage Rods (Connecting sleeve to blade root horns)
    const pitchRods: THREE.Mesh[] = [];
    const rodGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.75, 12);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x34d399, metalness: 0.85, roughness: 0.2 });
    [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((angle) => {
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.set(0.4 * Math.cos(angle), 0.4 * Math.sin(angle), 0.8);
      rotorGroup.add(rod);
      pitchRods.push(rod);
    });
    pitchRodsRef.current = pitchRods;

    // 11. THREE REAL 3D AEROFOIL BLADES WITH DYNAMIC AXIAL PITCH
    const bladeAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
    const bladeGroups: THREE.Group[] = [];
    const bladeMeshHolders: THREE.Group[] = [];

    // Extrude 3D Airfoil Geometry
    const airfoilShape = createAirfoilShape();
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      steps: 24,
      depth: 9.5, // Blade length
      bevelEnabled: true,
      bevelThickness: 0.1,
      bevelSize: 0.05,
      bevelSegments: 4,
    };
    const bladeGeo = new THREE.ExtrudeGeometry(airfoilShape, extrudeSettings);
    // Center airfoil geometry along span
    bladeGeo.center();

    // High performance aerodynamic blade materials
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.25,
      metalness: 0.4,
    });

    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.3,
      metalness: 0.3,
    });

    bladeAngles.forEach((radAngle) => {
      // 1. Blade Root Mount Group (Fixed at 120° angles around hub perimeter)
      const rootMountGroup = new THREE.Group();
      rootMountGroup.rotation.z = radAngle;
      rootMountGroup.position.set(0, 0, 0.5);

      // Root Pitch Bearing Housing Cylinder
      const bearingGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.7, 24);
      const bearingMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
      const rootBearing = new THREE.Mesh(bearingGeo, bearingMat);
      rootBearing.position.set(0, 0.9, 0);
      rootMountGroup.add(rootBearing);

      // Root Pitch Horn (Connecting to governor rod)
      const hornGeo = new THREE.BoxGeometry(0.12, 0.35, 0.25);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x34d399, metalness: 0.8 });
      const horn = new THREE.Mesh(hornGeo, hornMat);
      horn.position.set(0.15, 0.85, 0.15);
      rootMountGroup.add(horn);

      // 2. Pitch Rotation Axis Group (Rotates along blade length Y-axis based on pitchAngle!)
      const pitchPivotGroup = new THREE.Group();
      pitchPivotGroup.position.set(0, 1.2, 0);

      // 3. Blade Span Mesh (Oriented pointing radially outwards)
      const bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
      bladeMesh.scale.set(0.35, 0.35, 1.0);
      bladeMesh.rotation.x = Math.PI / 2; // Point along Y
      bladeMesh.position.set(0, 4.8, 0);
      bladeMesh.castShadow = true;
      pitchPivotGroup.add(bladeMesh);

      // Hi-Vis Red Warning Tip Stripes
      const tipGeo = new THREE.BoxGeometry(0.3, 0.9, 0.08);
      const tipMesh = new THREE.Mesh(tipGeo, tipMat);
      tipMesh.position.set(0, 9.2, 0);
      pitchPivotGroup.add(tipMesh);

      rootMountGroup.add(pitchPivotGroup);
      rotorGroup.add(rootMountGroup);

      bladeGroups.push(rootMountGroup);
      bladeMeshHolders.push(pitchPivotGroup);
    });

    bladeGroupsRef.current = bladeGroups;
    bladeMeshHoldersRef.current = bladeMeshHolders;

    // 12. EXPLODED VIEW 3D ANNOTATION / VECTOR GUIDELINES
    const guidesGroup = new THREE.Group();
    guidesGroup.visible = false;

    // Guide Axis line
    const guideLineMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 0.3,
      gapSize: 0.2,
      linewidth: 1.5,
    });
    const guidePoints = [
      new THREE.Vector3(0, 0, -2.5),
      new THREE.Vector3(0, 0, 5.0),
    ];
    const guideGeo = new THREE.BufferGeometry().setFromPoints(guidePoints);
    const guideLine = new THREE.Line(guideGeo, guideLineMat);
    guideLine.computeLineDistances();
    guidesGroup.add(guideLine);

    rotorGroup.add(guidesGroup);
    explodedGuidesGroupRef.current = guidesGroup;

    // 13. 3D DYNAMIC WIND STREAMLINE PARTICLES
    const particleCount = 280;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);

    for (let p = 0; p < particleCount; p++) {
      particlePositions[p * 3] = (Math.random() - 0.5) * 28;
      particlePositions[p * 3 + 1] = 6 + Math.random() * 26;
      particlePositions[p * 3 + 2] = -18 + Math.random() * 36;

      particleVelocities[p * 3] = 0;
      particleVelocities[p * 3 + 1] = (Math.random() - 0.5) * 0.1;
      particleVelocities[p * 3 + 2] = 1.0 + Math.random() * 0.8;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.25,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    windParticlesRef.current = particles;

    scene.add(yawGroup);

    // 14. RESIZE OBSERVER FOR CONTAINER DIMENSIONS
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // 15. MAIN RENDER & ANIMATION LOOP
    let lastTime = performance.now();

    const animate = (time: number) => {
      const deltaSec = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      const {
        state: curState,
        isPaused: curPaused,
        simSpeed: curSimSpeed,
        viewMode: curViewMode,
        explodedView: curExploded,
      } = latestPropsRef.current;

      // Camera Position Smooth Lerp
      camera.position.lerp(targetCamPosRef.current, 0.08);
      controls.target.lerp(targetCamLookRef.current, 0.08);
      controls.update();

      // Exploded View Smooth Lerp
      const targetExploded = curExploded ? 1.0 : 0.0;
      explodedFactorRef.current = THREE.MathUtils.lerp(explodedFactorRef.current, targetExploded, 0.1);
      const ef = explodedFactorRef.current;

      // Update Exploded Component Offsets
      if (spinnerMeshRef.current) {
        spinnerMeshRef.current.position.z = 1.6 + ef * 1.8;
      }
      if (hubShellRef.current) {
        hubShellRef.current.position.z = 0.5 + ef * 0.4;
      }
      if (sleeveMeshRef.current) {
        // Base sleeve displacement + exploded offset
        const baseDisp = (curState.sleeveDisplacement / 0.06) * 0.35;
        sleeveMeshRef.current.position.z = 0.7 + baseDisp + ef * 0.9;
      }
      if (springMeshRef.current) {
        // Dynamic spring compression
        const compressionScale = 1.0 - (curState.sleeveDisplacement / 0.06) * 0.35;
        springMeshRef.current.scale.set(1, 1, Math.max(0.4, compressionScale + ef * 0.6));
      }
      if (nacelleShellRef.current) {
        // Transparent in mechanism or exploded mode
        const mat = nacelleShellRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = (curViewMode === 'mechanism' || ef > 0.1) ? 0.3 : 0.95;
      }
      if (explodedGuidesGroupRef.current) {
        explodedGuidesGroupRef.current.visible = ef > 0.05;
      }

      // Smooth Yaw Orientation to Wind Direction
      if (yawGroupRef.current) {
        const targetYawRad = (curState.windDirection * Math.PI) / 180;
        yawGroupRef.current.rotation.y = THREE.MathUtils.lerp(
          yawGroupRef.current.rotation.y,
          targetYawRad,
          0.04
        );
      }

      // Real Rotor Rotation at State RPM
      if (!curPaused && curState.rotorRpm > 0 && rotorGroupRef.current) {
        const radPerSec = ((curState.rotorRpm * 2 * Math.PI) / 60) * curSimSpeed;
        currentRotationAngleRef.current += radPerSec * deltaSec;
        rotorGroupRef.current.rotation.z = currentRotationAngleRef.current;
      }

      // Dynamic Blade Pitch Physical Rotation (around Y axis of pitchPivotGroup)
      const pitchRad = (curState.pitchAngle * Math.PI) / 180;
      bladeMeshHoldersRef.current.forEach((holder) => {
        // Pivots blade so that higher angle feathers edge to wind
        holder.rotation.y = THREE.MathUtils.lerp(holder.rotation.y, pitchRad, 0.12);
      });

      // Exploded Blade Radial Displacement
      bladeGroupsRef.current.forEach((bg, idx) => {
        const radAngle = bladeAngles[idx];
        const radialDist = 0.5 + ef * 1.5;
        bg.position.set(
          Math.sin(radAngle) * ef * 0.8,
          Math.cos(radAngle) * ef * 0.8,
          radialDist
        );
      });

      // Flyweight Centrifugal Expansion
      const sleevePct = Math.min(1, Math.max(0, curState.sleeveDisplacement / 0.06));
      flyballArmsRef.current.forEach(({ arm, ball, sign }) => {
        const flyballRadius = 0.45 + sleevePct * 0.4 + ef * 0.5;
        arm.position.y = sign * (flyballRadius * 0.6);
        ball.position.y = sign * (flyballRadius + 0.15);
      });

      // Update 3D Wind Flow Particles
      if (windParticlesRef.current) {
        const positions = windParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const windSpeedScaled = Math.max(0.5, curState.windSpeed) * curSimSpeed * deltaSec * 8.0;
        const windYaw = (curState.windDirection * Math.PI) / 180;
        const cosYaw = Math.cos(windYaw);
        const sinYaw = Math.sin(windYaw);

        for (let p = 0; p < particleCount; p++) {
          const idx = p * 3;
          let px = positions[idx];
          let py = positions[idx + 1];
          let pz = positions[idx + 2];

          // Advance along wind vector
          px += sinYaw * windSpeedScaled;
          pz += cosYaw * windSpeedScaled;

          // Relative coordinates to hub center (0, 18, 0)
          const rx = px;
          const ry = py - 18;
          const rz = pz;

          // Project into wind-aligned coordinates:
          // s: streamwise (along wind direction)
          // c: crosswind (perpendicular horizontal)
          // h: vertical offset
          let s = rx * sinYaw + rz * cosYaw;
          let c = rx * cosYaw - rz * sinYaw;
          let h = ry;

          let needsRecycle = false;

          // Streamwise bounds: [-22, 22] (44m span)
          if (s > 22) {
            s = -22 + ((s - 22) % 44);
            c = (Math.random() - 0.5) * 28;
            h = (Math.random() - 0.5) * 24;
            needsRecycle = true;
          } else if (s < -22) {
            s = 22 - ((-22 - s) % 44);
            c = (Math.random() - 0.5) * 28;
            h = (Math.random() - 0.5) * 24;
            needsRecycle = true;
          }

          // Crosswind bounds: [-16, 16]
          if (c > 16 || c < -16) {
            c = (Math.random() - 0.5) * 28;
            s = (Math.random() - 0.5) * 40;
            needsRecycle = true;
          }

          // Height bounds: [-13, 13] (y between 5m and 31m)
          if (h > 13 || h < -13) {
            h = (Math.random() - 0.5) * 24;
            needsRecycle = true;
          }

          // Reconstruct world space coordinates when recycled
          if (needsRecycle) {
            px = s * sinYaw + c * cosYaw;
            pz = s * cosYaw - c * sinYaw;
            py = 18 + h;
          }

          // Fallback guard against non-finite values
          if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
            px = (Math.random() - 0.5) * 28;
            py = 6 + Math.random() * 24;
            pz = -18 + Math.random() * 36;
          }

          positions[idx] = px;
          positions[idx + 1] = py;
          positions[idx + 2] = pz;
        }

        windParticlesRef.current.geometry.attributes.position.needsUpdate = true;

        // Dynamic particle color based on speed
        const pMat = windParticlesRef.current.material as THREE.PointsMaterial;
        if (curState.windSpeed >= 22) {
          pMat.color.setHex(0xf43f5e);
        } else if (curState.windSpeed >= 14) {
          pMat.color.setHex(0xf59e0b);
        } else {
          pMat.color.setHex(0x38bdf8);
        }
      }

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // CLEANUP DISPOSAL ON UNMOUNT
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();

      // Dispose geometries and materials in scene
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [setCameraPreset]); // Runs once on mount, updates handled inside animation loop

  return (
    <div className={`relative w-full h-full select-none ${className || 'min-h-[380px] max-h-[520px]'}`}>
      {/* 3D WebGL Canvas Host Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* 3D Viewport Preset Camera Controls Overlay (Top Right) */}
      {showCameraControls && (
        <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-slate-800/80 p-1.5 rounded-2xl backdrop-blur-md shadow-xl text-[11px] font-bold z-10">
          <span className="text-[10px] text-slate-400 font-mono px-2 hidden sm:inline flex items-center gap-1">
            <Camera className="w-3 h-3 text-cyan-400" />
            <span>Camera:</span>
          </span>

          <button
            onClick={() => setCameraPreset('iso')}
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              activeCameraAngle === 'iso'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="3/4 Isometric Perspective"
          >
            3D Iso
          </button>

          <button
            onClick={() => setCameraPreset('front')}
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              activeCameraAngle === 'front'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Front Elevation Facing Rotor"
          >
            Front
          </button>

          <button
            onClick={() => setCameraPreset('side')}
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              activeCameraAngle === 'side'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Side Profile"
          >
            Side
          </button>

          <button
            onClick={() => setCameraPreset('macro')}
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              activeCameraAngle === 'macro'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Zoomed In Centrifugal Governor Mechanism"
          >
            Hub Zoom
          </button>

          <button
            onClick={() => setCameraPreset('top')}
            className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
              activeCameraAngle === 'top'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Top Down Plan View"
          >
            Top
          </button>
        </div>
      )}

      {/* Floating 3D Telemetry HUD Overlay (Top Left) */}
      {showHud && (
        <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-800/80 p-3 rounded-2xl backdrop-blur-md shadow-xl text-xs space-y-1.5 z-10 max-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>3D Aerodynamic HUD</span>
            </span>
            <span className="font-mono text-emerald-400">WebGL</span>
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-slate-400 text-[11px]">Blade Pitch (θ):</span>
            <span className="font-mono font-bold text-emerald-300">
              {state.pitchAngle.toFixed(1)}°
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Sleeve Travel:</span>
            <span className="font-mono font-bold text-amber-300">
              {(state.sleeveDisplacement * 1000).toFixed(1)} mm
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Governor Fc:</span>
            <span className="font-mono font-bold text-amber-400">
              {state.centrifugalForce.toFixed(0)} N
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-sans italic pt-1 border-t border-slate-800/60 leading-tight">
            💡 Drag to rotate 3D orbit • Scroll to zoom
          </div>
        </div>
      )}
    </div>
  );
};
