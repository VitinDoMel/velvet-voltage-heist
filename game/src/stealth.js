// Raycasted 2D vision cones, wall/smoke occlusion, and stealth detection math.

import { GRID } from './config.js';
import { isPointInShadow, isTileBlockingSight, segmentBlockedBySmoke, worldToGrid } from './levels.js';

function normalizeAngle(angle) {
  let a = angle;
  while (a <= -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

export function castSightRay(level, smokeClouds, ox, oy, angle, maxDist) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const step = 6;
  let dist = 0;

  while (dist < maxDist) {
    dist = Math.min(maxDist, dist + step);
    const px = ox + dx * dist;
    const py = oy + dy * dist;
    const { col, row } = worldToGrid(px, py);
    if (isTileBlockingSight(level, col, row)) {
      // Binary-refine the wall edge so cones hug walls cleanly without stair-stepping.
      let lo = Math.max(0, dist - step);
      let hi = dist;
      for (let k = 0; k < 4; k += 1) {
        const mid = (lo + hi) * 0.5;
        const g = worldToGrid(ox + dx * mid, oy + dy * mid);
        if (isTileBlockingSight(level, g.col, g.row)) hi = mid;
        else lo = mid;
      }
      return { x: ox + dx * lo, y: oy + dy * lo, dist: lo, hit: true };
    }
    for (let i = 0; i < smokeClouds.length; i += 1) {
      const cloud = smokeClouds[i];
      if (cloud.timer <= 0) continue;
      if ((px - cloud.x) ** 2 + (py - cloud.y) ** 2 <= cloud.radius * cloud.radius) {
        return { x: px, y: py, dist, hit: true };
      }
    }
  }
  return { x: ox + dx * maxDist, y: oy + dy * maxDist, dist: maxDist, hit: false };
}

export function computeVisionConePolygon(level, smokeClouds, ox, oy, centerAngle, fov, range, rayCount = 34) {
  const poly = [{ x: ox, y: oy }];
  const start = centerAngle - fov * 0.5;
  for (let i = 0; i <= rayCount; i += 1) {
    const a = start + (fov * i) / rayCount;
    const hit = castSightRay(level, smokeClouds, ox, oy, a, range);
    poly.push({ x: hit.x, y: hit.y });
  }
  return poly;
}

export function hasLineOfSight(level, smokeClouds, x1, y1, x2, y2) {
  if (segmentBlockedBySmoke(smokeClouds, x1, y1, x2, y2)) return false;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const steps = Math.ceil(dist / 5);
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const g = worldToGrid(x1 + dx * t, y1 + dy * t);
    if (isTileBlockingSight(level, g.col, g.row)) return false;
  }
  return true;
}

export function evaluateConeExposure(level, smokeClouds, viewerX, viewerY, viewerAngle, fov, range, targetX, targetY, shadowScale) {
  const dx = targetX - viewerX;
  const dy = targetY - viewerY;
  const dist = Math.hypot(dx, dy);
  const inShadow = isPointInShadow(level, targetX, targetY);
  const effectiveRange = inShadow ? range * shadowScale : range;
  if (dist > effectiveRange) return 0;

  const angleToTarget = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(angleToTarget - viewerAngle));
  if (diff > fov * 0.5) return 0;

  if (!hasLineOfSight(level, smokeClouds, viewerX, viewerY, targetX, targetY)) return 0;

  const distFactor = 1 - (dist / effectiveRange) * 0.65;
  const centerFactor = 1 - (diff / (fov * 0.5)) * 0.35;
  return Math.max(0.2, Math.min(1, distFactor * centerFactor * (inShadow ? 0.65 : 1)));
}

export function rotateToward(current, target, maxDelta) {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxDelta) return target;
  return normalizeAngle(current + Math.sign(diff) * maxDelta);
}
