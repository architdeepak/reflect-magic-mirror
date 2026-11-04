import assert from 'node:assert/strict';
import { birthdayIntent } from '../src/birthdayIntent.js';
for(const phrase of ["it's my birthday",'it s my birthday',"it's Sahiti's birthday",'it is Sahiti s birthday',"mirror mirror it's Sahiti’s 24th birthday",'mirror rmiorr its sahitis birthday','today is my birthday','celebrate sahitis birthday','wish sahiti a happy birthday','happy 24th birthday sahiti','start birthday mode','show birthday surprise for sahiti','its my birthday today'])assert.deepEqual(birthdayIntent(phrase),{name:'Sahiti',age:24},phrase);
for(const phrase of ['', 'mirror mirror', 'what is a birthday', 'when is sahitis birthday', 'its not my birthday', 'its my birthday next week', 'remind me about sahitis birthday','its advits birthday','play happy birthday on youtube','tell a story about a birthday','turn off birthday mode'])assert.equal(birthdayIntent(phrase),null,phrase);
console.log('Birthday intent: explicit birthday requests, Sahiti/24, wake and possessive variants; rejects dates, negations, other people, media and ordinary questions.');
// Exercise the actual renderer gate, not only its phrase parser.
const {default:vm}=await import('node:vm');const {default:fs}=await import('node:fs');
const renderer=fs.readFileSync('src/renderer.js','utf8');
const launches=[];const scope=vm.createContext({birthdayIntent,birthdayWakeArmed:false,hardMuted:false,awaitingWakeRequest:true,userCaptionFromLocal:false,captionState:{user:'',assistant:''},captionAssistantTurnActive:false,wake:{stopCaptionTurn(){}},appendCaption(role,text){scope.captionState[role]=text},playBirthdayCelebration:request=>launches.push(request),stopAssistant(){},showOracle(){}});
vm.runInContext(renderer.slice(renderer.indexOf('function handleTranscript('),renderer.indexOf('async function toggleVoice(')),scope);
scope.handleTranscript('user','its my birthday',{final:true});assert.equal(launches.length,0,'Birthday chat without a wake launched surprise');
scope.birthdayWakeArmed=true;scope.handleTranscript('user','its my birthday',{final:false});assert.equal(launches.length,0,'Interim speech launched surprise');
scope.handleTranscript('assistant','its my birthday',{final:true});assert.equal(launches.length,0,'Assistant speech launched surprise');
scope.handleTranscript('user','its my birthday',{final:true});assert.equal(launches.length,1);
console.log('Birthday gate: finalized user request after explicit wake only; no ambient, partial or assistant activation.');
