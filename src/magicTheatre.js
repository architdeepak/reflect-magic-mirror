import { GpuMirrorFog } from './gpuMirrorFog.js';
import { displayProfile, boundedSurface } from './displayQuality.js';
import { MirrorFog } from './mirrorFog.js';
import { FramePacer } from './renderBudget.js';
import { MIRROR_WAKE_MS, MIRROR_ARRIVAL_MS } from './revealTiming.js';
// Short, local theatrical cues. No permanent particle loop or additional model.
export class MagicTheatre {
  constructor(shell, { softwareGraphics = true, quality = 'auto' } = {}) {
    this.shell = shell; this.frame = null; this.nodes = []; this.epoch = 0;
    this.canvas = document.createElement('canvas'); this.canvas.className = 'magic-dust'; this.canvas.hidden = true; shell.append(this.canvas);
    this.reduced = localStorage.getItem('mirror.reduced-motion') === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.sound = localStorage.getItem('mirror.magic-sounds') !== 'false';
    this.cpuCanvas=this.canvas;this.softwareGraphics=softwareGraphics;this.quality=quality;this.backend='cpu';
    this.applyPreferences();
  }
  setQuality(id) { this.cancel();this.quality=['eco','auto','hd'].includes(id)?id:'auto';this.fog=null; }
  setMotionFps(fps) { this.motionFps=Math.max(15,Math.min(60,Number(fps)||60)); }
  targetFps() { return Math.min(this.motionFps??60,displayProfile(this.quality).fogFps,this.backend==='gpu'?60:30); }
  selectSurface(allowGpu = true) {
    const profile=displayProfile(this.quality),previous=this.canvas;previous.hidden=true;
    // The shader field is the default on any real GPU (measured 60 fps at 4K once
    // the full-screen blend layers were removed); software rendering, lost
    // contexts and an explicit mirror.cpu-smoke flag fall back to the CPU field.
    const cpuSmoke=typeof localStorage!=='undefined'&&localStorage.getItem('mirror.cpu-smoke')==='true';
    if(!cpuSmoke&&allowGpu&&!this.softwareGraphics&&!this.gpuFailed){
      try{if(!this.gpu){const canvas=document.createElement('canvas');canvas.className='magic-dust';canvas.hidden=true;this.gpu=new GpuMirrorFog(canvas);this.shell.append(canvas);}if(this.gpu.lost)throw new Error('Smoke graphics unavailable');this.canvas=this.gpu.canvas;this.backend='gpu';}
      catch(error){this.gpuFailed=true;this.fallbackReason=error.message;this.gpu?.dispose();this.gpu=null;this.canvas=this.cpuCanvas;this.backend='cpu';}
    }else{this.canvas=this.cpuCanvas;this.backend='cpu';}
    const bounds=this.shell.getBoundingClientRect(),dpr=typeof window==='undefined'?1:window.devicePixelRatio||1;
    const surface=boundedSurface(bounds.width,bounds.height,dpr,this.backend==='gpu'?profile.fogPixels:Math.min(profile.fogPixels,1_500_000),2);
    this.canvas.width=surface.width;this.canvas.height=surface.height;
    if(this.backend==='cpu'&&!this.fog){const width=this.quality==='eco'?112:this.quality==='hd'?256:216;this.fog=new MirrorFog(width,width*1.5,{lowDetail:this.quality==='eco'});}
  }
  snapshot() { return { quality:this.quality,backend:this.backend,resolution:[this.canvas.width,this.canvas.height],field:this.backend==='cpu'?[this.fog?.canvas.width||0,this.fog?.canvas.height||0]:null,frames:this.backend==='gpu'?this.gpu?.frames||0:this.fog?.frames||0,targetFps:this.targetFps(),fallbackReason:this.fallbackReason||null }; }
  applyPreferences() { this.shell.dataset.reducedMotion = String(this.reduced); }
  play(kind = 'wake', { muted = false, direction = '' } = {}) {
    this.cancel(); this.shell.dataset.magicCue = kind;
    if (this.sound && !muted && ['wake','arrival','capture','select','selection','swipe','pinch'].includes(kind)) void this.chime(kind,direction);
    if (this.reduced) { this.endTimer = setTimeout(() => this.cancel(), 650); return; }
    this.selectSurface(['wake','arrival'].includes(kind));

    this.canvas.hidden = false; const start = performance.now(), duration = kind === 'wake' ? MIRROR_WAKE_MS : kind === 'arrival' ? MIRROR_ARRIVAL_MS : 650;
    let last = null; const pacer = new FramePacer();
    const draw = now => {
      const t = (now - start) / duration;
      if (t >= 1 || document.hidden) { this.cancel(); return; }
      this.frame = requestAnimationFrame(draw);
      pacer.observe(now);
      if (!pacer.due(now, last, this.targetFps())) return; last = now;
      this.renderCue(kind,t);
    };
    this.frame = requestAnimationFrame(draw);
  }
  renderCue(kind, t) {
    if(this.backend==='gpu'){
      try{this.gpu.render(t,kind==='arrival',displayProfile(this.quality).fogSlices);return;}
      catch(error){this.gpuFailed=true;this.fallbackReason=error.message;this.selectSurface(false);this.canvas.hidden=false;}
    }
    const ctx=this.canvas.getContext('2d'), w=this.canvas.width, h=this.canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (kind === 'wake' || kind === 'arrival') {
        ctx.drawImage(this.fog.render(t, kind === 'arrival'), 0, 0, w, h);
      } else {
        // Brief diffuse reflection when selecting/capturing, without symbols.
        const light = ctx.createRadialGradient(w * .5, h * .5, 0, w * .5, h * .5, w * .48);
        light.addColorStop(0, 'rgba(210,222,235,0)'); light.addColorStop(.65, 'rgba(204,214,225,.09)'); light.addColorStop(1, 'rgba(210,222,235,0)');
        ctx.globalAlpha = Math.sin(t * Math.PI); ctx.fillStyle = light; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      }
  }
  async chime(kind = 'wake', direction = '') {
    const epoch = this.epoch;
    try {
      this.audio ||= new AudioContext(); await this.audio.resume();
      if (epoch !== this.epoch || !this.shell.dataset.magicCue) return;
      if (['select','selection','swipe','pinch'].includes(kind)) { this.gestureSound(kind,direction); return; }
      const now = this.audio.currentTime;
      const timeScale = kind === 'wake' ? MIRROR_WAKE_MS / 3100 : kind === 'arrival' ? MIRROR_ARRIVAL_MS / 1100 : 1;
      const atTime = seconds => now + seconds * timeScale;
      const master = this.audio.createGain(), filter = this.audio.createBiquadFilter();
      const duration = (kind === 'wake' ? 3.08 : kind === 'arrival' ? 1.08 : .6) * timeScale;
      master.gain.setValueAtTime(.0001, now);
      const level = kind === 'wake' ? .62 : kind === 'arrival' ? .43 : .24;
      master.gain.exponentialRampToValueAtTime(level, atTime(kind === 'wake' ? .22 : .035));
      master.gain.setValueAtTime(level, now + duration * .76);
      master.gain.exponentialRampToValueAtTime(.0001, now + duration);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(900, now);
      filter.frequency.exponentialRampToValueAtTime(4800, now + duration * .7);
      filter.connect(master); master.connect(this.audio.destination);
      const delay = this.audio.createDelay(.5), feedback = this.audio.createGain();
      delay.delayTime.value=.23*timeScale; feedback.gain.value=.09;
      master.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(this.audio.destination);
      this.soundGraph = [master, filter, delay, feedback];
      // A short stereo chamber gives the shimmer depth without an audio file
      // or a background audio loop. The graph is disconnected with the cue.
      if (this.audio.createConvolver) {
        if (!this.impulse || this.impulseScale !== timeScale) {
          const length = Math.ceil(this.audio.sampleRate * 1.35 * timeScale);
          this.impulse = this.audio.createBuffer(2, length, this.audio.sampleRate);
          this.impulseScale = timeScale;
          for (let channel = 0; channel < 2; channel++) {
            const samples = this.impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3.4);
          }
        }
        const reverb = this.audio.createConvolver(), wet = this.audio.createGain();
        reverb.buffer = this.impulse; wet.gain.value = .16;
        master.connect(reverb); reverb.connect(wet); wet.connect(this.audio.destination);
        this.soundGraph.push(reverb, wet);
      }
      // The smoke has a low body, then a separate late rush as it opens.
      // Each layer ends with the visual; no continuing audio or idle graph.
      if (kind === 'wake' || kind === 'arrival') {
        const length = duration;
        const buffer = this.audio.createBuffer(2, Math.ceil(this.audio.sampleRate * length), this.audio.sampleRate);
        // Independent coloured noise in each ear gives the cloud width. A
        // small white component keeps the clearing sweep airy on TV speakers.
        for (let channel = 0; channel < 2; channel++) {
          const data = buffer.getChannelData(channel); let brown = 0, pink = 0;
          for (let i = 0; i < data.length; i++) {
            const white = Math.random() * 2 - 1;
            brown = .985 * brown + .015 * white; pink = .86 * pink + .14 * white;
            data[i] = brown * 2.8 + pink * 1.1 + white * .24;
          }
        }
        const wind = this.audio.createBufferSource(), band = this.audio.createBiquadFilter(), air = this.audio.createGain();
        wind.buffer = buffer; band.type = 'bandpass'; band.Q.value = .9;
        band.frequency.setValueAtTime(kind === 'wake' ? 180 : 1700, now); band.frequency.exponentialRampToValueAtTime(kind === 'wake' ? 950 : 3200, now + length * .8);
        air.gain.setValueAtTime(0.0001, now); air.gain.exponentialRampToValueAtTime(kind === 'wake' ? .46 : .12, now + length * .48); air.gain.exponentialRampToValueAtTime(.0001, now + length);
        wind.connect(band); band.connect(air); air.connect(master); wind.start(now); wind.stop(now + length + .015*timeScale);
        const swell = this.audio.createOscillator(), swellGain = this.audio.createGain();
        swell.type = 'sine'; swell.frequency.setValueAtTime(kind === 'wake' ? 58.27 : 146.83, now); swell.frequency.exponentialRampToValueAtTime(kind === 'wake' ? 73.42 : 196, now + length * .7);
        swellGain.gain.setValueAtTime(0.0001, now); swellGain.gain.linearRampToValueAtTime(kind === 'wake' ? .18 : .035, now + length * .44); swellGain.gain.exponentialRampToValueAtTime(.0001, now + length);
        swell.connect(swellGain); swellGain.connect(master); swell.start(now); swell.stop(now + length + .015*timeScale);
        this.nodes.push(wind, swell); this.soundGraph.push(band, air, swellGain);
        if (kind === 'wake') {
          const body = this.audio.createOscillator(), bodyGain = this.audio.createGain();
          body.type = 'triangle'; body.frequency.setValueAtTime(116.54, now); body.frequency.exponentialRampToValueAtTime(146.83, atTime(2.5));
          bodyGain.gain.setValueAtTime(.0001, now); bodyGain.gain.exponentialRampToValueAtTime(.065, atTime(1.55)); bodyGain.gain.exponentialRampToValueAtTime(.0001, atTime(3.07));
          body.connect(bodyGain); bodyGain.connect(filter); body.start(now); body.stop(atTime(3.08));
          this.nodes.push(body); this.soundGraph.push(bodyGain);
          const rush = this.audio.createBufferSource(), high = this.audio.createBiquadFilter(), rushGain = this.audio.createGain();
          rush.buffer = buffer; high.type = 'bandpass'; high.Q.value = .55;
          high.frequency.setValueAtTime(650, atTime(2.12));
          high.frequency.exponentialRampToValueAtTime(4600, atTime(2.78));
          rushGain.gain.setValueAtTime(.0001, atTime(2.12));
          rushGain.gain.exponentialRampToValueAtTime(.72, atTime(2.76));
          rushGain.gain.exponentialRampToValueAtTime(.0001, atTime(3.07));
          rush.connect(high); high.connect(rushGain); rushGain.connect(master);
          rush.start(atTime(2.12)); rush.stop(atTime(3.08));
          this.nodes.push(rush); this.soundGraph.push(high, rushGain);
        }
      }
      // A restrained minor suspended colour under the cloud; the brighter
      // upper shimmer belongs to the face reveal, after the clearing rush.
      const notes = kind === 'wake' ? [146.83,174.61,220,329.63] : kind === 'arrival' ? [587.33,880,1174.66] : kind === 'capture' ? [523.25,659.25] : [659.25];
      for (const [i, frequency] of notes.entries()) for (const [partial, weight] of [[1,1],[2,.18],[3,.04]]) {
        const oscillator = this.audio.createOscillator(), gain = this.audio.createGain();
        const at=atTime((kind==='wake'?.52:.015)+i*(kind==='wake'?.31:.095)),tail=(kind==='wake'?1.38:kind==='arrival'?.7:.45)*timeScale;
        oscillator.type='sine';oscillator.frequency.value=frequency*partial;
        gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime((kind==='wake'?.032:kind==='arrival'?.04:.03)*weight,at+(kind==='wake'?.13:.025)*timeScale);
        gain.gain.exponentialRampToValueAtTime(.0001,at+tail);
        oscillator.connect(gain);
        if (this.audio.createStereoPanner && ['wake','arrival'].includes(kind)) {
          const pan = this.audio.createStereoPanner(); pan.pan.value = (i % 2 ? 1 : -1) * .48;
          gain.connect(pan); pan.connect(filter); this.soundGraph.push(pan);
        } else gain.connect(filter);
        oscillator.start(at);oscillator.stop(at+tail+.04*timeScale);
        this.nodes.push(oscillator);this.soundGraph.push(gain);
      }
    } catch { /* A blocked audio context leaves visual feedback available. */ }
  }
  gestureSound(kind,direction) {
    const now=this.audio.currentTime,swipe=kind==='swipe',length=swipe?.32:.22;
    const master=this.audio.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(swipe?.24:.20,now+.025);master.gain.exponentialRampToValueAtTime(.0001,now+length+.1);
    let output=master;this.soundGraph.push(master);
    if(this.audio.createStereoPanner){const pan=this.audio.createStereoPanner();const sign=/left|down/.test(direction)?-1:1;pan.pan.setValueAtTime(swipe?-sign*.6:0,now);if(swipe)pan.pan.linearRampToValueAtTime(sign*.6,now+length);master.connect(pan);output=pan;this.soundGraph.push(pan);}
    output.connect(this.audio.destination);
    if(swipe){
      const buffer=this.audio.createBuffer(2,Math.ceil(this.audio.sampleRate*length),this.audio.sampleRate);
      for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);let smooth=0;for(let i=0;i<data.length;i++){smooth=.8*smooth+.2*(Math.random()*2-1);data[i]=smooth;}}
      const source=this.audio.createBufferSource(),filter=this.audio.createBiquadFilter(),gain=this.audio.createGain();source.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(1100,now);filter.frequency.exponentialRampToValueAtTime(/down/.test(direction)?650:4200,now+length);
      gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.65,now+length*.45);gain.gain.exponentialRampToValueAtTime(.0001,now+length);source.connect(filter);filter.connect(gain);gain.connect(master);source.start(now);source.stop(now+length);this.nodes.push(source);this.soundGraph.push(filter,gain);
    }
    for(const [i,hz]of (swipe?[1046.5,1568]:[783.99,1174.66]).entries()){
      const tone=this.audio.createOscillator(),gain=this.audio.createGain(),at=now+i*.045;const tail=swipe?.26:.18;tone.type='sine';tone.frequency.setValueAtTime(hz*(swipe?.92:1.16),at);tone.frequency.exponentialRampToValueAtTime(hz,at+.05);
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(swipe?.045:.12,at+.009);gain.gain.exponentialRampToValueAtTime(.0001,at+tail);tone.connect(gain);gain.connect(master);tone.start(at);tone.stop(at+tail+.015);this.nodes.push(tone);this.soundGraph.push(gain);
    }
  }
  cancel() {
    this.epoch++;
    if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null;
    clearTimeout(this.endTimer); this.canvas.hidden = true; delete this.shell.dataset.magicCue;
    for (const node of this.nodes) { try { node.stop(); node.disconnect(); } catch {} } this.nodes = [];
    for (const node of this.soundGraph || []) { try { node.disconnect(); } catch {} } this.soundGraph = [];
    if (this.audio?.state === 'running') void this.audio.suspend().catch(() => {});
  }
}
