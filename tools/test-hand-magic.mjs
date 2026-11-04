import assert from 'node:assert/strict';
import { projectHand, gloveGeometry } from '../src/handMagicFeedback.js';
const hand=Array.from({length:21},()=>({x:.5,y:.5}));
const video={width:1280,height:720},portrait={width:1080,height:1799};
let result=projectHand(hand,video,portrait);assert(Math.abs(result.palm.x-50)<1e-8);assert(Math.abs(result.palm.y-50)<1e-8);
for(const p of hand)p.x=.55;result=projectHand(hand,video,portrait);assert(result.palm.x<50,'Feedback did not mirror camera coordinates');assert.equal(result.points.length,21);
assert.equal(projectHand(hand,{width:0,height:0},portrait),null);assert.equal(projectHand([],video,portrait),null);hand[5].x=NaN;assert.equal(projectHand(hand,video,portrait),null);
console.log('Hand magic: portrait cover crop, mirrored placement, complete fingers and invalid/camera-off rejection passed.');

const fingers=Array.from({length:21},()=>({x:50,y:50}));fingers[0]={x:50,y:70};for(const [m,x]of [[1,42],[5,45],[9,50],[13,55],[17,60]])for(let i=0;i<4;i++)fingers[m+i]={x,y:55-i*8};
const glove=gloveGeometry(fingers,portrait);assert.equal(glove.fingers.length,5);assert(glove.palm.includes('a')&&!glove.palm.includes('L'),'Palm marker lost its circular geometry');assert(glove.fingers.every(f=>f.path.includes('Q')&&f.width>=8));assert(Number.isFinite(glove.cuff.angle));
console.log('Hand feedback: circular palm marker and finite tracked geometry passed.');

const tip=fingers[8],pixelTip=`${(tip.x*portrait.width/100).toFixed(1)},${(tip.y*portrait.height/100).toFixed(1)}`;assert(glove.fingers[1].path.endsWith(pixelTip),'Glove shortened or shifted the tracked fingertip');
for(const i of [5,6,7,8])fingers[i].z=-.2;const nearer=gloveGeometry(fingers,portrait);assert(nearer.fingers[1].width>nearer.fingers[2].width,'Nearer fingers lost their tracked depth');
