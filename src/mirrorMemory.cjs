const fs = require('node:fs/promises');
const path = require('node:path');
const START = '<!-- mirror:learned:start -->', END = '<!-- mirror:learned:end -->';
async function readMirrorMemory(jsonPath) {
  let facts = [], markdown = '';
  try { facts = JSON.parse(await fs.readFile(jsonPath, 'utf8')).facts || []; } catch {}
  const markdownPath = path.join(path.dirname(jsonPath), 'MEMORY.md');
  try { markdown = (await fs.readFile(markdownPath, 'utf8')).slice(0, 16000); } catch {}
  return { version: 1, facts: Array.isArray(facts) ? facts.slice(-100) : [], markdown, markdownPath };
}
async function writeMirrorMemory(jsonPath, memory) {
  const facts = memory.facts.slice(-100), markdownPath = path.join(path.dirname(jsonPath), 'MEMORY.md');
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  let markdown = '';
  try { markdown = await fs.readFile(markdownPath, 'utf8'); } catch {}
  const block = `${START}\n${facts.map(item => `- ${String(item.fact).replace(/\r?\n/g, ' ')}`).join('\n')}\n${END}`;
  if (markdown.includes(START) && markdown.includes(END)) markdown = markdown.slice(0, markdown.indexOf(START)) + block + markdown.slice(markdown.indexOf(END) + END.length);
  else markdown = `${markdown.trim() || '# Mirror memory\n\nPersonal facts and preferences explicitly saved for this mirror.'}\n\n${block}\n`;
  for (const [file, text] of [[jsonPath, JSON.stringify({ version: 1, facts }, null, 2) + '\n'], [markdownPath, markdown]]) {
    await fs.writeFile(`${file}.tmp`, text, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(`${file}.tmp`, file);
  }
  return readMirrorMemory(jsonPath);
}
function homeAddress(memory = {}) {
  const fromMarkdown = String(memory.markdown || '').match(/(?:^|\n)\s*(?:-\s*)?home(?:\s+address)?\s*:\s*([^\n]+)/i)?.[1];
  if (fromMarkdown) return fromMarkdown.trim();
  return [...(memory.facts || [])].reverse().find(item => /^home(?:\s+address)?\s*:/i.test(item.fact || ''))?.fact.replace(/^home(?:\s+address)?\s*:\s*/i, '').trim() || '';
}
module.exports = { readMirrorMemory, writeMirrorMemory, homeAddress };
