import {flattenGlobalSelectData} from './GlobalSelect';

describe('flattenGlobalSelectData', () => {
  it('preserves key/account order with stable semantic row ids', () => {
    const rows = flattenGlobalSelectData([
      {
        key: 'key-1',
        keyName: 'Primary',
        accounts: [{id: 'account-1'}, {id: 'account-2'}],
      } as any,
    ]);

    expect(rows).toEqual([
      {
        __row: 'keyHeader',
        id: 'header-key-1',
        keyName: 'Primary',
      },
      {
        __row: 'account',
        id: 'account-key-1-account-1',
        account: {id: 'account-1'},
        keyId: 'key-1',
      },
      {
        __row: 'account',
        id: 'account-key-1-account-2',
        account: {id: 'account-2'},
        keyId: 'key-1',
      },
    ]);
  });

  it('does not reinterpret stale account-asset search results as currencies', () => {
    const currency = {
      id: 'btc',
      currencyAbbreviation: 'btc',
    };
    const staleAccountAssetResult = {
      id: 'asset-sol',
      chain: 'sol',
      chainAssetsList: [],
    };

    expect(
      flattenGlobalSelectData([
        staleAccountAssetResult as any,
        currency as any,
      ]),
    ).toEqual([
      {
        __row: 'currency',
        id: 'currency-btc',
        item: currency,
      },
    ]);
  });
});
