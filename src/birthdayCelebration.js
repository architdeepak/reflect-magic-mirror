const COLORS = ['#ffadc8','#c2b2ff','#ffd991','#a5e8d0','#a8d9ff','#ffc2a1'];
const balloon = color => `<svg viewBox="0 0 120 220" aria-hidden="true"><path d="M60 119c-22 30 25 33 0 64s11 27 0 35" fill="none" stroke="#c6aac0" stroke-width="1.8"/><ellipse cx="60" cy="60" rx="45" ry="55" fill="${color}"/><ellipse cx="42" cy="36" rx="10" ry="18" fill="#fff" opacity=".45" transform="rotate(25 42 36)"/><path d="m60 112-8 12h16z" fill="${color}"/><path d="M43 62q5-7 10 0m14 0q5-7 10 0" fill="none" stroke="#70536b" stroke-width="3" stroke-linecap="round"/><path d="M55 75q5 6 10 0" fill="none" stroke="#70536b" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="37" cy="73" rx="7" ry="4" fill="#ee7f9e" opacity=".65"/><ellipse cx="83" cy="73" rx="7" ry="4" fill="#ee7f9e" opacity=".65"/><path d="m60 128-14-5 3 12 11-5 11 5 3-12z" fill="#fff" opacity=".85"/></svg>`;
const cake = `<svg class="birthday-cake" viewBox="0 0 320 230" aria-hidden="true"><ellipse cx="160" cy="206" rx="133" ry="16" fill="#dbc6ed" opacity=".45"/><path d="M50 130q0-18 20-18h180q20 0 20 18v64q-110 32-220 0z" fill="#e9c6ff"/><path d="M50 135v-5q0-18 20-18h180q20 0 20 18v5q-13 27-29 1-15 29-30 3-16 25-32 0-18 25-34 0-18 23-34-2-18 25-32-2-14 27-29 0" fill="#fff9ed"/><path d="M50 173q110 25 220 0" fill="none" stroke="#ff9dbd" stroke-width="10"/><g fill="#ff8eb3"><circle cx="84" cy="155" r="4"/><circle cx="122" cy="164" r="4"/><circle cx="198" cy="164" r="4"/><circle cx="236" cy="155" r="4"/></g><g fill="#ffbcd3" stroke="#d77eaa" stroke-width="2"><rect x="131" y="69" width="13" height="47" rx="5"/><rect x="177" y="69" width="13" height="47" rx="5"/></g><g fill="#ffcf6b"><path d="M138 68c-18-11-1-24 0-32 4 10 17 23 0 32"/><path d="M183 68c-18-11-1-24 0-32 4 10 17 23 0 32"/></g><g fill="#fff5c8"><ellipse cx="138" cy="59" rx="4" ry="7"/><ellipse cx="183" cy="59" rx="4" ry="7"/></g><path d="M148 185q12 10 24 0" fill="none" stroke="#93607f" stroke-width="3" stroke-linecap="round"/><circle cx="139" cy="178" r="3" fill="#93607f"/><circle cx="181" cy="178" r="3" fill="#93607f"/></svg>`;
export class BirthdayCelebration {
  constructor(shell) {
    this.shell=shell;this.active=false;this.epoch=0;
    this.root=document.createElement('section');this.root.className='birthday-stage';this.root.hidden=true;this.root.setAttribute('aria-label','Birthday celebration');this.root.setAttribute('role','region');
    this.root.innerHTML=`<div class="birthday-cloud birthday-cloud-one"></div><div class="birthday-cloud birthday-cloud-two"></div><div class="birthday-balloons" aria-hidden="true"></div><div class="birthday-confetti" aria-hidden="true"></div><div class="birthday-card"><h1>Happy Birthday,<br><span>Sahiti!</span></h1><div class="birthday-age"><span>2</span><span>4</span><i>✦</i></div>${cake}</div><button class="birthday-close" type="button" aria-label="Close birthday celebration" title="Back to the mirror">✕</button>`;
    this.root.querySelector('button').addEventListener('click',()=>this.finish());
    this.key=event=>{if(this.active&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();this.finish();}};window.addEventListener('keydown',this.key,true);shell.append(this.root);
  }
  play({name='Sahiti',age=24}={}, {muted=false,reduced=false}={}) {
    this.cancel();this.active=true;const epoch=++this.epoch;this.root.hidden=false;this.root.dataset.reduced=String(reduced);this.shell.dataset.birthday='true';this.shell.dataset.birthdayPhase='entering';this.root.dataset.phase='entering';
    this.enterTimer=setTimeout(()=>{if(epoch===this.epoch){this.shell.dataset.birthdayPhase='active';this.root.dataset.phase='active';}},reduced?50:800);
    this.root.querySelector('h1 span').textContent=`${name}!`;
    this.root.querySelector('.birthday-age').setAttribute('aria-label',`${age} years old`);
    const balloons=this.root.querySelector('.birthday-balloons');
    balloons.innerHTML=Array.from({length:reduced?12:30},(_,i)=>{const side=i%2, lane=Math.floor(i/2)%5;return `<div class="birthday-balloon" style="--x:${side?81+lane*5:lane*5-5}%;--delay:${-(i%10)*.7}s;--duration:${9+(i%5)*.7}s;--sway:${i%2?-1:1};--size:${110+(i*17)%95}px;--tilt:${i%2?-10:10}deg">${balloon(COLORS[i%COLORS.length])}</div>`;}).join('');
    this.root.querySelector('.birthday-confetti').innerHTML=Array.from({length:reduced?0:52},(_,i)=>`<i style="--x:${(i*37)%100}%;--color:${COLORS[i%COLORS.length]};--delay:${(i%13)*.15}s;--fall:${5+i%4}s;--turn:${i%2?360:-360}deg;--drift:${(i%7-3)*18}px;--round:${i%3===0?'50%':'2px'}"></i>`).join('');
    if(!muted)void this.playMusic(epoch);
    this.endTimer=setTimeout(()=>this.finish(false),19000);
    return new Promise(resolve=>{this.resolve=resolve;});
  }
  async playMusic(epoch) {
    try {
      this.audio ||= new AudioContext();await this.audio.resume();if(epoch!==this.epoch)return;
      const master=this.master=this.audio.createGain();master.gain.value=.8;master.connect(this.audio.destination);
      this.notes=[];
      const frequencies={G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,C3:130.81,F3:174.61,G3:196,C6:1046.5};
      // A soft music-box arrangement of Happy Birthday, with a tiny plucked
      // accompaniment. Pure local synthesis: no speech, samples or network.
      const phrases=[
        [['G4',.5],['G4',.5],['A4',1],['G4',1],['C5',1],['B4',2]],
        [['G4',.5],['G4',.5],['A4',1],['G4',1],['D5',1],['C5',2]],
        [['G4',.5],['G4',.5],['G5',1],['E5',1],['C5',1],['B4',1],['A4',2]],
        [['F5',.5],['F5',.5],['E5',1],['C5',1],['D5',1],['C5',2]]
      ];
      const start=this.audio.currentTime+.7, beat=.55;
      const note=(pitch,at,length,volume=.11)=>{
        for(const [harmonic,weight]of [[1,1],[2,.19],[3,.055]]){
          const tone=this.audio.createOscillator(),gain=this.audio.createGain();tone.type='sine';tone.frequency.value=frequencies[pitch]*harmonic;
          gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume*weight,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
          tone.connect(gain);gain.connect(master);tone.start(at);tone.stop(at+length+.02);tone.onended=()=>{tone.disconnect();gain.disconnect();};this.notes.push(tone);
        }
      };
      let cursor=0;
      for(const [index,phrase]of phrases.entries()){
        note(index===2?'F3':index===3?'G3':'C3',start+cursor,1.1,.025);
        for(const [pitch,beats]of phrase){note(pitch,start+cursor,Math.max(.32,beats*beat*.95));cursor+=beats*beat;}
        cursor+=.24;
      }
      note('C6',start+cursor,.95,.035);this.musicDuration=cursor+1.65;
    } catch {}
  }
  finish(cancelled=true) {
    if(!this.active||this.root.dataset.phase==='leaving')return;
    clearTimeout(this.enterTimer);clearTimeout(this.endTimer);
    this.shell.dataset.birthdayPhase='leaving';this.root.dataset.phase='leaving';
    const duration=this.root.dataset.reduced==='true'?100:850;
    if(this.master&&this.audio?.state==='running'){
      const at=this.audio.currentTime;this.master.gain.cancelScheduledValues(at);this.master.gain.setValueAtTime(this.master.gain.value,at);this.master.gain.linearRampToValueAtTime(0,at+Math.min(duration/1000,.4));
    }
    this.exitTimer=setTimeout(()=>this.cancel(cancelled),duration);
  }
  cancel(cancelled=true) {
    ++this.epoch;clearTimeout(this.enterTimer);clearTimeout(this.exitTimer);clearTimeout(this.endTimer);for(const note of this.notes||[])try{note.stop();}catch{}this.notes=[];
    this.master?.disconnect();this.master=null;this.active=false;this.root.hidden=true;delete this.root.dataset.phase;delete this.shell.dataset.birthday;delete this.shell.dataset.birthdayPhase;this.root.querySelector('.birthday-balloons').replaceChildren();this.root.querySelector('.birthday-confetti').replaceChildren();
    this.resolve?.({cancelled});this.resolve=null;
    if(this.audio?.state==='running')void this.audio.suspend().catch(()=>{});
  }
  destroy(){this.cancel();window.removeEventListener('keydown',this.key,true);this.root.remove();void this.audio?.close().catch(()=>{});}
}
