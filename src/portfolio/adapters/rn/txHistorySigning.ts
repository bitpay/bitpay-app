import {Buffer as NodeBuffer} from 'buffer';
import processPolyfill from 'process';
import type {
  NitroRequest as NitroFetchRequest,
  NitroResponse as NitroFetchResponse,
} from 'react-native-nitro-fetch';

export type QuickCryptoHashHybrid = {
  createHash(algorithm: string, outputLength?: number): void;
  update(data: ArrayBuffer | string): void;
  digest(encoding?: string): ArrayBuffer;
};

export type QuickCryptoKeyObjectHybrid = {
  init(
    keyType: number,
    key: string | ArrayBuffer,
    format?: number,
    type?: number,
    passphrase?: ArrayBuffer,
  ): boolean;
};

export type QuickCryptoSignHybrid = {
  init(algorithm: string): void;
  update(data: ArrayBuffer): void;
  sign(
    keyHandle: QuickCryptoKeyObjectHybrid,
    padding?: number,
    saltLength?: number,
    dsaEncoding?: number,
  ): ArrayBuffer;
};

export type QuickCryptoEnums = {
  KeyType: {
    PRIVATE: number;
  };
  KFormatType: {
    DER: number;
  };
  KeyEncoding: {
    SEC1: number;
  };
};

type NitroModulesLike = {
  createHybridObject<T = unknown>(name: string): T;
  box?<T = unknown>(obj: T): BoxedHybridObjectLike<T>;
};

type TransferredNitroBwsSigningBatchHybrids = {
  firstHash: QuickCryptoHashHybrid;
  signHandles: QuickCryptoSignHybrid[];
  privateKeyHandle: QuickCryptoKeyObjectHybrid;
};

type BoxedHybridObjectLike<T> = {
  unbox(): T;
};

type NitroFetchClientHybrid = {
  request(req: NitroFetchRequest): Promise<NitroFetchResponse>;
  requestSync(req: NitroFetchRequest): NitroFetchResponse;
};

type NitroFetchHybrid = {
  createClient(): NitroFetchClientHybrid;
};

// Minimal tx-history signing authority. This is still sensitive signing
// authority, so it must stay in narrow request/job-owned contexts only.
export type PortfolioTxHistorySigningAuthority = {
  kind: 'sec1DerHex';
  sec1DerHex: string;
};

export type PortfolioTxHistorySigningDispatchContext = {
  requestCount?: number;
  signingAuthority?: PortfolioTxHistorySigningAuthority;
  boxedNitroModulesProxy?: BoxedHybridObjectLike<NitroModulesLike>;
  boxedNitroFetch?: BoxedHybridObjectLike<NitroFetchHybrid>;
  nitroFetchClient?: NitroFetchClientHybrid;
  firstHashHybrid?: QuickCryptoHashHybrid;
  signHandleHybrids?: QuickCryptoSignHybrid[];
  privateKeyHandle?: QuickCryptoKeyObjectHybrid;
  nextSignHandleIndex?: number;
};

type GlobalWithPortfolioSigningContext = typeof globalThis & {
  __bitpayPortfolioTxHistorySigningContextV1__?: PortfolioTxHistorySigningDispatchContext | null;
  __bitpayPortfolioBitcoreLibV1__?: any;
  NitroModulesProxy?: NitroModulesLike;
};

const PORTFOLIO_TX_HISTORY_SIGNING_CONTEXT_GLOBAL_KEY =
  '__bitpayPortfolioTxHistorySigningContextV1__';
const SECP256K1_CURVE_ORDER_HEX =
  'fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141';
const SECP256K1_CURVE_HALF_ORDER_HEX =
  '7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0';
export const DEFAULT_PORTFOLIO_NITRO_FETCH_TIMEOUT_MS = 15000;
const QUICK_CRYPTO_ENUMS: QuickCryptoEnums = {
  KeyType: {
    PRIVATE: 2,
  },
  KFormatType: {
    DER: 0,
  },
  KeyEncoding: {
    SEC1: 3,
  },
};
let sharedBoxedNitroFetchOnJS:
  | BoxedHybridObjectLike<NitroFetchHybrid>
  | undefined;
let sharedBoxedNitroModulesProxyOnJS:
  | BoxedHybridObjectLike<NitroModulesLike>
  | undefined;

function getBitcoreLibOnJS(): any {
  const globalRef = globalThis as GlobalWithPortfolioSigningContext;
  const cacheMiss = !globalRef.__bitpayPortfolioBitcoreLibV1__;
  if (cacheMiss) {
    const importedBitcoreLib = require('@bitpay-labs/bitcore-lib') as any;
    globalRef.__bitpayPortfolioBitcoreLibV1__ =
      importedBitcoreLib?.default || importedBitcoreLib;
  }

  const bitcoreLib = globalRef.__bitpayPortfolioBitcoreLibV1__;
  if (!bitcoreLib?.PrivateKey) {
    throw new Error('@bitpay-labs/bitcore-lib is unavailable on the RN host.');
  }

  return bitcoreLib;
}

function getNitroModulesOnJS(): NitroModulesLike {
  const importedNitroModules = require('react-native-nitro-modules') as any;
  const nitroModules =
    importedNitroModules?.NitroModules ||
    importedNitroModules?.default?.NitroModules;

  if (typeof nitroModules?.createHybridObject !== 'function') {
    throw new Error(
      'react-native-nitro-modules.NitroModules.createHybridObject() is unavailable on the RN host.',
    );
  }

  return nitroModules as NitroModulesLike;
}

function getNitroModulesForRN(): NitroModulesLike {
  'worklet';

  const nitroModules = (globalThis as GlobalWithPortfolioSigningContext)
    .NitroModulesProxy;
  if (typeof nitroModules?.createHybridObject === 'function') {
    return nitroModules as NitroModulesLike;
  }

  // Jest and other host-only environments exercise these helpers on the JS
  // thread without a dedicated worklet runtime. Fall back to the host module
  // when CommonJS is actually available there.
  if (typeof require === 'function') {
    return getNitroModulesOnJS();
  }

  throw new Error(
    'react-native-nitro-modules.NitroModules.createHybridObject() is unavailable on the RN runtime.',
  );
}

function createQuickCryptoHashHybridOnRN(): QuickCryptoHashHybrid {
  'worklet';

  return getNitroModulesForRN().createHybridObject<QuickCryptoHashHybrid>(
    'Hash',
  );
}

function createQuickCryptoKeyObjectHybridOnRN(): QuickCryptoKeyObjectHybrid {
  'worklet';

  return getNitroModulesForRN().createHybridObject<QuickCryptoKeyObjectHybrid>(
    'KeyObjectHandle',
  );
}

function createQuickCryptoSignHybridOnRN(): QuickCryptoSignHybrid {
  'worklet';

  return getNitroModulesForRN().createHybridObject<QuickCryptoSignHybrid>(
    'SignHandle',
  );
}

function getSharedBoxedNitroFetchOnJS(): BoxedHybridObjectLike<NitroFetchHybrid> {
  const cacheMiss = !sharedBoxedNitroFetchOnJS;
  if (cacheMiss) {
    const nitroModules = getNitroModulesOnJS();
    if (typeof nitroModules.box !== 'function') {
      throw new Error(
        'react-native-nitro-modules.NitroModules.box() is unavailable on the RN host.',
      );
    }

    const {NitroFetch: nitroFetchSingleton} =
      require('react-native-nitro-fetch') as {
        NitroFetch: NitroFetchHybrid;
      };

    sharedBoxedNitroFetchOnJS = nitroModules.box(nitroFetchSingleton);
  }

  return sharedBoxedNitroFetchOnJS;
}

function getSharedBoxedNitroModulesProxyOnJS(): BoxedHybridObjectLike<NitroModulesLike> {
  const cacheMiss = !sharedBoxedNitroModulesProxyOnJS;
  if (cacheMiss) {
    const nitroModules = getNitroModulesOnJS();
    if (typeof nitroModules.box !== 'function') {
      throw new Error(
        'react-native-nitro-modules.NitroModules.box() is unavailable on the RN host.',
      );
    }

    sharedBoxedNitroModulesProxyOnJS = nitroModules.box(nitroModules);
  }

  return sharedBoxedNitroModulesProxyOnJS;
}

function installPortfolioNitroModulesProxyOnRuntime(
  boxedNitroModulesProxy: BoxedHybridObjectLike<NitroModulesLike> | undefined,
): void {
  'worklet';

  if (!boxedNitroModulesProxy) {
    return;
  }

  const globalRef = globalThis as GlobalWithPortfolioSigningContext;
  if (typeof globalRef.NitroModulesProxy?.createHybridObject === 'function') {
    return;
  }

  globalRef.NitroModulesProxy = boxedNitroModulesProxy.unbox();
}

function getQuickCryptoEnumsForRN(): QuickCryptoEnums {
  'worklet';

  if (
    typeof QUICK_CRYPTO_ENUMS.KeyType?.PRIVATE !== 'number' ||
    typeof QUICK_CRYPTO_ENUMS.KFormatType?.DER !== 'number' ||
    typeof QUICK_CRYPTO_ENUMS.KeyEncoding?.SEC1 !== 'number'
  ) {
    throw new Error(
      'react-native-quick-crypto key import enums are unavailable on the RN runtime.',
    );
  }

  return QUICK_CRYPTO_ENUMS;
}

export function ensurePortfolioRuntimeSigningGlobals(): void {
  'worklet';

  const globalRef = globalThis as any;

  if (!globalRef.global) {
    globalRef.global = globalRef;
  }
  if (!globalRef.self) {
    globalRef.self = globalRef;
  }
  if (!globalRef.window) {
    globalRef.window = globalRef;
  }
  if (
    !globalRef.Buffer &&
    typeof (NodeBuffer as {from?: unknown})?.from === 'function'
  ) {
    globalRef.Buffer = NodeBuffer;
  }
  if (!globalRef.process) {
    globalRef.process = processPolyfill;
  }

  const processRef = globalRef.process as typeof processPolyfill;
  if (typeof processRef.browser === 'undefined') {
    processRef.browser = true;
  }
}

function bytesToHex(bytes: ArrayLike<number>): string {
  'worklet';

  let hex = '';

  for (let index = 0; index < bytes.length; index += 1) {
    hex += Number(bytes[index]).toString(16).padStart(2, '0');
  }

  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  'worklet';

  const normalizedHex = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalizedHex.length / 2);

  for (let index = 0; index < normalizedHex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(
      normalizedHex.slice(index, index + 2),
      16,
    );
  }

  return bytes;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  'worklet';

  let totalLength = 0;
  for (const part of parts) {
    totalLength += part.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function uint8ArrayToArrayBuffer(view: Uint8Array): ArrayBuffer {
  'worklet';

  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
}

function buildSecp256k1Sec1PrivateKeyDer(
  privateKeyBytes: ArrayLike<number>,
): Uint8Array {
  'worklet';

  if (privateKeyBytes.length !== 32) {
    throw new Error(
      `Expected a 32-byte secp256k1 private key, received ${privateKeyBytes.length} bytes.`,
    );
  }

  return concatBytes(
    Uint8Array.from([0x30, 0x2e, 0x02, 0x01, 0x01, 0x04, 0x20]),
    Uint8Array.from(privateKeyBytes),
    Uint8Array.from([0xa0, 0x07, 0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x0a]),
  );
}

function buildRequestPrivKeySec1DerHexOnJS(requestPrivKey: string): string {
  const bitcore = getBitcoreLibOnJS();
  const privateKey = new bitcore.PrivateKey(requestPrivKey);
  const privateKeyBytes = Uint8Array.from(privateKey.toBuffer());

  return bytesToHex(buildSecp256k1Sec1PrivateKeyDer(privateKeyBytes));
}

function createTransferredNitroBwsSigningBatchOnRN(
  signingSec1DerHex: string,
  requestCount: number,
): TransferredNitroBwsSigningBatchHybrids {
  'worklet';

  const {KeyType, KFormatType, KeyEncoding} = getQuickCryptoEnumsForRN();
  const sec1DerHex = String(signingSec1DerHex || '').trim();
  if (!sec1DerHex) {
    throw new Error(
      'A SEC1 DER-encoded request private key is required to hydrate Nitro signing handles.',
    );
  }

  const firstHash = createQuickCryptoHashHybridOnRN();
  const privateKeyHandle = createQuickCryptoKeyObjectHybridOnRN();
  const signHandles: QuickCryptoSignHybrid[] = [];

  const initialized = privateKeyHandle.init(
    KeyType.PRIVATE,
    uint8ArrayToArrayBuffer(hexToBytes(sec1DerHex)),
    KFormatType.DER,
    KeyEncoding.SEC1,
  );

  if (!initialized) {
    throw new Error(
      'QuickCrypto KeyObjectHandle.init() returned false for the secp256k1 request key.',
    );
  }

  while (signHandles.length < Math.max(1, Math.floor(requestCount))) {
    signHandles.push(createQuickCryptoSignHybridOnRN());
  }

  return {
    firstHash,
    signHandles,
    privateKeyHandle,
  };
}

export function derivePortfolioTxHistorySigningAuthorityOnRN(args: {
  requestPrivKey?: string;
}): PortfolioTxHistorySigningAuthority | undefined {
  let requestPrivKey = String(args.requestPrivKey || '').trim();
  if (!requestPrivKey) {
    return undefined;
  }

  try {
    return {
      kind: 'sec1DerHex',
      sec1DerHex: buildRequestPrivKeySec1DerHexOnJS(requestPrivKey),
    };
  } finally {
    requestPrivKey = '';
  }
}

export function createPortfolioTxHistorySigningDispatchContextOnRN(args: {
  signingAuthority?: PortfolioTxHistorySigningAuthority;
  requestCount?: number;
}): PortfolioTxHistorySigningDispatchContext {
  const boxedNitroModulesProxy = getSharedBoxedNitroModulesProxyOnJS();
  const boxedNitroFetch = getSharedBoxedNitroFetchOnJS();
  const requestCount = Math.max(1, Math.floor(args.requestCount ?? 4));
  const sec1DerHex =
    args.signingAuthority?.kind === 'sec1DerHex'
      ? String(args.signingAuthority.sec1DerHex || '').trim()
      : '';

  const context: PortfolioTxHistorySigningDispatchContext = {
    requestCount,
    boxedNitroModulesProxy,
    boxedNitroFetch,
    nextSignHandleIndex: 0,
  };
  if (sec1DerHex) {
    context.signingAuthority = {kind: 'sec1DerHex', sec1DerHex};
  }

  return context;
}

function clearHydratedPortfolioTxHistorySigningHandles(
  context: PortfolioTxHistorySigningDispatchContext,
): void {
  'worklet';

  if (Array.isArray(context.signHandleHybrids)) {
    context.signHandleHybrids.length = 0;
  }

  delete context.firstHashHybrid;
  delete context.signHandleHybrids;
  delete context.privateKeyHandle;
  delete context.nextSignHandleIndex;
}

export function disposePortfolioTxHistorySigningDispatchContext(
  context: PortfolioTxHistorySigningDispatchContext | null | undefined,
): void {
  'worklet';

  if (!context) {
    return;
  }

  delete context.signingAuthority;
  clearHydratedPortfolioTxHistorySigningHandles(context);
  delete context.nitroFetchClient;
  delete context.boxedNitroFetch;
  delete context.boxedNitroModulesProxy;
  delete context.requestCount;
}

export function portfolioTxHistorySigningDispatchContextHasSigningAuthority(
  context: PortfolioTxHistorySigningDispatchContext | undefined,
): boolean {
  'worklet';

  if (!context) {
    return false;
  }

  const hasPreHydrationAuthority =
    context.signingAuthority?.kind === 'sec1DerHex' &&
    !!String(context.signingAuthority.sec1DerHex || '').trim();
  const hasHydratedAuthority =
    !!context.firstHashHybrid &&
    !!context.privateKeyHandle &&
    Array.isArray(context.signHandleHybrids) &&
    context.signHandleHybrids.length > 0;

  return hasPreHydrationAuthority || hasHydratedAuthority;
}

function ensurePortfolioTxHistorySigningHandlesHydratedOnRuntime(
  context: PortfolioTxHistorySigningDispatchContext,
): PortfolioTxHistorySigningDispatchContext {
  'worklet';

  const needsTransferredNitroBatch =
    !context.firstHashHybrid ||
    !context.privateKeyHandle ||
    !Array.isArray(context.signHandleHybrids) ||
    !context.signHandleHybrids.length;

  if (needsTransferredNitroBatch) {
    const sec1DerHex =
      context.signingAuthority?.kind === 'sec1DerHex'
        ? String(context.signingAuthority.sec1DerHex || '').trim()
        : '';
    if (!sec1DerHex) {
      throw new Error(
        'No SEC1 DER-encoded request private key is available on the portfolio runtime for Nitro signing hydration.',
      );
    }

    let hydrated = false;
    try {
      const hybrids = createTransferredNitroBwsSigningBatchOnRN(
        sec1DerHex,
        context.requestCount ?? 4,
      );

      context.firstHashHybrid = hybrids.firstHash;
      context.signHandleHybrids = hybrids.signHandles;
      context.privateKeyHandle = hybrids.privateKeyHandle;
      hydrated = true;
    } finally {
      delete context.signingAuthority;
      if (!hydrated) {
        clearHydratedPortfolioTxHistorySigningHandles(context);
      }
    }
  }

  context.nextSignHandleIndex = Math.max(
    0,
    Math.floor(context.nextSignHandleIndex ?? 0),
  );

  return context;
}

function parseDerSignature(signatureHex: string): {r: bigint; s: bigint} {
  'worklet';

  const signatureBytes = hexToBytes(signatureHex);
  if (signatureBytes.length < 8) {
    throw new Error(
      `Expected a DER-encoded ECDSA signature, received ${signatureBytes.length} bytes.`,
    );
  }

  if (signatureBytes[0] !== 0x30) {
    throw new Error(
      `Expected DER sequence prefix 0x30, received 0x${signatureBytes[0].toString(
        16,
      )}.`,
    );
  }

  const sequenceLength = signatureBytes[1];
  if (sequenceLength !== signatureBytes.length - 2) {
    throw new Error(
      `Unexpected DER sequence length ${sequenceLength}; actual payload length is ${
        signatureBytes.length - 2
      }.`,
    );
  }

  if (signatureBytes[2] !== 0x02) {
    throw new Error(
      `Expected DER integer marker for r, received 0x${signatureBytes[2].toString(
        16,
      )}.`,
    );
  }

  const rLength = signatureBytes[3];
  const rStart = 4;
  const rEnd = rStart + rLength;

  if (signatureBytes[rEnd] !== 0x02) {
    throw new Error(
      `Expected DER integer marker for s, received 0x${signatureBytes[
        rEnd
      ].toString(16)}.`,
    );
  }

  const sLength = signatureBytes[rEnd + 1];
  const sStart = rEnd + 2;
  const sEnd = sStart + sLength;

  if (sEnd !== signatureBytes.length) {
    throw new Error(
      `Unexpected DER signature tail length ${signatureBytes.length - sEnd}.`,
    );
  }

  const rBytes = signatureBytes.subarray(rStart, rEnd);
  const sBytes = signatureBytes.subarray(sStart, sEnd);

  if (!rBytes.length || !sBytes.length) {
    throw new Error('DER signature is missing an r or s component.');
  }

  return {
    r: BigInt(`0x${bytesToHex(rBytes)}`),
    s: BigInt(`0x${bytesToHex(sBytes)}`),
  };
}

function encodeDerInteger(value: bigint): Uint8Array {
  'worklet';

  if (value < 0n) {
    throw new Error('DER integer encoding only supports non-negative values.');
  }

  let hex = value.toString(16);
  if (hex.length % 2 !== 0) {
    hex = `0${hex}`;
  }

  let bytes = hex.length > 0 ? hexToBytes(hex) : Uint8Array.of(0x00);

  while (bytes.length > 1 && bytes[0] === 0x00 && bytes[1] < 0x80) {
    bytes = bytes.subarray(1);
  }

  if (bytes[0] >= 0x80) {
    bytes = concatBytes(Uint8Array.of(0x00), bytes);
  }

  return bytes;
}

function encodeDerSignature(r: bigint, s: bigint): string {
  'worklet';

  const rBytes = encodeDerInteger(r);
  const sBytes = encodeDerInteger(s);
  const totalLength = 2 + rBytes.length + 2 + sBytes.length;

  if (totalLength >= 0x80) {
    throw new Error(
      `DER signature payload is too large to encode (${totalLength} bytes).`,
    );
  }

  return bytesToHex(
    concatBytes(
      Uint8Array.of(0x30, totalLength, 0x02, rBytes.length),
      rBytes,
      Uint8Array.of(0x02, sBytes.length),
      sBytes,
    ),
  );
}

function normalizeSecp256k1LowSSignatureHex(signatureHex: string): string {
  'worklet';

  const {r, s} = parseDerSignature(signatureHex);
  const curveHalfOrder = BigInt(`0x${SECP256K1_CURVE_HALF_ORDER_HEX}`);

  if (s <= curveHalfOrder) {
    return signatureHex;
  }

  const curveOrder = BigInt(`0x${SECP256K1_CURVE_ORDER_HEX}`);
  return encodeDerSignature(r, curveOrder - s);
}

export function signBwsGetRequestWithTransferredNitro(
  requestPath: string,
  firstHashHybrid: QuickCryptoHashHybrid,
  signHandleHybrid: QuickCryptoSignHybrid,
  privateKeyHandle: QuickCryptoKeyObjectHybrid,
): string {
  'worklet';

  ensurePortfolioRuntimeSigningGlobals();

  const signingMessage = `get|${requestPath}|{}`;

  firstHashHybrid.createHash('sha256');
  firstHashHybrid.update(signingMessage);
  const sha256Once = firstHashHybrid.digest();

  signHandleHybrid.init('sha256');
  signHandleHybrid.update(sha256Once);

  const rawNitroSignatureHex = bytesToHex(
    new Uint8Array(
      signHandleHybrid.sign(privateKeyHandle, undefined, undefined, 0),
    ),
  );

  return normalizeSecp256k1LowSSignatureHex(rawNitroSignatureHex);
}

export function setPortfolioTxHistorySigningDispatchContextOnRuntime(
  context: PortfolioTxHistorySigningDispatchContext | null | undefined,
): void {
  'worklet';

  // The runtime global is a borrowed pointer. Its owner is the request
  // dispatch context or populate job wallet context, which disposes it.
  installPortfolioNitroModulesProxyOnRuntime(context?.boxedNitroModulesProxy);
  (globalThis as GlobalWithPortfolioSigningContext)[
    PORTFOLIO_TX_HISTORY_SIGNING_CONTEXT_GLOBAL_KEY
  ] = context || undefined;
}

export function clearPortfolioTxHistorySigningDispatchContextOnRuntime(): void {
  'worklet';

  delete (globalThis as GlobalWithPortfolioSigningContext)[
    PORTFOLIO_TX_HISTORY_SIGNING_CONTEXT_GLOBAL_KEY
  ];
}

export function getPortfolioTxHistorySigningDispatchContextOnRuntime():
  | PortfolioTxHistorySigningDispatchContext
  | undefined {
  'worklet';

  return (globalThis as GlobalWithPortfolioSigningContext)[
    PORTFOLIO_TX_HISTORY_SIGNING_CONTEXT_GLOBAL_KEY
  ] as PortfolioTxHistorySigningDispatchContext | undefined;
}

export function requirePortfolioTxHistorySigningDispatchContextOnRuntime(): PortfolioTxHistorySigningDispatchContext {
  'worklet';

  const context = getPortfolioTxHistorySigningDispatchContextOnRuntime();
  if (!context) {
    throw new Error(
      'No portfolio runtime request context is initialized on the worklet runtime.',
    );
  }

  context.nextSignHandleIndex = Math.max(
    0,
    Math.floor(context.nextSignHandleIndex ?? 0),
  );

  return context;
}

export function getPortfolioNitroFetchClientOnRuntime(): NitroFetchClientHybrid {
  'worklet';

  const context = requirePortfolioTxHistorySigningDispatchContextOnRuntime();
  if (context.nitroFetchClient) {
    return context.nitroFetchClient;
  }

  if (!context.boxedNitroFetch) {
    throw new Error(
      'No transferred Nitro Fetch handle is initialized on the portfolio runtime.',
    );
  }

  const nitroFetch = context.boxedNitroFetch.unbox();
  const client = nitroFetch.createClient();
  context.nitroFetchClient = client;
  return client;
}

export function takeNextPortfolioTransferredSignHandleOnRuntime(): {
  firstHashHybrid: QuickCryptoHashHybrid;
  signHandleHybrid: QuickCryptoSignHybrid;
  privateKeyHandle: QuickCryptoKeyObjectHybrid;
} | null {
  'worklet';

  const context = ensurePortfolioTxHistorySigningHandlesHydratedOnRuntime(
    requirePortfolioTxHistorySigningDispatchContextOnRuntime(),
  );
  if (
    !context.firstHashHybrid ||
    !context.privateKeyHandle ||
    !Array.isArray(context.signHandleHybrids) ||
    !context.signHandleHybrids.length
  ) {
    return null;
  }

  const rawNextIndex = Math.max(
    0,
    Math.floor(context.nextSignHandleIndex ?? 0),
  );
  const signHandleCount = context.signHandleHybrids.length;
  const nextIndex = signHandleCount > 0 ? rawNextIndex % signHandleCount : 0;
  const signHandleHybrid = context.signHandleHybrids[nextIndex];
  if (!signHandleHybrid) {
    return null;
  }

  context.nextSignHandleIndex = rawNextIndex + 1;

  return {
    firstHashHybrid: context.firstHashHybrid,
    signHandleHybrid,
    privateKeyHandle: context.privateKeyHandle,
  };
}
