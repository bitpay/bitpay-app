import {
  workletKvClearAll,
  workletKvDelete,
  workletKvGetString,
  workletKvListKeys,
  workletKvSetString,
} from './portfolioWorkletKv';
import {createFakeWorkletStorage} from './__tests__/workletTestUtils';

describe('portfolioWorkletKv', () => {
  it('lists native keys and removes them on delete', () => {
    const storage = createFakeWorkletStorage();
    const config = {
      storage,
      registryKey: '__test_registry__',
    };

    workletKvSetString(config, 'snap:index:v2:wallet-1', '{}');
    workletKvSetString(config, 'rate:v1:USD:btc:1D', '{}');

    expect(workletKvGetString(config, 'snap:index:v2:wallet-1')).toBe('{}');
    expect(workletKvListKeys(config)).toEqual([
      'rate:v1:USD:btc:1D',
      'snap:index:v2:wallet-1',
    ]);

    workletKvDelete(config, 'snap:index:v2:wallet-1');

    expect(workletKvListKeys(config)).toEqual(['rate:v1:USD:btc:1D']);
  });

  it('clears native keys and a legacy registry entry', () => {
    const storage = createFakeWorkletStorage();
    const config = {
      storage,
      registryKey: '__test_registry__',
    };

    workletKvSetString(config, 'snap:index:v2:wallet-1', '{}');
    workletKvSetString(config, 'snap:chunk:v2:wallet-1:1', '{}');
    storage.set('__test_registry__', 'legacy');

    workletKvClearAll(config);

    expect(workletKvListKeys(config)).toEqual([]);
    expect(storage.getString('__test_registry__')).toBeUndefined();
  });
});
