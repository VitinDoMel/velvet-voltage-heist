// Player movement, stealth noise emission, lockpicking, terminal hacking, loot pickup, and extraction.

import { PLAYER_CFG } from './config.js';
import { pushCallout } from './gadgets.js';
import { isPointInShadow, resolveCircleGridCollision } from './levels.js';

export function createPlayer(startPos, startingGadgets) {
  return {
    x: startPos.x,
    y: startPos.y,
    radius: PLAYER_CFG.radius,
    facing: 0,
    sneaking: false,
    sprinting: false,
    inShadow: false,
    moving: false,
    noiseStepTimer: 0,
    interactTarget: null,
    gadgets: { ...startingGadgets },
    trail: [],
  };
}

function findNearestInteractable(level, player) {
  let best = null;
  let bestDist = PLAYER_CFG.interactRadius;

  for (let i = 0; i < level.terminals.length; i += 1) {
    const t = level.terminals[i];
    if (t.hacked) continue;
    const d = Math.hypot(t.x - player.x, t.y - player.y);
    if (d <= bestDist) {
      bestDist = d;
      best = { kind: 'terminal', item: t, dist: d };
    }
  }

  for (let i = 0; i < level.doors.length; i += 1) {
    const door = level.doors[i];
    if (door.open) continue;
    const d = Math.hypot(door.x - player.x, door.y - player.y);
    if (d <= bestDist) {
      bestDist = d;
      best = { kind: 'door', item: door, dist: d };
    }
  }

  return best;
}

export function updatePlayer(state, controls, dt) {
  const { level, player } = state;
  let mx = controls.moveX;
  let my = controls.moveY;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    player.facing = Math.atan2(my, mx);
  }

  player.sneaking = Boolean(controls.sneak);
  player.sprinting = !player.sneaking && Boolean(controls.sprint) && len > 0;
  player.moving = len > 0.01;

  const speed = player.sneaking
    ? PLAYER_CFG.sneakSpeed
    : player.sprinting
      ? PLAYER_CFG.sprintSpeed
      : PLAYER_CFG.walkSpeed;

  const targetX = player.x + mx * speed * dt;
  const targetY = player.y + my * speed * dt;
  const resolved = resolveCircleGridCollision(level, targetX, targetY, player.radius);
  player.x = resolved.x;
  player.y = resolved.y;
  player.inShadow = isPointInShadow(level, player.x, player.y);

  // Store subtle breadcrumb trail for motion clarity.
  if (player.moving && state.frameCount % 3 === 0) {
    player.trail.push({ x: player.x, y: player.y, alpha: 0.7 });
    if (player.trail.length > 14) player.trail.shift();
  }
  for (let i = player.trail.length - 1; i >= 0; i -= 1) {
    player.trail[i].alpha -= dt * 1.4;
    if (player.trail[i].alpha <= 0) player.trail.splice(i, 1);
  }

  // Emit movement noise rings when not sneaking.
  if (player.moving && !player.sneaking) {
    player.noiseStepTimer -= dt;
    if (player.noiseStepTimer <= 0) {
      const noiseRadius = player.sprinting ? PLAYER_CFG.sprintNoiseRadius : PLAYER_CFG.walkNoiseRadius;
      player.noiseStepTimer = player.sprinting ? 0.24 : 0.42;
      state.noiseRings.push({ x: player.x, y: player.y, radius: noiseRadius, timer: 0.35, maxTimer: 0.35 });
      state.pendingSounds.push({ x: player.x, y: player.y, radius: noiseRadius, isDecoy: false });
      state.events.push('step');
    }
  } else {
    player.noiseStepTimer = 0.08;
  }

  // Handle terminal hacking & door lockpicking.
  const interactable = findNearestInteractable(level, player);
  player.interactTarget = interactable;

  if (interactable && controls.interact) {
    const item = interactable.item;
    const duration = interactable.kind === 'terminal' ? PLAYER_CFG.hackDuration : PLAYER_CFG.lockpickDuration;
    item.progress = Math.min(1, item.progress + dt / duration);
    if (item.progress >= 1) {
      if (interactable.kind === 'terminal') {
        item.hacked = true;
        for (let i = 0; i < level.cameras.length; i += 1) {
          if (item.targets.includes(level.cameras[i].id)) level.cameras[i].disabledPermanent = true;
        }
        for (let i = 0; i < level.lasers.length; i += 1) {
          if (item.targets.includes(level.lasers[i].id)) level.lasers[i].disabledPermanent = true;
        }
        pushCallout(state, `${item.label} DISABLED`, '#48cae4', item.x, item.y);
        state.events.push('hack');
      } else {
        item.open = true;
        pushCallout(state, 'SERVICE DOOR PICKED', '#f4a261', item.x, item.y);
        state.events.push('unlock');
      }
    }
  }

  // Primary loot pickup.
  const primary = level.primaryLoot;
  if (!primary.collected && Math.hypot(primary.x - player.x, primary.y - player.y) <= 24) {
    primary.collected = true;
    state.hasPrimaryLoot = true;
    state.lootCollected += primary.value;
    pushCallout(state, `${primary.name.toUpperCase()} SECURED (+$${primary.value.toLocaleString()})`, '#ffd166', primary.x, primary.y);
    state.events.push('primary_loot');
  }

  // Bonus loot pickups.
  for (let i = 0; i < level.bonusLoot.length; i += 1) {
    const b = level.bonusLoot[i];
    if (!b.collected && Math.hypot(b.x - player.x, b.y - player.y) <= 22) {
      b.collected = true;
      state.lootCollected += b.value;
      state.bonusCount += 1;
      pushCallout(state, `${b.name} +$${b.value.toLocaleString()}`, '#38f2af', b.x, b.y);
      state.events.push('bonus_loot');
    }
  }

  // Extraction check once primary vault target is secured.
  if (state.hasPrimaryLoot) {
    const r = level.extractRect;
    if (player.x >= r.x && player.x <= r.x + r.w && player.y >= r.y && player.y <= r.y + r.h) {
      state.extracted = true;
      state.events.push('extract');
    }
  }
}
