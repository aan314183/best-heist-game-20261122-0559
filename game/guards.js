// Guards: patrol waypoints, vision cones with real line of sight, and four
// states — patrol, suspicious (heard or glimpsed something), alert (chasing
// the thief), investigate (walking to a noise point). A guard that touches the
// thief catches them. Speed rises while the alarm is high.

import { inVisionCone, moveCircle } from './level.js';

export const GUARD_STATES = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', ALERT: 'alert', INVESTIGATE: 'investigate' };

export class Guard {
  constructor(def) {
    this.id = def.id;
    this.name = def.name;
    this.waypoints = def.waypoints;
    this.baseSpeed = def.speed;
    this.viewRange = def.viewRange;
    this.viewHalf = def.viewHalf;
    this.x = def.waypoints[0][0];
    this.y = def.waypoints[0][1];
    this.wp = 1;
    this.angle = 0;
    this.state = GUARD_STATES.PATROL;
    this.stateT = 0;
    this.lastSeen = null; // {x, y}
    this.investigateTarget = null;
    this.suspicion = 0; // 0..1, fills while the thief is at the cone's edge
    this.pauseT = 0;
    this.stepPhase = 0;
  }

  speed(alarm) {
    const boost = alarm >= 100 ? 1.55 : alarm >= 60 ? 1.25 : 1;
    return this.baseSpeed * boost * (this.state === GUARD_STATES.ALERT ? 1.35 : 1);
  }

  // Returns true when the guard currently sees the thief.
  sees(player, sneaking) {
    const range = sneaking ? this.viewRange * 0.8 : this.viewRange;
    return inVisionCone(this.x, this.y, this.angle, range, this.viewHalf, player.x, player.y);
  }

  hearNoise(x, y, radius) {
    if (this.state === GUARD_STATES.ALERT) return;
    const d = Math.hypot(x - this.x, y - this.y);
    if (d < radius) {
      this.investigateTarget = { x, y };
      this.state = GUARD_STATES.INVESTIGATE;
      this.stateT = 0;
    }
  }

  update(dt, player, alarm, sneaking) {
    this.stateT += dt;
    const seen = this.sees(player, sneaking);
    if (seen) {
      this.lastSeen = { x: player.x, y: player.y };
      this.suspicion = Math.min(1, this.suspicion + dt * 1.6);
      if (this.suspicion > 0.55) {
        this.state = GUARD_STATES.ALERT;
        this.stateT = 0;
      } else if (this.state === GUARD_STATES.PATROL) {
        this.state = GUARD_STATES.SUSPICIOUS;
        this.stateT = 0;
      }
    } else {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.5);
      if (this.state === GUARD_STATES.SUSPICIOUS && this.stateT > 2.2) {
        this.state = GUARD_STATES.PATROL;
        this.stateT = 0;
      }
      if (this.state === GUARD_STATES.ALERT) {
        // Lost sight: keep hunting the last seen spot for a while, then give up.
        if (this.stateT > 5) {
          this.state = GUARD_STATES.PATROL;
          this.stateT = 0;
          this.lastSeen = null;
        }
      }
    }

    const sp = this.speed(alarm);
    let tx = null, ty = null, faceMove = true;

    if (this.state === GUARD_STATES.PATROL) {
      const [wx, wy] = this.waypoints[this.wp];
      tx = wx; ty = wy;
      if (Math.hypot(wx - this.x, wy - this.y) < 8) {
        if (this.pauseT <= 0) this.pauseT = 0.9; // look around at each waypoint
        this.wp = (this.wp + 1) % this.waypoints.length;
      }
    } else if (this.state === GUARD_STATES.SUSPICIOUS) {
      // Stop and scan toward the last seen spot.
      faceMove = false;
      if (this.lastSeen) this.angle = turnToward(this.angle, Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x), dt * 3);
    } else if (this.state === GUARD_STATES.ALERT) {
      const target = seen ? { x: player.x, y: player.y } : this.lastSeen;
      if (target) { tx = target.x; ty = target.y; }
    } else if (this.state === GUARD_STATES.INVESTIGATE) {
      if (this.investigateTarget) {
        tx = this.investigateTarget.x; ty = this.investigateTarget.y;
        if (Math.hypot(tx - this.x, ty - this.y) < 14) {
          // Arrived: look around, then resume patrol.
          this.pauseT = 1.6;
          this.investigateTarget = null;
          this.state = GUARD_STATES.PATROL;
          this.stateT = 0;
        }
      } else {
        this.state = GUARD_STATES.PATROL;
      }
    }

    if (this.pauseT > 0) {
      this.pauseT -= dt;
      // Scan slowly while paused.
      this.angle += dt * 0.9;
      return seen;
    }

    if (tx !== null && faceMove) {
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const step = Math.min(sp * dt, d);
        const nx = this.x + (dx / d) * step;
        const ny = this.y + (dy / d) * step;
        const before = { x: this.x, y: this.y };
        moveCircle(this, nx - this.x, ny - this.y, 14);
        const moved = Math.hypot(this.x - before.x, this.y - before.y);
        this.stepPhase += moved;
        this.angle = turnToward(this.angle, Math.atan2(dy, dx), dt * 6);
      }
    }
    return seen;
  }
}

export function turnToward(angle, target, maxStep) {
  let d = target - angle;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  if (Math.abs(d) <= maxStep) return target;
  return angle + Math.sign(d) * maxStep;
}
