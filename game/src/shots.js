// Deterministic screenshot staging (?shot=action|recon|tension|getaway) driven by real simulation steps.

import { GRID, STEP } from './config.js';
import { SCREEN_DEBRIEF, SCREEN_PLAY } from './renderer.js';
import { createHeistWorld, stepHeistWorld, useWorldGadget } from './world.js';

function cellPoint(col, row) {
  return {
    x: GRID.offsetX + (col + 0.5) * GRID.tile,
    y: GRID.offsetY + (row + 0.5) * GRID.tile,
  };
}

function driveToward(state, targetX, targetY, options = {}) {
  const { sneak = false, interact = false, maxSteps = 260, stopDist = 10 } = options;
  for (let i = 0; i < maxSteps; i += 1) {
    const dx = targetX - state.player.x;
    const dy = targetY - state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= stopDist && !interact) break;
    const moveX = dist > stopDist ? dx / dist : 0;
    const moveY = dist > stopDist ? dy / dist : 0;
    stepHeistWorld(state, { moveX, moveY, sneak, sprint: false, interact }, STEP);
    if (interact && state.player.interactTarget === null && dist <= stopDist + 16) break;
  }
}

export function stageScreenshot(shotName) {
  if (shotName === 'recon') {
    const state = createHeistWorld(1);
    state.reconMode = true;
    driveToward(state, cellPoint(5, 2).x, cellPoint(5, 2).y, { sneak: true });
    driveToward(state, cellPoint(6, 2).x, cellPoint(6, 2).y, { sneak: true, interact: true, maxSteps: 110 });
    driveToward(state, cellPoint(13.5, 2).x, cellPoint(13.5, 2).y, { sneak: true, maxSteps: 220 });
    useWorldGadget(state, 'emp');
    for (let i = 0; i < 20; i += 1) {
      stepHeistWorld(state, { moveX: 0.7, moveY: 0.35, sneak: true, sprint: false, interact: false }, STEP);
    }
    state.alarm = Math.max(state.alarm, 22);
    return { state, screen: SCREEN_PLAY };
  }

  if (shotName === 'tension') {
    const state = createHeistWorld(2);
    driveToward(state, cellPoint(5, 2).x, cellPoint(5, 2).y, { sneak: false, maxSteps: 120 });
    driveToward(state, cellPoint(6, 2).x, cellPoint(6, 2).y, { sneak: false, interact: true, maxSteps: 110 });
    driveToward(state, cellPoint(14.5, 4.5).x, cellPoint(14.5, 4.5).y, { sneak: false, maxSteps: 260 });
    useWorldGadget(state, 'smoke');
    for (let i = 0; i < 34; i += 1) {
      stepHeistWorld(state, { moveX: 0.9, moveY: 0.15, sneak: false, sprint: false, interact: false }, STEP);
    }
    state.alarm = Math.max(state.alarm, 72);
    if (state.level.guards[1]) {
      state.level.guards[1].mode = 'alert';
      state.level.guards[1].suspicion = 82;
    }
    return { state, screen: SCREEN_PLAY };
  }

  if (shotName === 'getaway') {
    const state = createHeistWorld(0);
    driveToward(state, cellPoint(5, 2).x, cellPoint(5, 2).y, { sneak: true, maxSteps: 140 });
    driveToward(state, cellPoint(6, 2).x, cellPoint(6, 2).y, { sneak: true, interact: true, maxSteps: 110 });
    driveToward(state, cellPoint(11, 1).x, cellPoint(11, 1).y, { sneak: true, maxSteps: 170 });
    driveToward(state, cellPoint(14, 1).x, cellPoint(14, 1).y, { sneak: true, interact: true, maxSteps: 130 });
    driveToward(state, cellPoint(26, 3).x, cellPoint(26, 3).y, { sneak: true, interact: true, maxSteps: 360 });
    driveToward(state, state.level.primaryLoot.x, state.level.primaryLoot.y, { sneak: true, maxSteps: 120 });
    driveToward(state, state.level.extractRect.x + 30, state.level.extractRect.y + 30, { sneak: true, maxSteps: 760 });
    state.hasPrimaryLoot = true;
    state.level.primaryLoot.collected = true;
    state.lootCollected = Math.max(state.lootCollected, state.level.primaryLoot.value + 3500);
    state.bonusCount = Math.max(state.bonusCount, 1);
    state.extracted = true;
    state.maxAlarmReached = Math.min(state.maxAlarmReached, 14);
    return { state, screen: SCREEN_DEBRIEF };
  }

  // Default & cover shot ('action'): thief crossing gallery toward vault,
  // guards with raycasted vision cones, active cameras, decoy lure, loot target, and alarm meter.
  const state = createHeistWorld(0);
  driveToward(state, cellPoint(5, 2).x, cellPoint(5, 2).y, { sneak: true, maxSteps: 130 });
  driveToward(state, cellPoint(6, 2).x, cellPoint(6, 2).y, { sneak: true, interact: true, maxSteps: 100 });
  driveToward(state, cellPoint(14.5, 6.2).x, cellPoint(14.5, 6.2).y, { sneak: true, maxSteps: 280 });
  const decoyTarget = cellPoint(10.5, 6.2);
  useWorldGadget(state, 'decoy', decoyTarget.x, decoyTarget.y);
  for (let i = 0; i < 44; i += 1) {
    stepHeistWorld(state, { moveX: 0.95, moveY: 0.25, sneak: true, sprint: false, interact: false }, STEP);
  }
  state.alarm = Math.max(state.alarm, 29);
  if (state.level.guards[0]) {
    state.level.guards[0].mode = 'investigate';
    state.level.guards[0].suspicion = 34;
  }
  return { state, screen: SCREEN_PLAY };
}
