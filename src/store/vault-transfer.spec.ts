import isEqual from 'lodash.isequal';
import {decodeSnapshot, encodeSnapshot} from './vault-codec';
import {
  transferVault,
  parseTransferRecord,
  TransferIO,
  Inventory,
  retirementSlots,
} from './vault-transfer';

// Existing retirement assertions exercise the later enabled build unchanged.
jest.mock('./vault-retirement-policy', () => ({
  LEGACY_RETIREMENT_ENABLED: true,
}));

const fixture = require('../../test/vault/fixtures/legacy-14.32.json').cases
  .plain;
const oldKey = 'synthetic-legacy-fixture-key';
const newKey = Buffer.alloc(32, 72).toString('base64');
const equal = (a: unknown, b: unknown) => expect(isEqual(a, b)).toBe(true);

const loadTransfer = (enabled?: boolean): typeof transferVault => {
  jest.resetModules();
  if (enabled === undefined) jest.dontMock('./vault-retirement-policy');
  else
    jest.doMock('./vault-retirement-policy', () => ({
      LEGACY_RETIREMENT_ENABLED: enabled,
    }));
  return require('./vault-transfer').transferVault;
};

function harness(source: 'mmkv' | 'async' | 'fresh' = 'mmkv') {
  let control: string | null = null;
  const destinations: Record<string, string | null> = {
    root: null,
    main: null,
    bak: null,
  };
  const state: Inventory & {
    sources: Inventory['sources'] & {temp: string | null};
  } = {
    sources: {
      mmkv: source === 'mmkv' ? fixture.raw : null,
      async:
        source === 'async'
          ? encodeSnapshot(
              {
                ...fixture.state,
                APP: {
                  ...fixture.state.APP,
                  migrationMMKVStorageComplete: false,
                },
              },
              oldKey,
            )
          : null,
      main: null,
      bak: null,
      temp: null,
    },
    keys: source === 'mmkv' ? ['persist:root', 'persist:logs'] : [],
    files: {
      data: source === 'mmkv',
      crc: source === 'mmkv',
    },
  };
  let key: string | null = null;
  let warm = source === 'mmkv';
  const events: string[] = [];
  let fault: string | null = null;
  let faultReached = false;
  const hit = (name: string) => {
    events.push(name);
    if (name === fault) {
      faultReached = true;
      throw new Error('synthetic failure');
    }
  };
  const io: TransferIO = {
    readControl: () => {
      hit('control:read');
      return control;
    },
    writeControl: raw => {
      const phase = JSON.parse(raw).phase;
      hit('control:before:' + phase);
      control = raw;
      hit('control:after:' + phase);
    },
    modernKeys: () => (destinations.root === null ? [] : ['persist:root']),
    modernTempExists: async () => false,
    destinationExists: async slot => {
      hit('destination:exists:' + slot);
      return destinations[slot] !== null;
    },
    readDestination: async slot => {
      hit('destination:read:' + slot);
      return destinations[slot];
    },
    writeDestination: async (slot, raw) => {
      hit('destination:before:' + slot);
      destinations[slot] = raw;
      hit('destination:after:' + slot);
    },
    removeDestination: async slot => {
      hit('destination:before-remove:' + slot);
      destinations[slot] = null;
      hit('destination:after-remove:' + slot);
    },
    inventory: async () => {
      hit('inventory');
      return JSON.parse(JSON.stringify(state));
    },
    legacyKeys: async () => [oldKey],
    modernKey: async create => {
      hit('key:read');
      if (!key && create) {
        hit('key:create');
        key = newKey;
        hit('key:verify');
      }
      if (!key) throw new Error('missing modern key');
      return key;
    },
    claimColdRetirement: () => !warm,
    sourceExists: async slot => {
      hit('retirement:read:' + slot);
      if (slot === 'data' || slot === 'crc') return state.files[slot];
      const raw = state.sources[slot];
      if (raw === undefined) throw new Error('unreadable');
      return raw !== null;
    },
    removeSource: async slot => {
      hit('retirement:before:' + slot);
      if (slot === 'data' || slot === 'crc') state.files[slot] = false;
      else state.sources[slot] = null;
      hit('retirement:after:' + slot);
    },
    removeLegacyKey: async () => {
      hit('legacy-key:remove');
    },
    pending: () => {
      events.push('pending');
    },
  };
  return {
    io,
    controlRaw: () => control,
    keyValue: () => key,
    seedKey: () => {
      key = newKey;
    },
    state,
    destinations,
    events,
    record: () => (control === null ? null : parseTransferRecord(control)),
    setControl: (raw: string | null) => {
      control = raw;
    },
    fault: (name: string | null) => {
      fault = name;
      faultReached = false;
    },
    reached: () => faultReached,
    cold: () => {
      warm = false;
    },
    loseKey: () => {
      key = null;
    },
  };
}

const expectNoRetirement = (h: ReturnType<typeof harness>) => {
  expect(
    h.events.filter(
      event =>
        event.startsWith('retirement:') ||
        event === 'legacy-key:remove' ||
        event === 'pending',
    ),
  ).toEqual([]);
};

it('transfers genuine AsyncStorage directly and removes only its committed row', async () => {
  const h = harness('async');
  const source = h.state.sources.async;
  await transferVault(h.io);
  expectNoRetirement(h);
  expect(h.state.sources.async === source).toBe(true);
  expect(h.record()!.phase).toBe('active');
  equal(decodeSnapshot(h.destinations.root!, newKey).payload, {
    ...fixture.state,
    APP: {...fixture.state.APP, migrationMMKVStorageComplete: false},
  });
  expect(h.state.sources.mmkv === null).toBe(true);
  await transferVault(h.io);
  expect(h.state.sources.async === null).toBe(true);
  expect(h.record()!.phase).toBe('retired');
});

it('preserves independent main/bak contents and never creates a checkpoint', async () => {
  const h = harness();
  const main = {...fixture.state, UNKNOWN: {snapshot: 'main'}};
  const bak = {...fixture.state, UNKNOWN: {snapshot: 'older'}};
  h.state.sources.main = encodeSnapshot(main, oldKey);
  h.state.sources.bak = encodeSnapshot(bak, oldKey);
  await transferVault(h.io);
  equal(decodeSnapshot(h.destinations.main!, newKey).payload, main);
  equal(decodeSnapshot(h.destinations.bak!, newKey).payload, bak);
  expect(Object.keys(h.destinations).sort()).toEqual(['bak', 'main', 'root']);
});

it('established MMKV preserves an unresolved leftover row', async () => {
  const h = harness();
  h.state.sources.async = 'unreadable leftover';
  await transferVault(h.io);
  expect(h.state.sources.async === 'unreadable leftover').toBe(true);
  expect(h.record()!.release.async === false).toBe(true);
});

it('D15 A2: an unknown row stays protected after an established primary activates', async () => {
  const h = harness();
  h.state.sources.async = undefined;
  await loadTransfer(false)(h.io);
  expect(h.record()!.phase).toBe('active');
  expect(h.record()!.copies.root).toBe('mmkv');
  expect(h.record()!.release.async).toBe(false);
  expect(h.state.sources.async).toBeUndefined();
  equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
  expectNoRetirement(h);
  const saved = h.controlRaw();

  // The later existence check succeeds; this row is the only retirement blocker.
  h.state.sources.async = 'retained row';
  h.cold();
  h.io.inventory = jest.fn(async () => {
    throw new Error('source reread forbidden');
  });
  h.io.legacyKeys = jest.fn(async () => {
    throw new Error('replanning forbidden');
  });
  await loadTransfer(true)(h.io);
  expect(h.events).toContain('retirement:read:async');
  expect(h.events).not.toContain('retirement:before:async');
  expect(h.state.sources.async).toBe('retained row');
  expect(h.state.files).toEqual({data: false, crc: false});
  expect(h.events).toContain('pending');
  expect(h.events).not.toContain('legacy-key:remove');
  expect(h.controlRaw() === saved).toBe(true);
  expect(h.io.inventory).not.toHaveBeenCalled();
  expect(h.io.legacyKeys).not.toHaveBeenCalled();
});

it.each([
  'false flag',
  'missing flag',
  'main backup',
  'bak backup',
  'undecodable primary',
  'unreadable primary',
  'no selected source',
])('D15 A2: an unknown row retains SOURCE_READ for %s', async condition => {
  const h = harness('fresh');
  h.state.sources.async = undefined;
  if (condition === 'false flag' || condition === 'missing flag') {
    const payload = {
      ...fixture.state,
      APP:
        condition === 'missing flag'
          ? {}
          : {migrationMMKVStorageComplete: false},
    };
    h.state.sources.mmkv = encodeSnapshot(payload, oldKey);
    equal(decodeSnapshot(h.state.sources.mmkv, oldKey).payload, payload);
  } else if (condition === 'main backup') h.state.sources.main = fixture.raw;
  else if (condition === 'bak backup') h.state.sources.bak = fixture.raw;
  else if (condition === 'undecodable primary') {
    h.state.sources.mmkv = 'invalid primary';
    h.state.sources.main = fixture.raw;
  } else if (condition === 'unreadable primary')
    h.state.sources.mmkv = undefined;
  const run = loadTransfer(false);
  const diagnostic = await run(h.io).then(
    () => null,
    error => require('./vault-diagnostics').vaultDiagnostic(error),
  );
  expect(diagnostic).toEqual({
    code: 'SOURCE_CONFLICT',
    phase: 'inventory',
    reason: 'SOURCE_READ',
  });
  expect(h.state.sources.async).toBeUndefined();
  expect(h.destinations).toEqual({root: null, main: null, bak: null});
  expect(h.record()).toBeNull();
  expect(h.keyValue()).toBeNull();
  expectNoRetirement(h);
});

it('rejects competing history without authority, with no output or deletion', async () => {
  const h = harness();
  h.state.sources.mmkv = encodeSnapshot(
    {...fixture.state, APP: {migrationMMKVStorageComplete: false}},
    oldKey,
  );
  h.state.sources.async = fixture.raw;
  await fails(() => transferVault(h.io), 'SOURCE_CONFLICT');
  expect(h.destinations.root === null).toBe(true);
  expect(h.events.some(e => e.startsWith('retirement:before'))).toBe(false);
});

it('accepts an exact interrupted duplicate without merging snapshots', async () => {
  const h = harness();
  h.state.sources.mmkv = encodeSnapshot(
    {...fixture.state, APP: {migrationMMKVStorageComplete: false}},
    oldKey,
  );
  h.state.sources.async = h.state.sources.mmkv;
  await transferVault(h.io);
  expectNoRetirement(h);
  expect(h.state.sources.async === h.state.sources.mmkv).toBe(true);
  expect(h.record()!.phase).toBe('active');
  await transferVault(h.io);
  expect(h.state.sources.async === null).toBe(true);
});

it.each(['main', 'bak'] as const)(
  'retains unreadable non-authoritative %s while activating the wallet',
  async slot => {
    const h = harness();
    h.state.sources[slot] = 'damaged';
    await transferVault(h.io);
    expect(h.record()!.phase).toBe('active');
    expect(h.record()!.release[slot] === false).toBe(true);
    expect(h.state.sources[slot] === 'damaged').toBe(true);
  },
);

it('does not open an empty replacement when the only backup is unconvertible', async () => {
  const h = harness('fresh');
  h.state.sources.main = '{}';
  await fails(() => transferVault(h.io));
  expect(h.destinations.root === null).toBe(true);
});

it('uses main before bak for ordinary fallback and does not search by decryption', async () => {
  const h = harness();
  h.state.sources.mmkv = null;
  h.state.keys = ['persist:logs'];
  h.state.sources.main = '{}';
  h.state.sources.bak = fixture.raw;
  await fails(() => transferVault(h.io));
  h.state.sources.main = 'invalid JSON';
  await transferVault(h.io);
  equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
  expect(h.record()!.release.main === false).toBe(true);
});

it.each([
  'control:before:preparing',
  'control:after:preparing',
  'destination:before:root',
  'destination:after:root',
  'control:before:active',
])('preserves inputs at %s and succeeds after that fault clears', async cut => {
  const h = harness();
  const before = JSON.stringify(h.state);
  h.fault(cut);
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  expect(JSON.stringify(h.state) === before).toBe(true);
  h.fault(null);
  await transferVault(h.io);
  equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
});

it('observes persisted activation after a failed write acknowledgement, never replaying sources', async () => {
  const h = harness();
  h.fault('control:after:active');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  h.fault(null);
  h.destinations.root = encodeSnapshot(
    {...fixture.state, AFTER: {save: true}},
    newKey,
  );
  const saved = h.destinations.root;
  h.io.inventory = async () => {
    throw new Error('must not reimport');
  };
  await transferVault(h.io);
  expect(h.destinations.root === saved).toBe(true);
});

it('withholds activation on failed final read-back and retries the owned output', async () => {
  const h = harness();
  const read = h.io.readDestination;
  let damaged = true;
  h.io.readDestination = async slot => {
    const raw = await read(slot);
    return damaged && raw !== null ? raw + ' ' : raw;
  };
  await fails(() => transferVault(h.io), 'REQUIRED_COPY_FAILURE');
  expect(h.record()!.phase).toBe('preparing');
  damaged = false;
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('active');
});

it('a failed supported backup write is required, not an unresolved-backup shortcut', async () => {
  const h = harness();
  h.state.sources.main = fixture.raw;
  h.fault('destination:before:main');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  expect(h.state.sources.main === fixture.raw).toBe(true);
  h.fault(null);
  await transferVault(h.io);
  expect(h.destinations.main !== null).toBe(true);
});

it('B: final destination verification still rejects damage without a second source inventory', async () => {
  const h = harness();
  const read = h.io.readDestination;
  let outputReads = 0;
  let reached = false;
  let damage = true;
  h.io.readDestination = async slot => {
    const raw = await read(slot);
    if (slot === 'root' && raw !== null && ++outputReads === 2 && damage) {
      reached = true;
      return raw + ' ';
    }
    return raw;
  };
  const before = JSON.stringify(h.state);
  await fails(() => transferVault(h.io), 'REQUIRED_COPY_FAILURE');
  expect(reached).toBe(true);
  expect(h.events.filter(e => e === 'inventory').length).toBe(1);
  expect(JSON.stringify(h.state) === before).toBe(true);
  expect(h.record()!.phase).toBe('preparing');
  damage = false;
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('active');
});

it('unknown old entries keep the entire instance and credential', async () => {
  const h = harness();
  h.state.keys!.push('unknown');
  await transferVault(h.io);
  h.cold();
  await transferVault(h.io);
  expect(h.record()!.release.data === false).toBe(true);
  expect(h.events.includes('legacy-key:remove')).toBe(false);
});

it('D: defers warm removal and retries a partially removed file pair', async () => {
  const h = harness();
  await transferVault(h.io);
  expect(h.state.files.data).toBe(true);
  h.cold();
  h.fault('retirement:after:data');
  await transferVault(h.io);
  expect(h.reached()).toBe(true);
  expect(h.state.files.data).toBe(false);
  expect(h.state.files.crc).toBe(true);
  h.fault(null);
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('retired');
});

it('deletion and credential verification failures leave access usable and pending', async () => {
  const h = harness('async');
  h.fault('retirement:before:async');
  await transferVault(h.io);
  expectNoRetirement(h);
  expect(h.reached()).toBe(false);
  expect(h.state.sources.async).not.toBeNull();
  expect(h.record()!.phase).toBe('active');
  await transferVault(h.io);
  expect(h.reached()).toBe(true);
  h.fault('legacy-key:remove');
  await transferVault(h.io);
  expect(h.reached()).toBe(true);
  expect(h.record()!.phase).toBe('active');
  h.fault(null);
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('retired');
});

it('keeps ordinary total-loss behavior with a key and never reimports after activation', async () => {
  const h = harness();
  await transferVault(h.io);
  h.destinations.root = null;
  h.io.inventory = async () => {
    throw new Error('forbidden');
  };
  await transferVault(h.io);
  expect(h.destinations.root === null).toBe(true);
  h.loseKey();
  await fails(() => transferVault(h.io), 'missing modern key');
});

it('fresh installation activates without fabricating a root or backup', async () => {
  const h = harness('fresh');
  await transferVault(h.io);
  expect(Object.values(h.destinations).every(v => v === null)).toBe(true);
  expectNoRetirement(h);
  expect(h.record()!.phase).toBe('active');
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('retired');
});

it.each(['absent-control-data', 'corrupt-control', 'failed-control-read'])(
  'preserves modern bytes for %s',
  async kind => {
    const h = harness();
    if (kind === 'absent-control-data') h.destinations.root = 'unowned';
    if (kind === 'corrupt-control') h.setControl('{bad');
    if (kind === 'failed-control-read') h.fault('control:read');
    const before = {...h.destinations};
    await fails(() => transferVault(h.io));
    equal(h.destinations, before);
    expect(h.events.includes('key:create')).toBe(false);
  },
);

it('rejects arbitrary paths and invalid control permissions', async () => {
  const h = harness();
  await transferVault(h.io);
  const record = h.record()!;
  expect(() =>
    parseTransferRecord(JSON.stringify({...record, path: '/unrelated'})),
  ).toThrow();
  for (const slot of retirementSlots) {
    expect(() =>
      parseTransferRecord(
        JSON.stringify({
          ...record,
          release: {...record.release, [slot]: '/unrelated'},
        }),
      ),
    ).toThrow();
  }
});

it('does not revive an AsyncStorage row that records completed MMKV history', async () => {
  const h = harness('async');
  h.state.sources.async = fixture.raw;
  await fails(() => transferVault(h.io), 'SOURCE_CONFLICT');
  expect(h.destinations.root === null).toBe(true);
  expect(h.state.sources.async === fixture.raw).toBe(true);
});
it('existing malformed primary keeps the released failure behavior', async () => {
  const h = harness();
  h.state.sources.mmkv = 'invalid JSON';
  h.state.sources.main = fixture.raw;
  await fails(() => transferVault(h.io));
  expect(h.destinations.root === null).toBe(true);
});

// Never let Jest render a resolved key, ciphertext, payload, or source digest.
const fails = async (operation: () => Promise<unknown>, code?: string) => {
  let failed = false;
  try {
    await operation();
  } catch (error) {
    failed =
      code === undefined ||
      (error instanceof Error && error.message.includes(code));
  }
  expect(failed).toBe(true);
};

it('A/C: unreadable primary fallback cannot replace a higher-priority unfinished root', async () => {
  const h = harness();
  h.state.sources.main = encodeSnapshot(
    {...fixture.state, OLDER: {distinct: true}},
    oldKey,
  );
  h.fault('destination:before:main');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  const prior = {
    record: h.controlRaw(),
    key: h.keyValue(),
    outputs: {...h.destinations},
  };
  h.state.sources.mmkv = undefined;
  h.state.keys = undefined;
  h.fault(null);
  await fails(() => transferVault(h.io), 'SOURCE_CONFLICT');
  equal(
    {record: h.controlRaw(), key: h.keyValue(), outputs: {...h.destinations}},
    prior,
  );
});

it('A: a preparing record cannot replace a lost modern key', async () => {
  const h = harness();
  h.fault('control:before:active');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  const prior = {record: h.controlRaw(), outputs: {...h.destinations}};
  h.loseKey();
  h.fault(null);
  await fails(() => transferVault(h.io), 'missing modern key');
  equal({record: h.controlRaw(), outputs: {...h.destinations}}, prior);
  expect(h.keyValue() === null).toBe(true);
  expect(h.events.filter(e => e === 'key:create').length).toBe(1);
});

it('A: restarts with cleared optional backups and removes only obsolete owned backup outputs', async () => {
  const h = harness();
  h.state.sources.main = fixture.raw;
  h.state.sources.bak = encodeSnapshot(
    {...fixture.state, OLDER: {value: true}},
    oldKey,
  );
  const original = h.state.sources.mmkv;
  h.fault('control:before:active');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  expect(
    h.destinations.root !== null &&
      h.destinations.main !== null &&
      h.destinations.bak !== null,
  ).toBe(true);
  expect(h.state.sources.mmkv === original).toBe(true);
  const key = h.keyValue();
  h.state.sources.main = h.state.sources.bak = null;
  h.fault(null);
  await transferVault(h.io);
  expect(h.keyValue() === key).toBe(true);
  expect(h.events.filter(e => e === 'key:create').length).toBe(1);
  expect(h.destinations.main === null && h.destinations.bak === null).toBe(
    true,
  );
  equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
  expect(h.state.sources.mmkv === original).toBe(true); // warm guard still protects it
});

it.each(['all backups', 'main only'])(
  'A: loss of %s preserves the interrupted main-sourced wallet on repeated retries',
  async cleared => {
    const h = harness('fresh');
    h.state.sources.main = fixture.raw;
    h.state.sources.bak = encodeSnapshot(
      {...fixture.state, OLDER: {distinct: true}},
      oldKey,
    );
    h.fault('destination:before:main'); // root write and its immediate verification have completed
    await fails(() => transferVault(h.io));
    expect(h.reached()).toBe(true);
    equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
    expect(h.destinations.main === null && h.destinations.bak === null).toBe(
      true,
    );
    const prior = {
      record: h.controlRaw(),
      key: h.keyValue(),
      outputs: {...h.destinations},
    };
    h.state.sources.main = null;
    if (cleared === 'all backups') h.state.sources.bak = null;
    // With both cache sources cleared, the already verified modern root is the only wallet copy.
    if (cleared === 'all backups')
      expect(Object.values(h.state.sources).every(v => v === null)).toBe(true);
    const remaining = JSON.stringify(h.state);
    h.fault(null);
    for (let attempt = 0; attempt < 2; attempt++) {
      await fails(() => transferVault(h.io), 'SOURCE_CONFLICT');
      equal(
        {
          record: h.controlRaw(),
          key: h.keyValue(),
          outputs: {...h.destinations},
        },
        prior,
      );
      expect(JSON.stringify(h.state) === remaining).toBe(true);
      expect(h.events.some(e => e.startsWith('retirement:before:'))).toBe(
        false,
      );
      expect(h.events.filter(e => e === 'key:create').length).toBe(1);
    }
  },
);

it('A: a replacement plan that cannot decode its source leaves all unfinished outputs intact', async () => {
  const h = harness();
  h.state.sources.main = fixture.raw;
  h.fault('control:before:active');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  const before = {
    record: h.controlRaw(),
    key: h.keyValue(),
    outputs: {...h.destinations},
  };
  h.state.sources.mmkv = 'invalid JSON';
  h.state.sources.main = null;
  h.fault(null);
  await fails(() => transferVault(h.io));
  equal(
    {record: h.controlRaw(), key: h.keyValue(), outputs: {...h.destinations}},
    before,
  );
});

it('A: losing a previously selected AsyncStorage wallet preserves its unfinished root', async () => {
  const h = harness('async');
  h.fault('control:before:active');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  const before = {
    record: h.controlRaw(),
    key: h.keyValue(),
    outputs: {...h.destinations},
  };
  h.state.sources.async = null;
  h.fault(null);
  await fails(() => transferVault(h.io), 'SOURCE_CONFLICT');
  equal(
    {record: h.controlRaw(), key: h.keyValue(), outputs: {...h.destinations}},
    before,
  );
});

it('A/B: an optional backup read failure is not re-inventoried or imported after activation', async () => {
  const h = harness();
  h.state.sources.main = fixture.raw;
  const inventory = h.io.inventory;
  let reads = 0;
  h.io.inventory = async () => {
    const observed = await inventory();
    if (++reads === 1) observed.sources.main = undefined;
    return observed;
  };
  await transferVault(h.io);
  expect(reads).toBe(1);
  expect(h.destinations.main === null).toBe(true);
  const root = h.destinations.root;
  h.cold();
  await transferVault(h.io);
  expect(reads).toBe(1);
  expect(h.destinations.root === root && h.destinations.main === null).toBe(
    true,
  );
  expect(h.state.sources.main === fixture.raw).toBe(true);
  expect(h.record()!.phase).toBe('active');
  expect(h.events.includes('legacy-key:remove')).toBe(false);
});

it('A: a recovered optional backup read can join a restarted preparation', async () => {
  const h = harness();
  h.state.sources.main = fixture.raw;
  const inventory = h.io.inventory;
  let reads = 0;
  h.io.inventory = async () => {
    const observed = await inventory();
    if (++reads === 1) observed.sources.main = undefined;
    return observed;
  };
  h.fault('destination:before:root');
  await fails(() => transferVault(h.io));
  expect(h.reached()).toBe(true);
  h.fault(null);
  await transferVault(h.io);
  equal(decodeSnapshot(h.destinations.main!, newKey).payload, fixture.state);
  expect(h.events.filter(e => e === 'key:create').length).toBe(1);
});

it.each(['mmkv', 'fresh'] as const)(
  'D policy: the exact old writer temp is disposable with %s',
  async source => {
    const h = harness(source);
    h.state.sources.temp = 'unfinished old writer output';
    await transferVault(h.io);
    expectNoRetirement(h);
    expect(h.state.sources.temp).toBe('unfinished old writer output');
    expect(h.record()!.phase).toBe('active');
    if (source === 'fresh') expect(h.destinations.root === null).toBe(true);
    else
      equal(
        decodeSnapshot(h.destinations.root!, newKey).payload,
        fixture.state,
      );
    h.cold();
    await transferVault(h.io);
    expect(h.state.sources.temp === null).toBe(true);
    expect(h.record()!.phase).toBe('retired');
    expect(h.events.includes('legacy-key:remove')).toBe(true);
  },
);

it.each(['main', 'async', 'temp'] as const)(
  'D policy: late appearance at previously absent %s follows its fixed permission',
  async slot => {
    const h = harness();
    await transferVault(h.io);
    h.state.sources[slot] = 'newly appeared synthetic material';
    const modern = {...h.destinations};
    h.cold();
    await transferVault(h.io);
    equal(h.destinations, modern);
    expect(
      h.state.sources[slot] ===
        (slot === 'temp' ? null : 'newly appeared synthetic material'),
    ).toBe(true);
    expect(h.record()!.phase).toBe(slot === 'temp' ? 'retired' : 'active');
    expect(h.events.includes('legacy-key:remove')).toBe(slot === 'temp');
  },
);

it('D policy: an unresolved non-permitted backup that is now absent no longer prevents retirement', async () => {
  const h = harness();
  h.state.sources.main = 'unreadable old backup';
  await transferVault(h.io);
  h.state.sources.main = null;
  h.cold();
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('retired');
});

it('D: an inspected session-log-only old instance is disposable without importing its logs', async () => {
  const h = harness();
  h.state.sources.mmkv = null;
  h.state.keys = ['persist:logs'];
  await transferVault(h.io);
  expect(h.destinations.root === null).toBe(true);
  h.cold();
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('retired');
});

it.each(['preparing', 'active', 'retired'])(
  'D policy: rejects the old version-2 record in %s before any source or key access',
  async phase => {
    const h = harness();
    // The old internal schema, deliberately retained only as a rejection fixture.
    const hash = 'a'.repeat(64);
    const oldRecord = {
      version: 2,
      layout: 'bitpay.wallet.v2',
      phase,
      owned: true,
      inputs: {
        mmkv: hash,
        async: null,
        main: null,
        bak: null,
        temp: null,
        data: hash,
        crc: hash,
        keys: hash,
      },
      copies: {root: 'mmkv', main: null, bak: null},
      release: {
        data: hash,
        crc: hash,
        async: null,
        main: null,
        bak: null,
        temp: null,
      },
    };
    h.setControl(JSON.stringify(oldRecord));
    h.seedKey();
    h.destinations.root = encodeSnapshot(fixture.state, newKey);
    const before = {
      record: h.controlRaw(),
      key: h.keyValue(),
      sources: h.state,
      destinations: {...h.destinations},
    };
    await fails(() => transferVault(h.io), 'STARTUP_FAILURE');
    equal(
      {
        record: h.controlRaw(),
        key: h.keyValue(),
        sources: h.state,
        destinations: {...h.destinations},
      },
      before,
    );
    expect(h.events).toEqual(['control:read']);
  },
);

it.each(['acknowledgement', 'read-back'])(
  'A: a persisted replacement plan with failed %s still permits retrying obsolete backup removal',
  async failure => {
    const h = harness();
    h.state.sources.main = fixture.raw;
    h.fault('control:before:active');
    await fails(() => transferVault(h.io));
    expect(h.reached()).toBe(true);
    const old = JSON.stringify(h.state);
    const outputs = {...h.destinations};
    h.state.sources.main = null;
    const readControl = h.io.readControl;
    const key = h.keyValue();
    let readBackReached = false;
    h.fault(failure === 'acknowledgement' ? 'control:after:preparing' : null);
    if (failure === 'read-back')
      h.io.readControl = () => {
        const raw = readControl();
        if (raw !== null && JSON.parse(raw).copies.main === null) {
          readBackReached = true;
          throw new Error('synthetic record read-back failure');
        }
        return raw;
      };
    await fails(() => transferVault(h.io));
    expect(failure === 'read-back' ? readBackReached : h.reached()).toBe(true);
    expect(h.events.includes('destination:before-remove:main')).toBe(false);
    expect(h.keyValue() === key).toBe(true);
    h.io.readControl = readControl;
    equal(h.destinations, outputs);
    expect(h.record()!.copies.main).toBeNull();
    h.fault('destination:after-remove:main');
    await fails(() => transferVault(h.io));
    expect(h.reached()).toBe(true);
    expect(h.destinations.main === null).toBe(true);
    expect(h.state.sources.mmkv === JSON.parse(old).sources.mmkv).toBe(true);
    h.fault(null);
    await transferVault(h.io);
    expect(h.record()!.phase).toBe('active');
    expect(h.destinations.main === null).toBe(true);
  },
);

it('D: failed absence verification preserves modern access and pending retirement until it clears', async () => {
  const h = harness('async');
  const exists = h.io.sourceExists;
  let verifyFailure = true;
  let reached = false;
  h.io.sourceExists = async slot => {
    const present = await exists(slot);
    if (slot === 'async' && !present && verifyFailure) {
      reached = true;
      throw new Error('synthetic verification failure');
    }
    return present;
  };
  await transferVault(h.io);
  expectNoRetirement(h);
  expect(reached).toBe(false);
  expect(h.state.sources.async).not.toBeNull();
  expect(h.record()!.phase).toBe('active');
  await transferVault(h.io);
  expect(reached).toBe(true);
  expect(h.record()!.phase).toBe('active');
  expect(h.events.includes('legacy-key:remove')).toBe(false);
  verifyFailure = false;
  await transferVault(h.io);
  expect(h.record()!.phase).toBe('retired');
});

it.each([
  ['unreadable', 'main'],
  ['unreadable', 'bak'],
  ['readable partial', 'main'],
  ['already absent', 'bak'],
] as const)(
  'A follow-up: %s obsolete %s output uses presence-only cleanup',
  async (condition, slot) => {
    const h = harness();
    h.state.sources[slot] = fixture.raw;
    const original = JSON.stringify(h.state);
    const write = h.io.writeDestination;
    let writeFailure = true;
    let writeReached = false;
    h.io.writeDestination = async (target, raw) => {
      if (target === slot && writeFailure) {
        h.destinations[target] = 'partial output';
        writeReached = true;
        throw new Error('synthetic partial write');
      }
      await write(target, raw);
    };
    const read = h.io.readDestination;
    let rejectedContentReads = 0;
    h.io.readDestination = async target => {
      if (
        target === slot &&
        condition === 'unreadable' &&
        h.destinations[target] !== null
      ) {
        rejectedContentReads++;
        throw new Error('synthetic UTF-8 read failure');
      }
      return read(target);
    };
    await fails(() => transferVault(h.io), 'REQUIRED_COPY_FAILURE');
    expect(writeReached).toBe(true);
    expect(h.record()!.phase).toBe('preparing');
    expect(JSON.stringify(h.state) === original).toBe(true);
    equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
    if (condition === 'unreadable')
      await fails(() => h.io.readDestination(slot));
    expect(rejectedContentReads).toBe(condition === 'unreadable' ? 1 : 0);
    const key = h.keyValue();
    h.state.sources.main = h.state.sources.bak = null; // old cache eviction, external to preparation
    if (condition === 'already absent') h.destinations[slot] = null;
    const beforeRetry = JSON.stringify(h.state);
    const exists = h.io.destinationExists;
    const observations: boolean[] = [];
    h.io.destinationExists = async target => {
      const present = await exists(target);
      if (target === slot) observations.push(present);
      return present;
    };
    const save = h.io.writeControl;
    let activated = false;
    h.io.writeControl = raw => {
      if (JSON.parse(raw).phase === 'active') {
        expect(JSON.stringify(h.state) === beforeRetry).toBe(true);
        expect(h.destinations[slot] === null).toBe(true);
        expect(observations).toEqual([condition !== 'already absent', false]);
        activated = true;
      }
      save(raw);
    };
    writeFailure = false;
    await transferVault(h.io);
    expect(activated).toBe(true);
    expect(rejectedContentReads).toBe(condition === 'unreadable' ? 1 : 0);
    expect(
      h.events.filter(e => e === 'destination:before-remove:' + slot).length,
    ).toBe(condition === 'already absent' ? 0 : 1);
    expect(h.keyValue() === key).toBe(true);
    expect(h.events.filter(e => e === 'key:create').length).toBe(1);
    expect(h.record()!.copies.root).toBe('mmkv');
    equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
  },
);

it('D12: real disabled policy preserves every legacy location after verified activation and a cold reload', async () => {
  const migrate = loadTransfer();
  expect(require('./vault-retirement-policy').LEGACY_RETIREMENT_ENABLED).toBe(
    false,
  );
  const h = harness();
  const main = {...fixture.state, SNAPSHOT: {source: 'main'}};
  const bak = {...fixture.state, SNAPSHOT: {source: 'bak'}};
  h.state.sources.async = h.state.sources.mmkv;
  h.state.sources.main = encodeSnapshot(main, oldKey);
  h.state.sources.bak = encodeSnapshot(bak, oldKey);
  h.state.sources.temp = 'synthetic old writer temp';
  const original = JSON.parse(JSON.stringify(h.state));
  const forbidden = jest.fn(() => {
    throw new Error('retirement must not run');
  });
  h.io.sourceExists = forbidden;
  h.io.claimColdRetirement = forbidden;
  h.io.removeSource = forbidden;
  h.io.removeLegacyKey = forbidden;
  h.io.pending = forbidden;
  await migrate(h.io);
  expect(h.record()!.phase).toBe('active');
  expect(h.record()!.owned).toBe(true);
  expect(Object.values(h.record()!.release).every(Boolean)).toBe(true);
  equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
  equal(decodeSnapshot(h.destinations.main!, newKey).payload, main);
  equal(decodeSnapshot(h.destinations.bak!, newKey).payload, bak);
  equal(h.state, original);
  expect(h.events.slice(h.events.indexOf('control:after:active') + 1)).toEqual([
    'control:read',
  ]);
  expect(forbidden).not.toHaveBeenCalled();
  const record = h.controlRaw();
  h.io.inventory = forbidden;
  h.io.legacyKeys = forbidden;
  h.io.readDestination = forbidden;
  h.io.writeDestination = forbidden;
  h.cold();
  h.events.length = 0;
  expect((await loadTransfer()(h.io)) === newKey).toBe(true);
  expect(h.events).toEqual(['control:read', 'key:read']);
  expect(h.controlRaw() === record).toBe(true);
  equal(h.state, original);
  expect(forbidden).not.toHaveBeenCalled();
});

it.each([false, true])(
  'D12: fresh installation with old temp present=%s stays active without cleanup',
  async temp => {
    const h = harness('fresh');
    if (temp) h.state.sources.temp = 'synthetic leftover';
    await loadTransfer()(h.io);
    expect(h.record()!.phase).toBe('active');
    expect(h.state.sources.temp).toBe(temp ? 'synthetic leftover' : null);
    expect(
      h.events.some(
        e =>
          e.startsWith('retirement:') ||
          e === 'pending' ||
          e === 'legacy-key:remove',
      ),
    ).toBe(false);
  },
);

it.each(['write failure', 'verification failure'])(
  'D12: disabled cleanup cannot activate after %s',
  async failure => {
    const h = harness();
    const write = h.io.writeDestination;
    if (failure === 'write failure') h.fault('destination:after:root');
    else h.io.writeDestination = (slot, raw) => write(slot, raw + 'corrupt');
    await fails(() => loadTransfer()(h.io));
    expect(h.record()!.phase).toBe('preparing');
    expect(h.state.sources.mmkv === fixture.raw).toBe(true);
    expect(h.events.includes('control:after:active')).toBe(false);
    expect(h.events.some(e => e.startsWith('retirement:'))).toBe(false);
    h.fault(null);
    h.io.writeDestination = write;
    await loadTransfer()(h.io);
    expect(h.record()!.phase).toBe('active');
    expect(h.events.filter(e => e === 'key:create').length).toBe(1);
  },
);

it.each(['main', 'async'] as const)(
  'D12: later enabled build uses saved permissions and retains late %s material',
  async late => {
    const h = harness();
    h.state.sources.bak = fixture.raw;
    await loadTransfer()(h.io);
    const record = h.controlRaw();
    const root = h.destinations.root;
    const key = h.keyValue();
    h.state.sources.mmkv = 'changed permitted old contents';
    h.state.sources.bak = 'changed permitted backup';
    h.state.sources[late] = 'late non-permitted material';
    h.state.sources.temp = 'late disposable writer temp';
    const forbidden = jest.fn(() => {
      throw new Error('no second migration');
    });
    h.io.inventory = forbidden;
    h.io.legacyKeys = forbidden;
    h.io.writeDestination = forbidden;
    h.cold();
    await loadTransfer(true)(h.io);
    expect(h.state.files).toEqual({data: false, crc: false});
    expect(h.state.sources.bak).toBe(null);
    expect(h.state.sources.temp).toBe(null);
    expect(h.state.sources[late]).toBe('late non-permitted material');
    expect(h.controlRaw() === record).toBe(true);
    expect(h.events.includes('legacy-key:remove')).toBe(false);
    expect(h.events.includes('pending')).toBe(true);
    expect(h.destinations.root === root && h.keyValue() === key).toBe(true);
    expect(forbidden).not.toHaveBeenCalled();
    h.state.sources[late] = null;
    await loadTransfer(true)(h.io);
    expect(h.record()!.phase).toBe('retired');
    expect(h.events.includes('legacy-key:remove')).toBe(true);
    expect(forbidden).not.toHaveBeenCalled();
  },
);

it('D12: disabled build preserves an already-retired record and validates its modern key', async () => {
  const h = harness('fresh');
  await loadTransfer(true)(h.io);
  expectNoRetirement(h);
  expect(h.record()!.phase).toBe('active');
  await loadTransfer(true)(h.io);
  const record = h.controlRaw();
  expect(h.record()!.phase).toBe('retired');
  h.events.length = 0;
  await loadTransfer()(h.io);
  expect(h.controlRaw() === record).toBe(true);
  expect(h.events).toEqual(['control:read', 'key:read']);
  h.loseKey();
  await fails(() => loadTransfer()(h.io));
  expect(h.controlRaw() === record).toBe(true);
});

it('D12: disabled build still rejects a version-2 control without source access', async () => {
  const h = harness('fresh');
  await loadTransfer()(h.io);
  const record = JSON.stringify({...h.record(), version: 2});
  h.setControl(record);
  h.events.length = 0;
  await fails(() => loadTransfer()(h.io), 'STARTUP_FAILURE');
  expect(h.controlRaw() === record).toBe(true);
  expect(h.events).toEqual(['control:read']);
});

it.each([
  'presence before unlink',
  'presence after unlink',
  'unlink rejected',
  'still present',
])(
  'A follow-up: %s prevents activation and permits a later healthy retry',
  async failure => {
    const h = harness();
    h.state.sources.main = fixture.raw;
    h.fault('destination:after:main');
    await fails(() => transferVault(h.io));
    expect(h.reached()).toBe(true);
    const key = h.keyValue();
    h.state.sources.main = null;
    const original = JSON.stringify(h.state);
    h.fault(null);
    const exists = h.io.destinationExists;
    const remove = h.io.removeDestination;
    let failing = true;
    let checks = 0;
    let reached = false;
    h.io.destinationExists = async slot => {
      if (slot === 'main' && failing) {
        checks++;
        if (
          (failure === 'presence before unlink' && checks === 1) ||
          (failure === 'presence after unlink' && checks === 2)
        ) {
          reached = true;
          throw new Error('synthetic presence failure');
        }
      }
      return exists(slot);
    };
    h.io.removeDestination = async slot => {
      if (slot === 'main' && failing) {
        if (failure === 'unlink rejected') {
          reached = true;
          throw new Error('synthetic unlink failure');
        }
        if (failure === 'still present') {
          reached = true;
          return;
        }
      }
      await remove(slot);
    };
    await fails(() => transferVault(h.io), 'REQUIRED_COPY_FAILURE');
    expect(reached).toBe(true);
    expect(h.record()!.phase).toBe('preparing');
    expect(h.events.includes('control:before:active')).toBe(false);
    expect(h.events.some(e => e.startsWith('retirement:before:'))).toBe(false);
    expect(JSON.stringify(h.state) === original).toBe(true);
    expect(h.keyValue() === key).toBe(true);
    expect(h.events.filter(e => e === 'key:create').length).toBe(1);
    failing = false;
    await transferVault(h.io);
    expect(h.record()!.phase).toBe('active');
    expect(h.destinations.main === null).toBe(true);
    expect(h.keyValue() === key).toBe(true);
    expect(h.events.filter(e => e === 'key:create').length).toBe(1);
    equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
  },
);

it.each(['async', 'backup'] as const)(
  'D14: %s-only migration retains its source until a later enabled invocation',
  async source => {
    const h = harness(source === 'async' ? 'async' : 'fresh');
    const slot = source === 'async' ? 'async' : 'main';
    if (slot === 'main') h.state.sources.main = fixture.raw;
    const original = h.state.sources[slot];
    await transferVault(h.io);
    expectNoRetirement(h);
    expect(h.state.sources[slot] === original).toBe(true);
    expect(h.record()!.phase).toBe('active');
    const modern = {...h.destinations};
    const forbidden = jest.fn(async () => {
      throw new Error('no replanning');
    });
    h.io.inventory = forbidden;
    h.io.legacyKeys = forbidden;
    await transferVault(h.io);
    expect(h.state.sources[slot]).toBeNull();
    expect(h.record()!.phase).toBe('retired');
    expect(h.events.filter(event => event === 'key:create')).toHaveLength(1);
    expect(
      h.events.filter(event => event === 'legacy-key:remove'),
    ).toHaveLength(1);
    equal(h.destinations, modern);
    expect(forbidden).not.toHaveBeenCalled();
  },
);

const sessionLogNames = [
  ['sessionLogsProdEnabled'],
  ['sessionLogsCleanupDone'],
  ['sessionLogsProdEnabled', 'sessionLogsCleanupDone'],
];
it.each(sessionLogNames.map(names => [names.join('+'), names] as const))(
  'D14 markers: disabled wallet saves normal permissions for %s',
  async (_label, names) => {
    const migrate = loadTransfer();
    expect(require('./vault-retirement-policy').LEGACY_RETIREMENT_ENABLED).toBe(
      false,
    );
    const reference = harness();
    await migrate(reference.io);
    const h = harness();
    h.state.keys!.push(...names);
    const original = JSON.parse(JSON.stringify(h.state));
    await migrate(h.io);
    // This assertion isolates the classification edit while retirement is off.
    expect(h.record()!.release).toEqual(reference.record()!.release);
    expect(h.record()!.phase).toBe('active');
    equal(h.state, original);
    equal(decodeSnapshot(h.destinations.root!, newKey).payload, fixture.state);
    expectNoRetirement(h);
    const saved = h.controlRaw();
    const forbidden = jest.fn(async () => {
      throw new Error('no source reinspection');
    });
    h.io.inventory = forbidden;
    h.io.legacyKeys = forbidden;
    await migrate(h.io);
    expect(h.controlRaw()).toBe(saved);
    equal(h.state, original);
    expectNoRetirement(h);
    h.cold();
    await loadTransfer(true)(h.io);
    expect(h.state.files).toEqual({data: false, crc: false});
    expect(
      h.events.filter(event => event === 'legacy-key:remove'),
    ).toHaveLength(1);
    expect(h.events.filter(event => event === 'key:create')).toHaveLength(1);
    expect(h.record()!.phase).toBe('retired');
    expect(forbidden).not.toHaveBeenCalled();
  },
);

it('D14 markers: an inspected log-and-marker-only store is disposable without a wallet', async () => {
  const h = harness();
  h.state.sources.mmkv = null;
  h.state.keys = ['persist:logs', ...sessionLogNames[2]];
  await loadTransfer()(h.io);
  expectNoRetirement(h);
  expect(h.record()!.release.data).toBe(true);
  expect(h.record()!.release.crc).toBe(true);
  expect(h.state.files).toEqual({data: true, crc: true});
  expect(Object.values(h.destinations).every(value => value === null)).toBe(
    true,
  );
  h.cold();
  await loadTransfer(true)(h.io);
  expect(h.record()!.phase).toBe('retired');
  expect(h.state.files).toEqual({data: false, crc: false});
  expect(h.events.filter(event => event === 'legacy-key:remove')).toHaveLength(
    1,
  );
  expect(Object.values(h.destinations).every(value => value === null)).toBe(
    true,
  );
});

it.each(['wallet', 'log-only'] as const)(
  'D14 markers: extra unknown name protects the %s store under both policies',
  async source => {
    const h = harness();
    if (source === 'log-only') {
      h.state.sources.mmkv = null;
      h.state.keys = ['persist:logs'];
    }
    h.state.keys!.push(...sessionLogNames[2], 'sessionLogsCleanupDone.extra');
    await loadTransfer()(h.io);
    expect(require('./vault-retirement-policy').LEGACY_RETIREMENT_ENABLED).toBe(
      false,
    );
    expectNoRetirement(h);
    expect(h.record()!.release.data).toBe(false);
    expect(h.record()!.release.crc).toBe(false);
    const saved = h.controlRaw();
    const original = JSON.parse(JSON.stringify(h.state));
    h.cold();
    await loadTransfer(true)(h.io);
    expect(h.record()!.phase).toBe('active');
    expect(h.controlRaw()).toBe(saved);
    equal(h.state, original);
    expect(h.state.files).toEqual({data: true, crc: true});
    expect(h.events.includes('legacy-key:remove')).toBe(false);
  },
);
