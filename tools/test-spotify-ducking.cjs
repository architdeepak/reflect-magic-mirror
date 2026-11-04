const assert=require('node:assert/strict');const {SpotifyDucking}=require('../src/spotifyDucking.cjs');
(async()=>{
 const tv={index:7,properties:{'application.process.binary':'librespot'},volume:{left:{value:65536},right:{value:32768}}},other={index:8,properties:{'application.name':'Electron'},volume:{mono:{value:65536}}};
 const calls=[];let interval;const d=new SpotifyDucking({interval:fn=>{interval=fn;return{unref(){}}},clear:()=>{interval=null},run:async(cmd,args)=>{if(args[0]==='--format=json')return{stdout:JSON.stringify([tv,other])};calls.push(args);if(args[1]==='7')Object.values(tv.volume).forEach((v,i)=>v.value=Number(args[2+i]));return{stdout:''}}});
 await d.setActive(true);assert.equal(tv.volume.left.value,16384);assert.equal(other.volume.mono.value,65536);assert(interval);await d.refresh();assert.equal(calls.length,1,'Repeated polling compounded the duck');
 await d.setActive(false);assert.equal(tv.volume.left.value,65536);assert.equal(tv.volume.right.value,32768);assert.equal(interval,null);
 await d.setActive(true);tv.volume.left.value=12000;await d.setActive(false);assert.equal(tv.volume.left.value,12000,'Restore overwrote a user volume change');
 tv.volume.left.value=65536;await d.setActive(true);await d.setActive(false);assert.equal(d.owned.size,0);
 console.log('Spotify ducking: receiver-only channel gains, single attenuation, volume restoration, manual-change ownership and idle timer cleanup passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
