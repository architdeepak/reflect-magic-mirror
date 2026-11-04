// The real production classifier and renderer routing, with synthetic landmarks.
// Recognition of physical hands is a separate worker/camera check.
const assert=require('node:assert/strict'),fs=require('node:fs/promises');const {connect}=require('./cdp-client.cjs');
(async()=>{const tabs=await(await fetch('http://127.0.0.1:9223/json/list')).json();const c=await connect(tabs.find(t=>t.url.endsWith('/src/index.html')).webSocketDebuggerUrl);try{
 const evidence=await c.evaluate(`(async()=>{
 const d=__mirrorDebug,g=d.gestures;d.stopAssistant();
 // Off + key restores black standby too, without sending a cloud request.
 document.querySelector('#mirror-off').click();await new Promise(r=>setTimeout(r,200));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));await new Promise(r=>setTimeout(r,600));
 const hand=({x=0,y=0,pinch=false,neutral=false}={})=>{const p=Array.from({length:21},()=>({x:.5,y:.65}));p[0]={x:.5,y:.78};for(const [m,px]of [[5,.42],[9,.48],[13,.54],[17,.6]]){p[m]={x:px,y:.57};p[m+1]={x:px,y:.47};p[m+2]={x:px,y:.37};p[m+3]={x:px,y:neutral?.62:.27}}p[4]=pinch?{...p[8]}:{x:.3,y:.5};return p.map(p=>({x:p.x+x,y:p.y+y}))};
 const enabled=g.enabled;g.setEnabled(false);let at=10000;const rows=[];
 const swipe=async(dx,dy)=>{g._interpret(hand({neutral:true}),at);at+=500;g._interpret(hand(),at);g._interpret(hand({x:dx,y:dy}),at+150);at+=1000;await new Promise(r=>setTimeout(r,80));rows.push({gesture:g.lastGestureType,mode:d.getMirrorState().display.mode,depth:d.getMirrorState().display.depthEnabled,listening:d.gemini.listening})};
 d.setAssistantMode('mirror');for(let i=0;i<5;i++)await swipe(.2,0);await swipe(-.2,0);await swipe(0,-.2);await swipe(0,.2);
 d.setAssistantMode('portal');g._interpret(hand({neutral:true}),at);at+=500;g._interpret(hand(),at);g._interpret(hand(),at+500);await new Promise(r=>setTimeout(r,100));rows.push({gesture:g.lastGestureType,mode:d.getMirrorState().display.mode,listening:d.gemini.listening});
 d.setAssistantMode('mirror');g.setEnabled(enabled);return {rows,camera:d.getMirrorState().camera.active,wake:d.getWakeState(),scope:'Synthetic 21-point landmarks through the production classifier and real renderer controls. Physical room gestures are separate.'};
})()`,15000);
 assert.deepEqual(evidence.rows.slice(0,6).map(r=>r.mode),['portal','ar','watch','spotify','mirror','spotify']);assert.equal(evidence.rows[6].depth,true);assert.equal(evidence.rows[7].depth,false);assert.equal(evidence.rows[8].mode,'mirror');assert(evidence.rows.every(r=>!r.listening),'Gesture activated cloud listening');
 await fs.mkdir('artifacts/current-audit',{recursive:true});await fs.writeFile('artifacts/current-audit/gesture-routing.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await c.evaluate('__mirrorDebug.stopAssistant();__mirrorDebug.setAssistantMode("mirror")').catch(()=>{});c.close()}})().catch(e=>{console.error(e);process.exitCode=1});
