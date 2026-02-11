import Pbkdf2 from 'pbkdf2';
import crypto from 'crypto';

/**
 * PIN Security Configuration
 */
export const PIN_CONFIG = {
  LENGTH: 4,
  MIN_ITERATIONS: 1000,
  SALT_LENGTH: 32,
  KEY_LENGTH: 32,
  PIN_MAX_VALUE: 9,
  PIN_MIN_VALUE: 0,
  PIN_LENGTH: 4,
  ATTEMPT_LIMIT: 3,
  ATTEMPT_LOCK_OUT_TIME: 2 * 60,
} as const;

/**
 * Common weak 4-digit PINs to block
 */
const COMMON_WEAK_PINS = [
  '0000',
  '1111',
  '2222',
  '3333',
  '4444',
  '5555',
  '6666',
  '7777',
  '8888',
  '9999',
  '1234',
  '4321',
  '1212',
  '2121',
  '1004',
  '2000',
  '6969',
  '4200',
  '0420',
  '1122',
  '2211',
  '1313',
  '3131',
  '2580', // vertical on keypad
  '1470',
  '3690', // other keypad patterns
  '0007',
  '2580',
  '1379', // common patterns
];

/**
 * Check if PIN contains only sequential digits
 */
const isSequentialPin = (pin: string): boolean => {
  const ascending = ['0123', '1234', '2345', '3456', '4567', '5678', '6789'];
  const descending = ascending.map(s => s.split('').reverse().join(''));
  return [...ascending, ...descending].includes(pin);
};

/**
 * Check if PIN is all repeating digits
 */
const isRepeatingPin = (pin: string): boolean => {
  return /^(\d)\1{3}$/.test(pin);
};

/**
 * Validate PIN format and strength
 *
 * @param pin - 4-digit PIN string
 * @returns Object with validation result and error messages
 */
export const validatePin = (
  pin: string,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Format validation
  if (!pin || pin.length !== PIN_CONFIG.LENGTH) {
    errors.push(`PIN must be exactly ${PIN_CONFIG.LENGTH} digits`);
    return {isValid: false, errors};
  }

  if (!new RegExp(`^\\d{${PIN_CONFIG.LENGTH}}$`).test(pin)) {
    errors.push('PIN must contain only numbers');
    return {isValid: false, errors};
  }

  // Strength validation
  if (isRepeatingPin(pin)) {
    errors.push('PIN cannot be all the same digit');
  }

  if (isSequentialPin(pin)) {
    errors.push('PIN cannot be a sequential pattern');
  }

  if (COMMON_WEAK_PINS.includes(pin)) {
    errors.push(
      'This PIN is too common and easy to guess. Please choose a less common PIN.',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Uses a CSPRNG sources
 *
 * @returns Hex-encoded salt string
 */
const generatePinSalt = (): string => {
  // Generate salt bytes directly from a cryptographically secure PRNG
  return crypto.randomBytes(PIN_CONFIG.SALT_LENGTH).toString('hex');
};

/**
 * Hash a PIN with PBKDF2
 *
 * @param pin - 4-digit PIN string
 * @param salt - Salt for hashing (generates new one if not provided)
 * @returns String containing hash
 */
const hashPin = (pin: string | string[], salt: string) => {
  const pinString = Array.isArray(pin) ? pin.join('') : pin;
  const pinSalt = salt || generatePinSalt();

  try {
    const hash = Pbkdf2.pbkdf2Sync(
      pinString,
      pinSalt,
      PIN_CONFIG.MIN_ITERATIONS,
      PIN_CONFIG.KEY_LENGTH,
      'sha256',
    ).toString('hex');

    return hash;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to hash PIN: ${message}`);
  }
};

// Legacy hash function (SHA-256) - kept for migration compatibility
export const hashPinLegacy = (pin: string[]) => {
  const hash = crypto.createHash('sha256');
  hash.update(pin.join(''));
  return hash.digest('hex');
};

// Setup PIN to new PBKDF2 hash
export const createPin = (
  currentPin: string | string[],
  noVerify: boolean = false,
) => {
  if (!noVerify) {
    // Validate PIN format and strength (skip if noVerify is true for migration)
    const pinString = Array.isArray(currentPin)
      ? currentPin.join('')
      : currentPin;
    const {isValid, errors} = validatePin(pinString);
    if (!isValid) {
      throw new Error(errors.join('; '));
    }
  }

  // Generate new salt and hash with improved security (PBKDF2)
  const newSalt = generatePinSalt();
  // Skip PIN validation since legacy PIN was saved without it, but still enforce format for new hash
  const newHashedPin = hashPin(currentPin, newSalt);

  return {
    salt: newSalt,
    hashedPin: newHashedPin,
  };
};

/**
 * Verifies the entered PIN against the stored hash. If the stored hash is using the legacy SHA-256 method (no salt),
 * it will verify against that and then migrate to the new PBKDF2 method if valid.
 *
 * @param enteredPin - The PIN entered by the user (string or array format)
 * @param storedHash - The stored hash of the PIN (either legacy SHA-256 or new PBKDF2)
 * @param storedSalt - The salt used for the stored hash (undefined if legacy)
 */
export const verifyAndMigratePin = (
  enteredPin: string | string[],
  storedHash: string,
  storedSalt?: string,
) => {
  // check if storedFash is undefined or empty string, if so return invalid immediately
  if (!storedHash) {
    return {
      isValid: false,
      needsMigration: false,
      salt: undefined,
      hashedPin: undefined,
    };
  }

  // If salt exists, PIN has been migrated - use PBKDF2 verification
  if (storedSalt) {
    const computedHash = hashPin(enteredPin, storedSalt);
    // Use timing-safe comparison to prevent timing attacks
    const isValid = timingSafeEqual(computedHash, storedHash);

    return {
      isValid,
      needsMigration: false,
      salt: storedSalt,
      hashedPin: storedHash,
    };
  }

  // No salt = legacy SHA-256 hash - verify and migrate
  const pinArray = Array.isArray(enteredPin)
    ? enteredPin
    : enteredPin.split('');
  const legacyHash = hashPinLegacy(pinArray);
  const isValid = legacyHash === storedHash;

  if (!isValid) {
    return {
      isValid: false,
      needsMigration: false,
      salt: undefined,
      hashedPin: undefined,
    };
  }

  // Valid legacy PIN - migrate it now
  const {salt, hashedPin} = createPin(enteredPin, true);

  return {
    isValid: true,
    needsMigration: true,
    salt,
    hashedPin,
  };
};

/**
 * Constant-time comparison to prevent timing attacks
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
};
