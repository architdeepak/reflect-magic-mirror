import assert from 'node:assert/strict';
import { PcmStartupBuffer } from '../src/geminiLiveAdapter.js';
let next=0;const timers=new Map(),audio=[],events=[];
const buffer=new PcmStartupBuffer(pcm=>{audio.push([...pcm]);events.push('audio')},()=>events.push('end'),{schedule:fn=>{timers.set(++next,fn);return next},clear:id=>timers.delete(id)});
buffer.push(new Int16Array([1,2]));buffer.push(new Int16Array([3,4]));assert.equal(audio.length,0);assert.equal(timers.size,1);assert(buffer.pending);
[...timers.values()][0]();assert.deepEqual(audio,[[1,2,3,4]]);assert.equal(timers.size,0);buffer.push(new Int16Array([5]));assert.deepEqual(audio.at(-1),[5]);buffer.finish();assert.equal(events.at(-1),'end');
buffer.cancel();buffer.push(new Int16Array([6,7]));buffer.finish();assert.deepEqual(events.slice(-2),['audio','end'],'Short reply ended before its buffered audio was delivered');assert.deepEqual(audio.at(-1),[6,7]);assert.equal(timers.size,0);
buffer.cancel();buffer.push(new Int16Array([8]));const retired=[...timers.values()][0];buffer.cancel();retired();assert.equal(audio.length,3,'Stopped startup replayed retired PCM');assert(!buffer.started);buffer.push(new Int16Array([9]));retired();assert(buffer.pending,'Retired callback flushed a newer prefill');buffer.cancel();
console.log('PCM startup: one bounded prefill timer, ordered samples, steady pass-through, short reply drain and immediate Stop cancellation passed.');
