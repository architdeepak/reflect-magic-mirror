const fs = require('node:fs/promises');
const { connect } = require('./cdp-client.cjs');
(async () => {
 const tabs=await(await fetch('http://127.0.0.1:9223/json/list')).json();
 const c=await connect(tabs.find(t=>t.url.endsWith('/src/index.html')).webSocketDebuggerUrl);
 try {
  const before=await c.evaluate(`(async()=>{const d=__mirrorDebug;d.stopAssistant();d.setAssistantMode('portal');await d.gemini.startMicrophone();window.__quietProbeTracks=d.gemini.micStream.getTracks();return {listening:d.gemini.listening,tracks:window.__quietProbeTracks.map(t=>t.readyState)}})()`,25000);
  await new Promise(r=>setTimeout(r,13000));
  const after=await c.evaluate(`({listening:__mirrorDebug.gemini.listening,connected:__mirrorDebug.gemini.connected,transcribing:!!__mirrorDebug.gemini.transcriber,tracks:window.__quietProbeTracks.map(t=>t.readyState),wake:__mirrorDebug.getWakeState()})`);
  const result={before,after};console.log(JSON.stringify(result,null,2));
  await fs.writeFile('artifacts/spark-install/quiet-microphone-check.json',JSON.stringify(result,null,2));
  if(after.listening||after.connected||after.transcribing||after.tracks.some(s=>s!=='ended'))throw Error('Quiet microphone remained open');
 } finally {await c.evaluate('__mirrorDebug.stopAssistant()').catch(()=>{});c.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
