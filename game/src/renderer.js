// Architectural Noir-Blueprint Canvas 2D renderer, raycast cone shading, tactical HUD, and overlays.

import { ALARM_CFG, CANVAS, GADGETS, GRID, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_DEBRIEF = 'debrief';

const GADGET_CARD_BOUNDS = [
  { key: 'decoy', x: 24, y: 654, w: 184, h: 52 },
  { key: 'emp', x: 218, y: 654, w: 184, h: 52 },
  { key: 'smoke', x: 412, y: 654, w: 184, h: 52 },
];

function formatCash(amount) {
  return `$${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function hitTestGadgetCard(x, y) {
  for (let i = 0; i < GADGET_CARD_BOUNDS.length; i += 1) {
    const b = GADGET_CARD_BOUNDS[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.key;
  }
  return null;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawFloorAndWalls(ctx, level, hasPrimaryLoot, elapsed) {
  const { tiles } = level;

  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      const ch = tiles[r][c];
      if (ch === '#') continue;
      const x = GRID.offsetX + c * GRID.tile;
      const y = GRID.offsetY + r * GRID.tile;

      if (ch === 'M') ctx.fillStyle = PALETTE.floorMarble;
      else if (ch === 'V') ctx.fillStyle = PALETTE.floorVault;
      else if (ch === 'S') ctx.fillStyle = PALETTE.shadowCover;
      else ctx.fillStyle = PALETTE.floorBase;
      ctx.fillRect(x, y, GRID.tile, GRID.tile);

      ctx.strokeStyle = PALETTE.floorGrid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, GRID.tile - 1, GRID.tile - 1);

      if (ch === 'M') {
        ctx.strokeStyle = 'rgba(130, 175, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(x + 6, y + GRID.tile * 0.5);
        ctx.lineTo(x + GRID.tile * 0.5, y + 6);
        ctx.lineTo(x + GRID.tile - 6, y + GRID.tile * 0.5);
        ctx.lineTo(x + GRID.tile * 0.5, y + GRID.tile - 6);
        ctx.closePath();
        ctx.stroke();
      } else if (ch === 'V') {
        ctx.strokeStyle = 'rgba(255, 209, 102, 0.14)';
        ctx.strokeRect(x + 4, y + 4, GRID.tile - 8, GRID.tile - 8);
      } else if (ch === 'S') {
        ctx.strokeStyle = PALETTE.shadowBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + GRID.tile - 6);
        ctx.lineTo(x + GRID.tile - 6, y + 6);
        ctx.moveTo(x + 14, y + GRID.tile - 6);
        ctx.lineTo(x + GRID.tile - 6, y + 14);
        ctx.moveTo(x + 6, y + GRID.tile - 14);
        ctx.lineTo(x + GRID.tile - 14, y + 6);
        ctx.stroke();
        ctx.strokeRect(x + 2, y + 2, GRID.tile - 4, GRID.tile - 4);
      }
    }
  }

  const ex = level.extractRect;
  const exPulse = 0.55 + 0.35 * Math.sin(elapsed * 4.2);
  ctx.save();
  ctx.fillStyle = hasPrimaryLoot ? `rgba(56, 242, 175, ${0.18 * exPulse})` : 'rgba(56, 242, 175, 0.08)';
  ctx.fillRect(ex.x + 2, ex.y + 2, ex.w - 4, ex.h - 4);
  ctx.strokeStyle = hasPrimaryLoot ? PALETTE.extractZone : 'rgba(56, 242, 175, 0.45)';
  ctx.lineWidth = hasPrimaryLoot ? 2.5 : 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(ex.x + 3, ex.y + 3, ex.w - 6, ex.h - 6);
  ctx.setLineDash([]);
  ctx.fillStyle = PALETTE.extractZone;
  ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(hasPrimaryLoot ? 'EXTRACT!' : 'ENTRY/EXIT', ex.x + ex.w * 0.5, ex.y + ex.h * 0.5 + 4);
  ctx.restore();

  for (let i = 0; i < level.doors.length; i += 1) {
    const d = level.doors[i];
    const rx = GRID.offsetX + d.col * GRID.tile;
    const ry = GRID.offsetY + d.row * GRID.tile;
    ctx.save();
    if (d.open) {
      ctx.fillStyle = PALETTE.doorOpen;
      ctx.fillRect(rx + 4, ry + 4, 8, GRID.tile - 8);
    } else {
      ctx.fillStyle = 'rgba(244, 162, 97, 0.25)';
      ctx.fillRect(rx + 3, ry + 3, GRID.tile - 6, GRID.tile - 6);
      ctx.strokeStyle = PALETTE.doorClosed;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(rx + 4, ry + 4, GRID.tile - 8, GRID.tile - 8);
      ctx.fillStyle = PALETTE.doorClosed;
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LOCK', d.x, d.y + 3);
    }
    ctx.restore();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      if (tiles[r][c] !== '#') continue;
      if (r + 1 < GRID.rows && tiles[r + 1][c] !== '#') {
        ctx.fillRect(GRID.offsetX + c * GRID.tile + 3, GRID.offsetY + (r + 1) * GRID.tile, GRID.tile, 6);
      }
    }
  }

  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      if (tiles[r][c] !== '#') continue;
      const x = GRID.offsetX + c * GRID.tile;
      const y = GRID.offsetY + r * GRID.tile;
      ctx.fillStyle = PALETTE.wallFill;
      ctx.fillRect(x, y, GRID.tile, GRID.tile);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(x + 3, y + 3, GRID.tile - 6, GRID.tile - 6);

      ctx.strokeStyle = PALETTE.wallStroke;
      ctx.lineWidth = 1.4;
      if (r === 0 || tiles[r - 1][c] !== '#') {
        ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + GRID.tile, y + 0.5); ctx.stroke();
      }
      if (r === GRID.rows - 1 || tiles[r + 1][c] !== '#') {
        ctx.beginPath(); ctx.moveTo(x, y + GRID.tile - 0.5); ctx.lineTo(x + GRID.tile, y + GRID.tile - 0.5); ctx.stroke();
      }
      if (c === 0 || tiles[r][c - 1] !== '#') {
        ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + GRID.tile); ctx.stroke();
      }
      if (c === GRID.cols - 1 || tiles[r][c + 1] !== '#') {
        ctx.beginPath(); ctx.moveTo(x + GRID.tile - 0.5, y); ctx.lineTo(x + GRID.tile - 0.5, y + GRID.tile); ctx.stroke();
      }
    }
  }
}

function drawReconOverlay(ctx, level) {
  ctx.save();
  ctx.setLineDash([5, 6]);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(255, 195, 70, 0.48)';
  for (let i = 0; i < level.guards.length; i += 1) {
    const g = level.guards[i];
    if (g.waypoints.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(g.waypoints[0].x, g.waypoints[0].y);
    for (let k = 1; k < g.waypoints.length; k += 1) {
      ctx.lineTo(g.waypoints[k].x, g.waypoints[k].y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(72, 202, 228, 0.48)';
  ctx.setLineDash([3, 4]);
  for (let i = 0; i < level.terminals.length; i += 1) {
    const t = level.terminals[i];
    for (let c = 0; c < level.cameras.length; c += 1) {
      if (t.targets.includes(level.cameras[c].id)) {
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(level.cameras[c].x, level.cameras[c].y); ctx.stroke();
      }
    }
    for (let l = 0; l < level.lasers.length; l += 1) {
      if (t.targets.includes(level.lasers[l].id)) {
        const lx = (level.lasers[l].x1 + level.lasers[l].x2) * 0.5;
        const ly = (level.lasers[l].y1 + level.lasers[l].y2) * 0.5;
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(lx, ly); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawVisionCone(ctx, poly, originX, originY, range, fillInner, fillOuter, edgeStroke) {
  if (!poly || poly.length < 3) return;
  ctx.save();
  const grad = ctx.createRadialGradient(originX, originY, 8, originX, originY, range);
  grad.addColorStop(0, fillInner);
  grad.addColorStop(1, fillOuter);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i += 1) {
    ctx.lineTo(poly[i].x, poly[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edgeStroke;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.restore();
}

function drawInteractablesAndLoot(ctx, state) {
  const { level, elapsed, player } = state;

  for (let i = 0; i < level.terminals.length; i += 1) {
    const t = level.terminals[i];
    ctx.save();
    ctx.fillStyle = t.hacked ? 'rgba(72, 202, 228, 0.16)' : 'rgba(72, 202, 228, 0.28)';
    ctx.strokeStyle = t.hacked ? '#38f2af' : PALETTE.terminalCyan;
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, t.x - 13, t.y - 11, 26, 22, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = t.hacked ? '#38f2af' : '#b8f2ff';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.hacked ? 'HACKED' : 'TERM', t.x, t.y + 3);
    ctx.fillStyle = 'rgba(184, 242, 255, 0.88)';
    ctx.fillText(t.label, t.x, t.y - 16);
    ctx.restore();
  }

  for (let i = 0; i < level.lasers.length; i += 1) {
    const l = level.lasers[i];
    ctx.save();
    ctx.fillStyle = l.disabledPermanent || l.empTimer > 0 ? '#5b6c88' : '#ff3b6b';
    ctx.beginPath(); ctx.arc(l.x1, l.y1, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(l.x2, l.y2, 4.5, 0, Math.PI * 2); ctx.fill();

    if (l.active) {
      ctx.strokeStyle = 'rgba(255, 59, 107, 0.38)';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();

      ctx.strokeStyle = PALETTE.laserActive;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(120, 150, 190, 0.28)';
      ctx.setLineDash([3, 5]);
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(l.x1, l.y1); ctx.lineTo(l.x2, l.y2); ctx.stroke();
    }
    ctx.restore();
  }

  for (let i = 0; i < level.bonusLoot.length; i += 1) {
    const b = level.bonusLoot[i];
    if (b.collected) continue;
    const bob = Math.sin(elapsed * 3.5 + i) * 2.5;
    ctx.save();
    ctx.translate(b.x, b.y + bob);
    ctx.fillStyle = 'rgba(56, 242, 175, 0.22)';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(Math.PI * 0.25);
    ctx.fillStyle = PALETTE.lootBonus;
    ctx.fillRect(-6, -6, 12, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-6, -6, 12, 12);
    ctx.rotate(-Math.PI * 0.25);

    ctx.fillStyle = '#d6ffef';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`+$${(b.value / 1000).toFixed(1)}k`, 0, -16);
    ctx.restore();
  }

  const pri = level.primaryLoot;
  if (!pri.collected) {
    const pulse = 1 + 0.12 * Math.sin(elapsed * 4.5);
    ctx.save();
    ctx.translate(pri.x, pri.y);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.18)';
    ctx.beginPath(); ctx.arc(0, 0, 24 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.72)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = PALETTE.lootGold;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 12);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff5d6';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = 'rgba(11, 18, 32, 0.92)';
    drawRoundedRect(ctx, -46, -38, 92, 18, 4);
    ctx.fill();
    ctx.strokeStyle = PALETTE.lootGold;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.lootGold;
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LOOT ${formatCash(pri.value)}`, 0, -25);
    ctx.restore();
  }

  if (player.interactTarget) {
    const target = player.interactTarget;
    const item = target.item;
    ctx.save();
    ctx.fillStyle = 'rgba(11, 18, 32, 0.92)';
    drawRoundedRect(ctx, item.x - 42, item.y + 18, 84, 17, 4);
    ctx.fill();
    ctx.strokeStyle = target.kind === 'terminal' ? PALETTE.terminalCyan : PALETTE.doorClosed;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#eef6ff';
    ctx.font = 'bold 10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(target.kind === 'terminal' ? '[E] HACK' : '[E] PICK LOCK', item.x, item.y + 30);

    if (item.progress > 0) {
      ctx.strokeStyle = '#38f2af';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 20, -Math.PI * 0.5, -Math.PI * 0.5 + item.progress * Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawCamerasAndGuards(ctx, state) {
  const { level } = state;

  for (let i = 0; i < level.cameras.length; i += 1) {
    const cam = level.cameras[i];
    const offline = cam.disabledPermanent || cam.empTimer > 0;
    if (!offline) {
      drawVisionCone(
        ctx,
        cam.conePoly,
        cam.x,
        cam.y,
        210,
        cam.alertLevel > 0.1 ? 'rgba(255, 65, 110, 0.38)' : 'rgba(255, 72, 138, 0.28)',
        'rgba(255, 72, 138, 0.05)',
        'rgba(255, 100, 155, 0.52)',
      );
    }

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = offline ? '#48566e' : PALETTE.cameraBody;
    ctx.fillRect(-7, -6, 15, 12);
    ctx.fillStyle = offline ? '#1d2534' : '#ff3b6b';
    ctx.fillRect(6, -3, 5, 6);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = offline ? '#8da0be' : '#ff98b9';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(offline ? (cam.empTimer > 0 ? `EMP ${cam.empTimer.toFixed(1)}s` : 'CAM OFF') : 'CAM', cam.x, cam.y - 11);
    ctx.restore();
  }

  for (let i = 0; i < level.guards.length; i += 1) {
    const g = level.guards[i];
    const range = g.heavy ? 225 : 195;
    let inner = PALETTE.conePatrol;
    let edge = 'rgba(255, 200, 90, 0.52)';
    if (g.mode === 'alert') {
      inner = PALETTE.coneAlert;
      edge = 'rgba(255, 75, 95, 0.78)';
    } else if (g.mode === 'investigate' || g.suspicion > 5) {
      inner = PALETTE.coneSuspect;
      edge = 'rgba(255, 145, 75, 0.68)';
    }
    drawVisionCone(ctx, g.conePoly, g.x, g.y, range, inner, 'rgba(255, 180, 60, 0.04)', edge);

    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);
    ctx.fillStyle = g.heavy ? PALETTE.guardHeavy : PALETTE.guardBody;
    ctx.beginPath();
    ctx.arc(0, 0, g.heavy ? 13 : 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0b1220';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff5d6';
    ctx.fillRect(5, -3.5, 7, 7);
    ctx.restore();

    if (g.mode === 'alert' || g.suspicion >= 10) {
      ctx.save();
      ctx.fillStyle = g.mode === 'alert' ? '#ff3b6b' : '#ffd166';
      ctx.font = 'bold 14px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(g.mode === 'alert' ? '!' : '?', g.x, g.y - 16);
      ctx.restore();
    }
  }
}

function drawGadgetEffectsAndPlayer(ctx, state) {
  const { player, decoys, empWaves, smokeClouds, noiseRings, callouts } = state;

  for (let i = 0; i < noiseRings.length; i += 1) {
    const r = noiseRings[i];
    const p = 1 - r.timer / r.maxTimer;
    ctx.save();
    ctx.strokeStyle = `rgba(180, 220, 255, ${(1 - p) * 0.45})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 12 + r.radius * p, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < decoys.length; i += 1) {
    const d = decoys[i];
    ctx.save();
    ctx.strokeStyle = `rgba(255, 209, 102, ${1 - d.pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(d.x, d.y, 10 + d.pulse * 55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.decoyPulse;
    ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DECOY', d.x, d.y + 16);
    ctx.restore();
  }

  for (let i = 0; i < empWaves.length; i += 1) {
    const w = empWaves[i];
    ctx.save();
    ctx.strokeStyle = `rgba(92, 225, 230, ${Math.min(1, w.timer * 1.4)})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < smokeClouds.length; i += 1) {
    const c = smokeClouds[i];
    const alpha = Math.min(1, c.timer / 1.2) * 0.55;
    ctx.save();
    ctx.fillStyle = `rgba(175, 205, 235, ${alpha})`;
    ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(220, 240, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }

  for (let i = 0; i < player.trail.length; i += 1) {
    const t = player.trail[i];
    ctx.save();
    ctx.fillStyle = `rgba(56, 242, 175, ${t.alpha * 0.28})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.sneaking || player.inShadow) {
    ctx.strokeStyle = PALETTE.thiefSneakRing;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.rotate(player.facing);
  const bodyR = player.sneaking ? player.radius * 0.88 : player.radius;
  ctx.fillStyle = '#101b2e';
  ctx.beginPath(); ctx.arc(0, 0, bodyR + 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.thiefBody;
  ctx.beginPath(); ctx.arc(0, 0, bodyR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.thiefVisor;
  ctx.fillRect(4, -4, 6, 8);
  ctx.fillStyle = '#ff5470';
  ctx.fillRect(-bodyR - 4, -2.5, 5, 5);
  ctx.restore();

  if (player.inShadow || player.sneaking) {
    ctx.save();
    ctx.fillStyle = '#38f2af';
    ctx.font = 'bold 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(player.inShadow ? 'HIDDEN' : 'SNEAK', player.x, player.y - 20);
    ctx.restore();
  }

  for (let i = 0; i < callouts.length; i += 1) {
    const c = callouts[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, c.timer / 0.6));
    ctx.fillStyle = c.color;
    ctx.font = 'bold 11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(c.text, c.x, c.y);
    ctx.restore();
  }
}

function drawTopHud(ctx, state) {
  ctx.save();
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 0, CANVAS.width, 66);
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 66); ctx.lineTo(CANVAS.width, 66); ctx.stroke();

  ctx.fillStyle = '#38f2af';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${state.level.def.code} // VELVET & VOLTAGE`, 24, 22);

  ctx.fillStyle = '#e8f1ff';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText(state.level.def.name, 24, 43);

  ctx.fillStyle = state.hasPrimaryLoot ? '#38f2af' : '#ffd166';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillText(
    state.hasPrimaryLoot
      ? 'OBJ: EXTRACT TO ENTRY ZONE'
      : `OBJ: STEAL ${state.level.primaryLoot.name.toUpperCase()} (${formatCash(state.level.primaryLoot.value)})`,
    24,
    59,
  );

  const meterX = 430;
  const meterY = 14;
  const meterW = 420;
  const meterH = 38;
  const pct = Math.round(state.alarm);
  let statusText = 'SILENT';
  let barColor = '#38f2af';
  if (pct >= ALARM_CFG.dangerThreshold) {
    statusText = 'DANGER';
    barColor = '#ff3b6b';
  } else if (pct >= ALARM_CFG.cautionThreshold) {
    statusText = 'CAUTION';
    barColor = '#ff9f43';
  }

  ctx.fillStyle = '#070c16';
  drawRoundedRect(ctx, meterX, meterY, meterW, meterH, 6);
  ctx.fill();
  ctx.strokeStyle = pct >= ALARM_CFG.dangerThreshold ? '#ff3b6b' : '#2a436e';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.fillStyle = '#9bb5dc';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM METER', meterX + 12, meterY + 15);

  ctx.fillStyle = barColor;
  ctx.textAlign = 'right';
  ctx.fillText(`${pct}% · ${statusText}`, meterX + meterW - 12, meterY + 15);

  const trackX = meterX + 12;
  const trackY = meterY + 21;
  const trackW = meterW - 24;
  const trackH = 10;
  ctx.fillStyle = '#152238';
  drawRoundedRect(ctx, trackX, trackY, trackW, trackH, 3);
  ctx.fill();
  if (pct > 0) {
    ctx.fillStyle = barColor;
    drawRoundedRect(ctx, trackX, trackY, Math.max(6, (trackW * pct) / 100), trackH, 3);
    ctx.fill();
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#9bb5dc';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillText('HEIST TAKE', 1110, 22);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 18px ui-monospace, monospace';
  const net = Math.max(0, state.lootCollected - state.gadgetCost);
  ctx.fillText(formatCash(net), 1110, 44);

  ctx.fillStyle = '#9bb5dc';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillText('TIME', 1256, 22);
  ctx.fillStyle = '#e8f1ff';
  ctx.font = 'bold 18px ui-monospace, monospace';
  ctx.fillText(`${state.elapsed.toFixed(1)}s`, 1256, 44);
  ctx.fillStyle = state.reconMode ? '#5ce1e6' : '#7f99c4';
  ctx.font = 'bold 10px ui-monospace, monospace';
  ctx.fillText(state.reconMode ? '[TAB] RECON ON' : '[TAB] RECON', 1256, 59);
  ctx.restore();
}

function drawBottomHudAndMinimap(ctx, state) {
  ctx.save();
  ctx.fillStyle = PALETTE.hudBg;
  ctx.fillRect(0, 644, CANVAS.width, 76);
  ctx.strokeStyle = PALETTE.hudBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 644); ctx.lineTo(CANVAS.width, 644); ctx.stroke();

  const specs = [
    { ...GADGETS.decoy, count: state.player.gadgets.decoy, color: '#ffd166' },
    { ...GADGETS.emp, count: state.player.gadgets.emp, color: '#5ce1e6' },
    { ...GADGETS.smoke, count: state.player.gadgets.smoke, color: '#b8d8f8' },
  ];

  for (let i = 0; i < specs.length; i += 1) {
    const b = GADGET_CARD_BOUNDS[i];
    const sp = specs[i];
    const empty = sp.count <= 0;
    ctx.fillStyle = empty ? '#0b101b' : '#111d33';
    drawRoundedRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.strokeStyle = empty ? '#23324f' : sp.color;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = empty ? '#5a6d8e' : sp.color;
    ctx.font = 'bold 12px ui-monospace, monospace';
    ctx.fillText(`[${sp.key}] ${sp.short.toUpperCase()}`, b.x + 12, b.y + 21);

    ctx.fillStyle = empty ? '#5a6d8e' : '#cdddf7';
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(`Cost: -${formatCash(sp.cost)}`, b.x + 12, b.y + 40);

    ctx.textAlign = 'right';
    ctx.fillStyle = empty ? '#5a6d8e' : '#ffffff';
    ctx.font = 'bold 16px ui-monospace, monospace';
    ctx.fillText(`x${sp.count}`, b.x + b.w - 12, b.y + 32);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#9bb5dc';
  ctx.font = 'bold 11px ui-monospace, monospace';
  ctx.fillText('CONTROLS: WASD/Arrows Move · SHIFT Silent Sneak · E/SPACE Hack & Lockpick · CLICK/1-3 Gadgets · TAB Recon', 618, 672);
  ctx.fillStyle = '#6f8bb8';
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillText(state.level.def.subtitle, 618, 694);

  const mmW = 124;
  const mmH = 56;
  const mmX = CANVAS.width - mmW - 20;
  const mmY = 652;
  ctx.fillStyle = '#060a12';
  ctx.fillRect(mmX, mmY, mmW, mmH);
  ctx.strokeStyle = '#2d4b7a';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(mmX, mmY, mmW, mmH);

  const cellW = mmW / GRID.cols;
  const cellH = mmH / GRID.rows;
  ctx.fillStyle = '#243a60';
  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      if (state.level.tiles[r][c] === '#') {
        ctx.fillRect(mmX + c * cellW, mmY + r * cellH, Math.ceil(cellW), Math.ceil(cellH));
      }
    }
  }
  const toMini = (wx, wy) => ({
    x: mmX + ((wx - GRID.offsetX) / (GRID.cols * GRID.tile)) * mmW,
    y: mmY + ((wy - GRID.offsetY) / (GRID.rows * GRID.tile)) * mmH,
  });

  if (!state.level.primaryLoot.collected) {
    const lp = toMini(state.level.primaryLoot.x, state.level.primaryLoot.y);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(lp.x - 2, lp.y - 2, 5, 5);
  }
  for (let i = 0; i < state.level.guards.length; i += 1) {
    const gp = toMini(state.level.guards[i].x, state.level.guards[i].y);
    ctx.fillStyle = '#ff7b54';
    ctx.fillRect(gp.x - 1.5, gp.y - 1.5, 3, 3);
  }
  const pp = toMini(state.player.x, state.player.y);
  ctx.fillStyle = '#38f2af';
  ctx.beginPath(); ctx.arc(pp.x, pp.y, 2.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawModalCard(ctx, title, accent, lines, footer) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 9, 16, 0.76)';
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

  const w = 560;
  const h = 300;
  const x = (CANVAS.width - w) * 0.5;
  const y = (CANVAS.height - h) * 0.5;
  ctx.fillStyle = '#0c1526';
  drawRoundedRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 26px ui-monospace, monospace';
  ctx.fillText(title, CANVAS.width * 0.5, y + 54);

  ctx.fillStyle = '#dce8fb';
  ctx.font = '15px system-ui, -apple-system, sans-serif';
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], CANVAS.width * 0.5, y + 104 + i * 32);
  }

  ctx.fillStyle = accent;
  ctx.font = 'bold 14px ui-monospace, monospace';
  ctx.fillText(footer, CANVAS.width * 0.5, y + h - 34);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  return {
    draw(state, screen) {
      if (canvas.width !== CANVAS.width || canvas.height !== CANVAS.height) {
        canvas.width = CANVAS.width;
        canvas.height = CANVAS.height;
      }

      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);

      drawFloorAndWalls(ctx, state.level, state.hasPrimaryLoot, state.elapsed);
      if (state.reconMode) drawReconOverlay(ctx, state.level);
      drawInteractablesAndLoot(ctx, state);
      drawCamerasAndGuards(ctx, state);
      drawGadgetEffectsAndPlayer(ctx, state);

      if (state.alarm >= ALARM_CFG.cautionThreshold) {
        const intensity = ((state.alarm - ALARM_CFG.cautionThreshold) / 75) * 0.24;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 59, 107, ${intensity})`;
        ctx.lineWidth = 18;
        ctx.strokeRect(0, 66, CANVAS.width, 578);
        ctx.restore();
      }

      drawTopHud(ctx, state);
      drawBottomHudAndMinimap(ctx, state);

      if (screen === SCREEN_TITLE) {
        drawModalCard(
          ctx,
          'VELVET & VOLTAGE',
          '#38f2af',
          [
            'Read guard cones, hack camera hubs, pick side-route doors.',
            'Deploy Acoustic Decoys, EMP Surges & Smoke Veils at a cost.',
            'Steal the primary vault target and escape to the Extraction Zone.',
          ],
          '[ PRESS SPACE OR CLICK TO BEGIN HEIST ]',
        );
      } else if (screen === SCREEN_PAUSED) {
        drawModalCard(
          ctx,
          'HEIST PAUSED',
          '#5ce1e6',
          [
            `Current Wing: ${state.level.def.name}`,
            `Alarm Level: ${Math.round(state.alarm)}%`,
            'Press P / ESC to resume or R / TAB for Recon paths.',
          ],
          '[ PRESS SPACE OR P TO RESUME ]',
        );
      } else if (screen === SCREEN_CAUGHT) {
        drawModalCard(
          ctx,
          'LOCKDOWN TRIGGERED',
          '#ff3b6b',
          [
            `Spotted by: ${state.lastSpotter ?? 'Security Grid'}`,
            'Security shutters sealed the wing at 100% Alarm.',
            'Use Shadow Cover, Smoke Veil [3], or EMP [2] to break sight.',
          ],
          '[ PRESS SPACE OR CLICK TO RETRY WING ]',
        );
      } else if (screen === SCREEN_DEBRIEF) {
        const ghostBonus = state.maxAlarmReached < 25 ? 5000 : state.maxAlarmReached < 60 ? 2000 : 0;
        const netTake = Math.max(0, state.lootCollected + ghostBonus - state.gadgetCost);
        const rank = ghostBonus === 5000 && state.bonusCount >= 1 ? 'S' : netTake >= state.level.primaryLoot.value ? 'A' : 'B';
        drawModalCard(
          ctx,
          `HEIST COMPLETE · RANK ${rank}`,
          '#ffd166',
          [
            `Vault & Bonus Loot: +${formatCash(state.lootCollected)}   |   Ghost Bonus: +${formatCash(ghostBonus)}`,
            `Gadget Expenses: -${formatCash(state.gadgetCost)}   |   Time: ${state.elapsed.toFixed(1)}s`,
            `Net Heist Payout: ${formatCash(netTake)}`,
          ],
          '[ PRESS SPACE OR CLICK FOR NEXT WING ]',
        );
      }
    },
  };
}
