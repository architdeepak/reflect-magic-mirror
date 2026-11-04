import assert from 'node:assert/strict';
import { voiceWebIntent } from '../src/voiceWebIntents.js';
for (const phrase of ['show me the route to Shoreline Amphitheatre', 'directions to Shoreline Amphitheatre', 'hey, navigate to Shoreline Amphitheatre']) {
  const intent = voiceWebIntent(phrase), url = new URL(intent.url);
  assert.equal(url.searchParams.get('destination'), 'Shoreline Amphitheatre');
  assert.equal(url.searchParams.get('origin'), null, 'Unverified GPS location was invented');
}
const walking = new URL(voiceWebIntent('walking directions from Mountain View to Stanford University').url);
assert.equal(walking.searchParams.get('origin'), 'Mountain View');
assert.equal(walking.searchParams.get('travelmode'), 'walking');
for (const phrase of ['show me the route to here', 'navigate to there']) assert(voiceWebIntent(phrase).question);
for (const phrase of ['open reels', 'oh pull up Instagram Reels', 'show me my reels']) assert.equal(voiceWebIntent(phrase).url, 'https://www.instagram.com/reels/');
for (const phrase of ['play ocean waves on YouTube', 'pull up the YouTube video about ocean waves']) {
  assert.equal(new URL(voiceWebIntent(phrase).url).searchParams.get('search_query'), 'ocean waves');
}
assert(voiceWebIntent('pull up this video on YouTube').question);
const unicode = new URL(voiceWebIntent('directions to 東京都').url); assert.equal(unicode.searchParams.get('destination'), '東京都');
for (const phrase of ['what is the route protocol', 'I watched reels yesterday', 'play Spotify', 'open example.com']) assert.equal(voiceWebIntent(phrase), null);
console.log('Voice web intents: destinations, supplied origins, travel mode, ambiguous places/videos, Reels, YouTube, Unicode and unrelated speech passed.');
const home='72 Ortega Ave, Mountain View, CA';
assert.equal(new URL(voiceWebIntent('directions home',{homeAddress:home}).url).searchParams.get('destination'),home);
assert.equal(new URL(voiceWebIntent('directions to Stanford',{homeAddress:home}).url).searchParams.get('origin'),home);
assert.equal(new URL(voiceWebIntent('directions from home to Stanford',{homeAddress:home}).url).searchParams.get('origin'),home);
