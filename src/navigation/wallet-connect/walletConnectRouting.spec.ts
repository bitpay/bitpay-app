jest.mock('ethers', () => {
  const isAddress = (value: unknown) =>
    typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
  const utils = {getAddress: jest.fn((value: string) => value), isAddress};

  return {
    BigNumber: {from: jest.fn()},
    ethers: {BigNumber: {from: jest.fn()}, utils},
    utils,
  };
});

import {getSessionAddresses, matchesAccountRoute} from './walletConnectRouting';

const ACCOUNT_A = '0x1111111111111111111111111111111111111111';
const ACCOUNT_B = '0x2222222222222222222222222222222222222222';
const SOL_A = 'AKnL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
const SOL_B = 'AknL4NNf3DGWZJS6cPknBuEGnVsV4A4m5tgebLHaRSZ9';
const SOL_CHAIN = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const TOPIC = 'topic-1';

const buildRequest = (method: string, params: any, topic = TOPIC) =>
  ({
    id: 1,
    params: {chainId: 'eip155:1', request: {method, params}},
    topic,
  } as any);

describe('getSessionAddresses', () => {
  it('strips the chain prefix from each account', () => {
    expect(
      getSessionAddresses({
        accounts: [`eip155:1:${ACCOUNT_A}`, `${SOL_CHAIN}:${SOL_A}`],
      } as any),
    ).toEqual([ACCOUNT_A, SOL_A]);
  });

  it('returns nothing for a session without accounts', () => {
    expect(getSessionAddresses({} as any)).toEqual([]);
  });
});

describe('matchesAccountRoute', () => {
  it('shows a request on the route of the account it names', () => {
    const request = buildRequest('eth_signTypedData_v3', [
      ACCOUNT_A,
      '{"primaryType":"Permit"}',
    ]);

    expect(
      matchesAccountRoute(request, {
        selectedAccountAddress: ACCOUNT_A,
        topic: TOPIC,
      }),
    ).toBe(true);
  });

  it('hides a request from the route of any other account', () => {
    const request = buildRequest('eth_signTypedData_v3', [
      ACCOUNT_A,
      '{"primaryType":"Permit"}',
    ]);

    expect(
      matchesAccountRoute(request, {
        selectedAccountAddress: ACCOUNT_B,
        topic: TOPIC,
      }),
    ).toBe(false);
  });

  it('hides a request whose account cannot be derived', () => {
    const request = buildRequest('eth_sendRawTransaction', ['0xdeadbeef']);

    expect(
      matchesAccountRoute(request, {
        selectedAccountAddress: ACCOUNT_A,
        topic: TOPIC,
      }),
    ).toBe(false);
  });

  it('hides a request that belongs to another session', () => {
    const request = buildRequest(
      'eth_signTypedData_v3',
      [ACCOUNT_A, '{"primaryType":"Permit"}'],
      'other-topic',
    );

    expect(
      matchesAccountRoute(request, {
        selectedAccountAddress: ACCOUNT_A,
        topic: TOPIC,
      }),
    ).toBe(false);
  });

  it('ignores case for evm accounts', () => {
    const request = buildRequest('personal_sign', [
      '0x6869',
      '0xabcdef0123456789abcdef0123456789abcdef01',
    ]);

    expect(
      matchesAccountRoute(request, {
        selectedAccountAddress: '0xABCDEF0123456789ABCDEF0123456789ABCDEF01',
        topic: TOPIC,
      }),
    ).toBe(true);
  });

  it('does not match solana accounts that only differ in case', () => {
    const request = buildRequest('solana_signMessage', {pubkey: SOL_A});

    expect(
      matchesAccountRoute(request, {
        selectedAccountAddress: SOL_B,
        topic: TOPIC,
      }),
    ).toBe(false);
  });
});
