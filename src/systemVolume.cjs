const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
class SystemVolume {
  constructor({run=promisify(execFile)}={}){this.run=run;this.queue=Promise.resolve()}
  command(input={}){const task=this.queue.catch(()=>{}).then(()=>this.apply(input));this.queue=task;return task}
  async status(){
    const name=(await this.run('pactl',['get-default-sink'],{timeout:3000})).stdout.trim();
    const sinks=JSON.parse((await this.run('pactl',['--format=json','list','sinks'],{timeout:3000})).stdout);
    const sink=sinks.find(s=>s.name===name);if(!sink)throw Error('TV audio output is unavailable.');
    const channels=Object.values(sink.volume||{}).map(v=>v.value);if(!channels.length)throw Error('TV volume is unavailable.');
    return{volume:Math.round(channels.reduce((a,b)=>a+b,0)/channels.length/65536*100),muted:!!sink.mute};
  }
  async apply({action='status',value}={}){
    if(!['status','set','increase','decrease','mute','unmute'].includes(action))throw Error('Unsupported volume action.');
    if(['set','increase','decrease'].includes(action)&&value!==undefined&&(!Number.isFinite(value)||value<0||value>100))throw Error('Volume must be between 0 and 100.');
    if(action==='set'&&value===undefined)throw Error('Choose a volume from 0 to 100.');
    const before=await this.status();if(action==='status')return before;
    if(['mute','unmute'].includes(action))await this.run('pactl',['set-sink-mute','@DEFAULT_SINK@',action==='mute'?'1':'0'],{timeout:3000});
    else{const next=Math.min(100,Math.max(0,action==='set'?value:before.volume+(action==='increase'?1:-1)*(value??10)));
      await this.run('pactl',['set-sink-volume','@DEFAULT_SINK@',`${Math.round(next)}%`],{timeout:3000});
      if(before.muted&&next>0)await this.run('pactl',['set-sink-mute','@DEFAULT_SINK@','0'],{timeout:3000});}
    return this.status();
  }
}
module.exports={SystemVolume};
