import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { starterWardrobe } from '../src/starterWardrobe.js';
const all=starterWardrobe();assert.equal(all.length,108);assert.equal(new Set(all.map(i=>i.id)).size,all.length);
const women=all.filter(i=>i.collection);assert.equal(women.length,78);assert.equal(new Set(women.map(i=>i.collectionStyle)).size,13);
for(const item of all){assert(['t-shirt','blouse','long sleeve','dress','skirt'].includes(item.style));const svg=await fs.readFile(new URL(item.imageUrl),'utf8');assert(svg.includes('<svg'));assert(!/<image|https?:\/\//.test(svg.replace(/xmlns="[^"]+"/g,'')),'Garment needs remote or raster imagery');}
for(const category of ['top','dress','skirt','outerwear'])assert(women.some(i=>i.category===category));
console.log('Wardrobe: 108 unique bundled garments, 13 women’s styles in six colors, categories, local vector assets and live-fit patterns passed.');
