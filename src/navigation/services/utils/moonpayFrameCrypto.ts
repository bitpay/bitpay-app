/**
 * Crypto utilities for MoonPay Frames protocol (check / connect frames).
 *
 * The check/connect frames return encrypted client credentials over postMessage.
 * We generate an ephemeral X25519 keypair, pass the public key to the frame URL,
 * and use the private key to decrypt the payload when it arrives.
 *
 * Encryption scheme used by MoonPay:
 *   - Key agreement : X25519 ECDH  (@noble/curves)
 *   - KDF           : HKDF-SHA256  (@noble/hashes)
 *   - Cipher        : AES-128-GCM  (@noble/ciphers)
 *
 * Reference: https://moonpay.mintlify.app/guides/manual-integration/react-native
 *
 * IMPORTANT: The private key must be held in memory only for the duration of the
 * session and must never be persisted to disk or storage.
 */

// react-native-get-random-values is already polyfilled in index.js,
// but the import below is kept as an explicit safety net so this module
// works even if the call-site changes.
import 'react-native-get-random-values';
import {x25519} from '@noble/curves/ed25519';
import {hkdf} from '@noble/hashes/hkdf';
import {sha256} from '@noble/hashes/sha2';
import {gcm} from '@noble/ciphers/aes';
import {bytesToHex, hexToBytes} from '@noble/hashes/utils';

export interface MoonpayKeyPair {
  privateKeyHex: string;
  publicKeyHex: string;
}

export interface MoonpayClientCredentials {
  accessToken: string;
  clientToken: string;
  expiresAt?: string; // ISO timestamp
}

/**
 * Generates an ephemeral X25519 keypair.
 * Store the returned object in component state only – never persist to disk.
 */
export function generateKeyPair(): MoonpayKeyPair {
  // const {secretKey, publicKey} = x25519.keygen();
  const secretKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(secretKey);
  return {
    privateKeyHex: bytesToHex(secretKey),
    publicKeyHex: bytesToHex(publicKey),
  };
}

/**
 * Generates a unique channel ID to identify messages for a given frame session.
 */
export function generateChannelId(): string {
  return `ch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function parseEncryptedValue(encryptedValue: string): {
  ephemeralPublicKey: string;
  iv: string;
  ciphertext: string;
} {
  // 1) Try parse as JSON directly
  try {
    const obj = JSON.parse(encryptedValue);
    if (obj?.ephemeralPublicKey && obj?.iv && obj?.ciphertext) {
      return obj;
    }
  } catch (_) {}

  // 2) If that fails, try decode as base64-encoded JSON (legacy format)
  try {
    const jsonStr = atob(encryptedValue);
    const obj = JSON.parse(jsonStr);
    if (obj?.ephemeralPublicKey && obj?.iv && obj?.ciphertext) {
      return obj;
    }
  } catch (_) {}

  throw new Error(
    'Invalid encryptedValue format: not JSON and not base64(JSON)',
  );
}

/**
 * Decrypts the client credentials returned by the check / connect frame.
 *
 * @param encryptedValue - The stringified JSON object from `payload.credentials`.
 * @param privateKeyHex  - The private key hex from the ephemeral keypair.
 * @returns Decrypted `{ accessToken, clientToken }`.
 */
export function decryptClientCredentials(
  encryptedValue: string,
  privateKeyHex: string,
): MoonpayClientCredentials {
  const encrypted = parseEncryptedValue(encryptedValue);

  const sharedSecret = x25519.getSharedSecret(
    hexToBytes(privateKeyHex),
    hexToBytes(encrypted.ephemeralPublicKey),
  );
  console.log(sharedSecret.length);
  if (sharedSecret.length !== 32)
    throw new Error('Invalid shared secret length');

  const derivedKey = hkdf(
    sha256,
    sharedSecret,
    new Uint8Array([]),
    new Uint8Array([]),
    32,
  );
  const aes = gcm(derivedKey, hexToBytes(encrypted.iv));
  const decrypted = aes.decrypt(hexToBytes(encrypted.ciphertext));
  const text = new TextDecoder().decode(decrypted);

  return JSON.parse(text) as MoonpayClientCredentials;
}
