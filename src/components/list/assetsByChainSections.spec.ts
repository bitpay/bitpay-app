import type {AssetsByChainData} from '../../navigation/wallet/screens/AccountDetails';
import type {WalletRowProps} from './WalletRow';
import {buildVirtualizedAssetsByChainSections} from './assetsByChainSections';

const makeWallet = (id: string, chain = 'eth') =>
  ({id, chain} as WalletRowProps);

const makeAccountItem = (
  chain: string,
  chainAssetsList: WalletRowProps[],
): AssetsByChainData => ({
  id: `chain-${chain}`,
  chain,
  chainName: chain.toUpperCase(),
  chainImg: '',
  chainAssetsList,
  accountAddress: '0xaccount',
  fiatBalance: 0,
  fiatLockedBalance: 0,
  fiatConfirmedLockedBalance: 0,
  fiatSpendableBalance: 0,
  fiatPendingBalance: 0,
  fiatBalanceFormat: '$0.00',
  fiatLockedBalanceFormat: '$0.00',
  fiatConfirmedLockedBalanceFormat: '$0.00',
  fiatSpendableBalanceFormat: '$0.00',
  fiatPendingBalanceFormat: '$0.00',
});

const makeSection = (accountItem: AssetsByChainData) => ({
  title: accountItem.chain,
  chains: [accountItem.chain],
  data: [accountItem],
});

describe('buildVirtualizedAssetsByChainSections', () => {
  it('exposes every expanded wallet as an individual SectionList item', () => {
    const wallets = [
      makeWallet('wallet-1'),
      makeWallet('wallet-2'),
      makeWallet('wallet-3'),
    ];
    const accountItem = makeAccountItem('eth', wallets);

    const sections = buildVirtualizedAssetsByChainSections(
      [makeSection(accountItem)],
      {eth: true},
      false,
    );

    expect(sections).toHaveLength(1);
    expect(sections[0].accountItem).toBe(accountItem);
    expect(sections[0].data).toBe(wallets);
    expect(sections[0].data).toHaveLength(3);
    expect(sections[0].data[0]).toBe(wallets[0]);
  });

  it('keeps a collapsed chain header while omitting its wallet items', () => {
    const accountItem = makeAccountItem('eth', [
      makeWallet('wallet-1'),
      makeWallet('wallet-2'),
    ]);

    const sections = buildVirtualizedAssetsByChainSections(
      [makeSection(accountItem)],
      {eth: false},
      false,
    );

    expect(sections).toEqual([
      expect.objectContaining({
        key: 'chain-eth',
        accountItem,
        expanded: false,
        data: [],
      }),
    ]);
  });

  it('keeps every section when all chains are collapsed', () => {
    const ethAccountItem = makeAccountItem('eth', [makeWallet('wallet-1')]);
    const arbAccountItem = makeAccountItem('arb', [
      makeWallet('wallet-2', 'arb'),
    ]);

    const sections = buildVirtualizedAssetsByChainSections(
      [makeSection(ethAccountItem), makeSection(arbAccountItem)],
      {},
      false,
    );

    expect(sections).toHaveLength(2);
    expect(sections.map(section => section.accountItem)).toEqual([
      ethAccountItem,
      arbAccountItem,
    ]);
    expect(sections.every(section => section.data.length === 0)).toBe(true);
  });

  it('always expands the only chain without copying its wallet array', () => {
    const wallets = [makeWallet('wallet-1', 'sol')];
    const accountItem = makeAccountItem('sol', wallets);

    const sections = buildVirtualizedAssetsByChainSections(
      [makeSection(accountItem)],
      {sol: false},
      true,
    );

    expect(sections[0].expanded).toBe(true);
    expect(sections[0].data).toBe(wallets);
  });

  it('preserves stable section keys and ignores malformed empty sections', () => {
    const accountItem = makeAccountItem('eth', [makeWallet('wallet-1')]);

    const sections = buildVirtualizedAssetsByChainSections(
      [{title: 'empty', data: []}, makeSection(accountItem)],
      {eth: true},
      false,
    );

    expect(sections.map(section => section.key)).toEqual(['chain-eth']);
  });
});
