// The Velvet Vault — level layout: one casino floor, five rooms the thief crosses.
// Rooms: Lobby (entry/exit, bottom-left), Slots floor (centre), High-Roller Lounge
// (bottom-right), Antechamber + Vault (top-right, behind a laser corridor and a
// lockpickable vault door). Walls are axis-aligned rectangles; doors are gaps
// between wall segments. All coordinates are pixels on a 1280x800 canvas.

export const VIEW_W = 1280;
export const VIEW_H = 800;

// ---- walls (solid rectangles) ---------------------------------------------
export const WALLS = [
  // outer shell (20 thick), with a gap at the bottom-left for the entry/exit
  { x: 0, y: 0, w: 1280, h: 20 }, // top
  { x: 0, y: 0, w: 20, h: 800 }, // left
  { x: 1260, y: 0, w: 20, h: 800 }, // right
  { x: 0, y: 780, w: 100, h: 20 }, // bottom, left of entry door
  { x: 200, y: 780, w: 1080, h: 20 }, // bottom, right of entry door

  // wall x=760 separates the west wing from the east wing; two door gaps
  { x: 760, y: 20, w: 16, h: 230 }, // 20..250
  { x: 760, y: 310, w: 16, h: 190 }, // 310..500
  { x: 760, y: 560, w: 16, h: 220 }, // 560..780

  // wall y=560 separates the Lobby from the Slots floor; one door gap
  { x: 20, y: 560, w: 280, h: 16 }, // 20..300
  { x: 360, y: 560, w: 400, h: 16 }, // 360..760

  // wall y=420 separates the Lounge from the corridor strip; one door gap
  { x: 776, y: 420, w: 204, h: 16 }, // 776..980
  { x: 1040, y: 420, w: 220, h: 16 }, // 1040..1260

  // wall y=200 separates the corridor strip from the Antechamber/Vault; one door
  { x: 776, y: 200, w: 74, h: 16 }, // 776..850
  { x: 910, y: 200, w: 350, h: 16 }, // 910..1260

  // wall x=1000 separates the Antechamber from the Vault; the vault door gap
  // (y 90..130) is NOT a wall — it is a door object (see DOORS).
  { x: 1000, y: 20, w: 16, h: 70 }, // 20..90
  { x: 1000, y: 130, w: 16, h: 70 }, // 130..200

  // interior furniture (solid, blocks movement and line of sight)
  // slot-machine rows on the Slots floor
  { x: 120, y: 300, w: 180, h: 34 },
  { x: 420, y: 300, w: 180, h: 34 },
  { x: 120, y: 430, w: 180, h: 34 },
  { x: 420, y: 430, w: 180, h: 34 },
  // lounge tables and bar
  { x: 860, y: 520, w: 110, h: 60 },
  { x: 1080, y: 520, w: 110, h: 60 },
  { x: 860, y: 660, w: 110, h: 60 },
  { x: 1080, y: 660, w: 110, h: 60 },
  { x: 1180, y: 440, w: 80, h: 26 }, // bar counter
  // lobby planters / reception desk
  { x: 220, y: 640, w: 90, h: 30 },
  { x: 40, y: 700, w: 30, h: 60 },
  // antechamber pillars
  { x: 830, y: 60, w: 26, h: 26 },
  { x: 830, y: 150, w: 26, h: 26 },
];

// ---- doors -----------------------------------------------------------------
// The vault door is lockpickable (hold F nearby). Other gaps are open doorways.
export const VAULT_DOOR = { x: 1000, y: 90, w: 16, h: 40, locked: true, pick: 0 };

// ---- laser grid ------------------------------------------------------------
// Beams across the Antechamber corridor (x = 900). Each beam spans the corridor
// vertically and toggles on/off on its own phase. Touching a live beam spikes
// the alarm. The beams are off while the vault door is being picked? No — they
// are the vault's own defence and only the EMP-free corridor timing beats them.
export const LASERS = [
  { x: 880, y1: 30, y2: 190, period: 3.4, phase: 0.0, on: 0.55 },
  { x: 920, y1: 30, y2: 190, period: 3.4, phase: 1.7, on: 0.55 },
  { x: 960, y1: 30, y2: 190, period: 4.6, phase: 0.8, on: 0.5 },
];

// ---- loot ------------------------------------------------------------------
// value in casino chips; the Velvet Diamond is the win target.
export const LOOT_DEFS = [
  { id: 'chips-lobby', kind: 'chips', x: 150, y: 720, value: 100, label: 'Chip stack' },
  { id: 'chips-slots', kind: 'chips', x: 510, y: 370, value: 150, label: 'Chip stack' },
  { id: 'cash-lounge', kind: 'cash', x: 1015, y: 610, value: 250, label: 'Cash bundle' },
  { id: 'gold-ante', kind: 'gold', x: 890, y: 110, value: 500, label: 'Gold bars' },
  { id: 'diamond', kind: 'diamond', x: 1140, y: 110, value: 1000, label: 'Velvet Diamond' },
];

// ---- spawn / exit / patrols ------------------------------------------------
export const PLAYER_SPAWN = { x: 150, y: 740 };
export const EXIT_ZONE = { x: 100, y: 740, w: 100, h: 40, label: 'EXIT' };

export const GUARD_DEFS = [
  {
    id: 'g1', name: 'Rocco',
    waypoints: [[150, 280], [620, 280], [620, 500], [150, 500]],
    speed: 62, viewRange: 230, viewHalf: 0.61,
  },
  {
    id: 'g2', name: 'Vera',
    waypoints: [[850, 470], [1190, 470], [1190, 720], [850, 720]],
    speed: 58, viewRange: 230, viewHalf: 0.61,
  },
  {
    id: 'g3', name: 'Sal',
    waypoints: [[820, 260], [1200, 260], [1200, 380], [820, 380]],
    speed: 66, viewRange: 240, viewHalf: 0.58,
  },
];

export const CAMERA_DEFS = [
  // wall-mounted just outside the walls, sweeping cones
  { id: 'c1', x: 790, y: 225, baseAngle: 0.5, sweep: 0.9, speed: 0.45, range: 270, half: 0.5 },
  { id: 'c2', x: 1240, y: 240, baseAngle: Math.PI, sweep: 0.8, speed: 0.55, range: 260, half: 0.5 },
  { id: 'c3', x: 790, y: 450, baseAngle: 1.1, sweep: 0.9, speed: 0.4, range: 260, half: 0.5 },
];

// ---- collision + line of sight --------------------------------------------
// Circle (px,py,r) vs wall rectangles.
export function circleHitsWall(px, py, r) {
  for (const w of WALLS) {
    const cx = Math.max(w.x, Math.min(px, w.x + w.w));
    const cy = Math.max(w.y, Math.min(py, w.y + w.h));
    const dx = px - cx, dy = py - cy;
    if (dx * dx + dy * dy < r * r) return w;
  }
  if (VAULT_DOOR.locked) {
    const d = VAULT_DOOR;
    const cx = Math.max(d.x, Math.min(px, d.x + d.w));
    const cy = Math.max(d.y, Math.min(py, d.y + d.h));
    const dx = px - cx, dy = py - cy;
    if (dx * dx + dy * dy < r * r) return d;
  }
  return null;
}

// Move a circle, sliding along walls (axis-separated).
export function moveCircle(pos, dx, dy, r) {
  const nx = pos.x + dx;
  if (!circleHitsWall(nx, pos.y, r)) pos.x = nx;
  const ny = pos.y + dy;
  if (!circleHitsWall(pos.x, ny, r)) pos.y = ny;
}

// Does segment (x1,y1)-(x2,y2) cross any wall (or the locked vault door)?
function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test for segment vs AABB.
  const dx = x2 - x1, dy = y2 - y1;
  let tmin = 0, tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx, t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy, t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function hasLineOfSight(x1, y1, x2, y2) {
  for (const w of WALLS) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return false;
  }
  if (VAULT_DOOR.locked && segmentHitsRect(x1, y1, x2, y2, VAULT_DOOR)) return false;
  return true;
}

// Point-in-cone test with line of sight, for guards and cameras.
export function inVisionCone(ox, oy, angle, range, half, tx, ty) {
  const dx = tx - ox, dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range || dist < 1) return false;
  let da = Math.atan2(dy, dx) - angle;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  if (Math.abs(da) > half) return false;
  return hasLineOfSight(ox, oy, tx, ty);
}

// Laser beam live right now? (time in seconds)
export function laserLive(laser, t) {
  const phase = ((t + laser.phase) % laser.period) / laser.period;
  return phase < laser.on;
}
