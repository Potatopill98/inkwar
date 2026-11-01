// 程序化古风音频：五声音阶 BGM + 战斗音效（无外部音频资源）
const NOTES = {
  D3: 146.83, E3: 164.81, G3: 196.0, A3: 220.0, C4: 261.63,
  D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, C5: 523.25,
  D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.musicOn = true;
    this.sfxOn = true;
    this.musicTimer = null;
    this.step = 0;
    this.mood = 'menu';
    this.intensity = 0;
    this.boss = false;
    this.lastPlay = new Map();
    this.noiseBuffer = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.nextNoteTime = 0;
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        this.ctx.suspend().catch(() => {});
      } else if (this.unlocked) {
        this.ctx.resume().catch(() => {});
      }
    });
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.unlocked = true;
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.16 : 0;
    this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 0.42 : 0;
    this.sfxGain.connect(this.master);
    this.noiseBuffer = this.makeNoise();
    this.unlocked = true;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  makeNoise() {
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setMusicEnabled(on) {
    this.musicOn = !!on;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.08);
    }
  }

  setSfxEnabled(on) {
    this.sfxOn = !!on;
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(on ? 0.42 : 0, this.ctx.currentTime, 0.08);
    }
  }

  vibrate(ms = 12) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(ms);
    } catch {}
  }

  throttled(key, ms) {
    if (!this.sfxOn) return true;
    const now = performance.now();
    const last = this.lastPlay.get(key) || 0;
    if (now - last < ms) return true;
    this.lastPlay.set(key, now);
    return false;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ---------- 基础合成 ----------
  tone(freq, when, dur, peak, type = 'triangle', dest = null, detune = 0) {
    if (!this.ctx) return;
    const t = when ?? this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  pluck(freq, when, dur = 0.6, peak = 0.12, dest = null) {
    if (!this.ctx) return;
    const t = when ?? this.now();
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(6000, freq * 8), t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 2), t + dur);
    osc.type = 'triangle';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(freq * 2.01, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g);
    g.connect(dest || this.musicGain);
    osc.start(t);
    osc2.start(t);
    osc.stop(t + dur + 0.05);
    osc2.stop(t + dur + 0.05);
  }

  noise(when, dur, peak, filterType = 'bandpass', freq = 1200, q = 1, dest = null) {
    if (!this.ctx || !this.noiseBuffer) return;
    const t = when ?? this.now();
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || this.sfxGain);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  drum(when = null, low = true, peak = 0.32) {
    if (!this.ctx) return;
    const t = when ?? this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const f0 = low ? 95 : 170;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(low ? 32 : 90, t + 0.28);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.36);
    this.noise(t, 0.10, peak * 0.22, 'lowpass', 420, 0.8);
  }

  gong(when = null, pitch = 1) {
    if (!this.ctx) return;
    const t = when ?? this.now();
    const base = 110 * pitch;
    const partials = [1, 1.53, 2.07, 2.71, 3.4];
    const ratios = [0.20, 0.10, 0.075, 0.045, 0.03];
    partials.forEach((p, i) => {
      this.tone(base * p, t, 1.6 + i * 0.22, ratios[i], 'sine', this.sfxGain, (i % 2 ? 6 : -4));
    });
    this.noise(t, 0.8, 0.05, 'bandpass', 900, 0.6);
  }

  // ---------- UI / 战斗音效 ----------
  click() {
    if (!this.ctx || this.throttled('click', 40)) return;
    this.noise(null, 0.05, 0.12, 'bandpass', 1600, 2);
    this.tone(NOTES.G4, null, 0.09, 0.05, 'sine');
  }

  select() {
    if (!this.ctx || this.throttled('select', 50)) return;
    this.noise(null, 0.12, 0.07, 'highpass', 2400, 0.7);
    this.tone(NOTES.D5, null, 0.18, 0.05, 'sine');
  }

  woodfish() {
    if (!this.ctx || this.throttled('woodfish', 220)) return;
    const t = this.now();
    this.noise(t, 0.04, 0.05, 'bandpass', 800, 3);
    this.tone(480, t, 0.08, 0.04, 'triangle');
  }

  error() {
    if (!this.ctx || this.throttled('error', 160)) return;
    this.tone(120, null, 0.15, 0.12, 'square');
    this.tone(90, null, 0.18, 0.08, 'triangle');
  }

  deploy(building = false) {
    if (!this.ctx || this.throttled('deploy', 45)) return;
    this.drum(null, true, 0.22);
    this.noise(null, building ? 0.22 : 0.12, 0.12, 'lowpass', building ? 500 : 900, 0.8);
    if (!building) this.tone(520, null, 0.12, 0.04, 'sine');
  }

  sword() {
    if (!this.ctx || this.throttled('sword', 45)) return;
    this.noise(null, 0.12, 0.16, 'bandpass', 2600, 1.4);
    this.tone(760, null, 0.09, 0.035, 'triangle');
  }

  spear() {
    if (!this.ctx || this.throttled('spear', 50)) return;
    this.noise(null, 0.08, 0.12, 'highpass', 3200, 0.6);
    this.tone(1100, null, 0.06, 0.03, 'sine');
  }

  bow() {
    if (!this.ctx || this.throttled('bow', 45)) return;
    this.noise(null, 0.18, 0.08, 'highpass', 2600, 0.6);
    this.tone(330, null, 0.16, 0.045, 'triangle');
  }

  javelin() {
    if (!this.ctx || this.throttled('javelin', 70)) return;
    this.noise(null, 0.22, 0.11, 'bandpass', 1400, 0.8);
    this.tone(210, null, 0.2, 0.05, 'triangle');
  }

  horse() {
    if (!this.ctx || this.throttled('horse', 90)) return;
    for (let i = 0; i < 3; i++) {
      this.noise(this.now() + i * 0.08, 0.06, 0.10, 'lowpass', 380, 1.2);
    }
    this.tone(90, null, 0.2, 0.05, 'sine');
  }

  charge() {
    if (!this.ctx || this.throttled('charge', 200)) return;
    this.noise(null, 0.35, 0.14, 'bandpass', 700, 0.8);
    this.tone(140, null, 0.35, 0.10, 'sawtooth');
    this.drum(null, true, 0.2);
  }

  explosion() {
    if (!this.ctx || this.throttled('explosion', 100)) return;
    this.noise(null, 0.5, 0.30, 'lowpass', 800, 1);
    this.tone(70, null, 0.5, 0.24, 'sine');
    this.tone(140, null, 0.32, 0.10, 'triangle');
  }

  fire() {
    if (!this.ctx || this.throttled('fire', 140)) return;
    this.noise(null, 0.35, 0.10, 'bandpass', 900, 0.5);
  }

  heal() {
    if (!this.ctx || this.throttled('heal', 160)) return;
    const t = this.now();
    this.tone(880, t, 0.5, 0.06, 'sine');
    this.tone(1320, t + 0.06, 0.5, 0.04, 'sine');
    this.tone(1760, t + 0.12, 0.4, 0.025, 'sine');
  }

  shield() {
    if (!this.ctx || this.throttled('shield', 160)) return;
    this.tone(560, null, 0.3, 0.06, 'sine');
    this.tone(840, null, 0.28, 0.04, 'sine');
  }

  skill() {
    if (!this.ctx || this.throttled('skill', 180)) return;
    this.gong(null, 1.1);
    this.noise(null, 0.5, 0.12, 'bandpass', 1800, 0.7);
  }

  bossRoar() {
    if (!this.ctx) return;
    this.drum(null, true, 0.4);
    this.drum(this.now() + 0.28, true, 0.35);
    this.gong(null, 0.72);
    this.tone(55, null, 1.2, 0.18, 'sawtooth');
  }

  baseHit() {
    if (!this.ctx || this.throttled('basehit', 90)) return;
    this.noise(null, 0.18, 0.16, 'lowpass', 300, 0.8);
    this.tone(70, null, 0.22, 0.14, 'sine');
  }

  victory() {
    if (!this.ctx) return;
    this.gong(null, 1.2);
    const seq = [NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.D5];
    seq.forEach((f, i) => this.pluck(f, this.now() + 0.25 + i * 0.22, 1.2, 0.10, this.sfxGain));
    this.drum(this.now() + 0.25, true, 0.2);
  }

  defeat() {
    if (!this.ctx) return;
    this.drum(null, true, 0.3);
    this.tone(110, null, 1.6, 0.12, 'sawtooth');
    this.tone(82, null, 1.8, 0.10, 'triangle');
  }

  star(index = 0) {
    if (!this.ctx) return;
    this.gong(this.now() + index * 0.28, 1 + index * 0.12);
    this.pluck([NOTES.G4, NOTES.A4, NOTES.D5][index % 3], this.now() + index * 0.28 + 0.02, 1.0, 0.10, this.sfxGain);
  }

  // ---------- BGM ----------
  startMusic(mood = 'menu') {
    if (!this.ctx) return;
    if (this.musicTimer && this.mood === mood) return;
    this.mood = mood;
    this.stopMusic();
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.2;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 220);
    this.scheduleMusic();
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  setMood(mood) {
    if (mood !== this.mood) this.startMusic(mood);
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(2, v));
  }

  setBoss(on) {
    this.boss = !!on;
    if (on) this.setMood('boss');
  }

  scheduleMusic() {
    if (!this.ctx || !this.musicOn) return;
    const now = this.ctx.currentTime;
    const stepDur = this.mood === 'menu' ? 0.46 : this.mood === 'boss' ? 0.26 : 0.32;
    while (this.nextNoteTime < now + 0.45) {
      this.playStep(this.step, this.nextNoteTime);
      this.step++;
      this.nextNoteTime += stepDur;
    }
  }

  playStep(step, t) {
    const menu = this.mood === 'menu';
    const boss = this.mood === 'boss';
    const scale = [NOTES.D4, NOTES.E4, NOTES.G4, NOTES.A4, NOTES.C5, NOTES.D5, NOTES.E5];
    const pattern = [0, 2, 4, 3, 1, 3, 5, 4, 2, 1, 0, 2];
    const idx = pattern[step % pattern.length];
    let f = scale[idx];
    if (boss) f *= 0.5;
    if (menu) {
      if (step % 4 === 0 || step % 7 === 2) {
        this.pluck(f, t, 1.4, 0.075, this.musicGain);
      }
      if (step % 8 === 0) this.pluck(f / 2, t, 1.8, 0.05, this.musicGain);
    } else {
      if (step % 2 === 0 || this.intensity > 0) {
        this.pluck(f, t, 0.7, 0.055, this.musicGain);
      }
      if (step % 4 === 0) this.pluck(f / 2, t, 0.9, 0.04, this.musicGain);
      if (step % 2 === 0) {
        this.drum(t, step % 8 === 0, step % 8 === 0 ? 0.16 : 0.10);
      }
      if (this.intensity >= 1 && step % 2 === 1) {
        this.noise(t, 0.06, 0.020, 'highpass', 3000, 0.8, this.musicGain);
      }
      if (boss && step % 8 === 4) this.gong(t, 0.9);
    }
  }
}

export const audio = new AudioEngine();
