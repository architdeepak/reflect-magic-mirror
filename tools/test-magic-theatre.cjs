const assert = require('assert/strict'), fs = require('fs'), vm = require('vm');
let id = 0, draws = 0, oscillators = 0, resume;
const frames = new Map(), timers = [];
const canvas = { getContext: () => ({ createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},putImageData(){},drawImage(){draws++},clearRect() {}, beginPath() {}, arc() { draws++; }, fill() {}, fillRect() {}, moveTo() {}, bezierCurveTo() {}, stroke() {}, createLinearGradient() { return { addColorStop() {} }; } }) };
const shell = { dataset: {}, append() {}, getBoundingClientRect: () => ({ width: 1080, height: 1920 }) };
const scope = vm.createContext({ performance: { now: () => 0 }, document: { hidden: false, createElement: () => canvas }, localStorage: { getItem: () => null }, matchMedia: () => ({ matches: false }), requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id), setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {}, AudioContext: class { constructor() { this.state = 'suspended'; } resume() { return new Promise(resolve => resume = resolve); } createOscillator() { oscillators++; } } });
vm.runInContext(fs.readFileSync('src/revealTiming.js','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('src/renderBudget.js','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('src/displayQuality.js','utf8').replace(/export /g,'')+'\n'+fs.readFileSync('src/mirrorFog.js','utf8').replace('export class','class')+'\n'+fs.readFileSync('src/magicTheatre.js','utf8').replace(/^import .*;$/mg,'').replace('export class','class') + ';globalThis.Theatre=MagicTheatre;globalThis.Fog=MirrorFog;globalThis.wakeMs=MIRROR_WAKE_MS;globalThis.arrivalMs=MIRROR_ARRIVAL_MS', scope);
(async () => {
  const theatre = new scope.Theatre(shell); theatre.play('wake', { muted: true });
  theatre.backend='gpu';theatre.setMotionFps(30);assert.equal(theatre.snapshot().targetFps,30);theatre.setMotionFps(60);assert.equal(theatre.snapshot().targetFps,60);theatre.backend='cpu';assert.equal(theatre.snapshot().targetFps,30);
  assert(canvas.width*canvas.height<=1_500_000);
  for (let now = 0; now < scope.wakeMs + 100; now += 1000 / 60) { const entry = frames.entries().next().value; if (entry) { frames.delete(entry[0]); entry[1](now); } }
  assert.equal(frames.size, 0); assert(canvas.hidden); assert(draws <= 74, 'Fog frame budget exceeded');assert.equal(theatre.fog.noise.length,16384);
  theatre.setQuality('eco');assert.equal(theatre.targetFps(),20,'Efficient CPU fog ignored its cadence limit');theatre.setQuality('auto');
  const fog=new scope.Fog(24,36);
  fog.render(1);const end=Array.from(fog.image.data);
  fog.render(0,true);assert.deepEqual(Array.from(fog.image.data),end,'Wake and arrival fields jumped at their shared boundary');
  fog.render(0);assert(fog.image.data.filter((_,i)=>i%4===3).every(a=>a===0),'Wake did not begin transparent');
  fog.render(1,true);assert(fog.image.data.filter((_,i)=>i%4===3).every(a=>a===0),'Arrival did not end transparent');
  theatre.play(); theatre.cancel(); assert.equal(frames.size, 0); assert.equal(shell.dataset.magicCue, undefined);
  theatre.reduced = true; theatre.play(); assert.equal(frames.size, 0); assert(canvas.hidden); timers.at(-1)();
  theatre.sound = true; theatre.reduced = false; theatre.play('wake'); theatre.cancel(); resume(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(oscillators, 0, 'Stopped chime started after AudioContext resumed');
  const audioNodes=[];
  const parameter=()=>({value:0,events:[],setValueAtTime(value,time){this.events.push({value,time})},linearRampToValueAtTime(value,time){this.events.push({value,time})},exponentialRampToValueAtTime(value,time){this.events.push({value,time})}});
  const node=type=>{const n={type,gain:parameter(),frequency:parameter(),Q:parameter(),pan:parameter(),delayTime:parameter(),connect(){},disconnect(){this.disconnected=true},start(at){this.startedAt=at},stop(at){this.stoppedAt=at}};audioNodes.push(n);return n};
  theatre.audio={state:'suspended',currentTime:10,sampleRate:8000,destination:{},async resume(){this.state='running'},async suspend(){this.state='suspended'},createGain:()=>node('gain'),createStereoPanner:()=>node('pan'),createBiquadFilter:()=>node('filter'),createDelay:()=>node('delay'),createConvolver:()=>node('convolver'),createOscillator:()=>node('oscillator'),createBufferSource:()=>node('source'),createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)}}};
  shell.dataset.magicCue='wake';await theatre.chime('wake');
  const wakeSources=audioNodes.filter(n=>n.startedAt!==undefined);
  assert(wakeSources.some(n=>n.startedAt>11.6&&n.startedAt<11.7),'Smoke clearing rush did not arrive near the end of the cloud');
  assert(wakeSources.every(n=>n.stoppedAt<=10+scope.wakeMs/1000),'Wake audio outlived the smoke reveal');
  assert(audioNodes.flatMap(n=>[...n.gain.events,...n.frequency.events]).every(e=>e.time<=10+scope.wakeMs/1000),'Wake automation outlived shortened reveal');
  assert(audioNodes[0].gain.events.every(e=>e.value<=.62),'Wake cue exceeded restrained master gain');
  const oldGraph=[...audioNodes];theatre.cancel();
  assert(oldGraph.every(n=>n.disconnected),'A cancelled cue left audio processing nodes connected');assert.equal(theatre.audio.state,'suspended');
  audioNodes.length=0;shell.dataset.magicCue='arrival';await theatre.chime('arrival');
  assert(audioNodes.filter(n=>n.startedAt!==undefined).every(n=>n.stoppedAt<=10+scope.arrivalMs/1000),'Face shimmer outlived the reveal');
  assert(audioNodes.flatMap(n=>[...n.gain.events,...n.frequency.events]).every(e=>e.time<=10+scope.arrivalMs/1000),'Arrival automation outlived shortened reveal');
  theatre.cancel();assert.equal(theatre.nodes.length,0);assert.equal(theatre.soundGraph.length,0);assert.equal(theatre.audio.state,'suspended');
  for(const kind of ['swipe','pinch','selection']){
    audioNodes.length=0;shell.dataset.magicCue=kind;await theatre.chime(kind,'swipe-left');
    const sources=audioNodes.filter(n=>n.startedAt!==undefined);assert(sources.length>=2);assert(sources.every(n=>n.stoppedAt<=10.43),'Gesture sound outlived its short feedback window');
    if(kind==='swipe'){assert(sources.some(n=>n.buffer),'Swipe has no airy texture');assert(audioNodes.some(n=>n.pan.events.length===2),'Swipe lost directional stereo');}
    const graph=[...audioNodes];theatre.cancel();assert(graph.every(n=>n.disconnected),'Gesture audio graph leaked');
  }
  console.log('Magic theatre: bounded smoke, late clearing rush, brief shimmer, restrained levels, graph cleanup, reduced motion and late audio-resume cancellation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
