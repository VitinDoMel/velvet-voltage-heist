// Guard AI state machine (patrol, scan, investigate, alert), rotating cameras, and laser cycles.

import { ALARM_CFG, CAMERA_CFG, GUARD_CFG } from './config.js';
import { isPointInShadow, pointToSegmentDist, resolveCircleGridCollision } from './levels.js';
import { computeVisionConePolygon, evaluateConeExposure, hasLineOfSight, rotateToward } from './stealth.js';

function moveWithSlide(level, entity, vx, vy, radius, dt) {
  const nextX = entity.x + vx * dt;
  const nextY = entity.y + vy * dt;
  const resolved = resolveCircleGridCollision(level, nextX, nextY, radius);
  entity.x = resolved.x;
  entity.y = resolved.y;
}

export function updateGuards(state, dt, soundEvents) {
  const { level, player, smokeClouds } = state;
  let maxExposure = 0;
  let spottedBy = null;

  for (let i = 0; i < level.guards.length; i += 1) {
    const g = level.guards[i];
    const range = g.heavy ? GUARD_CFG.heavyVisionRange : GUARD_CFG.visionRange;
    const fov = g.heavy ? GUARD_CFG.heavyVisionFov : GUARD_CFG.visionFov;

    // Hear nearby noise events (decoy chimes or brisk footsteps).
    for (let s = 0; s < soundEvents.length; s += 1) {
      const ev = soundEvents[s];
      const d = Math.hypot(ev.x - g.x, ev.y - g.y);
      if (d <= ev.radius && g.mode !== 'alert') {
        g.mode = 'investigate';
        g.investigateTarget = { x: ev.x, y: ev.y };
        g.investigateTimer = ev.isDecoy ? 3.8 : 2.2;
      }
    }

    const exposure = evaluateConeExposure(
      level,
      smokeClouds,
      g.x,
      g.y,
      g.angle,
      fov,
      range,
      player.x,
      player.y,
      GUARD_CFG.shadowDetectScale,
    );

    if (exposure > 0) {
      maxExposure = Math.max(maxExposure, exposure);
      spottedBy = g.role;
      g.suspicion = Math.min(100, g.suspicion + GUARD_CFG.suspicionRisePerSec * exposure * dt);
      g.lastSeenPos = { x: player.x, y: player.y };
      const angleToPlayer = Math.atan2(player.y - g.y, player.x - g.x);
      g.angle = rotateToward(g.angle, angleToPlayer, 4.5 * dt);

      if (g.suspicion >= 42) {
        g.mode = 'alert';
      } else if (g.mode === 'patrol') {
        g.mode = 'investigate';
        g.investigateTarget = { x: player.x, y: player.y };
        g.investigateTimer = 2.6;
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - GUARD_CFG.suspicionDecayPerSec * dt);
      if (g.mode === 'alert' && g.suspicion < 15) {
        g.mode = 'investigate';
        g.investigateTarget = g.lastSeenPos ?? g.waypoints[g.waypointIndex];
        g.investigateTimer = 2.4;
      }
    }

    // State movement logic.
    if (g.mode === 'alert' && g.lastSeenPos) {
      const dx = g.lastSeenPos.x - g.x;
      const dy = g.lastSeenPos.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 14) {
        const desired = Math.atan2(dy, dx);
        g.angle = rotateToward(g.angle, desired, 5.2 * dt);
        const speed = GUARD_CFG.chaseSpeed * (g.heavy ? 0.85 : 1);
        moveWithSlide(level, g, (dx / dist) * speed, (dy / dist) * speed, GUARD_CFG.radius, dt);
      }
    } else if (g.mode === 'investigate' && g.investigateTarget) {
      const dx = g.investigateTarget.x - g.x;
      const dy = g.investigateTarget.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 16) {
        const desired = Math.atan2(dy, dx);
        g.angle = rotateToward(g.angle, desired, 3.8 * dt);
        moveWithSlide(level, g, (dx / dist) * GUARD_CFG.investigateSpeed, (dy / dist) * GUARD_CFG.investigateSpeed, GUARD_CFG.radius, dt);
      } else {
        g.investigateTimer -= dt;
        // Scan side-to-side while inspecting an acoustic decoy or suspicious sound.
        g.angle += Math.sin(state.elapsed * 2.8 + i) * 1.4 * dt;
        if (g.investigateTimer <= 0) {
          g.mode = 'patrol';
          g.investigateTarget = null;
        }
      }
    } else {
      const wp = g.waypoints[g.waypointIndex];
      const dx = wp.x - g.x;
      const dy = wp.y - g.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 6) {
        if (g.pauseTimer <= 0) {
          g.pauseTimer = g.pauseTime;
        } else {
          g.pauseTimer -= dt;
          g.angle += Math.sin(state.elapsed * 2.2 + i * 1.7) * 0.9 * dt;
          if (g.pauseTimer <= 0) {
            g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
          }
        }
      } else {
        const desired = Math.atan2(dy, dx);
        g.angle = rotateToward(g.angle, desired, 3.4 * dt);
        const speed = GUARD_CFG.patrolSpeed * (g.heavy ? 0.85 : 1);
        moveWithSlide(level, g, (dx / dist) * speed, (dy / dist) * speed, GUARD_CFG.radius, dt);
      }
    }

    g.conePoly = computeVisionConePolygon(level, smokeClouds, g.x, g.y, g.angle, fov, range, 32);

    // Direct physical bump catches thief fairly if guard is right on top of them without smoke.
    const bodyDist = Math.hypot(player.x - g.x, player.y - g.y);
    if (bodyDist < GUARD_CFG.radius + player.radius + 4 && hasLineOfSight(level, smokeClouds, g.x, g.y, player.x, player.y)) {
      maxExposure = Math.max(maxExposure, 1.2);
      spottedBy = g.role;
      g.suspicion = 100;
      g.mode = 'alert';
    }
  }

  return { maxExposure, spottedBy };
}

export function updateCamerasAndLasers(state, dt) {
  const { level, player, smokeClouds } = state;
  let camExposure = 0;
  let camSpottedBy = null;
  let laserHit = false;

  for (let i = 0; i < level.cameras.length; i += 1) {
    const cam = level.cameras[i];
    if (cam.empTimer > 0) cam.empTimer = Math.max(0, cam.empTimer - dt);
    const active = !cam.disabledPermanent && cam.empTimer <= 0;

    if (active) {
      cam.angle = cam.baseAngle + Math.sin(state.elapsed * cam.speed + cam.phase) * cam.sweep;
      cam.conePoly = computeVisionConePolygon(
        level,
        smokeClouds,
        cam.x,
        cam.y,
        cam.angle,
        CAMERA_CFG.visionFov,
        CAMERA_CFG.visionRange,
        28,
      );
      const exp = evaluateConeExposure(
        level,
        smokeClouds,
        cam.x,
        cam.y,
        cam.angle,
        CAMERA_CFG.visionFov,
        CAMERA_CFG.visionRange,
        player.x,
        player.y,
        0.72,
      );
      cam.alertLevel = exp > 0 ? Math.min(1, cam.alertLevel + dt * 2.5) : Math.max(0, cam.alertLevel - dt * 1.4);
      if (exp > 0) {
        camExposure = Math.max(camExposure, exp);
        camSpottedBy = 'CCTV Camera';
      }
    } else {
      cam.conePoly = [];
      cam.alertLevel = 0;
    }
  }

  for (let i = 0; i < level.lasers.length; i += 1) {
    const l = level.lasers[i];
    if (l.empTimer > 0) l.empTimer = Math.max(0, l.empTimer - dt);
    if (l.disabledPermanent || l.empTimer > 0) {
      l.active = false;
      continue;
    }
    const cycle = ((state.elapsed + l.phase) % l.period) / l.period;
    l.active = cycle < l.duty;

    if (l.active) {
      const dist = pointToSegmentDist(player.x, player.y, l.x1, l.y1, l.x2, l.y2);
      if (dist <= player.radius + 2) {
        laserHit = true;
      }
    }
  }

  // Combine exposure into global alarm meter fairly.
  const lootScale = state.hasPrimaryLoot ? ALARM_CFG.extractionBoost : 1;
  const shadowBonus = isPointInShadow(level, player.x, player.y) ? 0.72 : 1;

  if (laserHit) {
    state.alarm = Math.min(ALARM_CFG.max, state.alarm + 160 * dt);
    state.lastSpotter = 'Laser Tripwire';
  } else if (camExposure > 0 || state.guardExposure > 0) {
    const rate = Math.max(
      camExposure * CAMERA_CFG.alarmRisePerSec,
      state.guardExposure * 76,
    );
    state.alarm = Math.min(ALARM_CFG.max, state.alarm + rate * lootScale * shadowBonus * dt);
    state.lastSpotter = state.guardExposure >= camExposure ? state.guardSpotter : camSpottedBy;
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM_CFG.decayPerSec * dt);
  }

  return { camExposure, laserHit };
}
