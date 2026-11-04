const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/main.js','utf8');
(async()=>{
 let starts=0,reads=0,plays=0;
 const context=vm.createContext({spotifyGeneration:0,process:{env:{MIRROR_SPOTIFY_DEVICE_NAME:'Magic Mirror TV'}},setTimeout:fn=>{fn()},startLocalSpotifyReceiver:async()=>{starts++;return true},spotifyApi:async(route,options)=>{if(route.startsWith('search?'))return{tracks:{items:[{uri:'spotify:track:fixture',name:'Ambient fixture'}]}};if(route==='me/player/devices'){reads++;return{devices:reads>1?[{id:'tv',name:'Magic Mirror TV'}]:[]}};if(options?.method==='PUT'){plays++;return null}throw Error(route)},openNativeApplication:async()=>{throw Error('Unexpected external application')}});
 vm.runInContext(source.slice(source.indexOf('const SPOTIFY_KINDS'),source.indexOf('async function startLocalSpotifyReceiver'))+'\n'+source.slice(source.indexOf('async function playSpotifyQuery('),source.indexOf('async function performSpotifyControl(')),context);
 const result=await context.playSpotifyQuery({query:'ambient'});assert(result.ok);assert.equal(starts,1);assert.equal(plays,1);
 reads=0;context.startLocalSpotifyReceiver=async()=>{context.spotifyGeneration++;return true};await assert.rejects(context.playSpotifyQuery({query:'ambient'}),/connection changed/);assert.equal(plays,1,'A changed account received a stale playback request');
 reads=0;context.startLocalSpotifyReceiver=async()=>false;await assert.rejects(context.playSpotifyQuery({query:'ambient'}),/Reconnect its Spotify playback account on this mirror/);
 console.log('Spotify local receiver: automatic service recovery, preferred-device playback, account-change isolation and actionable local error passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
