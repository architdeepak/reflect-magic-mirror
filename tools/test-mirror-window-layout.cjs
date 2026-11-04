const assert=require('node:assert/strict');const {mirrorSafeArea,managedBrowserBounds}=require('../src/mirrorWindowLayout.cjs');
for(const b of [{x:0,y:0,width:1080,height:1920},{x:1080,y:30,width:1920,height:1080},{x:-720,y:100,width:720,height:1280}]){
 const s=mirrorSafeArea(b),normal=managedBrowserBounds(b),full=managedBrowserBounds(b,true);
 assert(s.y>b.y);assert.equal(s.y+s.height,b.y+b.height);assert.deepEqual(full,s);
 assert(normal.y>=s.y);assert(normal.x>=s.x);assert(normal.x+normal.width<=s.x+s.width);assert(normal.y+normal.height<=s.y+s.height);
}
assert.equal(mirrorSafeArea({x:0,y:0,width:1080,height:1920}).y,121);
console.log('Browser layout: covered top band, companion/fullscreen bounds, portrait/landscape and relocated displays passed.');
