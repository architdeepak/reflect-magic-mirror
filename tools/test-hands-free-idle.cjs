const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../src/renderer.js'), 'utf8');
const resetStart = source.indexOf('function resetIdle() {');
const reset = source.slice(resetStart, source.indexOf('// Privacy.', resetStart));
const privacyStart = source.indexOf('const privacyTimer = setInterval(() => {');
const privacy = source.slice(privacyStart, source.indexOf('}, 2000);', privacyStart) + '}, 2000);'.length);

function fixture({ enabled = true, ready = true, cameraActive = true } = {}) {
  const timers = new Map();
  const calls = [];
  const classes = { contains: () => false, add() {}, remove() {} };
  const scope = vm.createContext({
    Date: { now: () => 120000 }, lastVoiceActivity: 0,
    fullyOff: false, sleeping: false, cameraIdlePaused: false, cameraWasActiveBeforeSleep: false,
    speech: { isSpeaking: false }, requestedMode: 'mirror', state: 'ready', mode: 'mirror', agentRunId: null, desktopActive: false,
    idleTimer: null, sleepTimer: null, galleryEpoch: 0,
    gestures: { enabled, tracker: { ready }, setEnabled: value => calls.push(['gestures', value]) },
    watchPlayback:{snapshot:()=>({playing:false})}, voiceStarting: false, gemini: { listening: false }, closet: { photo: { open: false } },
    experience: { dialog: { open: false }, capturing: false, routineActive: false },
    elements: { form: { classList: classes }, shell: { dataset: {} },
      settings: { classList: classes }, personaPanel: { classList: classes }, launcherPanel: { classList: classes } },
    getTrackingStatus: () => ({ cameraActive }),
    toggleCamera: async value => { calls.push(['camera', value]); },
    endConversationListening() { calls.push(['cloud-stop']); scope.gemini.listening = false; }, stopAssistant() {}, showGesture() {}, updateTrackingUi() {}, updatePrivacyChip() {},
    syncAmbienceContext() {}, resumeRendering() {}, wakeFromSleep() {}, enterBlackStandby() { calls.push(["standby"]); scope.sleeping=true; },
    clearTimeout() {}, setTimeout: (callback, delay) => { timers.set(delay, callback); return delay; },
    setInterval: callback => { timers.set('privacy', callback); return 1; },
  });
  vm.runInContext(reset + '\n' + privacy + '\nresetIdle();', scope);
  scope.lastVoiceActivity = 119000;
  return { scope, timers, calls };
}

const handsFree = fixture();
handsFree.timers.get('privacy')();
assert.deepEqual(handsFree.calls, [], 'Quiet ambient mode shut down an active gesture camera');
handsFree.timers.get(180000)();
assert.equal(handsFree.scope.sleeping, false, 'Idle sleep disabled hands-free navigation');
assert.deepEqual(handsFree.calls, []);

for (const settings of [{ enabled: false }, { ready: false }]) {
  const quiet = fixture(settings);quiet.scope.lastVoiceActivity = 59000;
  quiet.timers.get('privacy')();
  assert.deepEqual(quiet.calls, [['standby']], 'Quiet standby depended on gesture availability');
}

const cameraOff = fixture({ cameraActive: false });
cameraOff.timers.get('privacy')();
cameraOff.timers.get(180000)();
assert.equal(cameraOff.scope.sleeping, true);
assert(!cameraOff.calls.some(([type]) => type === 'camera'), 'Idle policy reopened a disabled camera');
const standby = fixture();standby.scope.lastVoiceActivity = 59000;standby.timers.get('privacy')();
assert.deepEqual(standby.calls, [['standby']], 'One minute of quiet did not request black standby');
standby.calls.length = 0;standby.scope.speech.isSpeaking = true;standby.timers.get('privacy')();assert.equal(standby.calls.length,0,'Speech was interrupted by standby');
const captions = fixture();captions.scope.lastVoiceActivity = 111000;let visible = true;
captions.scope.elements.captions = { classList: { contains: () => visible, remove: () => { visible = false; } }, dataset: {} };
const line = () => ({ querySelector: () => ({ textContent: 'old words' }), classList: { remove() {} } });
Object.assign(captions.scope, { captionState: { user: 'old words', assistant: 'old reply' },
  speech: { isSpeaking: false }, captionUserTurnActive: true, captionAssistantTurnActive: true });
captions.scope.elements.captionUser = line();captions.scope.elements.captionAssistant = line();
captions.timers.get('privacy')();
assert.equal(visible, false, 'Quiet captions remained visible');
assert.equal(captions.scope.elements.captions.dataset.quiet, 'true');
assert.equal(captions.scope.captionState.user, '');assert.equal(captions.scope.captionState.assistant, '');
assert.equal(captions.scope.captionUserTurnActive, false);
console.log('Idle policy: active gestures remain usable before timeout; one-minute quiet requests black standby; speaking prevents standby; eight-second captions expire; camera-off intent is preserved.');

const speakingUser = fixture();speakingUser.scope.lastVoiceActivity=59000;speakingUser.scope.gemini.audioTurns={active:true};speakingUser.timers.get('privacy')();assert.deepEqual(speakingUser.calls,[['standby']],'Background VAD prevented quiet standby');
const black = fixture();black.scope.sleeping=true;black.scope.wakeFromSleep=()=>{throw Error('Ambient woke on mouse movement')};black.scope.resetIdle();assert.equal(black.scope.sleeping,true);

const noise = fixture();noise.scope.lastVoiceActivity=59000;noise.scope.gemini.listening=true;noise.scope.gemini.audioTurns={active:true};noise.timers.get('privacy')();assert.deepEqual(noise.calls,[['cloud-stop'],['standby']], 'Ambient VAD kept the cloud microphone open');
const recent = fixture();recent.scope.gemini.listening=true;recent.timers.get('privacy')();assert.deepEqual(recent.calls,[], 'Recent recognized request was cut off');

const visibleHand=fixture();visibleHand.scope.performance={now:()=>1000};visibleHand.scope.lastVoiceActivity=59000;visibleHand.scope.gestures.hand=Array(21).fill({x:.5,y:.5});visibleHand.scope.gestures.lastHandAt=900;visibleHand.scope.gemini.listening=true;visibleHand.timers.get('privacy')();assert.deepEqual(visibleHand.calls,[['cloud-stop'],['standby']],'A static hand kept the screen awake beyond one minute');
const beforeMinute=fixture();beforeMinute.scope.lastVoiceActivity=61000;beforeMinute.timers.get('privacy')();assert.deepEqual(beforeMinute.calls,[],'Screen timed out before one minute');
for(const mode of ['ar','spotify','watch']){const idle=fixture();idle.scope.mode=mode;idle.scope.lastVoiceActivity=59000;idle.timers.get('privacy')();assert.deepEqual(idle.calls,[['standby']],mode+' did not time out');}
const video=fixture();video.scope.mode='watch';video.scope.lastVoiceActivity=59000;video.scope.watchPlayback.snapshot=()=>({playing:true});video.timers.get('privacy')();assert.deepEqual(video.calls,[],'Active video was treated as idle');

for(const state of ['error','thinking','connecting']){const stalled=fixture();stalled.scope.state=state;stalled.scope.lastVoiceActivity=59000;stalled.timers.get('privacy')();assert.deepEqual(stalled.calls,[['standby']],'Stalled '+state+' kept the screen awake');}
