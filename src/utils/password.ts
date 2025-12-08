import Pbkdf2 from 'pbkdf2';

const WEAK_BASE_WORDS = [
  'password',
  'qwerty',
  'letmein',
  'welcome',
  'admin',
  'iloveyou',
  'dragon',
  'monkey',
  'login',
];

const WEAK_SEQUENCES = [
  '12345',
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  'abc123',
  'abcdef',
];

const normalizeForWeakCheck = (value: string) => {
  const lower = value.toLowerCase();

  const onlyAlnum = lower.replace(/[^a-z0-9]/g, '');

  const deLeet = onlyAlnum
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't');

  return deLeet;
};

const isSequential = (s: string) => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const revAlphabet = alphabet.split('').reverse().join('');
  const revNumbers = numbers.split('').reverse().join('');

  return (
    alphabet.includes(s) ||
    numbers.includes(s) ||
    revAlphabet.includes(s) ||
    revNumbers.includes(s)
  );
};

export const isCommonWeakPassword = (raw: string) => {
  const normalized = normalizeForWeakCheck(raw);

  if (!normalized) return true;

  if (normalized.length < 6) return true;

  if (WEAK_BASE_WORDS.some(w => normalized === w || normalized.startsWith(w))) {
    return true;
  }

  if (WEAK_SEQUENCES.some(s => normalized === s || normalized.startsWith(s))) {
    return true;
  }

  if (/^password[0-9]*$/.test(normalized)) {
    return true;
  }

  for (let len = 4; len <= 6 && len <= normalized.length; len++) {
    for (let i = 0; i + len <= normalized.length; i++) {
      const part = normalized.slice(i, i + len);
      if (isSequential(part)) return true;
    }
  }

  return false;
};

export const isBasedOnUserData = (
  password: string,
  opts: {email?: string; givenName?: string; familyName?: string},
) => {
  const lower = password.toLowerCase();
  const candidates: string[] = [];

  if (opts.email) {
    const [localPart] = opts.email.toLowerCase().split('@');
    candidates.push(localPart);
  }

  if (opts.givenName) candidates.push(opts.givenName.toLowerCase());
  if (opts.familyName) candidates.push(opts.familyName.toLowerCase());

  // Only consider “interesting” pieces (>= 3 chars) to reduce false positives
  return candidates.some(
    piece => piece && piece.length >= 3 && lower.includes(piece),
  );
};

export const isLowEntropy = (value: string) => {
  const trimmed = value.trim();

  // Few distinct chars in the whole string => very weak
  const uniqueChars = new Set(trimmed).size;
  if (uniqueChars <= 3) return true;

  // Long runs of the same character => patterns like aaaaaaaaA1!
  // You can tune the "{4,}" threshold if needed
  if (/(.)\1{4,}/.test(trimmed)) return true;

  return false;
};

export const generateSalt = () => {
  const salt = Pbkdf2.pbkdf2Sync(
    Math.random().toString(),
    Math.random().toString(),
    Math.floor(Math.random() * 30),
    47,
  ).toString('hex');

  return salt;
};

export const hashPassword = (password: string) => {
  const hashedPassword = Pbkdf2.pbkdf2Sync(
    password,
    '..............',
    200,
    64,
  ).toString('hex');

  return hashedPassword;
};
