// Tactical heist gadgets (Acoustic Decoy, EMP Surge, Smoke Veil) with financial cost and active effects.

import { GADGETS, GRID } from './config.js';
import { isTileBlockingMove, worldToGrid } from './levels.js';

export function pushCallout(state, text, color = '#ffd166', x = null, y = null) {
  state.callouts.push({
    text,
    color,
    x: x ?? state.player.x,
    y: (y ?? state.player.y) - 36,
    timer: 1.9,
    maxTimer: 1.9,
  });
}

export function triggerGadget(state, slotKey, aimX, aimY) {
  const { player, level } = state;
  if (slotKey === 'decoy') {
    if (player.gadgets.decoy <= 0) {
      pushCallout(state, 'NO DECOYS LEFT', '#ff6b6b');
      return false;
    }
    // Clamp decoy throw target inside playable grid and avoid throwing inside solid walls.
    let tx = Number.isFinite(aimX) ? aimX : player.x + Math.cos(player.facing) * 110;
    let ty = Number.isFinite(aimY) ? aimY : player.y + Math.sin(player.facing) * 110;
    const dist = Math.hypot(tx - player.x, ty - player.y);
    if (dist > 260) {
      tx = player.x + ((tx - player.x) / dist) * 260;
      ty = player.y + ((ty - player.y) / dist) * 260;
    }
    const g = worldToGrid(tx, ty);
    if (isTileBlockingMove(level, g.col, g.row)) {
      tx = player.x + Math.cos(player.facing) * 72;
      ty = player.y + Math.sin(player.facing) * 72;
    }

    player.gadgets.decoy -= 1;
    state.gadgetCost += GADGETS.decoy.cost;
    state.decoys.push({
      x: tx,
      y: ty,
      radius: GADGETS.decoy.noiseRadius,
      timer: GADGETS.decoy.duration,
      pulse: 0,
    });
    state.pendingSounds.push({
      x: tx,
      y: ty,
      radius: GADGETS.decoy.noiseRadius,
      isDecoy: true,
    });
    pushCallout(state, `DECOY THROWN (-$${GADGETS.decoy.cost})`, '#ffd166', tx, ty);
    state.events.push('decoy');
    return true;
  }

  if (slotKey === 'emp') {
    if (player.gadgets.emp <= 0) {
      pushCallout(state, 'NO EMP LEFT', '#ff6b6b');
      return false;
    }
    player.gadgets.emp -= 1;
    state.gadgetCost += GADGETS.emp.cost;
    state.empWaves.push({
      x: player.x,
      y: player.y,
      radius: 14,
      maxRadius: GADGETS.emp.radius,
      timer: 0.75,
    });

    let affected = 0;
    for (let i = 0; i < level.cameras.length; i += 1) {
      const cam = level.cameras[i];
      if (Math.hypot(cam.x - player.x, cam.y - player.y) <= GADGETS.emp.radius) {
        cam.empTimer = Math.max(cam.empTimer, GADGETS.emp.duration);
        affected += 1;
      }
    }
    for (let i = 0; i < level.lasers.length; i += 1) {
      const l = level.lasers[i];
      const mx = (l.x1 + l.x2) * 0.5;
      const my = (l.y1 + l.y2) * 0.5;
      if (Math.hypot(mx - player.x, my - player.y) <= GADGETS.emp.radius) {
        l.empTimer = Math.max(l.empTimer, GADGETS.emp.duration);
        affected += 1;
      }
    }
    pushCallout(
      state,
      affected > 0 ? `EMP SURGE: ${affected} OFFLINE (-$${GADGETS.emp.cost})` : `EMP SURGE (-$${GADGETS.emp.cost})`,
      '#5ce1e6',
    );
    state.events.push('emp');
    return true;
  }

  if (slotKey === 'smoke') {
    if (player.gadgets.smoke <= 0) {
      pushCallout(state, 'NO SMOKE LEFT', '#ff6b6b');
      return false;
    }
    player.gadgets.smoke -= 1;
    state.gadgetCost += GADGETS.smoke.cost;
    state.smokeClouds.push({
      x: player.x,
      y: player.y,
      radius: GADGETS.smoke.radius,
      timer: GADGETS.smoke.duration,
      maxTimer: GADGETS.smoke.duration,
    });
    pushCallout(state, `SMOKE VEIL (-$${GADGETS.smoke.cost})`, '#b8d8f8');
    state.events.push('smoke');
    return true;
  }

  return false;
}

export function updateGadgetEffects(state, dt) {
  for (let i = state.decoys.length - 1; i >= 0; i -= 1) {
    const d = state.decoys[i];
    d.timer -= dt;
    d.pulse = (d.pulse + dt * 2.2) % 1;
    if (d.timer <= 0) state.decoys.splice(i, 1);
  }

  for (let i = state.empWaves.length - 1; i >= 0; i -= 1) {
    const w = state.empWaves[i];
    w.timer -= dt;
    const progress = 1 - Math.max(0, w.timer) / 0.75;
    w.radius = 16 + (w.maxRadius - 16) * progress;
    if (w.timer <= 0) state.empWaves.splice(i, 1);
  }

  for (let i = state.smokeClouds.length - 1; i >= 0; i -= 1) {
    const c = state.smokeClouds[i];
    c.timer -= dt;
    if (c.timer <= 0) state.smokeClouds.splice(i, 1);
  }

  for (let i = state.noiseRings.length - 1; i >= 0; i -= 1) {
    const r = state.noiseRings[i];
    r.timer -= dt;
    if (r.timer <= 0) state.noiseRings.splice(i, 1);
  }

  for (let i = state.callouts.length - 1; i >= 0; i -= 1) {
    const c = state.callouts[i];
    c.timer -= dt;
    c.y -= 14 * dt;
    if (c.timer <= 0) state.callouts.splice(i, 1);
  }

  // Keep player constrained within inner playfield bounds just in case.
  const minX = GRID.offsetX + GRID.tile;
  const maxX = GRID.offsetX + (GRID.cols - 1) * GRID.tile;
  const minY = GRID.offsetY + GRID.tile;
  const maxY = GRID.offsetY + (GRID.rows - 1) * GRID.tile;
  state.player.x = Math.max(minX, Math.min(maxX, state.player.x));
  state.player.y = Math.max(minY, Math.min(maxY, state.player.y));
}
