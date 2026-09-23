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

import {getMessageView, getRequestSummary} from './walletConnectRequestSummary';

const ACCOUNT_A = '0x1111111111111111111111111111111111111111';
const ACCOUNT_B = '0x2222222222222222222222222222222222222222';

const PERMIT = JSON.stringify({
  domain: {chainId: 1, name: 'USDC', verifyingContract: ACCOUNT_B},
  message: {owner: ACCOUNT_B, value: '1000'},
  primaryType: 'Permit',
  types: {Permit: []},
});

const buildRequest = (method: string, params: any) =>
  ({
    id: 1,
    params: {chainId: 'eip155:1', request: {method, params}},
    topic: 'topic-1',
  } as any);

describe('getRequestSummary', () => {
  it('binds eth_signTypedData_v3 to the account named by the request', () => {
    const summary = getRequestSummary(
      buildRequest('eth_signTypedData_v3', [ACCOUNT_A, PERMIT]),
    );

    expect(summary).toEqual({
      address: ACCOUNT_A,
      isMethodSupported: true,
      kind: 'sign',
      message: PERMIT,
    });
  });

  it('binds typed data regardless of parameter order', () => {
    const summary = getRequestSummary(
      buildRequest('eth_signTypedData', [PERMIT, ACCOUNT_A]),
    );

    expect(summary.address).toBe(ACCOUNT_A);
    expect(summary.message).toBe(PERMIT);
  });

  it('reads personal_sign as [message, account]', () => {
    const summary = getRequestSummary(
      buildRequest('personal_sign', ['0x6869', ACCOUNT_A]),
    );

    expect(summary.address).toBe(ACCOUNT_A);
    expect(summary.message).toBe('0x6869');
  });

  it('marks a switch chain request as supported for a known chain', () => {
    const summary = getRequestSummary(
      buildRequest('wallet_switchEthereumChain', [{chainId: '0x1'}]),
    );

    expect(summary).toEqual({isMethodSupported: true, kind: 'switchChain'});
  });

  it('marks a switch chain request as unsupported for an unknown chain', () => {
    const summary = getRequestSummary(
      buildRequest('wallet_switchEthereumChain', [{chainId: '0xdead'}]),
    );

    expect(summary.isMethodSupported).toBe(false);
  });

  it('reads the solana signer from the first signing key', () => {
    const summary = getRequestSummary(
      buildRequest('solana_signTransaction', {
        instructions: [
          {
            keys: [
              {isSigner: false, pubkey: 'not-a-signer'},
              {isSigner: true, pubkey: 'sol-signer'},
            ],
          },
        ],
        transaction: 'base64-tx',
      }),
    );

    expect(summary.address).toBe('sol-signer');
    expect(summary.message).toBe('base64-tx');
  });

  it('reports an unknown method as unsupported', () => {
    const summary = getRequestSummary(buildRequest('eth_unknownMethod', []));

    expect(summary).toEqual({
      isMethodSupported: false,
      kind: 'unsupportedMethod',
    });
  });
});

describe('getMessageView', () => {
  it('surfaces the eip-712 domain and primary type alongside the message', () => {
    const view = getMessageView(PERMIT);

    expect(view).toEqual({
      kind: 'typedData',
      value: {
        domain: {chainId: 1, name: 'USDC', verifyingContract: ACCOUNT_B},
        message: {owner: ACCOUNT_B, value: '1000'},
        primaryType: 'Permit',
      },
    });
  });

  it('accepts typed data that arrives already deserialized', () => {
    const view = getMessageView(JSON.parse(PERMIT));

    expect(view.kind).toBe('typedData');
    expect((view as any).value.domain.verifyingContract).toBe(ACCOUNT_B);
  });

  it('omits an absent domain instead of rendering it empty', () => {
    const view = getMessageView(JSON.stringify({message: {a: 1}}));

    expect(view).toEqual({kind: 'typedData', value: {message: {a: 1}}});
  });

  it('keeps a non json message as raw copyable text', () => {
    expect(getMessageView('0x6869')).toEqual({kind: 'raw', value: '0x6869'});
  });

  it('stringifies an object that is not typed data', () => {
    expect(getMessageView({a: 1})).toEqual({kind: 'text', value: '{"a":1}'});
  });
});
