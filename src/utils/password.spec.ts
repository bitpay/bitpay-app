import {
  isCommonWeakPassword,
  isBasedOnUserData,
  isLowEntropy,
} from './password';

describe('isCommonWeakPassword', () => {
  it('returns true for empty/short strings', () => {
    expect(isCommonWeakPassword('')).toBe(true);
    expect(isCommonWeakPassword('abc')).toBe(true);
    expect(isCommonWeakPassword('ab')).toBe(true);
  });

  it('returns true for common weak passwords', () => {
    expect(isCommonWeakPassword('password')).toBe(true);
    expect(isCommonWeakPassword('qwerty')).toBe(true);
    expect(isCommonWeakPassword('letmein')).toBe(true);
    expect(isCommonWeakPassword('welcome')).toBe(true);
    expect(isCommonWeakPassword('admin')).toBe(true);
    expect(isCommonWeakPassword('iloveyou')).toBe(true);
    expect(isCommonWeakPassword('dragon')).toBe(true);
    expect(isCommonWeakPassword('monkey')).toBe(true);
    expect(isCommonWeakPassword('login')).toBe(true);
  });

  it('returns true for leet-speak variations of weak base words', () => {
    // normalizeForWeakCheck strips non-alnum and applies leet substitutions
    // p4ssword → p4ssword → onlyAlnum → p4ssword → deLeet(4→a) → password
    expect(isCommonWeakPassword('p4ssword')).toBe(true);
    // 1337 → leet → checks base words
    expect(isCommonWeakPassword('dr4gon')).toBe(true);
  });

  it('returns true for passwords starting with weak words', () => {
    expect(isCommonWeakPassword('password123')).toBe(true);
    expect(isCommonWeakPassword('admin2024')).toBe(true);
  });

  it('returns true when normalized form contains an alphabetic sequential run', () => {
    // 'myabcdpass' → normalized 'myabcdpass' → contains 'abcd' (sequential)
    expect(isCommonWeakPassword('myabcdpass')).toBe(true);
  });

  it('returns false for strong passwords', () => {
    expect(isCommonWeakPassword('X7#mK9@qL')).toBe(false);
    expect(isCommonWeakPassword('correct-horse-battery')).toBe(false);
    expect(isCommonWeakPassword('Tr0ub4dor&3')).toBe(false);
  });
});

describe('isBasedOnUserData', () => {
  it('returns true when password contains email local part', () => {
    expect(
      isBasedOnUserData('johnsmith99', {email: 'johnsmith@example.com'}),
    ).toBe(true);
  });

  it('returns true when password contains given name', () => {
    expect(isBasedOnUserData('alice2024', {givenName: 'Alice'})).toBe(true);
  });

  it('returns true when password contains family name', () => {
    expect(isBasedOnUserData('smithsecure', {familyName: 'Smith'})).toBe(true);
  });

  it('returns false when password does not contain user data', () => {
    expect(
      isBasedOnUserData('X7#mK9@qL', {
        email: 'alice@example.com',
        givenName: 'Alice',
        familyName: 'Smith',
      }),
    ).toBe(false);
  });

  it('ignores user data pieces shorter than 3 chars', () => {
    expect(isBasedOnUserData('abcdef', {givenName: 'ab'})).toBe(false);
    expect(isBasedOnUserData('abcdef', {familyName: 'cd'})).toBe(false);
  });

  it('returns false when no opts are provided', () => {
    expect(isBasedOnUserData('anypassword', {})).toBe(false);
  });
});

describe('isLowEntropy', () => {
  it('returns true when there are 3 or fewer unique characters', () => {
    expect(isLowEntropy('aaa')).toBe(true);
    expect(isLowEntropy('ababab')).toBe(true);
    expect(isLowEntropy('abcabc')).toBe(true);
  });

  it('returns true for long runs of the same character', () => {
    expect(isLowEntropy('aaaaaA1!')).toBe(true);
    expect(isLowEntropy('bbbbb123')).toBe(true);
  });

  it('returns false for high-entropy strings', () => {
    expect(isLowEntropy('X7#mK9@qL')).toBe(false);
    expect(isLowEntropy('Tr0ub4dor&3')).toBe(false);
  });
});
