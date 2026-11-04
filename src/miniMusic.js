export class MiniMusic {
  constructor({shell,onOpen,onCollapse,onCommand,onError}) {
    Object.assign(this,{shell,onOpen,onCollapse,onCommand,onError});
    this.root=document.createElement('aside');this.root.className='mini-music';this.root.hidden=true;this.root.setAttribute('aria-label','Now playing');
    this.root.innerHTML=`<button class="mini-expand" data-hand-click aria-label="Open music player"><img alt="" hidden><span><b></b><small></small></span></button><button class="mini-play" data-hand-click aria-label="Play or pause">Ⅱ</button><label class="mini-volume">Volume <input type="range" min="0" max="100" step="5" value="55" aria-label="Music volume"></label><button class="mini-hide" data-hand-click aria-label="Hide music details">⌄</button><button class="mini-restore" data-hand-click aria-label="Show music controls">♫</button>`;
    shell.append(this.root);this.art=this.root.querySelector('img');this.title=this.root.querySelector('b');this.artist=this.root.querySelector('small');this.play=this.root.querySelector('.mini-play');
    this.root.querySelector('.mini-expand').onclick=()=>onOpen();
    this.root.querySelector('.mini-hide').onclick=()=>{this.root.dataset.tucked='true'};
    this.root.querySelector('.mini-restore').onclick=()=>{delete this.root.dataset.tucked};
    this.play.onclick=()=>this.command(this.snapshot?.isPlaying?'pause':'play');
    this.volumes=[this.root.querySelector('input'),document.querySelector('#spotify-volume')].filter(Boolean);
    for(const input of this.volumes)input.addEventListener('change',()=>this.command({action:'volume',volume:Number(input.value)}));
    document.querySelector('#spotify-collapse')?.addEventListener('click',()=>onCollapse());
  }
  async command(action){
    if(action?.action==='volume'){this.pendingVolume=action.volume;this.volumePendingUntil=Date.now()+4000;for(const input of this.volumes)input.value=String(action.volume)}
    try{await this.onCommand(action)}catch(error){this.volumePendingUntil=0;this.render();this.onError(error.message)}
  }
  setMode(mode){this.mode=mode;this.render()}
  reveal(){delete this.root.dataset.tucked;this.render()}
  update(snapshot){this.snapshot=snapshot;this.render()}
  render(){
    const s=this.snapshot,item=s?.item;this.root.hidden=!item||this.mode==='spotify';if(!item)return;
    this.title.textContent=item.name;this.artist.textContent=item.artists?.join(' · ')||'';
    this.play.textContent=s.isPlaying?'Ⅱ':'▶';this.play.setAttribute('aria-label',s.isPlaying?'Pause music':'Resume music');this.play.disabled=!s.canControl;
    const art=/^https:\/\//i.test(item.imageUrl||'')?item.imageUrl:'';this.art.hidden=!art;if(art&&this.art.getAttribute('src')!==art)this.art.src=art;
    for(const input of this.volumes){input.disabled=!s.canControl;if(Number.isFinite(s.volumePercent)&&document.activeElement!==input)input.value=String(Date.now()<this.volumePendingUntil?this.pendingVolume:s.volumePercent)}
  }
}
