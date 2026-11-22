// Procedural sound: every effect is synthesised with WebAudio — no audio
// files, no network. Created lazily on the first user gesture (browser
// autoplay rules), silent until then.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.alarmNodes = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
  }

  tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, vol = 0.15, freq = 1200, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
  }

  step() { this.noise(0.05, 0.05, 700); }
  coin() { this.tone(1900, 0.09, 'triangle', 0.22); this.tone(2500, 0.14, 'triangle', 0.16, null, 0.07); }
  clink() { this.tone(3200, 0.06, 'square', 0.08); this.tone(2100, 0.08, 'square', 0.06, null, 0.05); }
  pickup() { this.tone(660, 0.1, 'sine', 0.2); this.tone(990, 0.16, 'sine', 0.2, null, 0.08); }
  diamond() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.22, null, i * 0.09));
  }
  emp() { this.tone(1200, 0.5, 'sawtooth', 0.14, 90); this.noise(0.4, 0.12, 2400); }
  laserZap() { this.tone(220, 0.18, 'sawtooth', 0.2, 880); }
  lockpickTick() { this.tone(1400, 0.04, 'square', 0.07); }
  doorOpen() { this.tone(180, 0.25, 'triangle', 0.2, 90); this.noise(0.2, 0.1, 500, 0.05); }
  spotted() { this.tone(880, 0.12, 'square', 0.16); this.tone(880, 0.12, 'square', 0.16, null, 0.15); }
  win() {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, null, i * 0.11));
  }
  caught() {
    [330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.28, 'sawtooth', 0.16, null, i * 0.16));
  }

  // Alarm siren while the meter is high; call every frame with the level.
  setAlarm(level) {
    if (!this.ctx || this.muted) return;
    if (level > 55 && !this.alarmNodes) {
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 620;
      lfo.type = 'sine';
      lfo.frequency.value = 1.4;
      lfoGain.gain.value = 180;
      g.gain.value = 0.05;
      lfo.connect(lfoGain).connect(osc.frequency);
      osc.connect(g).connect(this.master);
      osc.start(); lfo.start();
      this.alarmNodes = { osc, lfo, g };
    } else if (level <= 55 && this.alarmNodes) {
      const { osc, lfo, g } = this.alarmNodes;
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
      osc.stop(this.ctx.currentTime + 0.3);
      lfo.stop(this.ctx.currentTime + 0.3);
      this.alarmNodes = null;
    }
    if (this.alarmNodes) {
      this.alarmNodes.g.gain.value = 0.03 + (level / 100) * 0.05;
    }
  }

  stopAlarm() {
    if (this.alarmNodes && this.ctx) {
      const { osc, lfo, g } = this.alarmNodes;
      try { g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1); osc.stop(this.ctx.currentTime + 0.2); lfo.stop(this.ctx.currentTime + 0.2); } catch { /* already stopped */ }
      this.alarmNodes = null;
    }
  }
}
