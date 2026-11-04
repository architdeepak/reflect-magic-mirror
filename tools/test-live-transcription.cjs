const assert = require('assert/strict');
const fs = require('fs');
const vm = require('vm');
const sockets = [], received = [], finalFlags = [];
class Socket {
  static OPEN = 1;
  constructor() { this.readyState = 1; this.messages = []; sockets.push(this); }
  send(value) { this.messages.push(JSON.parse(value)); }
  close() { this.closed = true; this.readyState = 3; }
}
const source = fs.readFileSync('src/geminiLiveAdapter.js', 'utf8');
const gainScope=vm.createContext({Int16Array});
vm.runInContext(source.slice(source.indexOf('function conditionMicrophoneFrame('),source.indexOf('function downsample('))+';this.condition=conditionMicrophoneFrame;',gainScope);
const quietFrame=new Int16Array(1600).fill(196),noiseFrame=new Int16Array(1600).fill(20);
assert.equal(gainScope.condition(quietFrame)[0],784,'Accepted quiet speech was not lifted');
assert.equal(gainScope.condition(noiseFrame),noiseFrame,'Background/silence was amplified');
const peakFrame=new Int16Array(1600).fill(200);peakFrame[0]=31000;
assert(gainScope.condition(peakFrame)[0]<=31130,'Gain clipped a transient peak');
const scope = vm.createContext({ setTimeout, clearTimeout, WebSocket: Socket,
  window: { mirrorBridge: { readMemory: async()=>({facts:[],markdown:"Birthday regression fixture"}), createGeminiToken: async () => ({ token: 'test-only' }) } } });
vm.runInContext(source.slice(source.indexOf('class LiveTranscription {'), source.indexOf('function formatCloseError(')) + ';this.Transcriber=LiveTranscription;', scope);
(async () => {
  const t = new scope.Transcriber({ onTranscript: (text, meta) => { received.push(text); finalFlags.push(meta.final); } });
  const connecting = t.connect();
  t.send({ activityStart: {} }); t.send({ audio: { data: 'fixture', mimeType: 'audio/pcm;rate=16000' } });
  await new Promise(resolve => setImmediate(resolve));
  const socket = sockets[0]; socket.onopen();
  const setup = socket.messages[0].setup;
  assert.equal(setup.model, 'models/gemini-3.5-transcribe-live');
  assert.equal(setup.inputAudioTranscription.languageCodes.length, 0);
  assert.deepEqual(Array.from(setup.inputAudioTranscription.customVocabulary), ['Advit', 'Sahiti', 'Aarti', 'Brianna', 'Archit']);
  await socket.onmessage({ data: JSON.stringify({ setupComplete: {} }) }); await connecting;
  assert(t.ready); assert.equal(socket.messages.length, 3, 'Speech prefix was lost during connection');
  await socket.onmessage({ data: JSON.stringify({ serverContent: { interimInputTranscription: { text: 'Advit और Sahiti' } } }) });
  await socket.onmessage({ data: JSON.stringify({ serverContent: { inputTranscription: { text: 'Advit और Sahiti.' } } }) });
  assert.deepEqual(received, ['Advit और Sahiti', 'Advit और Sahiti.']);
  assert.deepEqual(finalFlags, [false, true], 'Final speech marker required for birthday routing was lost');
  await socket.onmessage({ data: JSON.stringify({ serverContent: { interimInputTranscription: { text: 'Aarti and' } } }) });
  assert.equal(received.at(-1), 'Advit और Sahiti. Aarti and', 'A new partial erased the finalized first phrase');
  await socket.onmessage({ data: JSON.stringify({ serverContent: {
    interimInputTranscription: { text: 'Artie and Brian' }, inputTranscription: { text: 'Aarti and Brianna.' }
  } }) });
  assert.equal(received.at(-1), 'Advit और Sahiti. Aarti and Brianna.', 'Interim hypothesis won over the authoritative final');
  t.send({ activityStart: {} });
  await socket.onmessage({ data: JSON.stringify({ serverContent: { inputTranscription: { text: 'Archit.' } } }) });
  assert.equal(received.at(-1), 'Archit.', 'A new microphone turn retained the previous sentence');
  const beforeClose=received.length;
  let finish;const late = socket.onmessage({ data: { text: () => new Promise(resolve => { finish = resolve; }) } });
  t.close();finish(JSON.stringify({ serverContent: { inputTranscription: { text: 'stale' } } }));await late;
  assert.equal(received.length, beforeClose);assert(socket.closed);assert.equal(t.queue.length, 0);
  const cancelled = new scope.Transcriber({ onTranscript() {} });const pending = cancelled.connect();cancelled.close();await pending;
  assert.equal(sockets.length, 1, 'Cancelled token acquisition opened a socket');
  const failed = new scope.Transcriber({onTranscript(){}});const failedConnection=failed.connect();
  await new Promise(resolve=>setImmediate(resolve));const failedSocket=sockets.at(-1);failedSocket.onopen();
  await failedSocket.onmessage({data:JSON.stringify({setupComplete:{}})});await failedConnection;
  await failedSocket.onmessage({data:JSON.stringify({error:{message:'provider failure'}})});
  assert(!failed.ready&&failed.closed&&failed.status==='fallback','Failure after setup suppressed the native fallback forever');
  const bounded = new scope.Transcriber({ onTranscript() {} });for(let i=0;i<100;i++)bounded.send({audio:{data:'x'}});
  assert(bounded.closed);assert.equal(bounded.queue.length,0);
  console.log('Live transcription: multilingual partial/final text, name vocabulary, buffered onset, cancellation, stale response isolation and bounded memory passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
