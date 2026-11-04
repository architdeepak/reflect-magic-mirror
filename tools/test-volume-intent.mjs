import assert from 'node:assert/strict';
import { volumeIntent } from '../src/volumeIntent.js';
for(const text of ['turn it up','increase the volume','make it louder','a bit louder','volume up'])assert.equal(volumeIntent(text)?.action,'increase',text);
for(const text of ['turn it down','lower the volume','make it quieter'])assert.equal(volumeIntent(text)?.action,'decrease',text);
assert.deepEqual(volumeIntent('set volume to 40 percent'),{target:'system',action:'set',value:40});
assert.deepEqual(volumeIntent('turn up the music by 15'),{target:'music',action:'increase',value:15});
assert.equal(volumeIntent('unmute audio').action,'unmute');assert.equal(volumeIntent('mute music').action,'mute');assert.equal(volumeIntent('turn down youtube').target,'watch');
for(const text of ['turn up brightness','turn up the thermostat','play my music','mute','set volume to 150'])assert.equal(volumeIntent(text),null,text);
console.log('Spoken volume: relative/absolute levels, music/video targets, mute/unmute and unrelated request rejection passed.');
