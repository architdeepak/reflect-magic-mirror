// A soft circular palm marker follows local landmarks. Camera pixels never appear;
// the classifier still uses the untouched tracker coordinates.
export function projectHand(hand, video, viewport) {
  if (!hand || hand.length !== 21 || !video.width || !video.height || !viewport.width || !viewport.height) return null;
  const scale = Math.max(viewport.width / video.width, viewport.height / video.height);
  const cropX = (video.width * scale - viewport.width) / 2, cropY = (video.height * scale - viewport.height) / 2;
  const points = hand.map(p => ({x:((1-p.x)*video.width*scale-cropX)/viewport.width*100,y:(p.y*video.height*scale-cropY)/viewport.height*100,z:Number.isFinite(p.z)?p.z:0}));
  if (points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))) return null;
  const palm = [0,5,9,13,17].reduce((out,i)=>({x:out.x+points[i].x/5,y:out.y+points[i].y/5}),{x:0,y:0});
  return {points,palm};
}
const add=(a,b,n=1)=>({x:a.x+b.x*n,y:a.y+b.y*n});
const mix=(a,b,n=.5)=>({x:a.x+(b.x-a.x)*n,y:a.y+(b.y-a.y)*n,z:(a.z||0)+((b.z||0)-(a.z||0))*n});
const unit=(a,b)=>{const length=Math.hypot(a.x-b.x,a.y-b.y)||1;return{x:(a.x-b.x)/length,y:(a.y-b.y)/length}};
const xy=p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`;
export function gloveGeometry(points, viewport) {
  const p=points.map(p=>({x:p.x*viewport.width/100,y:p.y*viewport.height/100,z:p.z||0}));
  const across=unit(p[5],p[17]),up=unit(p[9],p[0]);
  const width=Math.hypot(p[5].x-p[17].x,p[5].y-p[17].y);
  if(width<3)return null;
  const center=[0,5,9,13,17].reduce((a,i)=>({x:a.x+p[i].x/5,y:a.y+p[i].y/5}),{x:0,y:0});
  const radius=Math.max(13,Math.min(64,width*.38));
  const bubble=`M${center.x-radius},${center.y}a${radius},${radius} 0 1,0 ${radius*2},0a${radius},${radius} 0 1,0 ${-radius*2},0`;

  const fingers=[[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]].map((chain,i)=>{
    const [base,a,b,tip]=chain.map(index=>p[index]);
    const depth=chain.reduce((sum,index)=>sum+p[index].z,0)/4;
    const palmDepth=[0,5,9,13,17].reduce((sum,index)=>sum+p[index].z,0)/5;
    const depthScale=Math.max(.75,Math.min(1.25,1-(depth-palmDepth)*2));
    return {path:`M${xy(base)}Q${xy(a)} ${xy(mix(a,b))}Q${xy(b)} ${xy(mix(b,tip))}Q${xy(tip)} ${xy(tip)}`,depth,width:Math.max(5,Math.min(90,width*(i===0?.23:.20)*depthScale))};
  });
  const cuff=add(p[0],up,-width*.11);
  return {palm:bubble,fingers,palmDepth:[0,5,9,13,17].reduce((sum,index)=>sum+p[index].z,0)/5,cuff:{x:cuff.x,y:cuff.y,width:width*.94,height:Math.max(9,width*.23),angle:Math.atan2(across.y,across.x)*180/Math.PI},label:add(cuff,up,-width*.34)};
}
export class HandMagicFeedback {
  constructor(shell) {
    const ns='http://www.w3.org/2000/svg';const node=(tag,attributes={})=>{const element=document.createElementNS(ns,tag);for(const [key,value]of Object.entries(attributes))element.setAttribute(key,value);return element};
    this.root=node('svg',{'aria-hidden':'true'});this.root.classList.add('hand-magic');this.root.style.display='none';
    const defs=node('defs');const gradient=node('linearGradient',{id:'mirror-glove-satin',gradientUnits:'userSpaceOnUse',x1:'0%',y1:'0%',x2:'100%',y2:'100%'});
    for(const [offset,color]of [['0%','#ffffff'],['60%','#fffaf4'],['100%','#e9def4']])gradient.append(node('stop',{offset,'stop-color':color}));defs.append(gradient);this.root.append(defs);
    this.glove=node('g',{class:'hand-glove'});this.root.append(this.glove);
    this.fingers=Array.from({length:5},()=>{const group=node('g');const fill=node('path',{class:'glove-finger',display:'none'});group.append(fill);return {group,fill}});
    for(const finger of this.fingers.slice(1))this.glove.append(finger.group);
    this.palm=node('path',{class:'glove-palm'});this.glove.append(this.palm,this.fingers[0].group);
    this.cuff=node('rect',{class:'glove-cuff',display:'none'});this.glove.append(this.cuff);
    this.label=document.createElement('div');this.label.className='hand-magic-label';this.label.hidden=true;shell.append(this.root,this.label);
  }
  update({gestures,video,viewport,hidden,now}) {
    const hand=gestures.hand;
    const projected=!hidden&&gestures.enabled&&hand&&now-gestures.lastSampleAt<350?projectHand(hand,{width:video.videoWidth,height:video.videoHeight},viewport):null;
    if(!projected){if(this.root.style.display!=='none')this.root.style.display='none';if(!this.label.hidden)this.label.hidden=true;this.smooth=null;return;}
    const alpha=this.smooth?1-Math.exp(-Math.min(100,now-this.updatedAt)/45):1;this.updatedAt=now;
    this.smooth=projected.points.map((p,i)=>this.smooth?mix(this.smooth[i],p,alpha):p);
    const geometry=gloveGeometry(this.smooth,viewport);
    if(!geometry){this.root.style.display='none';this.label.hidden=true;return;}
    const viewBox=`0 0 ${viewport.width} ${viewport.height}`;if(this.root.getAttribute('viewBox')!==viewBox)this.root.setAttribute('viewBox',viewBox);
    const set=(element,key,value)=>{value=String(value);if(element.getAttribute(key)!==value)element.setAttribute(key,value)};
    for(const [i,finger]of geometry.fingers.entries()){set(this.fingers[i].fill,'d',finger.path);set(this.fingers[i].fill,'stroke-width',finger.width.toFixed(1));}
    set(this.palm,'d',geometry.palm);
    const cuff=geometry.cuff;for(const [key,value]of Object.entries({x:cuff.x-cuff.width/2,y:cuff.y-cuff.height/2,width:cuff.width,height:cuff.height,rx:cuff.height*.45}))set(this.cuff,key,value.toFixed(1));set(this.cuff,'transform',`rotate(${cuff.angle.toFixed(1)} ${cuff.x.toFixed(1)} ${cuff.y.toFixed(1)})`);
    // MediaPipe depth is negative toward the camera. Draw far fingers first.
    const layers=[{element:this.palm,depth:geometry.palmDepth,key:'palm'},{element:this.cuff,depth:geometry.palmDepth+.02,key:'cuff'},...geometry.fingers.map((f,i)=>({element:this.fingers[i].group,depth:f.depth,key:String(i)}))].sort((a,b)=>b.depth-a.depth);
    const order=layers.map(layer=>layer.key).join(',');if(order!==this.layerOrder){for(const layer of layers)this.glove.append(layer.element);this.layerOrder=order;}
    if(this.root.style.display==='none')this.root.style.display='';
    const latched=String(Boolean(gestures.latched));if(this.root.dataset.latched!==latched)this.root.dataset.latched=latched;
    const emitted=gestures.lastGestureType&&now-gestures.lastGestureAt<700;
    const label=emitted?({'swipe-left':'←','swipe-right':'→','swipe-up':'↑','swipe-down':'↓',palm:'✓',pinch:'♡'}[gestures.lastGestureType]||'♡'):gestures.pinchSince?'♡':'';
    if(this.label.textContent!==label)this.label.textContent=label;
    this.label.hidden=!label;
    if(label){const x=Math.max(5,Math.min(95,geometry.label.x/viewport.width*100)).toFixed(1)+'%',y=Math.max(5,Math.min(92,geometry.label.y/viewport.height*100)).toFixed(1)+'%';if(this.label.style.left!==x)this.label.style.left=x;if(this.label.style.top!==y)this.label.style.top=y;}
  }
}
