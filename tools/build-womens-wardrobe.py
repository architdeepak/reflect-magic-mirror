"""Create original local vector outfits in the mirror's existing sewing coordinates."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
colors={'ivory':'#e9e1cf','camel':'#b18b62','chocolate':'#50372f','burgundy':'#702c42','navy':'#243954','sage':'#8d9d86'}
styles=[('satin-slip-dress','Satin slip dress','dress','dress','satin'),('wrap-midi-dress','Wrap midi dress','dress','dress','wrap'),('shirt-dress','Shirt dress','dress','dress','shirt'),('rib-knit-dress','Rib knit dress','dress','dress','rib'),('a-line-skirt','A-line skirt','skirt','skirt','plain'),('pleated-midi-skirt','Pleated midi skirt','skirt','skirt','pleats'),('satin-bias-skirt','Satin bias skirt','skirt','skirt','satin'),('tailored-blazer','Tailored blazer','outerwear','blouse','blazer'),('cropped-trench-jacket','Cropped trench jacket','outerwear','blouse','trench'),('soft-cardigan','Soft cardigan','outerwear','long sleeve','cardigan'),('rib-knit-top','Rib knit top','top','long sleeve','rib'),('puff-sleeve-blouse','Puff sleeve blouse','top','blouse','puff'),('linen-shirt','Linen shirt','top','blouse','shirt')]
records=[]
for slug,label,category,pattern,detail in styles:
 for color,hexcolor in colors.items():
  source=root/'src/assets/wardrobe'/f"{pattern.replace(' ','-')}-black.svg"
  svg=source.read_text().replace('#252932',hexcolor)
  # Keep the original sewing boundary so sleeve meshes remain attached.
  additions=[]
  if detail in ('shirt','cardigan','blazer','trench'):
   additions.append('<path d="M256 98V442" stroke="#12121a" stroke-opacity=".28" stroke-width="3"/>')
   for y in range(150,430,50): additions.append(f'<circle cx="256" cy="{y}" r="4" fill="#dcc59e" stroke="#352e2a" stroke-width="1"/>')
  if detail in ('blazer','trench'):
   additions.append('<path d="M213 38L256 137L220 198L196 117L218 125L199 74M299 38L256 137L292 198L316 117L294 125L313 74" fill="#000" fill-opacity=".15" stroke="#fff" stroke-opacity=".25" stroke-width="2"/><path d="M171 329H225M287 329H341" stroke="#000" stroke-opacity=".35" stroke-width="5"/>')
  if detail=='trench': additions.append('<path d="M150 345H362V369H150Z" fill="#000" fill-opacity=".18"/><rect x="235" y="341" width="42" height="33" rx="3" fill="none" stroke="#d5bd8f" stroke-width="5"/>')
  if detail=='cardigan': additions.append('<path d="M216 35L256 155L296 35" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="13"/>')
  if detail=='rib':
   additions.append('<g clip-path="url(#shape)" fill="none" stroke="#fff" stroke-opacity=".11" stroke-width="2">'+''.join(f'<path d="M{x} 45V705"/>' for x in range(115,405,9))+'</g>')
  if detail=='pleats': additions.append('<g clip-path="url(#shape)" stroke="#000" stroke-opacity=".18" stroke-width="3">'+''.join(f'<path d="M{200+i*14} 50L{90+i*33} 675"/>' for i in range(9))+'</g>')
  if detail=='wrap': additions.append('<path d="M216 35L303 223L186 308M296 35L216 225L332 313" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="6"/><path d="M180 228Q256 245 332 228" fill="none" stroke="#d5bd8f" stroke-width="9"/><path d="M310 237L345 322L324 346L298 242" fill="#000" fill-opacity=".18"/>')
  if detail=='satin': additions.append('<path d="M216 90Q260 190 207 370Q180 470 170 645M300 110Q280 330 332 620" fill="none" stroke="#fff" stroke-opacity=".17" stroke-width="20" stroke-linecap="round" clip-path="url(#shape)"/>')
  if detail=='puff': additions.append('<path d="M145 62Q108 99 110 174M367 62Q404 99 402 174" fill="none" stroke="#fff" stroke-opacity=".24" stroke-width="13"/>')
  if slug=='satin-slip-dress':
   # A separate strap silhouette, no short sleeves painted over the arms.
   silhouette='M183 55L217 55L223 105Q256 137 289 105L295 55L329 55L326 226L375 655Q256 680 137 655L186 226Z'
   import re
   svg=re.sub(r'd="M150 55[^\"]+"',f'd="{silhouette}"',svg)
  svg=svg.replace('</svg>',''.join(additions)+'</svg>')
  filename=f'women-{slug}-{color}.svg';(root/'src/assets/wardrobe'/filename).write_text(svg)
  records.append({'id':f'women-{slug}-{color}','name':f'{color.title()} {label.lower()}','category':category,'color':color,'style':pattern,'collectionStyle':slug,'starter':True,'collection':'Women’s essentials','asset':filename})
(root/'src/womensWardrobe.json').write_text(json.dumps(records,indent=2)+'\n')
# A JS module avoids JSON import-assertion differences between Electron versions.
(root/'src/womensWardrobe.js').write_text('// Original local women’s capsule. Sewing coordinates match the live fit meshes.\nconst garments = '+json.dumps(records,indent=2)+';\nexport function womensWardrobe() { return garments.map(({asset,...item}) => ({...item,imageUrl:new URL(`./assets/wardrobe/${asset}`,import.meta.url).href})); }\n')
print(f'Built {len(records)} original women’s garment variants.')
