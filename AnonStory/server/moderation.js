// Lightweight safety layer. The original app advertises AI moderation that
// drops bullying/harassment before it reaches the inbox; this is a
// deterministic stand-in: normalise the text (case, leetspeak, repeated
// letters, spacing) and match it against a blocklist of phrases.

const BLOCKED_PHRASES = [
  'kill yourself',
  'kys',
  'go die',
  'end yourself',
  'unalive yourself',
  'nobody likes you',
  'everyone hates you',
  'you should die',
  'i will find you',
  'i know where you live',
  'send nudes',
];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', '@': 'a', $: 's' };

function normalise(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[013457@$]/g, (c) => LEET[c])
    .replace(/[^a-z\s]/g, ' ')
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    // re-join words spelled out letter by letter: "k y s" -> "kys"
    .replace(/\b[a-z](?: [a-z]\b)+/g, (m) => m.replace(/ /g, ''));
}

// Returns null when the message is allowed, otherwise a short reason code.
function check(text) {
  const norm = normalise(text);
  const padded = ` ${norm} `;
  const squashed = norm.replace(/ /g, '');
  for (const phrase of BLOCKED_PHRASES) {
    if (padded.includes(` ${phrase} `) || (phrase.length > 4 && squashed.includes(phrase.replace(/ /g, '')))) {
      return 'harassment';
    }
  }
  return null;
}

module.exports = { check, normalise, BLOCKED_PHRASES };
