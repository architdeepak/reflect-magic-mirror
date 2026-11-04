// Predictable destinations for common spoken requests. More involved tasks
// remain with the browser agent, which can inspect results and operate pages.
export function voiceWebIntent(value, { homeAddress = '' } = {}) {
  const text = String(value || '').trim().replace(/^(?:(?:hey|oh|please|mirror mirror)[, ]+)+/i, '').replace(/[.!?]+$/, '').trim();
  const route = text.match(/^(?:(?:show|give|find|get|pull up)(?: me)?\s+)?(?:(walking|driving|transit|bicycling)\s+)?(?:the\s+|a\s+)?(?:route|directions)(?:\s+from\s+(.+?))?\s+to\s+(.+)$/i)
    || text.match(/^(?:how do i get|navigate|take me)\s+to\s+(.+)$/i)
    || text.match(/^(?:directions|navigate|take me)\s+(home)$/i);
  if (route) {
    const simple = route.length === 2;
    let destination = (simple ? route[1] : route[3]).trim();
    const goingHome = /^(?:my )?home$/i.test(destination);
    if (goingHome) {
      if (!homeAddress) return { question: 'What is your home address?' };
      destination = homeAddress;
    }
    if (/^(?:here|there|this|that|that place|this place)$/i.test(destination)) return { question: 'Where would you like directions to?' };
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1'); url.searchParams.set('destination', destination);
    let origin = (!simple && route[2]) || (!goingHome ? homeAddress : '');
    if (/^(?:my )?home$/i.test(origin || '')) origin = homeAddress;
    if (origin && !/^(?:here|my location|current location)$/i.test(origin.trim())) url.searchParams.set('origin', origin.trim());
    if (!simple && route[1]) url.searchParams.set('travelmode', route[1].toLowerCase());
    return { url: url.href, label: `Directions to ${destination}`, kind: 'directions' };
  }
  if (/^(?:open|show|pull up|launch|take me to)(?:\s+me)?\s+(?:(?:my|the)\s+)?(?:instagram\s+)?reels$/i.test(text)) {
    return { url: 'https://www.instagram.com/reels/', label: 'Instagram Reels', kind: 'reels' };
  }
  const youtube = text.match(/^(?:play|show|pull up|find|search for)(?:\s+me)?\s+(.+?)\s+on\s+youtube$/i)
    || text.match(/^(?:play|show|pull up|find)(?:\s+me)?\s+(?:a\s+|the\s+)?youtube\s+(?:video\s+(?:of|about|for)\s+)?(.+)$/i);
  if (youtube) {
    const query = youtube[1].trim();
    if (/^(?:this|that)(?:\s+video)?$/i.test(query)) return { question: 'Which YouTube video would you like?' };
    const url = new URL('https://www.youtube.com/results'); url.searchParams.set('search_query', query);
    return { url: url.href, label: `YouTube · ${query}`, kind: 'youtube-search' };
  }
  return null;
}
