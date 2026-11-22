// The thief: WASD/arrows movement (Shift to sneak), mouse click to toss a
// coin lure, E for the one-shot EMP, hold F to pick the vault door. Loot is
// picked up by walking over it; the Velvet Diamond is the win target.

import { moveCircle, VAULT_DOOR, LOOT_DEFS, EXIT_ZONE } from './level.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 150;
    this.y = 740;
    this.r = 13;
    this.speed = 175;
    this.sneakSpeed = 95;
    this.sneaking = false;
    this.moving = false;
    this.face = -Math.PI / 2;
    this.coins = 3;
    this.emp = 1;
    this.loot = 0;
    this.lootCount = 0;
    this.hasDiamond = false;
    this.pickProgress = 0;
    this.picking = false;
    this.stepPhase = 0;
    this.thrownCoins = []; // {x, y, t} — visual + audio only
  }

  nearVaultDoor() {
    const cx = VAULT_DOOR.x + VAULT_DOOR.w / 2;
    const cy = VAULT_DOOR.y + VAULT_DOOR.h / 2;
    return Math.hypot(this.x - cx, this.y - cy) < 62;
  }

  update(dt, keys, mouse) {
    let dx = 0, dy = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
    this.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
    this.picking = keys.has('KeyF') && VAULT_DOOR.locked && this.nearVaultDoor();

    // Picking the vault door roots the thief in place.
    if (this.picking) {
      this.pickProgress += dt;
      this.moving = false;
      if (this.pickProgress >= 3) {
        VAULT_DOOR.locked = false;
        VAULT_DOOR.pick = 1;
        this.pickProgress = 0;
        this.picking = false;
        return 'door-opened';
      }
      return null;
    }
    this.pickProgress = Math.max(0, this.pickProgress - dt * 1.5);

    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    if (this.moving) {
      dx /= len; dy /= len;
      const sp = this.sneaking ? this.sneakSpeed : this.speed;
      const ox = this.x, oy = this.y;
      moveCircle(this, dx * sp * dt, dy * sp * dt, this.r);
      this.stepPhase += Math.hypot(this.x - ox, this.y - oy);
      this.face = Math.atan2(dy, dx);
    }

    // Coin toss: click throws one coin toward the mouse point (max range 320).
    if (mouse.clicked && this.coins > 0) {
      const dxm = mouse.x - this.x, dym = mouse.y - this.y;
      const d = Math.hypot(dxm, dym);
      const range = Math.min(d, 320);
      const tx = this.x + (dxm / (d || 1)) * range;
      const ty = this.y + (dym / (d || 1)) * range;
      this.coins -= 1;
      this.thrownCoins.push({ x: tx, y: ty, t: 0 });
      mouse.clicked = false;
      return { type: 'coin', x: tx, y: ty };
    }
    mouse.clicked = false;
    return null;
  }

  // Walk-over pickup. Returns the loot def just taken, or null.
  tryPickup(loot) {
    for (const item of loot) {
      if (!item.taken && Math.hypot(item.x - this.x, item.y - this.y) < 26) {
        item.taken = true;
        this.loot += item.value;
        this.lootCount += 1;
        if (item.kind === 'diamond') this.hasDiamond = true;
        return item;
      }
    }
    return null;
  }

  inExitZone() {
    return (
      this.x > EXIT_ZONE.x && this.x < EXIT_ZONE.x + EXIT_ZONE.w &&
      this.y > EXIT_ZONE.y && this.y < EXIT_ZONE.y + EXIT_ZONE.h
    );
  }
}

export function freshLoot() {
  return LOOT_DEFS.map((d) => ({ ...d, taken: false }));
}
