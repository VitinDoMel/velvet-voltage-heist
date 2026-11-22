// Core constants, physics tuning, gadget costs, and Noir-Blueprint palette for Velvet & Voltage.

export const CANVAS = {
  width: 1280,
  height: 720,
};

export const GRID = {
  tile: 40,
  cols: 31,
  rows: 14,
  offsetX: 20,
  offsetY: 76,
};

export const STEP = 1 / 60;

export const PLAYER_CFG = {
  radius: 11,
  walkSpeed: 158,
  sneakSpeed: 96,
  sprintSpeed: 232,
  walkNoiseRadius: 72,
  sprintNoiseRadius: 165,
  sneakNoiseRadius: 0,
  interactRadius: 46,
  hackDuration: 1.35,
  lockpickDuration: 1.15,
};

export const GUARD_CFG = {
  radius: 12,
  patrolSpeed: 74,
  investigateSpeed: 98,
  chaseSpeed: 148,
  visionRange: 195,
  heavyVisionRange: 225,
  visionFov: Math.PI * 0.44,
  heavyVisionFov: Math.PI * 0.36,
  shadowDetectScale: 0.58,
  suspicionRisePerSec: 115,
  suspicionDecayPerSec: 28,
};

export const CAMERA_CFG = {
  visionRange: 210,
  visionFov: Math.PI * 0.34,
  alarmRisePerSec: 88,
};

export const GADGETS = {
  decoy: {
    id: 'decoy',
    key: '1',
    name: 'Acoustic Decoy',
    short: 'Decoy',
    cost: 250,
    noiseRadius: 250,
    duration: 4.5,
  },
  emp: {
    id: 'emp',
    key: '2',
    name: 'EMP Surge',
    short: 'EMP',
    cost: 500,
    radius: 210,
    duration: 6.5,
  },
  smoke: {
    id: 'smoke',
    key: '3',
    name: 'Smoke Veil',
    short: 'Smoke',
    cost: 350,
    radius: 82,
    duration: 5.5,
  },
};

export const ALARM_CFG = {
  max: 100,
  cautionThreshold: 25,
  dangerThreshold: 60,
  decayPerSec: 7.5,
  extractionBoost: 1.15,
};

export const PALETTE = {
  bg: '#070b12',
  hudBg: '#0b1220',
  hudBorder: '#1f3252',
  floorBase: '#0e1726',
  floorGrid: 'rgba(74, 130, 210, 0.08)',
  floorMarble: '#132036',
  floorVault: '#171c2b',
  shadowCover: '#060c14',
  shadowBorder: 'rgba(56, 242, 175, 0.36)',
  wallFill: '#1a2740',
  wallTop: '#243656',
  wallStroke: '#6da8ff',
  doorClosed: '#f4a261',
  doorOpen: 'rgba(244, 162, 97, 0.22)',
  thiefBody: '#e8f1ff',
  thiefVisor: '#38f2af',
  thiefSneakRing: 'rgba(56, 242, 175, 0.45)',
  guardBody: '#ff9f43',
  guardHeavy: '#ff6b6b',
  conePatrol: 'rgba(255, 195, 70, 0.26)',
  coneSuspect: 'rgba(255, 125, 45, 0.34)',
  coneAlert: 'rgba(255, 58, 82, 0.44)',
  cameraBody: '#5ce1e6',
  cameraCone: 'rgba(255, 72, 138, 0.24)',
  cameraDisabled: 'rgba(110, 130, 160, 0.25)',
  laserActive: '#ff3b6b',
  lootGold: '#ffd166',
  lootBonus: '#38f2af',
  terminalCyan: '#48cae4',
  extractZone: '#38f2af',
  smokeFill: 'rgba(185, 210, 235, 0.36)',
  empRing: '#5ce1e6',
  decoyPulse: '#ffd166',
};
