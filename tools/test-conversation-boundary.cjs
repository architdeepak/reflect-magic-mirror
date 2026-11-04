const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/renderer.js','utf8');
function section(a,b){return source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)))}
const context=vm.createContext({lastVoiceActivity:123,Date:{now:()=>999999},awaitingWakeRequest:false,agentRunId:null,voiceStarting:false,browserRecognition:null,hardMuted:false,desktopActive:false,mode:'portal',captionUserTurnActive:true,captionAssistantTurnActive:true,localCaptionsAllowed:false,userCaptionFromLocal:false,localCaptionEpoch:0,
 gemini:{listening:true,connected:true,stopMicrophone(){this.listening=false},stopPlayback(){},disconnect(){this.connected=false}},
 wake:{setAssistantActive(){},resume(){},startCaptionTurn(){return 1}},elements:{wakeToggle:{checked:true}},setState(){},setAssistantMode(mode){context.mode=mode},returnToRequestedMode(){}});
vm.runInContext(section('function endConversationListening() {','function stopAssistant() {'),context);
vm.runInContext(section('function beginHeardCaption() {','function handleLocalTranscript('),context);
const callback=section('  onTurnComplete: () => {','  onModeChange:').replace('  onTurnComplete: () => {','globalThis.complete = () => {').replace(/},\s*$/,'};');vm.runInContext(callback,context);
for(let i=0;i<100;i++)context.beginHeardCaption();assert.equal(context.lastVoiceActivity,123,'VAD extended the quiet deadline');
context.awaitingWakeRequest=true;context.complete();assert(context.gemini.listening,'Greeting closed microphone before user request');
context.awaitingWakeRequest=false;context.complete();assert(!context.gemini.listening&&!context.gemini.connected,'Completed answer left microphone/cloud open');assert.equal(context.mode,'mirror');
context.gemini.listening=true;context.agentRunId='working';context.complete();assert(context.gemini.listening,'Tool/agent task was cut off early');
console.log('Conversation boundary: background VAD cannot extend quiet deadline; greeting allows one request; completed answer closes cloud capture and returns Ambient; pending agent preserved.');

Object.assign(context,{fullyOff:false,sleeping:true,stopAssistant(){},paused:0});context.wake.pause=async()=>{context.paused++};
vm.runInContext(section('async function enterBlackStandby({ full = false } = {}) {',"document.querySelector('#mirror-off')"),context);
context.enterBlackStandby({full:true}).then(()=>{assert(context.fullyOff);assert.equal(context.paused,1,'Off from existing standby retained local microphone');console.log('Power boundary: Off from black standby disables local wake capture.');}).catch(e=>{console.error(e);process.exitCode=1});
