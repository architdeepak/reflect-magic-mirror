import { projectHand } from './handMagicFeedback.js';

// Point to aim, then pinch or bend the pointing finger to press. Only visible
// controls explicitly opted in can be clicked; a held press never repeats.
export class HandPointer {
  constructor(shell) {
    this.shell=shell;this.cursor=document.createElement('div');this.cursor.className='hand-pointer';this.cursor.hidden=true;shell.append(this.cursor);
    this.target=null;this.held=false;this.suppressUntil=0;this.lastAimAt=0;
  }
  clear() {this.target?.classList.remove('hand-hover');this.target=null;this.cursor.hidden=true;this.cursor.classList.remove('pressed');this.held=false;this.lastAimAt=0;}
  consume(type,now=performance.now()) {return type==='pinch'&&(!!this.target||now<this.suppressUntil);}
  update({gestures,video,viewport,hidden,now}) {
    const h=gestures.hand;
    if(hidden||!gestures.enabled||!h||h.length!==21||now-gestures.lastSampleAt>350){this.clear();return;}
    const dist=(a,b)=>Math.hypot((a.x-b.x)*video.videoWidth/video.videoHeight,a.y-b.y);
    const width=dist(h[5],h[17]);if(width<.025){this.clear();return;}
    const extended=tip=>dist(h[tip],h[0])>dist(h[tip-2],h[0])*1.12;
    const index=extended(8),others=[12,16,20].filter(extended).length;
    const pinch=dist(h[4],h[8])<width*.42;
    const pressing=pinch||(!index&&this.lastAimAt&&now-this.lastAimAt<500);
    // Open palms belong to swipe/Stop, not pointing.
    if(others>=2&&!pinch){this.clear();return;}
    if(index&&!pinch){
      const p=projectHand(h,{width:video.videoWidth,height:video.videoHeight},viewport)?.points[8];
      if(!p){this.clear();return;}
      const box=this.shell.getBoundingClientRect(),x=box.left+p.x*viewport.width/100,y=box.top+p.y*viewport.height/100;
      this.cursor.hidden=false;this.cursor.style.left=p.x+'%';this.cursor.style.top=p.y+'%';
      const target=document.elementFromPoint(x,y)?.closest('.mode-btn,.dimension-switch button,[data-hand-click]');
      const eligible=target&&!target.disabled&&target.getClientRects().length?target:null;
      if(eligible!==this.target){this.target?.classList.remove('hand-hover');this.target=eligible;this.aimSince=now;this.target?.classList.add('hand-hover');}
      this.lastAimAt=now;this.held=false;
    }
    if(pressing&&this.target){
      this.suppressUntil=now+600;
      if(!this.held&&now-this.aimSince>=160){this.held=true;this.cursor.classList.add('pressed');this.target.click();}
    }else if(!pressing){this.held=false;this.cursor.classList.remove('pressed');}
    if(!index&&!pinch&&now-this.lastAimAt>=500)this.clear();
  }
}
