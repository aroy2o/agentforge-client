const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const digitWords = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  thirty: '30',
};

function normaliseNumberWords(text) {
  const tokens = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  const out = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === 'twenty') {
      const next = tokens[i + 1];
      if (next && Object.prototype.hasOwnProperty.call(digitWords, next)) {
        out.push(`2${digitWords[next]}`);
        i += 1;
      } else {
        out.push('20');
      }
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(digitWords, token)) {
      out.push(digitWords[token]);
      continue;
    }

    out.push(token);
  }

  return out.join(' ');
}

function compactLocalPart(part) {
  const cleaned = normaliseNumberWords(part)
    .replace(/\b(my|email|id|is|address|the|full|and|please)\b/gi, ' ')
    .replace(/[^a-z0-9+_.\s-]/gi, ' ')
    .trim();

  if (!cleaned) return '';
  const pieces = cleaned.split(/\s+/).filter(Boolean);
  const allSingleLetters = pieces.length > 1 && pieces.every((p) => /^[a-z]$/i.test(p));

  if (allSingleLetters) return pieces.join('');
  return pieces.join('');
}

function compactDomainPart(part) {
  return normaliseNumberWords(part)
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.-]/gi, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function extractEmail(text) {
  let working = String(text || '').toLowerCase().trim();
  if (!working) {
    console.log('EMAIL EXTRACTED:', null);
    return null;
  }

  working = working.replace(/at\s+the\s+rate/g, '@');
  working = working.replace(/at\s+the\s+red/g, '@');
  working = working.replace(/at\s+the\s+right/g, '@');
  working = working.replace(/at\s+sign/g, '@');
  working = working.replace(/at\s+rate/g, '@');
  working = working.replace(/at\s+red/g, '@');
  working = working.replace(/dot\s+co\s+dot\s+in/g, '.co.in');
  working = working.replace(/dot\s+com/g, '.com');
  working = working.replace(/dot\s+in/g, '.in');
  working = working.replace(/dot\s+org/g, '.org');
  working = working.replace(/dot\s+net/g, '.net');

  // Convert spoken "at" only when it looks like email local@domain context.
  if (!working.includes('@')) {
    working = working.replace(/([a-z0-9\s._+-]{2,})\sat\s([a-z0-9\s.-]+(?:\.[a-z]{2,}|\sdot\s[a-z]{2,}))/g, '$1 @ $2');
  }

  working = working.replace(/\sdot\s/g, '.');
  working = working.replace(/\s+/g, ' ').trim();

  const match = working.match(/([a-z0-9\s._+-]+)\s*@\s*([a-z0-9\s.-]+\.[a-z]{2,}(?:\.[a-z]{2,})?)/i);
  if (!match) {
    console.log('EMAIL EXTRACTED:', null);
    return null;
  }

  const local = compactLocalPart(match[1]);
  const domain = compactDomainPart(match[2]);
  if (!local) {
    console.log('EMAIL EXTRACTION FAILED - no username found');
    return null;
  }
  const result = `${local}@${domain}`.trim();

  if (result.startsWith('@') || result.split('@')[0].trim().length === 0) {
    console.log('EMAIL EXTRACTION FAILED - no username found');
    return null;
  }

  if (!EMAIL_REGEX.test(result) || result.includes(' ')) {
    console.log('EMAIL EXTRACTED:', null);
    return null;
  }

  console.log('EMAIL EXTRACTED:', result);
  return result;
}
