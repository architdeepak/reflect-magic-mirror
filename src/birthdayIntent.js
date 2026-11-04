// This parser is called only by the finalized wake-word path. Birthday chat,
// calendar questions and ambient conversation cannot launch a celebration.
export function birthdayIntent(value) {
  const text = String(value || '').toLowerCase().replace(/[’']/g, '').replace(/[.!?,]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^mirror\s+(?:mirror|rmiorr)\s+/, '').replace(/^please\s+/, '')
    .replace(/\bit s\b/g, 'its').replace(/\bsahiti s\b/g, 'sahitis');
  const person = '(?:my|sahitis|sahithis|sahitis|sa hiti s|sahiti|sahithi)';
  if (new RegExp(`^(?:(?:its|it is|today is) (?:also )?${person} (?:24th |twenty fourth )?birthday(?: today)?|(?:celebrate|lets celebrate) ${person} (?:24th |twenty fourth )?birthday|(?:start|show|turn on) (?:the )?birthday (?:mode|surprise)(?: for sahiti)?|wish sahiti (?:a )?happy birthday|happy (?:24th )?birthday sahiti)$`).test(text)) {
    return { name: 'Sahiti', age: 24 };
  }
  return null;
}
