import isEqual from 'lodash.isequal';
import {decodeSnapshot, reencryptSnapshot, verifySnapshot} from './vault-codec';
import {safeVaultError, vaultError} from './vault-diagnostics';
import {LEGACY_RETIREMENT_ENABLED} from './vault-retirement-policy';
import {object} from './transforms/persist-encryption';

export const sourceSlots = ['mmkv', 'async', 'main', 'bak'] as const;
export const destinationSlots = ['root', 'main', 'bak'] as const;
export const retirementSlots = [
  'data',
  'crc',
  'async',
  'main',
  'bak',
  'temp',
] as const;
type Source = (typeof sourceSlots)[number];
type Destination = (typeof destinationSlots)[number];
type Retirement = (typeof retirementSlots)[number];
export type Inventory = {
  // undefined is an unsuccessful read, never absence. Unknown key inventories
  // cannot authorize retiring an old instance even when its wallet is readable.
  sources: Record<Source, string | null | undefined>;
  files: {data: boolean; crc: boolean};
  keys: string[] | undefined;
};
export type TransferRecord = {
  version: 3;
  layout: 'bitpay.wallet.v2';
  phase: 'preparing' | 'active' | 'retired';
  // All three destinations were observed absent before claiming ownership.
  owned: true;
  copies: Record<Destination, Source | null>;
  release: Record<Retirement, boolean>;
};
export type TransferIO = {
  readControl(): string | null;
  writeControl(raw: string): void;
  modernKeys(): string[];
  modernTempExists(): Promise<boolean>;
  readDestination(slot: Destination): Promise<string | null>;
  destinationExists(slot: 'main' | 'bak'): Promise<boolean>;
  writeDestination(slot: Destination, raw: string): Promise<void>;
  removeDestination(slot: 'main' | 'bak'): Promise<void>;
  inventory(): Promise<Inventory>;
  legacyKeys(): Promise<string[]>;
  modernKey(create: boolean): Promise<string>;
  claimColdRetirement(): boolean;
  sourceExists(slot: Retirement): Promise<boolean>;
  removeSource(slot: Retirement): Promise<void>;
  removeLegacyKey(): Promise<void>;
  pending(): void;
};

const exactKeys = (value: any, keys: readonly string[]) =>
  object(value) && isEqual(Object.keys(value).sort(), [...keys].sort());
const invalid = () =>
  vaultError('STARTUP_FAILURE', 'inventory', 'RECORD_INVALID', 'record');

export const parseTransferRecord = (raw: string): TransferRecord => {
  try {
    if (raw.length > 8192) throw invalid();
    const r = JSON.parse(raw);
    if (
      !exactKeys(r, [
        'version',
        'layout',
        'phase',
        'owned',
        'copies',
        'release',
      ]) ||
      r.version !== 3 ||
      r.layout !== 'bitpay.wallet.v2' ||
      r.owned !== true ||
      !['preparing', 'active', 'retired'].includes(r.phase) ||
      !exactKeys(r.copies, destinationSlots) ||
      !exactKeys(r.release, retirementSlots)
    )
      throw invalid();
    for (const slot of destinationSlots) {
      const source = r.copies[slot];
      if (
        source !== null &&
        !(sourceSlots as readonly string[]).includes(source)
      )
        throw invalid();
      if (slot !== 'root' && source !== null && source !== slot)
        throw invalid();
    }
    for (const slot of retirementSlots) {
      if (typeof r.release[slot] !== 'boolean') throw invalid();
    }
    if (r.release.data !== r.release.crc || r.release.temp !== true)
      throw invalid();
    if (r.release.async && r.copies.root === null) throw invalid();
    for (const slot of ['main', 'bak'] as const) {
      if (r.release[slot] && r.copies[slot] !== slot) throw invalid();
    }
    return r;
  } catch {
    throw invalid();
  }
};

const readRecord = (io: TransferIO) => {
  try {
    const raw = io.readControl();
    return raw === null ? null : parseTransferRecord(raw);
  } catch (error) {
    throw safeVaultError(
      error,
      'STARTUP_FAILURE',
      'inventory',
      'RECORD_READ',
      'record',
    );
  }
};
const saveRecord = (io: TransferIO, record: TransferRecord) => {
  try {
    const raw = JSON.stringify(record);
    parseTransferRecord(raw);
    io.writeControl(raw);
    if (io.readControl() !== raw) throw new Error();
  } catch (error) {
    throw safeVaultError(
      error,
      'STARTUP_FAILURE',
      'inventory',
      'RECORD_WRITE',
      'record',
    );
  }
};
const jsonReadable = (raw: string | null | undefined) => {
  if (typeof raw !== 'string') return false;
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
};
const decodeWithCandidate = (raw: string, candidates: string[]) => {
  for (const key of [...new Set(candidates)]) {
    try {
      return {key, snapshot: decodeSnapshot(raw, key)};
    } catch {}
  }
  throw vaultError('INVALID_LEGACY_INPUT', 'classify', 'SOURCE_INVALID');
};

function plan(inventory: Inventory, candidates: string[]): TransferRecord {
  const {sources, keys, files} = inventory;
  if (sources.async === undefined) {
    throw vaultError('SOURCE_CONFLICT', 'inventory', 'SOURCE_READ');
  }
  // Released main-before-bak JSON selection, with no decryption-based search.
  const selectedMMKV: Source | null =
    typeof sources.mmkv === 'string'
      ? 'mmkv'
      : jsonReadable(sources.main)
      ? 'main'
      : jsonReadable(sources.bak)
      ? 'bak'
      : null;
  let selected: Source | null = selectedMMKV;
  if (selectedMMKV) {
    const raw = sources[selectedMMKV]!;
    const current = decodeWithCandidate(raw, candidates).snapshot;
    if (
      sources.async !== null &&
      sources.async !== raw &&
      current.payload.APP?.migrationMMKVStorageComplete !== true
    ) {
      throw vaultError('SOURCE_CONFLICT', 'classify', 'SOURCE_INVALID');
    }
  } else if (sources.mmkv === undefined) {
    throw vaultError('SOURCE_CONFLICT', 'inventory', 'SOURCE_READ');
  } else if (sources.async !== null) {
    // Failed or damaged MMKV/recovery observations cannot establish an empty history.
    if (
      sources.mmkv !== null ||
      sources.main !== null ||
      sources.bak !== null
    ) {
      throw vaultError('SOURCE_CONFLICT', 'classify', 'SOURCE_INVALID');
    }
    const historical = decodeWithCandidate(sources.async, candidates).snapshot;
    if (historical.payload.APP?.migrationMMKVStorageComplete === true) {
      throw vaultError('SOURCE_CONFLICT', 'classify', 'SOURCE_INVALID');
    }
    selected = 'async';
  } else if (sourceSlots.some(slot => sources[slot] !== null)) {
    throw vaultError('INVALID_LEGACY_INPUT', 'classify', 'SOURCE_INVALID');
  }
  const copies: TransferRecord['copies'] = {
    root: selected,
    main: null,
    bak: null,
  };
  for (const slot of ['main', 'bak'] as const) {
    if (typeof sources[slot] !== 'string') continue;
    try {
      decodeWithCandidate(sources[slot], candidates);
      copies[slot] = slot;
    } catch {}
  }
  const used = (slot: Source) =>
    sources[slot] === null ||
    (selected !== null && sources[slot] === sources[selected]);
  const canRetireMMKV =
    keys !== undefined &&
    keys.every(key =>
      [
        'persist:root',
        'persist:logs',
        'sessionLogsProdEnabled',
        'sessionLogsCleanupDone',
      ].includes(key),
    ) &&
    used('mmkv');
  return {
    version: 3,
    layout: 'bitpay.wallet.v2',
    phase: 'preparing',
    owned: true,
    copies,
    release: {
      data: canRetireMMKV && files.data,
      crc: canRetireMMKV && files.crc,
      async: sources.async !== null && used('async'),
      main: copies.main === 'main',
      bak: copies.bak === 'bak',
      // Only the exact old writer temp is disposable even if it was absent.
      temp: true,
    },
  };
}

async function retire(io: TransferIO, record: TransferRecord) {
  if (!LEGACY_RETIREMENT_ENABLED || record.phase === 'retired') return;
  let pending = false;
  const remove = async (slot: Retirement) => {
    if (!(await io.sourceExists(slot))) return;
    if (
      !record.release[slot] ||
      ((slot === 'data' || slot === 'crc') && !io.claimColdRetirement())
    )
      throw new Error();
    // The native claim precedes either MMKV unlink and seals subsequent opens.
    // Permission follows the transferred/disposable location, not its contents.
    await io.removeSource(slot);
    if (await io.sourceExists(slot)) throw new Error();
  };
  // A failure on the data file leaves its metadata partner for a safe retry.
  try {
    await remove('data');
    await remove('crc');
  } catch {
    pending = true;
  }
  for (const slot of ['async', 'main', 'bak', 'temp'] as const) {
    try {
      await remove(slot);
    } catch {
      pending = true;
    }
  }
  if (!pending) {
    try {
      // Recheck all absence obligations immediately before retiring the key.
      for (const slot of retirementSlots) {
        if (await io.sourceExists(slot)) throw new Error();
      }
      await io.removeLegacyKey();
      saveRecord(io, {...record, phase: 'retired'});
    } catch {
      pending = true;
    }
  }
  if (pending) {
    try {
      io.pending();
    } catch {
      /* Reporting cannot revoke modern access. */
    }
  }
}

export async function transferVault(io: TransferIO): Promise<string> {
  let record = readRecord(io);
  if (record && record.phase !== 'preparing') {
    const key = await io.modernKey(false);
    await retire(io, record);
    return key;
  }
  if (!record) {
    if (io.modernKeys().length || (await io.modernTempExists()))
      throw invalid();
    for (const slot of destinationSlots) {
      if ((await io.readDestination(slot)) !== null) throw invalid();
    }
  }
  const inventory = await io.inventory();
  const candidates = await io.legacyKeys();
  const proposed = plan(inventory, candidates);
  const restarting = record !== null;
  if (record && record.copies.root !== null) {
    const previous = record.copies.root;
    const next = proposed.copies.root;
    const fallbackOrder: Source[] = ['mmkv', 'main', 'bak'];
    // Compare roles only. AsyncStorage's pending import is not a backup rank.
    // Reject before changing the record, key, or any unfinished destination.
    if (
      next === null ||
      (previous === 'async' || next === 'async'
        ? previous !== next
        : fallbackOrder.indexOf(next) > fallbackOrder.indexOf(previous))
    ) {
      throw vaultError('SOURCE_CONFLICT', 'inventory', 'SOURCE_CHANGED');
    }
  }
  const key = await io.modernKey(record === null);
  record = proposed;
  saveRecord(io, record);
  const prepared: {
    slot: Destination;
    output: string;
    payload: Record<string, any>;
  }[] = [];
  for (const slot of destinationSlots) {
    const source = record.copies[slot];
    if (source === null) {
      if (restarting && slot !== 'root') {
        try {
          if (await io.destinationExists(slot))
            await io.removeDestination(slot);
          if (await io.destinationExists(slot)) throw new Error();
        } catch {
          throw vaultError(
            'REQUIRED_COPY_FAILURE',
            'required-copy',
            'COPY_VERIFICATION',
          );
        }
      }
      continue;
    }
    const raw = inventory.sources[source]!;
    const decoded = decodeWithCandidate(raw, candidates);
    const output = reencryptSnapshot(raw, decoded.key, key);
    try {
      await io.writeDestination(slot, output);
    } catch {
      throw vaultError('REQUIRED_COPY_FAILURE', 'required-copy', 'COPY_WRITE');
    }
    verifySnapshot(
      await io.readDestination(slot),
      output,
      decoded.snapshot.payload,
      key,
    );
    prepared.push({slot, output, payload: decoded.snapshot.payload});
  }
  for (const item of prepared) {
    verifySnapshot(
      await io.readDestination(item.slot),
      item.output,
      item.payload,
      key,
    );
  }
  // Empty/unplanned slots must still be empty. Never activate unowned surprises.
  if (
    io.modernKeys().some(k => k !== 'persist:root') ||
    (await io.modernTempExists())
  )
    throw invalid();
  for (const slot of destinationSlots) {
    if (
      record.copies[slot] === null &&
      (await io.readDestination(slot)) !== null
    )
      throw invalid();
  }
  const active: TransferRecord = {...record, phase: 'active'};
  saveRecord(io, active);
  return key;
}
