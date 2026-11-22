// Security cameras: wall-mounted, sweeping vision cones with real line of
// sight. An EMP burst (the thief's one-shot tool) disables every camera for
// 12 seconds — their cones go grey and they stop feeding the alarm.

import { inVisionCone } from './level.js';

export class Camera {
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.speed = def.speed;
    this.range = def.range;
    this.half = def.half;
    this.t = Math.random() * 10;
    this.disabledUntil = -1;
    this.angle = def.baseAngle;
  }

  get disabled() {
    return this.t < this.disabledUntil;
  }

  disableFor(seconds) {
    this.disabledUntil = this.t + seconds;
  }

  update(dt) {
    this.t += dt;
    // Ping-pong sweep around the base angle.
    this.angle = this.baseAngle + Math.sin(this.t * this.speed) * this.sweep;
  }

  sees(player) {
    if (this.disabled) return false;
    return inVisionCone(this.x, this.y, this.angle, this.range, this.half, player.x, player.y);
  }
}
