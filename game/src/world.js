// Core simulation state container and fixed-timestep update coordinator for Velvet & Voltage.

import { ALARM_CFG } from './config.js';
import { triggerGadget, updateGadgetEffects } from './gadgets.js';
import { updateCamerasAndLasers, updateGuards } from './guards.js';
import { buildLevelState } from './levels.js';
import { createPlayer, updatePlayer } from './player.js';

export function createHeistWorld(levelIndex = 0) {
  const level = buildLevelState(levelIndex);
  const state = {
    levelIndex,
    level,
    player: createPlayer(level.playerStart, level.def.startingGadgets),
    elapsed: 0,
    frameCount: 0,
    alarm: 0,
    maxAlarmReached: 0,
    lastSpotter: null,
    guardExposure: 0,
    guardSpotter: null,
    hasPrimaryLoot: false,
    lootCollected: 0,
    bonusCount: 0,
    gadgetCost: 0,
    extracted: false,
    caught: false,
    reconMode: false,
    decoys: [],
    empWaves: [],
    smokeClouds: [],
    noiseRings: [],
    pendingSounds: [],
    callouts: [],
    events: [],
  };

  // Run one zero-dt update so initial vision cone polygons exist on frame 0.
  updateGuards(state, 0, []);
  updateCamerasAndLasers(state, 0);
  return state;
}

export function stepHeistWorld(state, controls, dt) {
  state.events.length = 0;
  state.elapsed += dt;
  state.frameCount += 1;

  updatePlayer(state, controls, dt);

  const sounds = state.pendingSounds.splice(0, state.pendingSounds.length);
  const guardRes = updateGuards(state, dt, sounds);
  state.guardExposure = guardRes.maxExposure;
  state.guardSpotter = guardRes.spottedBy;

  updateCamerasAndLasers(state, dt);
  updateGadgetEffects(state, dt);

  state.maxAlarmReached = Math.max(state.maxAlarmReached, state.alarm);
  if (state.alarm >= ALARM_CFG.max && !state.caught) {
    state.caught = true;
    state.events.push('lockdown');
  }
  return state.events;
}

export function useWorldGadget(state, slotKey, aimX, aimY) {
  return triggerGadget(state, slotKey, aimX, aimY);
}
