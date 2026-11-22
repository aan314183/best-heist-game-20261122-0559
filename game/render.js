// Rendering: everything is drawn on one canvas — casino floors with distinct
// carpets per room, shadow-casting vision cones (raycast against the walls),
// the laser grid, loot sparkles, the thief, the guards, the cameras, and the
// full HUD (alarm meter, loot, tools, objective, hints) plus title/win/lose
// overlays. No images: all art is drawn in code.

import { WALLS, VAULT_DOOR, LASERS, EXIT_ZONE, VIEW_W, VIEW_H, laserLive } from './level.js';

// ---- raycast: nearest wall hit along a ray (for true cone shadows) ---------
function rayHit(ox, oy, dx, dy, maxDist) {
  let best = maxDist;
  const rects = VAULT_DOOR.locked ? [...WALLS, VAULT_DOOR] : WALLS;
  for (const r of rects) {
    const t = rayRect(ox, oy, dx, dy, r);
    if (t !== null && t < best) best = t;
  }
  return best;
}

function rayRect(ox, oy, dx, dy, r) {
  let tmin = 0, tmax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (ox < r.x || ox > r.x + r.w) return null;
  } else {
    let t1 = (r.x - ox) / dx, t2 = (r.x + r.w - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < r.y || oy > r.y + r.h) return null;
  } else {
    let t1 = (r.y - oy) / dy, t2 = (r.y + r.h - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

function drawCone(ctx, ox, oy, angle, range, half, fill, edge) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  for (let i = 0; i <= steps; i++) {
    const a = angle - half + (2 * half * i) / steps;
    const dx = Math.cos(a), dy = Math.sin(a);
    const d = rayHit(ox, oy, dx, dy, range);
    ctx.lineTo(ox + dx * d, oy + dy * d);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ---- floors -----------------------------------------------------------------
function drawFloors(ctx, t) {
  // Lobby (bottom-left): marble tiles
  ctx.fillStyle = '#33363f';
  ctx.fillRect(20, 576, 740, 204);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 20; x < 760; x += 46) { ctx.beginPath(); ctx.moveTo(x, 576); ctx.lineTo(x, 780); ctx.stroke(); }
  for (let y = 576; y < 780; y += 46) { ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(760, y); ctx.stroke(); }

  // Slots floor (centre): green felt with a subtle diamond pattern
  ctx.fillStyle = '#0e3d2c';
  ctx.fillRect(20, 20, 740, 540);
  ctx.fillStyle = 'rgba(255,215,0,0.05)';
  for (let x = 60; x < 760; x += 76) {
    for (let y = 60; y < 560; y += 76) {
      ctx.beginPath();
      ctx.moveTo(x, y - 8); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 8, y);
      ctx.closePath(); ctx.fill();
    }
  }

  // Lounge (bottom-right): purple carpet
  ctx.fillStyle = '#2c1b40';
  ctx.fillRect(776, 436, 484, 344);
  ctx.strokeStyle = 'rgba(255,180,255,0.06)';
  for (let x = 776; x < 1260; x += 44) { ctx.beginPath(); ctx.moveTo(x, 436); ctx.lineTo(x, 780); ctx.stroke(); }

  // Corridor strip (middle-right): dark red runner
  ctx.fillStyle = '#3d1620';
  ctx.fillRect(776, 216, 484, 204);
  ctx.fillStyle = '#571c2b';
  ctx.fillRect(776, 300, 484, 20);

  // Antechamber (top-right): burgundy
  ctx.fillStyle = '#401423';
  ctx.fillRect(776, 20, 224, 180);
  // Vault (top-right corner): gold marble
  ctx.fillStyle = '#4a3410';
  ctx.fillRect(1016, 20, 244, 180);
  ctx.strokeStyle = 'rgba(255,215,0,0.14)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1024, 28, 228, 164);

  // Room labels, faint, painted on the floor
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('L O B B Y', 40, 600);
  ctx.fillText('S L O T S', 40, 48);
  ctx.fillText('H I G H - R O L L E R   L O U N G E', 800, 462);
  ctx.fillText('V A U L T', 1060, 48);
}

// ---- walls, doors, exit -----------------------------------------------------
function drawWalls(ctx) {
  for (const w of WALLS) {
    ctx.fillStyle = '#14141c';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = 'rgba(212,175,55,0.55)';
    if (w.h <= 20) ctx.fillRect(w.x, w.y, w.w, 2);
    else if (w.w <= 20) ctx.fillRect(w.x, w.y, 2, w.h);
  }
  // Vault door: steel slab while locked, open gap once picked
  const d = VAULT_DOOR;
  if (d.locked) {
    ctx.fillStyle = '#5a5f6b';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#c8ccd6';
    ctx.fillRect(d.x + 5, d.y + 16, 6, 8);
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔒', d.x + 8, d.y - 4);
  } else {
    ctx.fillStyle = 'rgba(212,175,55,0.9)';
    ctx.fillRect(d.x, d.y, 3, d.h);
    ctx.fillRect(d.x + d.w - 3, d.y, 3, d.h);
  }
  // Exit zone: green glowing doorway at the bottom-left
  ctx.save();
  ctx.fillStyle = 'rgba(46,204,113,0.25)';
  ctx.fillRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.strokeStyle = '#2ecc71';
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT_ZONE.x, EXIT_ZONE.y, EXIT_ZONE.w, EXIT_ZONE.h);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT  ➜', EXIT_ZONE.x + EXIT_ZONE.w / 2, EXIT_ZONE.y + EXIT_ZONE.h / 2 + 5);
  ctx.restore();
}

// ---- lasers ------------------------------------------------------------------
function drawLasers(ctx, t) {
  for (const l of LASERS) {
    const live = laserLive(l, t);
    const phase = ((t + l.phase) % l.period) / l.period;
    ctx.save();
    if (live) {
      ctx.strokeStyle = 'rgba(255,30,30,0.95)';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff2222';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(l.x, l.y1); ctx.lineTo(l.x, l.y2); ctx.stroke();
      ctx.fillStyle = '#ff6666';
      ctx.beginPath(); ctx.arc(l.x, l.y1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(l.x, l.y2, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      // Charging back up: faint warning dots count the beam in.
      ctx.fillStyle = `rgba(255,60,60,${0.25 + 0.55 * phase})`;
      for (let y = l.y1 + 10; y < l.y2; y += 22) {
        ctx.beginPath(); ctx.arc(l.x, y, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}

// ---- loot ---------------------------------------------------------------------
function drawLoot(ctx, loot, t) {
  for (const item of loot) {
    if (item.taken) continue;
    const bob = Math.sin(t * 3 + item.x) * 2;
    const glow = 0.5 + 0.3 * Math.sin(t * 4 + item.y);
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.shadowBlur = 14;
    if (item.kind === 'chips') {
      ctx.shadowColor = '#e74c3c';
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(-6, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.arc(0, -3, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.arc(6, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', 0, 0);
    } else if (item.kind === 'cash') {
      ctx.shadowColor = '#27ae60';
      ctx.fillStyle = '#1e8449'; ctx.fillRect(-14, -8, 28, 16);
      ctx.fillStyle = '#2ecc71'; ctx.fillRect(-11, -5, 22, 10);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b3d1e'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    } else if (item.kind === 'gold') {
      ctx.shadowColor = '#f1c40f';
      ctx.fillStyle = '#b7950b';
      ctx.beginPath(); ctx.moveTo(-14, 6); ctx.lineTo(-10, -6); ctx.lineTo(10, -6); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f7dc6f';
      ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(10, -6); ctx.lineTo(8, -2); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    } else if (item.kind === 'diamond') {
      ctx.shadowColor = '#00e5ff';
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#7df9ff';
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(13, -4); ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.lineTo(-13, -4);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#e0ffff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-3, -5, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#bffaff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('VELVET DIAMOND', 0, 30);
    }
    ctx.restore();
  }
}

// ---- cameras -------------------------------------------------------------------
function drawCameras(ctx, cameras) {
  for (const cam of cameras) {
    if (!cam.disabled) {
      drawCone(ctx, cam.x, cam.y, cam.angle, cam.range, cam.half,
        'rgba(255,45,45,0.13)', 'rgba(255,45,45,0.35)');
    } else {
      drawCone(ctx, cam.x, cam.y, cam.angle, cam.range, cam.half,
        'rgba(150,150,150,0.06)', 'rgba(150,150,150,0.25)');
    }
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = cam.disabled ? '#555' : '#222';
    ctx.fillRect(-4, -7, 16, 14);
    ctx.fillStyle = cam.disabled ? '#777' : '#ff2222';
    ctx.beginPath(); ctx.arc(12, 0, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = cam.disabled ? '#999' : '#ff5555';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cam.disabled ? 'CAM OFF' : 'CAM', cam.x, cam.y - 12);
  }
}

// ---- guards ----------------------------------------------------------------------
function drawGuards(ctx, guards, t) {
  for (const g of guards) {
    const alert = g.state === 'alert';
    const susp = g.state === 'suspicious' || g.state === 'investigate';
    drawCone(ctx, g.x, g.y, g.angle, g.viewRange, g.viewHalf,
      alert ? 'rgba(255,60,60,0.20)' : susp ? 'rgba(255,190,40,0.16)' : 'rgba(255,220,90,0.12)',
      alert ? 'rgba(255,60,60,0.5)' : 'rgba(255,220,90,0.4)');
    ctx.save();
    ctx.translate(g.x, g.y);
    // body: navy uniform
    ctx.fillStyle = '#1f2a5a';
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0d1230'; ctx.lineWidth = 2; ctx.stroke();
    // facing direction tick
    ctx.rotate(g.angle);
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(4, -5); ctx.lineTo(4, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    // cap
    ctx.fillStyle = '#101736';
    ctx.beginPath(); ctx.arc(g.x, g.y - 4, 7, Math.PI, 0); ctx.fill();
    // state mark
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    if (alert) {
      ctx.fillStyle = '#ff3333';
      ctx.fillText('!', g.x, g.y - 22 - Math.sin(t * 8) * 2);
    } else if (susp) {
      ctx.fillStyle = '#ffcc00';
      ctx.fillText('?', g.x, g.y - 22);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '10px sans-serif';
    ctx.fillText(g.name, g.x, g.y + 26);
  }
}

// ---- the thief ----------------------------------------------------------------------
function drawPlayer(ctx, player, t) {
  const p = player;
  ctx.save();
  ctx.translate(p.x, p.y);
  // soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath(); ctx.ellipse(0, 9, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
  // tuxedo body
  ctx.fillStyle = '#14161f';
  ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = p.sneaking ? '#2ecc71' : '#d4af37';
  ctx.lineWidth = 2;
  ctx.stroke();
  // white shirt V + bow tie, facing the move direction
  ctx.rotate(p.face);
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath(); ctx.moveTo(p.r - 2, 0); ctx.lineTo(2, -5); ctx.lineTo(2, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(p.r - 6, -2, 3, 4);
  ctx.restore();
  // top hat
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(p.x - 7, p.y - p.r - 8, 14, 9);
  ctx.fillRect(p.x - 10, p.y - p.r - 1, 20, 3);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(p.x - 7, p.y - p.r - 3, 14, 2);
  // thrown coins on the floor
  for (const c of p.thrownCoins) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b7950b'; ctx.lineWidth = 1; ctx.stroke();
  }
  // lockpick progress ring
  if (p.picking) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#d4af37';
    ctx.beginPath(); ctx.arc(p.x, p.y, 22, -Math.PI / 2, -Math.PI / 2 + (p.pickProgress / 3) * Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PICKING LOCK…', p.x, p.y - 30);
    ctx.restore();
  }
}

// ---- HUD ----------------------------------------------------------------------------
function drawHUD(ctx, game) {
  const { player, alarm, timeLeft, camerasDisabled } = game;
  ctx.save();
  // top bar
  ctx.fillStyle = 'rgba(8,8,14,0.82)';
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(0, 52, VIEW_W, 2);

  // title + objective
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5d76e';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText('THE VELVET VAULT', 14, 22);
  ctx.fillStyle = '#cfcfcf';
  ctx.font = '12px sans-serif';
  const objective = player.hasDiamond
    ? 'Diamond secured — get to the EXIT!'
    : 'Steal the VELVET DIAMOND in the vault, then reach the EXIT.';
  ctx.fillText(objective, 14, 40);

  // alarm meter, centre
  const ax = VIEW_W / 2 - 170, ay = 14, aw = 340, ah = 16;
  ctx.fillStyle = '#222';
  ctx.fillRect(ax - 2, ay - 2, aw + 4, ah + 4);
  const frac = Math.max(0, Math.min(1, alarm / 100));
  const grad = ctx.createLinearGradient(ax, 0, ax + aw, 0);
  grad.addColorStop(0, '#27ae60'); grad.addColorStop(0.55, '#f1c40f'); grad.addColorStop(1, '#e74c3c');
  ctx.fillStyle = grad;
  ctx.fillRect(ax, ay, aw * frac, ah);
  ctx.strokeStyle = alarm >= 100 ? '#ff3333' : '#888';
  ctx.lineWidth = alarm >= 100 ? 2.5 : 1;
  ctx.strokeRect(ax, ay, aw, ah);
  ctx.fillStyle = alarm >= 100 ? '#ff5555' : '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(alarm >= 100 ? '⚠ LOCKDOWN ⚠' : `ALARM ${Math.round(alarm)}%`, ax + aw / 2, ay + ah + 14);

  // loot + tools, right
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`💰 ${player.loot} chips  (${player.lootCount}/5 loot)`, VIEW_W - 14, 22);
  ctx.fillStyle = '#ddd';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    `🪙 coins ×${player.coins}   ⚡ EMP ×${player.emp}${camerasDisabled ? '  (cameras off)' : ''}   ⏱ ${Math.max(0, Math.ceil(timeLeft))}s`,
    VIEW_W - 14, 40);

  // bottom hints
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    'WASD / arrows — move    Shift — sneak    Click — toss coin lure    E — EMP cameras    Hold F — pick vault lock    M — mute',
    VIEW_W / 2, VIEW_H - 10);

  // red vignette as the alarm climbs
  if (alarm > 40) {
    const a = ((alarm - 40) / 60) * 0.28;
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
    vg.addColorStop(0, 'rgba(255,0,0,0)');
    vg.addColorStop(1, `rgba(255,0,0,${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
}

// ---- overlays --------------------------------------------------------------------------
function overlay(ctx, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,5,12,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, 300);
  ctx.fillStyle = '#eee';
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 345 + i * 28));
  ctx.restore();
}

export function drawTitle(ctx) {
  ctx.save();
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE VELVET VAULT', VIEW_W / 2, 250);
  ctx.fillStyle = '#f5d76e';
  ctx.font = 'italic 20px Georgia, serif';
  ctx.fillText('A casino heist in one night', VIEW_W / 2, 290);
  ctx.fillStyle = '#ddd';
  ctx.font = '16px sans-serif';
  const lines = [
    'Slip past Rocco, Vera and Sal — their vision cones are real, and so is line of sight.',
    'Dodge the sweeping cameras, time the laser grid, pick the vault lock.',
    'Grab the Velvet Diamond, then walk out the EXIT with your loot.',
    '',
    'WASD / arrows — move      Shift — sneak      Click — toss a coin lure (3)',
    'E — EMP: kill all cameras for 12s (once)      Hold F — pick the vault lock',
    '',
    'If the alarm hits 100% the casino locks down and the guards hunt you.',
    'If a guard catches you, the night is over.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 340 + i * 26));
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Click anywhere to begin the heist', VIEW_W / 2, 620);
  ctx.restore();
}

export function drawEnd(ctx, won, score, detail) {
  if (won) {
    overlay(ctx, 'CLEAN GETAWAY!', [
      `You slipped out with ${score} chips. The Velvet Diamond is yours.`,
      detail,
      '',
      'Press R to play again',
    ], '#2ecc71');
  } else {
    overlay(ctx, 'CAUGHT!', [
      'A guard got a hand on you. The Velvet Vault keeps its diamond — tonight.',
      detail,
      '',
      'Press R to try again',
    ], '#e74c3c');
  }
}

export function drawGame(ctx, game) {
  const { t } = game;
  // Paint the whole canvas first: the entry-door gap in the bottom wall is
  // covered by no floor fill, and without this the translucent alarm
  // vignette would accumulate there frame after frame into solid red.
  ctx.fillStyle = '#07070d';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloors(ctx, t);
  drawLoot(ctx, game.loot, t);
  drawLasers(ctx, t);
  drawCameras(ctx, game.cameras);
  drawGuards(ctx, game.guards, t);
  drawPlayer(ctx, game.player, t);
  drawWalls(ctx);
  drawHUD(ctx, game);
}
