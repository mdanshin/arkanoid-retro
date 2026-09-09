// Original, sample-free score: layered analogue synths and spatial sound design.
// Every musical event is scheduled on the audio clock, independent of frame rate.
const midi = note => 440 * 2 ** ((note - 69) / 12);
const limit = (value, min, max) => Math.max(min, Math.min(max, value));
const CHORDS = [[45, 52, 57, 60, 64], [41, 48, 53, 57, 60], [48, 55, 60, 64, 67], [43, 50, 55, 59, 62]];
const MELODY = [76, null, 79, 81, null, 79, 76, null, 72, null, 74, 76, null, 71, 74, null];

export class HorizonAudio {
  constructor(settings = {}) {
    this.settings = {...settings}; this.ctx = null; this.voices = new Set();
    this.playing = false; this.step = 0; this.intensity = 0; this.level = 0;
    this.timer = null; this.lastSound = new Map(); this.disposed = false;
    this.bpm = 112; this.tick = 60 / this.bpm / 4;
  }

  async unlock() {
    if (this.disposed) return false;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return false;
    try {
      if (!this.ctx) {
        const c = this.ctx = new Audio({latencyHint: 'interactive'});
        this.master = c.createGain();
        const compressor = c.createDynamicsCompressor();
        compressor.threshold.value = -12; compressor.knee.value = 16;
        compressor.ratio.value = 5; compressor.attack.value = .003; compressor.release.value = .2;
        this.master.connect(compressor); compressor.connect(c.destination);
        this.noiseBuffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const noise = this.noiseBuffer.getChannelData(0);
        let smooth = 0;
        for (let i = 0; i < noise.length; i++) {
          const white = Math.random() * 2 - 1; smooth = .72 * smooth + .28 * white;
          noise[i] = white * .72 + smooth * .28;
        }
        const impulse = c.createBuffer(2, Math.floor(c.sampleRate * 2.7), c.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
          const data = impulse.getChannelData(channel); let previous = 0;
          for (let i = 0; i < data.length; i++) {
            previous = previous * .45 + (Math.random() * 2 - 1) * .55;
            data[i] = previous * (1 - i / data.length) ** 3 * (i < 800 ? i / 800 : 1);
          }
        }
        this.music = this.createBus(impulse, .28, .23);
        this.effects = this.createBus(impulse, .18, .13);
        this.updateMix();
        c.onstatechange = () => {
          if (c.state === 'running' && this.playing && !this.timer) this.beginScheduler();
          if (c.state !== 'running') this.stopScheduler();
        };
      }
      if (this.ctx.state !== 'running') await this.ctx.resume();
      if (this.playing && !this.timer) this.beginScheduler();
      return this.ctx.state === 'running';
    } catch { return false; }
  }

  createBus(impulse, reverbLevel, echoLevel) {
    const c = this.ctx, output = c.createGain(), reverb = c.createConvolver();
    reverb.buffer = impulse;
    const verbGain = c.createGain(); verbGain.gain.value = reverbLevel;
    reverb.connect(verbGain); verbGain.connect(output);
    const delay = c.createDelay(2), feedback = c.createGain(), echoGain = c.createGain(), damp = c.createBiquadFilter();
    delay.delayTime.value = this.tick * 3; feedback.gain.value = .3;
    damp.type = 'lowpass'; damp.frequency.value = 3800; echoGain.gain.value = echoLevel;
    delay.connect(damp); damp.connect(feedback); feedback.connect(delay);
    damp.connect(echoGain); echoGain.connect(output); output.connect(this.master);
    return {output, reverb, delay};
  }

  updateMix(settings = {}) {
    Object.assign(this.settings, settings);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(limit(this.settings.master ?? .65, 0, 1), t, .025);
    this.effects.output.gain.setTargetAtTime(limit(this.settings.effects ?? .8, 0, 1), t, .025);
    const volume = this.playing ? limit(this.settings.music ?? .6, 0, 1) : 0;
    this.music.output.gain.setTargetAtTime(volume, t, .12);
  }

  setPlaying(playing) {
    if (this.playing === playing) return;
    this.playing = playing; this.updateMix();
    if (playing && this.ctx?.state === 'running') this.beginScheduler();
    else {
      this.stopScheduler();
      if (this.ctx) for (const voice of this.voices) if (voice.bus === 'music') {
        const t = this.ctx.currentTime;
        voice.env.gain.cancelScheduledValues(t);
        voice.env.gain.setTargetAtTime(.0001, t, .04);
        try { voice.source.stop(t + .2); } catch { /* already ended */ }
      }
    }
  }

  setIntensity(boost, combo, level) {
    this.intensity = boost ? 1 : Math.min(.7, combo / 32); this.level = level;
  }

  beginScheduler() {
    if (this.timer || !this.playing) return;
    this.nextTime = this.ctx.currentTime + .07;
    this.schedule(); this.timer = setInterval(() => this.schedule(), 25);
  }
  stopScheduler() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  schedule() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.playing) return;
    if (this.nextTime < this.ctx.currentTime - .1) this.nextTime = this.ctx.currentTime + .025;
    while (this.nextTime < this.ctx.currentTime + .15) {
      this.musicStep(this.step++, this.nextTime); this.nextTime += this.tick;
    }
  }

  route(source, time, duration, options = {}) {
    const c = this.ctx, busName = options.bus || 'effects', bus = this[busName];
    const env = c.createGain(), pan = c.createStereoPanner();
    const attack = Math.min(options.attack ?? .004, duration * .25), peak = Math.max(.0002, options.gain ?? .1);
    env.gain.setValueAtTime(.0001, time);
    env.gain.linearRampToValueAtTime(peak, time + attack);
    env.gain.setValueAtTime(peak * (options.sustain ?? .4), time + Math.min(duration * .4, attack + .1));
    env.gain.exponentialRampToValueAtTime(.0001, time + duration);
    pan.pan.value = limit(options.pan ?? 0, -1, 1);
    const nodes = [env, pan];
    if (options.cutoff) {
      const filter = c.createBiquadFilter(); filter.type = options.filter || 'lowpass';
      filter.frequency.setValueAtTime(options.cutoff, time); filter.Q.value = options.q ?? .65;
      if (options.cutoffEnd) filter.frequency.exponentialRampToValueAtTime(options.cutoffEnd, time + duration);
      source.connect(filter); filter.connect(env); nodes.push(filter);
    } else source.connect(env);
    env.connect(pan); pan.connect(bus.output);
    const wet = options.wet ?? .3;
    if (wet) {
      const send = c.createGain(); send.gain.value = wet;
      pan.connect(send); send.connect(bus.reverb); send.connect(bus.delay); nodes.push(send);
    }
    const voice = {source, env, bus: busName}; this.voices.add(voice);
    source.onended = () => {
      source.disconnect(); nodes.forEach(node => node.disconnect()); this.voices.delete(voice);
    };
    source.start(time); source.stop(time + duration + .015);
    return voice;
  }

  tone(type, frequency, time, duration, options = {}) {
    if (!this.ctx || this.voices.size > 240) return;
    const oscillator = this.ctx.createOscillator(); oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(12, frequency), time);
    if (options.bend) oscillator.frequency.exponentialRampToValueAtTime(Math.max(12, options.bend), time + duration);
    oscillator.detune.value = options.detune || 0;
    return this.route(oscillator, time, duration, options);
  }

  noise(time, duration, options = {}) {
    if (!this.ctx || this.voices.size > 240) return;
    const source = this.ctx.createBufferSource(); source.buffer = this.noiseBuffer;
    source.loop = true; return this.route(source, time, duration, options);
  }

  musicStep(step, time) {
    if ((this.settings.music ?? .6) <= 0) return;
    const bar = Math.floor(step / 16), beat = step % 16, phrase = Math.floor(bar / 8) % 4;
    const chord = CHORDS[Math.floor(bar / 2) % CHORDS.length], energetic = this.intensity > .75 || this.level === 32;
    const m = {bus: 'music'};
    // A spacious eight-bar harmony with a stereo, gently detuned pad.
    if (beat === 0 && bar % 2 === 0) {
      for (let i = 1; i < chord.length; i++) for (const side of [-1, 1]) {
        this.tone('sawtooth', midi(chord[i]), time, this.tick * 34, {
          ...m, gain: .016, attack: .55, sustain: .75, cutoff: 850 + this.intensity * 1000,
          cutoffEnd: 450, detune: side * (5 + i), pan: side * .65, wet: .9
        });
      }
      this.tone('sine', midi(chord[0] + 12), time, this.tick * 30, {...m, gain: .028, attack: .4, wet: .45});
    }
    // Warm sub, a rounded kick and a quiet, wide percussion bed.
    if ([0, 6, 8, 14].includes(beat)) {
      const note = chord[0] - 12 + (beat === 14 ? 12 : 0);
      this.tone('sine', midi(note), time + .015, .32, {...m, gain: .16, attack: .012, wet: .015});
      this.tone('triangle', midi(note + 12), time + .02, .19, {...m, gain: .024, cutoff: 420, wet: .04});
    }
    if (beat % 4 === 0) {
      this.tone('sine', 145, time, .23, {...m, gain: .27, bend: 42, wet: .01, sustain: .18});
      this.noise(time, .024, {...m, gain: .036, cutoff: 1900, wet: 0});
    }
    if (beat === 4 || beat === 12) {
      this.noise(time, .14, {...m, gain: .09, filter: 'bandpass', cutoff: 2100, q: .6, wet: .42, pan: .1});
      this.noise(time + .018, .075, {...m, gain: .035, filter: 'highpass', cutoff: 3900, wet: .3, pan: -.2});
      this.tone('triangle', 180, time, .09, {...m, gain: .026, bend: 90, wet: .12});
    }
    if (beat % 2 === 0 || energetic) {
      const open = beat === 14;
      this.noise(time + .005, open ? .16 : .043, {...m, gain: open ? .035 : .026,
        filter: 'highpass', cutoff: 7100, wet: .23, pan: beat % 4 === 0 ? -.45 : .45});
    }
    // Plucked eighth notes use the current harmony; later phrases reveal a lead.
    if (step % 2 === 0) {
      const pattern = [1, 3, 2, 4, 1, 2, 3, 4];
      const note = chord[pattern[Math.floor(beat / 2)]] + 12;
      this.tone('triangle', midi(note), time + .009, .42, {...m, gain: .046 + this.intensity * .025,
        cutoff: 3400, cutoffEnd: 700, wet: .85, pan: Math.sin(step * .7) * .55});
      this.tone('sine', midi(note + 12), time + .011, .17, {...m, gain: .012, wet: .9, pan: -.4});
    }
    if ((phrase > 0 || energetic) && beat % 2 === 0) {
      const note = MELODY[(Math.floor(step / 2) + phrase * 4) % MELODY.length];
      if (note) {
        const pitch = midi(note + (energetic ? 0 : -12));
        for (const side of [-1, 1]) this.tone('sawtooth', pitch, time, .53, {...m,
          gain: .019, attack: .025, detune: side * 7, cutoff: 2100, cutoffEnd: 600, pan: side * .25, wet: .85});
      }
    }
    if (beat === 15 && bar % 8 === 7) this.noise(time, .5, {...m, gain: .055, attack: .1, filter: 'bandpass', cutoff: 3800, cutoffEnd: 600, wet: .9});
  }

  sfx(name, variant = 0, pan = 0) {
    if (this.ctx?.state !== 'running' || (this.settings.effects ?? .8) === 0) return;
    const t = this.ctx.currentTime + .005, last = this.lastSound.get(name) ?? -1;
    if (t - last < (name === 'wall' ? .05 : name === 'brick' ? .025 : .018)) return;
    this.lastSound.set(name, t);
    const at = {pan: limit(pan, -.8, .8)}, tone = (type, hz, offset, duration, options = {}) => this.tone(type, hz, t + offset, duration, {...at, ...options});
    const noise = (offset, duration, options = {}) => this.noise(t + offset, duration, {...at, ...options});
    if (name === 'wall') {
      tone('sine', 620, 0, .045, {gain: .06, bend: 420, wet: .1});
    } else if (name === 'paddle') {
      tone('sine', 180, 0, .12, {gain: .21, bend: 70, wet: .12});
      tone('triangle', 740 + variant * 300, 0, .11, {gain: .065, wet: .4});
      noise(0, .035, {gain: .036, cutoff: 2200, wet: .1});
    } else if (name === 'brick') {
      const scale = [0, 3, 7, 10, 12, 15, 19, 22], hz = midi(67 + scale[Math.floor(variant) % scale.length]);
      tone('sine', hz, 0, .3, {gain: .1, wet: .75});
      tone('sine', hz * 2.005, 0, .13, {gain: .038, wet: .65});
      tone('triangle', hz / 2, 0, .06, {gain: .06, cutoff: 1700, wet: .1});
      noise(0, .035, {gain: .032, filter: 'highpass', cutoff: 3700, wet: .4});
    } else if (name === 'metal') {
      for (const [hz, gain] of [[440, .065], [731, .038], [1160, .02]]) tone('sine', hz, 0, .19, {gain, wet: .55});
      noise(0, .035, {gain: .07, filter: 'bandpass', cutoff: 3300, wet: .15});
    } else if (name === 'laser') {
      tone('sawtooth', 1250, 0, .14, {gain: .065, bend: 180, cutoff: 2900, wet: .35});
      tone('sine', 2300, 0, .085, {gain: .04, bend: 340, pan: -pan, wet: .3});
    } else if (['power', 'life', 'start', 'clear'].includes(name)) {
      const notes = name === 'clear' ? [60, 64, 67, 71, 76, 79] : name === 'life' ? [72, 76, 79, 84] : [64, 67, 71, 76];
      notes.forEach((note, i) => {
        tone('sine', midi(note), i * .075, .65, {gain: .095, pan: (i / notes.length - .5) * .9, wet: .95});
        tone('triangle', midi(note - 12), i * .075, .24, {gain: .025, wet: .5});
      });
      if (name === 'clear') noise(.03, 1.3, {gain: .085, attack: .12, filter: 'bandpass', cutoff: 2800, cutoffEnd: 500, wet: .9});
    } else if (name === 'launch') {
      tone('sine', 160, 0, .21, {gain: .12, bend: 680, wet: .65});
      noise(0, .2, {gain: .075, filter: 'bandpass', cutoff: 600, cutoffEnd: 4500, wet: .55});
    } else if (name === 'boost') {
      tone('sine', 42, 0, 1.1, {gain: .26, bend: 72, attack: .07, wet: .15});
      noise(0, 1.3, {gain: .15, attack: .16, filter: 'bandpass', cutoff: 300, cutoffEnd: 6400, wet: .8});
      [57, 64, 69, 76, 81].forEach((note, i) => tone('triangle', midi(note), i * .07, .8, {gain: .07, wet: 1, pan: (i - 2) * .3}));
    } else if (name === 'lose' || name === 'boss' || name === 'enemy') {
      const heavy = name !== 'enemy';
      tone('sine', heavy ? 110 : 230, 0, heavy ? .55 : .16, {gain: heavy ? .24 : .13, bend: 30, wet: .23});
      noise(0, heavy ? .42 : .16, {gain: heavy ? .16 : .09, cutoff: 2400, cutoffEnd: 180, wet: .7});
      if (name === 'lose') tone('triangle', 420, .05, .7, {gain: .07, bend: 90, wet: .8});
    } else if (name === 'gameover') {
      [57, 60, 64, 71].forEach((note, i) => tone('triangle', midi(note), i * .09, 1.7, {gain: .07, attack: .08, wet: 1, pan: (i - 1.5) * .25}));
    }
  }

  suspend() { this.setPlaying(false); if (this.ctx?.state === 'running') this.ctx.suspend().catch(() => {}); }
  dispose() { this.disposed = true; this.stopScheduler(); if (this.ctx) this.ctx.close().catch(() => {}); }
}
