// The Velvet Vault — bootstrap, game loop, input and the alarm meter.
// States: 'title' → 'playing' → 'won' | 'caught'. The alarm rises while any
// guard or camera sees the thief (faster in the open, slower while sneaking),
// falls while hidden, and at 100% the casino locks down: guards speed up and
// hunt, the vault door re-locks if it was picked. Lasers spike the alarm.
// Deterministic screenshot presets live behind ?shot=start|patrol|alert|escape
// (plus &seed=, ignored — the layout is fixed) for the entry's screenshots.

import { VIEW_W, VIEW_H, GUARD_DEFS, CAMERA_DEFS, VAULT_DOOR, LASERS, laserLive, PLAYER_SPAWN } from './level.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { Player, freshLoot } from './player.js';
import { SoundFX } from './audio.js';
import { drawGame, drawTitle, drawEnd } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const sfx = new SoundFX();

const game = {
  state: 'title', // title | playing | won | caught
  t: 0,
  timeLeft: 300, // 5-minute night
  alarm: 0,
  lockdown: false,
  player: new Player(),
  guards: GUARD_DEFS.map((d) => new Guard(d)),
  cameras: CAMERA_DEFS.map((d) => new Camera(d)),
  loot: freshLoot(),
  keys: new Set(),
  mouse: { x: 0, y: 0, clicked: false },
  endDetail: '',
  frozen: false, // screenshot mode: render the staged scene, never advance it
  spottedLatch: false,
  lastStepSound: 0,
};

function resetGame() {
  VAULT_DOOR.locked = true;
  VAULT_DOOR.pick = 0;
  game.state = 'playing';
  game.t = 0;
  game.timeLeft = 300;
  game.alarm = 0;
  game.lockdown = false;
  game.player = new Player();
  game.guards = GUARD_DEFS.map((d) => new Guard(d));
  game.cameras = CAMERA_DEFS.map((d) => new Camera(d));
  game.loot = freshLoot();
  game.endDetail = '';
  game.spottedLatch = false;
}

// ---- input ----------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') { sfx.muted = !sfx.muted; return; }
  if (e.code === 'KeyR' && (game.state === 'won' || game.state === 'caught')) { resetGame(); return; }
  if (e.code === 'KeyE' && game.state === 'playing' && game.player.emp > 0) {
    game.player.emp -= 1;
    for (const cam of game.cameras) cam.disableFor(12);
    sfx.ensure(); sfx.emp();
    return;
  }
  game.keys.add(e.code);
});
window.addEventListener('keyup', (e) => game.keys.delete(e.code));
canvas.addEventListener('mousemove', (e) => {
  const r = canvas.getBoundingClientRect();
  game.mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
  game.mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
});
canvas.addEventListener('mousedown', (e) => {
  sfx.ensure();
  const r = canvas.getBoundingClientRect();
  game.mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
  game.mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
  if (game.state === 'title') { resetGame(); return; }
  if (game.state === 'playing') game.mouse.clicked = true;
});

// ---- alarm ------------------------------------------------------------------
function updateAlarm(dt, seenByGuard, seenByCamera) {
  const p = game.player;
  if (seenByGuard || seenByCamera) {
    const rate = (seenByGuard ? 52 : 0) + (seenByCamera ? 38 : 0);
    game.alarm += rate * dt * (p.sneaking ? 0.55 : 1);
    if (!game.spottedLatch) { sfx.spotted(); game.spottedLatch = true; }
  } else {
    game.alarm = Math.max(0, game.alarm - dt * (game.lockdown ? 7 : 14));
    game.spottedLatch = false;
  }
  game.alarm = Math.min(100, game.alarm);
  if (game.alarm >= 100 && !game.lockdown) {
    game.lockdown = true;
    // Lockdown slams the vault door shut again if it was picked.
    if (!VAULT_DOOR.locked) { VAULT_DOOR.locked = true; VAULT_DOOR.pick = 0; }
  }
  if (game.lockdown && game.alarm < 40) game.lockdown = false;
}

// ---- main update --------------------------------------------------------------
function update(dt) {
  game.t += dt;
  game.timeLeft -= dt;
  if (game.timeLeft <= 0) {
    game.state = 'caught';
    game.endDetail = 'The night ran out — dawn security swept the floor.';
    sfx.caught();
    return;
  }

  const p = game.player;
  const evt = p.update(dt, game.keys, game.mouse);
  if (evt === 'door-opened') { sfx.doorOpen(); }
  if (evt && evt.type === 'coin') {
    sfx.coin();
    setTimeout(() => sfx.clink(), 350);
    for (const g of game.guards) g.hearNoise(evt.x, evt.y, 280);
  }
  if (p.picking && Math.random() < dt * 6) sfx.lockpickTick();

  // Footsteps.
  if (p.moving && game.t - game.lastStepSound > (p.sneaking ? 0.42 : 0.3)) {
    game.lastStepSound = game.t;
    sfx.step();
  }

  // Lasers.
  for (const l of LASERS) {
    if (laserLive(l, game.t) && Math.abs(p.x - l.x) < p.r + 2 && p.y > l.y1 && p.y < l.y2) {
      if (!p._laserHit || game.t - p._laserHit > 1) {
        p._laserHit = game.t;
        game.alarm = Math.min(100, game.alarm + 35);
        sfx.laserZap();
        // Shove the thief back out of the beam.
        p.x += p.x < l.x ? -26 : 26;
      }
    }
  }

  // Guards + cameras.
  let seenByGuard = false, seenByCamera = false;
  for (const g of game.guards) {
    if (g.update(dt, p, game.alarm, p.sneaking)) seenByGuard = true;
    if (Math.hypot(g.x - p.x, g.y - p.y) < 26) {
      game.state = 'caught';
      game.endDetail = `${g.name} caught you on the floor. Loot kept: ${p.loot} chips.`;
      sfx.stopAlarm(); sfx.caught();
      return;
    }
  }
  for (const cam of game.cameras) {
    cam.update(dt);
    if (cam.sees(p)) seenByCamera = true;
  }

  updateAlarm(dt, seenByGuard, seenByCamera);
  sfx.setAlarm(game.alarm);

  // Loot pickup.
  const got = p.tryPickup(game.loot);
  if (got) {
    if (got.kind === 'diamond') sfx.diamond(); else sfx.pickup();
  }

  // Win: diamond in hand, reach the exit.
  if (p.hasDiamond && p.inExitZone()) {
    game.state = 'won';
    const timeBonus = Math.max(0, Math.round(game.timeLeft)) * 2;
    const total = p.loot + timeBonus;
    game.endDetail = `Loot ${p.loot} chips + time bonus ${timeBonus} = ${total} chips. Alarm peaked and fell — the house never knew.`;
    game.player.loot = total;
    sfx.stopAlarm(); sfx.win();
  }
}

// ---- screenshot presets -------------------------------------------------------
function applyShot(name) {
  resetGame();
  game.frozen = true;
  const p = game.player;
  if (name === 'start') {
    // Opening frame: thief at the lobby door, guards on patrol, all systems live.
    p.x = 150; p.y = 700;
    game.guards[0].x = 320; game.guards[0].y = 280; game.guards[0].angle = 0;
    game.guards[1].x = 1000; game.guards[1].y = 470; game.guards[1].angle = Math.PI;
    game.guards[2].x = 1000; game.guards[2].y = 260; game.guards[2].angle = Math.PI / 2;
  } else if (name === 'patrol') {
    // Mid-heist: thief crouched at the edge of Rocco's cone on the Slots floor.
    p.x = 380; p.y = 390; p.sneaking = true; p.face = 0.6;
    p.loot = 150; p.lootCount = 1; p.coins = 2;
    game.loot[0].taken = true;
    game.guards[0].x = 480; game.guards[0].y = 270; game.guards[0].angle = Math.PI;
    game.guards[0].state = 'suspicious'; game.guards[0].suspicion = 0.4;
    game.guards[1].x = 900; game.guards[1].y = 650; game.guards[1].angle = 0;
    game.guards[2].x = 850; game.guards[2].y = 380; game.guards[2].angle = -Math.PI / 2;
    game.alarm = 34;
    game.timeLeft = 232;
  } else if (name === 'alert') {
    // Spotted: alarm at 88, Sal chasing through the corridor strip, camera on the thief.
    p.x = 700; p.y = 330; p.face = Math.PI;
    p.loot = 400; p.lootCount = 2; p.coins = 1; p.emp = 0;
    game.loot[0].taken = true; game.loot[1].taken = true;
    game.guards[0].x = 620; game.guards[0].y = 360; game.guards[0].angle = 0.3;
    game.guards[0].state = 'alert'; game.guards[0].suspicion = 1;
    game.guards[1].x = 880; game.guards[1].y = 480; game.guards[1].angle = -Math.PI / 2;
    game.guards[1].state = 'alert'; game.guards[1].suspicion = 1;
    game.guards[2].x = 800; game.guards[2].y = 300; game.guards[2].angle = 0;
    game.guards[2].state = 'alert'; game.guards[2].suspicion = 1;
    game.cameras[0].angle = 0.9;
    game.alarm = 88;
    game.timeLeft = 171;
  } else if (name === 'escape') {
    // Getaway: diamond in hand, vault door picked, thief slipping through the lounge.
    p.x = 900; p.y = 640; p.face = -Math.PI / 2;
    p.loot = 1900; p.lootCount = 5; p.hasDiamond = true; p.coins = 0; p.emp = 0;
    for (const item of game.loot) item.taken = true;
    VAULT_DOOR.locked = false;
    game.guards[0].x = 300; game.guards[0].y = 480; game.guards[0].angle = Math.PI;
    game.guards[1].x = 1150; game.guards[1].y = 625; game.guards[1].angle = Math.PI;
    game.guards[1].state = 'suspicious';
    game.guards[2].x = 900; game.guards[2].y = 260; game.guards[2].angle = Math.PI / 2;
    game.cameras[2].disabledUntil = 9999; game.cameras[2].t = 0;
    game.alarm = 52;
    game.timeLeft = 96;
  }
  game.t = name === 'alert' ? 41.7 : name === 'escape' ? 12.3 : name === 'patrol' ? 23.1 : 2.0;
}

// ---- loop ----------------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (game.state === 'playing' && !game.frozen) update(dt);
  if (game.state === 'title') drawTitle(ctx);
  else if (game.state === 'won') { drawGame(ctx, game); drawEnd(ctx, true, game.player.loot, game.endDetail); }
  else if (game.state === 'caught') { drawGame(ctx, game); drawEnd(ctx, false, 0, game.endDetail); }
  else drawGame(ctx, game);
  requestAnimationFrame(frame);
}

if (shot) applyShot(shot);
requestAnimationFrame(frame);

// Exposed for headless play-testing: drive the game without a real keyboard.
window.__velvet = {
  game,
  resetGame,
  doorLocked: () => VAULT_DOOR.locked,
  press(code) { game.keys.add(code); },
  release(code) { game.keys.delete(code); },
  click(x, y) {
    game.mouse.x = x; game.mouse.y = y;
    if (game.state === 'title') resetGame();
    else if (game.state === 'playing') game.mouse.clicked = true;
  },
};
