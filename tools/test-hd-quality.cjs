const assert=require('assert/strict'),fs=require('fs'),vm=require('vm');
(async()=>{
 const quality=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('src/displayQuality.js','utf8')).toString('base64'));
 for(const id of ['eco','auto','hd'])for(const [w,h,dpr]of[[2160,3840,2],[1080,1920,3],[400,710,1],[0,0,1]]){
  const p=quality.displayProfile(id),s=quality.boundedSurface(w,h,dpr,p.avatarPixels,p.avatarDpr);assert(s.width*s.height<=p.avatarPixels);assert(s.width>0&&s.height>0);if(w&&h)assert(Math.abs(s.width/s.height-w/h)<.005);
 }
 const hd=quality.displayProfile('hd');
 const hdSurface=quality.boundedSurface(562,864,Math.max(1,hd.avatarMinDpr),hd.avatarPixels,hd.avatarDpr);
 assert.equal(hdSurface.width,1124,'HD TV portrait must retain source detail at DPR1');
 assert.equal(hdSurface.height,1728);
 const mock=new Proxy({drawImage(){}},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
 const scope=vm.createContext({});vm.runInContext(fs.readFileSync('src/faceHost.js','utf8').replace(/^import .*;$/mg,'').replace('export class','class')+';globalThis.Host=FaceHost',scope);
 const make=()=>{const h=Object.create(scope.Host.prototype);Object.assign(h,{ctx:mock,canvas:{},width:400,height:500,ready:true,persona:'velora',image:{naturalWidth:1200,naturalHeight:1312},speech:0,blendshapes:{},gaze:{x:0,y:0,confidence:1},viewer:{x:0,y:0},performance:{turn:0,nod:0,lean:0},performanceSmooth:{turn:0,nod:0,lean:0},poseBlend:{AA:0,O:0},viseme:'rest',drawCount:0});h.draw(0);return h};
 const sample=fps=>{const h=make();h.setPerformance({turn:.6,nod:.2,lean:.1});h.setFace({}, {x:.8,y:.2,confidence:1},.6,{});h.setViseme('AA');for(let i=1;i<=fps/2;i++)h.draw(i/fps);return h};
 const a=sample(30),b=sample(60);assert(Math.abs(a.performanceSmooth.turn-b.performanceSmooth.turn)<.001);assert(Math.abs(a.poseBlend.AA-b.poseBlend.AA)<.001);assert(Math.abs(a.gazeSmooth.x-b.gazeSmooth.x)<.001);
 assert(Math.abs(a.faceAnchor.size*1312/1200-a.faceAnchor.size)>20,'Portrait artwork lost native aspect');
 const h=make();h.setFace({}, {x:1,y:0,confidence:1},0,{});h.draw(1/60);assert(h.gazeSmooth.x>0&&h.gazeSmooth.x<1,'Gaze jumped immediately');
 for(const [width,height]of [[320,180],[475,828],[1080,1920]])for(const lean of [-1,0,1]){
  const portrait=make();Object.assign(portrait,{width,height,viewer:{x:lean},performance:{turn:lean,nod:lean,lean},performanceSmooth:{turn:lean,nod:lean,lean},lastIdleSignature:null});
  let translation,rotation,bounds;
  portrait.ctx=new Proxy({translate:(x,y)=>translation=[x,y],rotate:angle=>rotation=angle,drawImage:(image,x,y,w,h)=>{if(image===portrait.image)bounds=[x,y,w,h]}},{get:(t,k)=>t[k]||(()=>{}),set:(t,k,v)=>{t[k]=v;return true}});
  portrait.draw(1);const [x,y,w,h]=bounds;
  for(const [dx,dy]of [[x,y],[x+w,y],[x,y+h],[x+w,y+h]]){
   const px=translation[0]+dx*Math.cos(rotation)-dy*Math.sin(rotation),py=translation[1]+dx*Math.sin(rotation)+dy*Math.cos(rotation);
   assert(px>=0&&px<=width&&py>=0&&py<=height,'Moving portrait cropped its hair/crown');
  }
 }
 console.log('HD quality: bounded 4K/DPR surfaces, profile validation, native portrait proportion and matching 30/60 Hz gaze/head/mouth easing passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
