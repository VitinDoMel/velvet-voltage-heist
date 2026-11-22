// Handcrafted multi-route heist wings, tile collision helpers, and level instantiation.
// Tile legend (31 cols x 14 rows):
//   '#' = solid wall          '.' = standard floor        'M' = gallery marble floor
//   'V' = vault floor         'S' = shadow cover alcove   'E' = entry / extraction zone
//   'D' = locked service door (lockpickable for stealth flank route)
// Coordinate convention: tile (col, row) has its center at (col + 0.5, row + 0.5).

import { GRID } from './config.js';

function tileCenter(col, row) {
  return {
    x: GRID.offsetX + (col + 0.5) * GRID.tile,
    y: GRID.offsetY + (row + 0.5) * GRID.tile,
  };
}

export const LEVEL_DEFS = [
  {
    id: 'meridian-gallery',
    code: 'WING 01',
    name: 'The Meridian Gallery',
    subtitle: 'Bypass atrium patrols, cut security feeds, extract the Star Sapphire.',
    parTime: 65,
    startingGadgets: { decoy: 3, emp: 2, smoke: 2 },
    map: [
      '###############################',
      '#EE..S..#.......#......S..#VVV#',
      '#EE.....D.......#.........#VVV#',
      '#....#..#..###..#...###...DVVV#',
      '#....#.....#S#......#S#...#VVV#',
      '#..###..S..#.#..MM..#.#...##D##',
      '#...........MM..MM..MM........#',
      '#..S....MM..MM..SS..MM..S.....#',
      '#.......MM..MM......MM........#',
      '#..###..#...#...##...#..###...#',
      '#....#..#..S....##......#S....#',
      '#....#..D.......##......D.....#',
      '#..S....#.......##......#...S.#',
      '###############################',
    ],
    playerStart: { col: 1, row: 1 },
    extractZone: { col: 1, row: 1, w: 2, h: 2 },
    primaryLoot: { col: 28, row: 2, name: 'Star Sapphire', value: 25000 },
    bonusLoot: [
      { col: 11, row: 1, name: 'Gold Cipher', value: 3500 },
      { col: 28, row: 12, name: 'Velvet Ledger', value: 4000 },
    ],
    terminals: [
      { col: 14, row: 1, label: 'CAM/LASER HUB', targets: ['cam-1', 'laser-1'] },
    ],
    cameras: [
      { id: 'cam-1', col: 17.0, row: 1.0, baseAngle: Math.PI * 0.42, sweep: 0.48, speed: 0.85, phase: 0.3 },
      { id: 'cam-2', col: 25.0, row: 6.0, baseAngle: Math.PI * 0.85, sweep: 0.55, speed: 0.9, phase: 1.2 },
    ],
    lasers: [
      { id: 'laser-1', c1: 26.05, r1: 3.08, c2: 26.05, r2: 3.92, period: 4.4, duty: 0.55, phase: 0.5 },
    ],
    guards: [
      {
        id: 'g1',
        role: 'Patrol',
        heavy: false,
        waypoints: [
          { col: 6, row: 6 },
          { col: 13, row: 6 },
          { col: 13, row: 8 },
          { col: 6, row: 8 },
        ],
        pauseTime: 0.75,
      },
      {
        id: 'g2',
        role: 'Inspector',
        heavy: false,
        waypoints: [
          { col: 18, row: 6 },
          { col: 23, row: 6 },
          { col: 23, row: 8 },
          { col: 18, row: 8 },
        ],
        pauseTime: 0.9,
      },
      {
        id: 'g3',
        role: 'Sentinel',
        heavy: true,
        waypoints: [
          { col: 18, row: 11 },
          { col: 23, row: 11 },
          { col: 23, row: 8 },
          { col: 18, row: 8 },
        ],
        pauseTime: 1.0,
      },
    ],
  },
  {
    id: 'obsidian-vault',
    code: 'WING 02',
    name: 'Obsidian Vault Wing',
    subtitle: 'Cross dual laser locks, read overlapping patrols, claim Bearer Bonds.',
    parTime: 80,
    startingGadgets: { decoy: 3, emp: 2, smoke: 3 },
    map: [
      '###############################',
      '#EE...#......S....#.....S.#VVV#',
      '#EE...D...........D.......#VVV#',
      '#.....#..###..##..#..###..DVVV#',
      '#..S..#..#S#..##.....#S#..#VVV#',
      '#.....#..#.#......MM.#.#..##D##',
      '#..####......MM...MM..........#',
      '#........MM..MM...SS..MM..S...#',
      '#..####..MM..SS.......MM......#',
      '#.....#..#....##..##..#...#...#',
      '#..S..#..#..S.##..##......D...#',
      '#.....D.......##......##..#...#',
      '#.....#..S....##..S...##..#.S.#',
      '###############################',
    ],
    playerStart: { col: 1, row: 1 },
    extractZone: { col: 1, row: 1, w: 2, h: 2 },
    primaryLoot: { col: 28, row: 2, name: 'Sovereign Bonds', value: 45000 },
    bonusLoot: [
      { col: 10, row: 4, name: 'Ruby Seal', value: 4500 },
      { col: 16, row: 11, name: 'Vault Keyplate', value: 5000 },
      { col: 28, row: 12, name: 'Obsidian Bust', value: 5500 },
    ],
    terminals: [
      { col: 8, row: 1, label: 'WEST GRID', targets: ['cam-1', 'laser-1'] },
      { col: 24, row: 1, label: 'VAULT LOCK', targets: ['cam-3', 'laser-2'] },
    ],
    cameras: [
      { id: 'cam-1', col: 12.0, row: 1.0, baseAngle: Math.PI * 0.5, sweep: 0.7, speed: 0.92, phase: 0.0 },
      { id: 'cam-2', col: 17.0, row: 6.0, baseAngle: Math.PI * 0.5, sweep: 0.78, speed: 0.88, phase: 1.7 },
      { id: 'cam-3', col: 25.0, row: 8.0, baseAngle: Math.PI * 0.95, sweep: 0.62, speed: 1.05, phase: 0.8 },
    ],
    lasers: [
      { id: 'laser-1', c1: 14.5, r1: 5.08, c2: 14.5, r2: 6.92, period: 4.2, duty: 0.58, phase: 0.3 },
      { id: 'laser-2', c1: 26.05, r1: 3.08, c2: 26.05, r2: 3.92, period: 3.8, duty: 0.62, phase: 1.5 },
    ],
    guards: [
      {
        id: 'g1',
        role: 'Patrol',
        heavy: false,
        waypoints: [
          { col: 7, row: 6 },
          { col: 12, row: 6 },
          { col: 12, row: 11 },
          { col: 7, row: 11 },
        ],
        pauseTime: 0.75,
      },
      {
        id: 'g2',
        role: 'Inspector',
        heavy: false,
        waypoints: [
          { col: 16, row: 2 },
          { col: 22, row: 2 },
          { col: 22, row: 5 },
          { col: 16, row: 5 },
        ],
        pauseTime: 0.9,
      },
      {
        id: 'g3',
        role: 'Sentinel',
        heavy: true,
        waypoints: [
          { col: 19, row: 8 },
          { col: 24, row: 8 },
          { col: 24, row: 11 },
          { col: 19, row: 11 },
        ],
        pauseTime: 1.1,
      },
      {
        id: 'g4',
        role: 'Patrol',
        heavy: false,
        waypoints: [
          { col: 27, row: 6 },
          { col: 29, row: 6 },
          { col: 29, row: 11 },
          { col: 27, row: 11 },
        ],
        pauseTime: 0.8,
      },
    ],
  },
  {
    id: 'crown-penthouse',
    code: 'WING 03',
    name: 'Crown Penthouse',
    subtitle: 'Maximum security atrium. Outmaneuver Sentinels and extract the Chronograph.',
    parTime: 95,
    startingGadgets: { decoy: 4, emp: 3, smoke: 3 },
    map: [
      '###############################',
      '#EE...#....S.....#.....S..#VVV#',
      '#EE...D..........D........#VVV#',
      '#.....#..##..##..#..###...DVVV#',
      '#..S.....##..##.....#S#...#VVV#',
      '#.....#......SS..MM.#.#...##D##',
      '#..####..MM......MM...........#',
      '#........MM..SS..MM...SS..S...#',
      '#..####..MM......MM...........#',
      '#.....#......##......##...#...#',
      '#..S..#..S...##..S...##...D...#',
      '#.....D......##...........#...#',
      '#.....#......##......##...#.S.#',
      '###############################',
    ],
    playerStart: { col: 1, row: 1 },
    extractZone: { col: 1, row: 1, w: 2, h: 2 },
    primaryLoot: { col: 28, row: 2, name: 'Imperial Chronograph', value: 75000 },
    bonusLoot: [
      { col: 12, row: 1, name: 'Platinum Blueprint', value: 6000 },
      { col: 18, row: 12, name: 'Cipher Module', value: 7000 },
      { col: 28, row: 12, name: 'Crown Emerald', value: 8000 },
    ],
    terminals: [
      { col: 15, row: 1, label: 'ATRIUM NODE', targets: ['cam-1', 'cam-2', 'laser-1'] },
      { col: 22, row: 12, label: 'PENTHOUSE LOCK', targets: ['cam-3', 'cam-4', 'laser-2', 'laser-3'] },
    ],
    cameras: [
      { id: 'cam-1', col: 9.0, row: 1.0, baseAngle: Math.PI * 0.5, sweep: 0.72, speed: 0.96, phase: 0.1 },
      { id: 'cam-2', col: 19.0, row: 1.0, baseAngle: Math.PI * 0.55, sweep: 0.68, speed: 1.04, phase: 1.2 },
      { id: 'cam-3', col: 25.0, row: 6.0, baseAngle: Math.PI * 0.85, sweep: 0.62, speed: 1.12, phase: 2.1 },
      { id: 'cam-4', col: 13.0, row: 12.0, baseAngle: -Math.PI * 0.5, sweep: 0.72, speed: 0.95, phase: 0.7 },
    ],
    lasers: [
      { id: 'laser-1', c1: 11.5, r1: 5.08, c2: 11.5, r2: 6.92, period: 3.6, duty: 0.6, phase: 0.2 },
      { id: 'laser-2', c1: 21.5, r1: 6.08, c2: 21.5, r2: 7.92, period: 4.0, duty: 0.6, phase: 1.4 },
      { id: 'laser-3', c1: 26.05, r1: 3.08, c2: 26.05, r2: 3.92, period: 3.4, duty: 0.65, phase: 0.8 },
    ],
    guards: [
      {
        id: 'g1',
        role: 'Patrol',
        heavy: false,
        waypoints: [
          { col: 7, row: 6 },
          { col: 10, row: 6 },
          { col: 10, row: 10 },
          { col: 7, row: 10 },
        ],
        pauseTime: 0.7,
      },
      {
        id: 'g2',
        role: 'Inspector',
        heavy: false,
        waypoints: [
          { col: 15, row: 4 },
          { col: 18, row: 4 },
          { col: 18, row: 8 },
          { col: 15, row: 8 },
        ],
        pauseTime: 0.85,
      },
      {
        id: 'g3',
        role: 'Sentinel',
        heavy: true,
        waypoints: [
          { col: 18, row: 6 },
          { col: 24, row: 6 },
          { col: 24, row: 8 },
          { col: 18, row: 8 },
        ],
        pauseTime: 0.95,
      },
      {
        id: 'g4',
        role: 'Sentinel',
        heavy: true,
        waypoints: [
          { col: 27, row: 6 },
          { col: 29, row: 6 },
          { col: 29, row: 11 },
          { col: 27, row: 11 },
        ],
        pauseTime: 1.0,
      },
    ],
  },
];

export function buildLevelState(levelIndex) {
  const def = LEVEL_DEFS[levelIndex % LEVEL_DEFS.length];
  const tiles = def.map.map((row) => row.split(''));
  const doors = [];

  for (let r = 0; r < GRID.rows; r += 1) {
    for (let c = 0; c < GRID.cols; c += 1) {
      if (tiles[r][c] === 'D') {
        const pos = tileCenter(c, r);
        doors.push({
          id: `door-${c}-${r}`,
          col: c,
          row: r,
          x: pos.x,
          y: pos.y,
          open: false,
          progress: 0,
        });
      }
    }
  }

  const startPos = tileCenter(def.playerStart.col, def.playerStart.row);
  const primaryPos = tileCenter(def.primaryLoot.col, def.primaryLoot.row);

  return {
    def,
    tiles,
    doors,
    playerStart: startPos,
    extractRect: {
      x: GRID.offsetX + def.extractZone.col * GRID.tile,
      y: GRID.offsetY + def.extractZone.row * GRID.tile,
      w: def.extractZone.w * GRID.tile,
      h: def.extractZone.h * GRID.tile,
    },
    primaryLoot: {
      x: primaryPos.x,
      y: primaryPos.y,
      name: def.primaryLoot.name,
      value: def.primaryLoot.value,
      collected: false,
    },
    bonusLoot: def.bonusLoot.map((b, idx) => {
      const p = tileCenter(b.col, b.row);
      return { id: `bonus-${idx}`, x: p.x, y: p.y, name: b.name, value: b.value, collected: false };
    }),
    terminals: def.terminals.map((t, idx) => {
      const p = tileCenter(t.col, t.row);
      return {
        id: `term-${idx}`,
        x: p.x,
        y: p.y,
        label: t.label,
        targets: [...t.targets],
        hacked: false,
        progress: 0,
      };
    }),
    cameras: def.cameras.map((cam) => {
      const p = tileCenter(cam.col, cam.row);
      return {
        id: cam.id,
        x: p.x,
        y: p.y,
        baseAngle: cam.baseAngle,
        angle: cam.baseAngle,
        sweep: cam.sweep,
        speed: cam.speed,
        phase: cam.phase,
        empTimer: 0,
        disabledPermanent: false,
        alertLevel: 0,
        conePoly: [],
      };
    }),
    lasers: def.lasers.map((l) => ({
      id: l.id,
      x1: GRID.offsetX + l.c1 * GRID.tile,
      y1: GRID.offsetY + l.r1 * GRID.tile,
      x2: GRID.offsetX + l.c2 * GRID.tile,
      y2: GRID.offsetY + l.r2 * GRID.tile,
      period: l.period,
      duty: l.duty,
      phase: l.phase,
      active: true,
      empTimer: 0,
      disabledPermanent: false,
    })),
    guards: def.guards.map((g) => {
      const pts = g.waypoints.map((w) => tileCenter(w.col, w.row));
      const initialAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      return {
        id: g.id,
        role: g.role,
        heavy: g.heavy,
        waypoints: pts,
        waypointIndex: 1,
        x: pts[0].x,
        y: pts[0].y,
        angle: initialAngle,
        targetAngle: initialAngle,
        pauseTime: g.pauseTime,
        pauseTimer: 0,
        mode: 'patrol',
        suspicion: 0,
        investigateTarget: null,
        investigateTimer: 0,
        conePoly: [],
        lastSeenPos: null,
      };
    }),
  };
}

export function getTileAt(level, col, row) {
  if (row < 0 || row >= GRID.rows || col < 0 || col >= GRID.cols) return '#';
  return level.tiles[row][col];
}

export function worldToGrid(x, y) {
  return {
    col: Math.floor((x - GRID.offsetX) / GRID.tile),
    row: Math.floor((y - GRID.offsetY) / GRID.tile),
  };
}

export function isTileBlockingMove(level, col, row) {
  const ch = getTileAt(level, col, row);
  if (ch === '#') return true;
  if (ch === 'D') {
    const door = level.doors.find((d) => d.col === col && d.row === row);
    return door ? !door.open : true;
  }
  return false;
}

export function isTileBlockingSight(level, col, row) {
  return isTileBlockingMove(level, col, row);
}

export function isPointInShadow(level, x, y) {
  const { col, row } = worldToGrid(x, y);
  return getTileAt(level, col, row) === 'S';
}

export function resolveCircleGridCollision(level, x, y, radius) {
  let nx = x;
  let ny = y;
  const minCol = Math.floor((nx - radius - GRID.offsetX) / GRID.tile) - 1;
  const maxCol = Math.floor((nx + radius - GRID.offsetX) / GRID.tile) + 1;
  const minRow = Math.floor((ny - radius - GRID.offsetY) / GRID.tile) - 1;
  const maxRow = Math.floor((ny + radius - GRID.offsetY) / GRID.tile) + 1;

  for (let r = minRow; r <= maxRow; r += 1) {
    for (let c = minCol; c <= maxCol; c += 1) {
      if (!isTileBlockingMove(level, c, r)) continue;
      const rx = GRID.offsetX + c * GRID.tile;
      const ry = GRID.offsetY + r * GRID.tile;
      const closestX = Math.max(rx, Math.min(nx, rx + GRID.tile));
      const closestY = Math.max(ry, Math.min(ny, ry + GRID.tile));
      const dx = nx - closestX;
      const dy = ny - closestY;
      const distSq = dx * dx + dy * dy;
      if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = radius - dist;
        nx += (dx / dist) * push;
        ny += (dy / dist) * push;
      }
    }
  }
  return { x: nx, y: ny };
}

export function segmentBlockedBySmoke(smokeClouds, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;

  for (let i = 0; i < smokeClouds.length; i += 1) {
    const cloud = smokeClouds[i];
    if (cloud.timer <= 0) continue;
    const t = Math.max(0, Math.min(1, ((cloud.x - x1) * dx + (cloud.y - y1) * dy) / lenSq));
    const px = x1 + t * dx;
    const py = y1 + t * dy;
    const distSq = (px - cloud.x) ** 2 + (py - cloud.y) ** 2;
    if (distSq <= cloud.radius * cloud.radius) return true;
  }
  return false;
}

export function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
