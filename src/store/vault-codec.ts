// Adapted from the pinned reference's pure codec; no coordinator/recovery code.
import crypto from 'crypto';
import bs58 from 'bs58';
import isEqual from 'lodash.isequal';
import {Network} from '../constants';
import {decodeDetails, vaultDiagnostic, vaultError} from './vault-diagnostics';
import {
  decryptPersistValue,
  decryptValue,
  encryptPersistValue,
  encryptValue,
  hasProtectedValue,
} from './transforms/encrypt';
import {
  unencryptedPersistStores,
  walletProtectedFields,
  identityProtectedFields,
  giftCardProtectedFields,
  walletFieldContext,
  identityFieldContext,
  giftCardFieldContext,
  object,
} from './transforms/persist-encryption';
type Payload = Record<string, any>;
type Snapshot = {raw: string; payload: Payload; format: 'cbc' | 'gcm'};
// SHOP_CATALOG and PORTFOLIO are deliberately retained. The backup writer's
// omission list differs.
const omittedLegacySections = new Set([
  'MARKET_STATS',
  'PORTFOLIO_CHARTS',
  'RATE',
]);

function fail(label: keyof typeof decodeDetails): never {
  // Parser checks are fixed classification sites, never native-message inference.
  throw vaultError(
    'INVALID_LEGACY_INPUT',
    'classify',
    'SOURCE_INVALID',
    undefined,
    decodeDetails[label],
  );
}

// Read-only syntax checks for the two historically unwrapped fields. These do
// not instantiate/normalize wallet clients or unlock inner password ciphertext.
const legacyEddsaValue = (value: string, field: string): boolean => {
  try {
    if (field === 'xPrivKeyEDDSA') {
      const data = Buffer.from(bs58.decode(value));
      if (data.length !== 82 || data[45] !== 0) return false;
      if (![0x0488ade4, 0x04358394].includes(data.readUInt32BE(0)))
        return false;
      const checksum = crypto
        .createHash('sha256')
        .update(
          crypto.createHash('sha256').update(data.subarray(0, 78)).digest(),
        )
        .digest()
        .subarray(0, 4);
      return checksum.equals(data.subarray(78)) && bs58.encode(data) === value;
    }
    const blob = JSON.parse(value);
    if (!object(blob)) return false;
    for (const name of ['ct', 'iv', 'salt']) {
      if (
        typeof blob[name] !== 'string' ||
        !blob[name].length ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(blob[name])
      )
        return false;
    }
    return Buffer.from(blob.ct, 'base64').length >= 16;
  } catch {
    return false;
  }
};

const mapFields = (
  state: Payload,
  reducer: string,
  transform: (value: string, context: string, field: string) => string,
  copy = true,
): Payload => {
  const result = copy ? JSON.parse(JSON.stringify(state)) : state;
  const fields = (
    container: any,
    names: readonly string[],
    context: (name: string) => string,
  ) => {
    if (!object(container)) {
      fail('invalid protected-field container');
    }
    for (const name of names) {
      const value = container[name];
      if (!hasProtectedValue(value)) {
        continue;
      }
      if (typeof value !== 'string') {
        fail('invalid protected-field value');
      }
      container[name] = transform(value, context(name), name);
    }
  };
  if (reducer === 'WALLET' && result.keys != null) {
    if (!object(result.keys)) {
      fail('invalid wallet key map');
    }
    for (const [id, key] of Object.entries(result.keys)) {
      if (!object(key)) {
        fail('invalid wallet key');
      }
      if (key.properties != null) {
        fields(key.properties, walletProtectedFields, field =>
          walletFieldContext(id, field),
        );
      }
    }
  }
  if (reducer === 'APP' && result.identity != null) {
    if (!object(result.identity)) {
      fail('invalid identity map');
    }
    if (result.identity[Network.mainnet] != null) {
      fields(
        result.identity[Network.mainnet],
        identityProtectedFields,
        identityFieldContext,
      );
    }
  }
  if (reducer === 'SHOP' && result.giftCards != null) {
    if (!object(result.giftCards)) {
      fail('invalid gift card map');
    }
    const cards = result.giftCards[Network.mainnet];
    if (cards != null) {
      if (!Array.isArray(cards)) {
        fail('invalid gift card list');
      }
      for (const card of cards) {
        if (!object(card)) {
          fail('invalid gift card');
        }
        fields(card, giftCardProtectedFields, field =>
          giftCardFieldContext(card.invoiceId, field),
        );
      }
    }
  }
  return result;
};

export const decodeSnapshot = (raw: string, secret: string): Snapshot => {
  const outer = JSON.parse(raw);
  if (!object(outer)) {
    fail('expected Redux Persist JSON');
  }
  const kinds = new Set<'cbc' | 'gcm'>();
  let unwrappedEddsa = false;
  // Serialized reducer names must remain own data properties, never setters on
  // Object.prototype (in particular they cannot supply an inherited _persist).
  const payload: Payload = Object.create(null);
  for (const [reducer, encoded] of Object.entries(outer)) {
    if (typeof encoded !== 'string') {
      fail('invalid serialized reducer');
    }
    if (omittedLegacySections.has(reducer)) continue;
    // redux-persist deserializes each value before reversing the transforms.
    const value = JSON.parse(encoded);
    if (typeof value !== 'string') {
      fail('expected transform output to be a string');
    }
    let state: any;
    let wholeCbc = false;
    if (value.startsWith('persist-aesgcm-v1:')) {
      kinds.add('gcm');
      if (kinds.size !== 1) fail('invalid or mixed-format snapshot');
      state = decryptPersistValue(value, secret, `persist:${reducer}`);
    } else if (value.startsWith('U2FsdGVkX1')) {
      kinds.add('cbc');
      if (kinds.size !== 1) fail('invalid or mixed-format snapshot');
      wholeCbc = true;
      state = decryptPersistValue(value, secret, `persist:${reducer}`);
    } else if (unencryptedPersistStores.has(reducer)) {
      state = JSON.parse(value);
    } else {
      fail('unexpected plaintext reducer');
    }
    if (!object(state)) {
      fail('invalid reducer payload');
    }
    payload[reducer] = mapFields(state, reducer, (field, context, name) => {
      if (field.startsWith('encrypted:')) {
        kinds.add('cbc');
      } else if (field.startsWith('field-aesgcm-v1:')) {
        kinds.add('gcm');
      } else if (field.startsWith('persist-aesgcm-v1:')) {
        return fail('invalid protected-field envelope');
      } else if (wholeCbc) {
        return field; // Historical whole-reducer CBC protected these strings.
      } else if (
        reducer === 'WALLET' &&
        ['xPrivKeyEDDSA', 'xPrivKeyEDDSAEncrypted'].includes(name) &&
        legacyEddsaValue(field, name)
      ) {
        // v.14.32.0 omitted these two fields. Only an otherwise validated CBC
        // snapshot can authorize this legacy-only normalization. Inner password
        // ciphertext remains opaque; ordinary modern rehydration stays strict.
        unwrappedEddsa = true;
        return field;
      } else {
        return fail('unexpected plaintext protected field');
      }
      // In particular, a GCM field hidden inside a CBC reducer must never be
      // passed a legacy/device-ID candidate, even for a doomed validation try.
      if (kinds.size !== 1) fail('invalid or mixed-format snapshot');
      const plain = decryptValue(field, secret, context);
      if (typeof plain !== 'string' || plain.length === 0) {
        fail('invalid decrypted field');
      }
      return plain;
    });
  }
  if (
    !object(payload._persist) ||
    typeof payload._persist.version !== 'number' ||
    typeof payload._persist.rehydrated !== 'boolean' ||
    kinds.size !== 1 ||
    (unwrappedEddsa && !kinds.has('cbc'))
  ) {
    fail('invalid or mixed-format snapshot');
  }
  return {raw, payload, format: kinds.has('gcm') ? 'gcm' : 'cbc'};
};

export const encodeSnapshot = (payload: Payload, secret: string): string => {
  const outer: Record<string, string> = Object.create(null);
  for (const [reducer, state] of Object.entries(payload)) {
    const fields = mapFields(state, reducer, (value, context) =>
      encryptValue(value, secret, context),
    );
    outer[reducer] = JSON.stringify(
      unencryptedPersistStores.has(reducer)
        ? JSON.stringify(fields)
        : encryptPersistValue(fields, secret, `persist:${reducer}`),
    );
  }
  return JSON.stringify(outer);
};

// One key must decode the whole source. Selection/iteration belongs to the caller.
export const reencryptSnapshot = (
  raw: string,
  oldKey: string,
  newKey: string,
) => {
  try {
    const source = decodeSnapshot(raw, oldKey);
    const output = encodeSnapshot(source.payload, newKey);
    verifySnapshot(output, output, source.payload, newKey);
    return output;
  } catch (error) {
    throw vaultError(
      'INVALID_LEGACY_INPUT',
      'conversion',
      'SOURCE_INVALID',
      undefined,
      vaultDiagnostic(error as Error)?.detail,
    );
  }
};
export const verifySnapshot = (
  actual: string | null,
  intended: string,
  payload: Payload,
  key: string,
) => {
  try {
    if (actual !== intended || actual === null) throw new Error();
    const decoded = decodeSnapshot(actual, key);
    if (decoded.format !== 'gcm' || !isEqual(decoded.payload, payload))
      throw new Error();
  } catch {
    throw vaultError(
      'REQUIRED_COPY_FAILURE',
      'required-copy',
      'COPY_VERIFICATION',
    );
  }
};
