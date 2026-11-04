export function volumeIntent(value){
  const text=String(value||'').toLowerCase().replace(/[.!?,]/g,'').replace(/^(?:(?:please|mirror mirror|can you|could you)\s+)+/,'').trim();
  if(/\b(?:brightness|lights?|temperature|thermostat|heating)\b/.test(text))return null;
  const target=/\b(?:music|spotify)\b/.test(text)?'music':/\b(?:video|youtube)\b/.test(text)?'watch':'system';
  const number=text.match(/\b(\d{1,3})\s*(?:%|percent)?\b/);const amount=number?Number(number[1]):undefined;
  if(amount!==undefined&&amount>100)return null;
  if(/^(?:set|turn|put|change|make|increase|decrease|raise|lower)\b/.test(text)&&/\b(?:volume|sound|audio|music|spotify|video|youtube)\b/.test(text)&&/\bto\s+\d/.test(text))return{target,action:'set',value:amount};
  if(/^(?:(?:turn|bring|crank|bump)\b.*\bup\b|(?:increase|raise)\b.*\b(?:volume|sound|audio|music)\b|(?:make|a little|a bit)\b.*\blouder\b|louder$|volume up$)/.test(text))return{target,action:'increase',value:amount??10};
  if(/^(?:(?:turn|bring)\b.*\bdown\b|(?:decrease|lower|reduce)\b.*\b(?:volume|sound|audio|music)\b|(?:make|a little|a bit)\b.*\b(?:quieter|softer)\b|quieter$|volume down$)/.test(text))return{target,action:'decrease',value:amount??10};
  if(/^(?:unmute|mute) (?:the )?(?:audio|sound|volume|music|spotify|video|youtube)$/.test(text))return{target,action:text.startsWith('unmute')?'unmute':'mute'};
  return null;
}
