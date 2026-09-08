// Original four-voice chiptune, synthesized locally. No remote audio assets.
export class ArcadeAudio {
  constructor(settings = {}) {
    this.ctx = null; this.sfx = settings.sfx !== false; this.music = settings.music !== false;
    this.volume = settings.volume ?? 0.55; this.running = false; this.step = 0;
    this.level = 0; this.nextNote = 0; this.timer = null; this.activeMusic = new Set();
  }
  async unlock() {
    try {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain(); this.master.gain.value = this.volume * 0.5;
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -12; this.compressor.ratio.value = 5;
        this.master.connect(this.compressor); this.compressor.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.40; this.musicBus.connect(this.master);
        this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
        this.noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        let lfsr = 0xace1;
        for (let i = 0; i < data.length; i++) {lfsr = (lfsr >> 1) ^ (-(lfsr & 1) & 0xb400); data[i] = (lfsr / 32768 - 1) * .75;}
      }
      if (this.ctx.state !== 'running') await this.ctx.resume();
      return this.ctx.state === 'running';
    } catch { return false; }
  }
  setVolume(value) {this.volume = value; if(this.master) this.master.gain.setTargetAtTime(value * .5, this.ctx.currentTime, .015);}
  tone(freq, length, type = 'square', gain = .12, when = 0, end = null, music = false) {
    if(!this.ctx || this.ctx.state !== 'running' || (!music && !this.sfx)) return;
    const t = Math.max(this.ctx.currentTime, when || this.ctx.currentTime);
    const osc = this.ctx.createOscillator(), amp = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    if(end) osc.frequency.exponentialRampToValueAtTime(Math.max(20,end), t + length);
    amp.gain.setValueAtTime(0, t); amp.gain.linearRampToValueAtTime(gain, t+.003);
    amp.gain.exponentialRampToValueAtTime(.0001,t+length);
    osc.connect(amp); amp.connect(music ? this.musicBus : this.sfxBus);
    osc.start(t); osc.stop(t+length+.01);
    if(music) this.activeMusic.add(osc);
    osc.onended = () => {this.activeMusic.delete(osc); osc.disconnect(); amp.disconnect();};
  }
  noise(length, gain, when, music = false, cutoff = 4000) {
    if(!this.ctx || this.ctx.state !== 'running' || (!music && !this.sfx)) return;
    const t = when || this.ctx.currentTime, source = this.ctx.createBufferSource(), amp = this.ctx.createGain(), filter = this.ctx.createBiquadFilter();
    source.buffer = this.noiseBuffer; filter.type = 'highpass'; filter.frequency.value = cutoff;
    amp.gain.setValueAtTime(gain,t); amp.gain.exponentialRampToValueAtTime(.0001,t+length);
    source.connect(filter); filter.connect(amp); amp.connect(music ? this.musicBus : this.sfxBus);
    source.start(t); source.stop(t+length);
    if(music) this.activeMusic.add(source);
    source.onended = () => {this.activeMusic.delete(source); source.disconnect(); filter.disconnect(); amp.disconnect();};
  }
  effect(name, variant = 0) {
    if(!this.ctx || !this.sfx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime;
    if(name==='wall') this.tone(450,.025,'square',.06, t,320);
    if(name==='paddle') {this.tone(760 + variant*160,.06,'square',.16,t,300);this.tone(150,.035,'triangle',.15,t);}
    if(name==='brick') {this.tone(850+variant*95,.052,'square',.10,t,480+variant*65);this.tone(1600+variant*80,.025,'triangle',.08,t);}
    if(name==='metal') {this.tone(1720,.08,'square',.075,t,850);this.tone(2430,.06,'square',.045,t);}
    if(name==='laser') this.tone(1600,.11,'sawtooth',.085,t,120);
    if(name==='enemy') {this.noise(.13,.16,t,false,700);this.tone(230,.1,'square',.13,t,55);}
    if(name==='launch') {this.tone(350,.09,'square',.13,t,1050);this.tone(700,.08,'triangle',.08,t+.07);}
    if(name==='power') [72,76,79,84].forEach((n,i)=>this.tone(this.hz(n),.14,'square',.105,t+i*.055));
    if(name==='life') [76,79,84,79,84,88].forEach((n,i)=>this.tone(this.hz(n),.19,'square',.13,t+i*.1));
    if(name==='lose') {this.noise(.3,.12,t,false,1200);[64,60,55,48,40].forEach((n,i)=>this.tone(this.hz(n),.24,'square',.14,t+i*.12));}
    if(name==='start') [52,59,64,67,71,76,83,88].forEach((n,i)=>this.tone(this.hz(n),.2,'square',.12,t+i*.085));
    if(name==='clear') [72,76,79,84,79,84,88,91].forEach((n,i)=>this.tone(this.hz(n),i===7?.5:.2,'square',.11,t+i*.11));
    if(name==='gameover') [64,62,60,59,57,52,40].forEach((n,i)=>this.tone(this.hz(n),.34,'triangle',.32,t+i*.19));
    if(name==='boss') {this.noise(.14,.18,t,false,350);this.tone(130,.15,'sawtooth',.13,t,55);}
  }
  hz(midi) { return 440 * 2 ** ((midi-69)/12); }
  start(level = this.level) {
    this.level = level;
    if(!this.ctx || !this.music || this.running) return;
    this.running = true; this.nextNote = this.ctx.currentTime+.08;
    this.timer = setInterval(()=>this.schedule(),25); this.schedule();
  }
  stop(reset = false) {
    this.running = false; clearInterval(this.timer); this.timer = null;
    for (const voice of this.activeMusic) {try {voice.stop();} catch {}}
    this.activeMusic.clear(); if(reset) this.step=0;
  }
  schedule() {
    if(!this.running || !this.music || this.ctx.state !== 'running') return;
    if(this.nextNote < this.ctx.currentTime-.2) this.nextNote = this.ctx.currentTime+.02;
    const duration = 60/(this.level===32?146:124)/4;
    while(this.nextNote < this.ctx.currentTime+.12) {this.playStep(this.step++,this.nextNote,duration);this.nextNote+=duration;}
  }
  playStep(step,t,d) {
    const melodies = [
      [76,0,79,83,81,79,76,74,76,0,71,74,76,79,83,86,84,0,83,79,81,0,79,76,74,76,79,74,71,0,74,0],
      [79,83,86,0,84,83,79,76,78,81,84,0,83,81,78,74,76,79,83,0,81,79,76,71,74,78,81,0,79,78,74,0],
      [76,88,83,79,76,0,74,76,79,0,83,86,88,0,86,83,84,0,81,79,78,0,74,71,76,79,83,79,76,74,71,0]
    ];
    const phrase = Math.floor(step/32), j=step%32, root=[40,36,43,38][Math.floor(step/16)%4];
    const melody=melodies[(Math.floor(phrase/2)+Math.floor(this.level/8))%melodies.length];
    let note=melody[j]; if(this.level===32) note=note?note-12:0;
    if(note) this.tone(this.hz(note),d*.8,'square',.11,t,null,true);
    if(step%2===0) {const bass=root+(step%8===6?12:0);this.tone(this.hz(bass),d*1.7,'triangle',.35,t,null,true);}
    const arp=[0,7,12,15][step%4];
    if(phrase%4>=2) this.tone(this.hz(root+24+arp),d*.5,'square',.035,t,null,true);
    if(step%8===0 || step%16===11) this.tone(115,.12,'sine',.40,t,38,true);
    if(step%8===4) {this.noise(.09,.13,t,true,1300);this.tone(180,.06,'triangle',.11,t,75,true);}
    if(step%2===0) this.noise(.023,.06,t,true,7500);
  }
}
