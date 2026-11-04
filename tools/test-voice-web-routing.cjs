const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/renderer.js','utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const pages=[],tasks=[],notices=[];let resolvePage,resolveAgent;
 const scope=vm.createContext({URL,config:{memory:{facts:[]}},voiceStartGeneration:0,manualControlGeneration:0,
  openDesktopPage:url=>{pages.push(url);return new Promise(resolve=>resolvePage=resolve)},
  runAgentTask:task=>{tasks.push(task);return new Promise(resolve=>resolveAgent=resolve)},
  showGesture(){},showOracle:(text)=>notices.push(text),appendCaption(){}});
 vm.runInContext(fs.readFileSync('src/voiceWebIntents.js','utf8').replace('export function','function'),scope);
 vm.runInContext(source.slice(source.indexOf('function runVoiceNavigation('),source.indexOf('function requestTryOnFromNavigation(')),scope);
 assert(scope.runVoiceNavigation('play ocean waves on YouTube'));assert.equal(tasks.length,0);
 resolvePage({current:true});await tick();assert.equal(tasks.length,1);assert(tasks[0].includes('Do not stop at search results'));
 resolveAgent({completed:true,summary:'Verified ocean waves video.'});await tick();assert.equal(notices.at(-1),'Verified ocean waves video.');
 scope.runVoiceNavigation('pull up piano on YouTube');scope.voiceStartGeneration++;resolvePage({current:true});await tick();assert.equal(tasks.length,1,'Stopped video lookup started an agent');
 scope.runVoiceNavigation('pull up jazz on YouTube');resolvePage({current:true});await tick();const previous=notices.length;scope.manualControlGeneration++;resolveAgent({completed:true,summary:'Stale video'});await tick();assert.equal(notices.length,previous,'Late agent answer replaced newer user control');
 scope.runVoiceNavigation('open reels');resolvePage({current:true});await tick();assert.equal(tasks.length,2,'Reels unnecessarily started a computer task');
 console.log('Voice web routing: real video selection beyond search, page ownership, Stop, late agent results and direct Reels passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
