const assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {readMirrorMemory,writeMirrorMemory,homeAddress}=require('../src/mirrorMemory.cjs');
(async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'mirror-memory-'));try{
 const file=path.join(dir,'memory.json');
 assert.equal(homeAddress(await readMirrorMemory(file)),'');
 await fs.writeFile(path.join(dir,'MEMORY.md'),'# My preferences\n\nKeep replies short.\n');
 let m=await writeMirrorMemory(file,{facts:[{fact:'Home address: 72 Ortega Ave, Mountain View, CA'}]});
 assert.equal(homeAddress(m),'72 Ortega Ave, Mountain View, CA');assert(m.markdown.includes('Keep replies short.'));
 m=await writeMirrorMemory(file,{facts:[...m.facts,{fact:'Enjoys jazz'}]});assert.equal(m.markdown.split('mirror:learned:start').length,2);assert(m.markdown.includes('Enjoys jazz'));
 assert.equal((await fs.stat(m.markdownPath)).mode&0o777,0o600);
 await fs.writeFile(m.markdownPath,'Home: Updated location\n'+m.markdown);
 assert.equal(homeAddress(await readMirrorMemory(file)),'Updated location');
 console.log('Memory: local Markdown, preserved manual edits, updated facts, home lookup and private file permissions passed.');
}finally{await fs.rm(dir,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
