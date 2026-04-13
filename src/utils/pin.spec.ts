import {validatePin, createPin, verifyAndMigratePin, hashPinLegacy, PIN_CONFIG} from './pin';

describe('PIN_CONFIG', () => {
  it('has expected constants', () => {
    expect(PIN_CONFIG.LENGTH).toBe(4);
    expect(PIN_CONFIG.ATTEMPT_LIMIT).toBe(3);
    expect(PIN_CONFIG.PIN_MAX_VALUE).toBe(9);
    expect(PIN_CONFIG.PIN_MIN_VALUE).toBe(0);
  });
});

describe('validatePin', () => {
  it('rejects empty/missing PIN', () => {
    expect(validatePin('').isValid).toBe(false);
    expect(validatePin(null as any).isValid).toBe(false);
  });

  it('rejects PINs that are not exactly 4 digits', () => {
    expect(validatePin('123').isValid).toBe(false);
    expect(validatePin('12345').isValid).toBe(false);
  });

  it('rejects non-numeric PINs', () => {
    expect(validatePin('12ab').isValid).toBe(false);
    expect(validatePin('ab12').isValid).toBe(false);
  });

  it('rejects all-same-digit PINs', () => {
    expect(validatePin('0000').isValid).toBe(false);
    expect(validatePin('1111').isValid).toBe(false);
    expect(validatePin('9999').isValid).toBe(false);
  });

  it('rejects sequential PINs', () => {
    expect(validatePin('1234').isValid).toBe(false);
    expect(validatePin('4321').isValid).toBe(false);
    expect(validatePin('0123').isValid).toBe(false);
  });

  it('rejects known weak PINs', () => {
    expect(validatePin('1212').isValid).toBe(false);
    expect(validatePin('1004').isValid).toBe(false);
    expect(validatePin('2580').isValid).toBe(false);
  });

  it('accepts a valid strong PIN', () => {
    const result = validatePin('3729');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts other valid PINs', () => {
    expect(validatePin('8472').isValid).toBe(true);
    expect(validatePin('5190').isValid).toBe(true);
  });

  it('returns an errors array with messages for invalid PINs', () => {
    const result = validatePin('1234');
    expect(result.errors.length).toBeGreaterThan(0);
    expect(typeof result.errors[0]).toBe('string');
  });
});

describe('createPin', () => {
  it('returns a salt and hashedPin for a valid PIN', () => {
    const result = createPin('3729');
    expect(result.salt).toBeTruthy();
    expect(result.hashedPin).toBeTruthy();
    expect(typeof result.salt).toBe('string');
    expect(typeof result.hashedPin).toBe('string');
  });

  it('accepts array format', () => {
    const result = createPin(['3', '7', '2', '9']);
    expect(result.salt).toBeTruthy();
    expect(result.hashedPin).toBeTruthy();
  });

  it('throws for a weak PIN', () => {
    expect(() => createPin('1234')).toThrow();
    expect(() => createPin('0000')).toThrow();
  });

  it('skips validation when noVerify is true', () => {
    expect(() => createPin('1234', true)).not.toThrow();
  });

  it('generates a unique salt each call', () => {
    const a = createPin('3729');
    const b = createPin('3729');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hashedPin).not.toBe(b.hashedPin);
  });
});

describe('verifyAndMigratePin', () => {
  it('returns isValid false when no stored hash', () => {
    const result = verifyAndMigratePin('3729', '');
    expect(result.isValid).toBe(false);
    expect(result.needsMigration).toBe(false);
  });

  it('verifies a PBKDF2 (new-format) PIN correctly', () => {
    const {salt, hashedPin} = createPin('3729');
    const result = verifyAndMigratePin('3729', hashedPin, salt);
    expect(result.isValid).toBe(true);
    expect(result.needsMigration).toBe(false);
  });

  it('rejects wrong PIN against PBKDF2 hash', () => {
    const {salt, hashedPin} = createPin('3729');
    const result = verifyAndMigratePin('8472', hashedPin, salt);
    expect(result.isValid).toBe(false);
  });

  it('verifies a legacy SHA-256 PIN and triggers migration', () => {
    const pin = ['3', '7', '2', '9'];
    const legacyHash = hashPinLegacy(pin);
    const result = verifyAndMigratePin('3729', legacyHash);
    expect(result.isValid).toBe(true);
    expect(result.needsMigration).toBe(true);
    expect(result.salt).toBeTruthy();
    expect(result.hashedPin).toBeTruthy();
  });

  it('rejects wrong PIN against legacy hash', () => {
    const pin = ['3', '7', '2', '9'];
    const legacyHash = hashPinLegacy(pin);
    const result = verifyAndMigratePin('8472', legacyHash);
    expect(result.isValid).toBe(false);
    expect(result.needsMigration).toBe(false);
  });

  it('accepts array-format PIN for PBKDF2 verification', () => {
    const {salt, hashedPin} = createPin('3729');
    const result = verifyAndMigratePin(['3', '7', '2', '9'], hashedPin, salt);
    expect(result.isValid).toBe(true);
  });
});
