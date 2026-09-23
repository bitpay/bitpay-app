jest.mock('ethers', () => {
  // test/setup.js stubs isAddress as always true; these tests need the real predicates
  const {utils} = jest.requireActual('ethers');

  return {
    BigNumber: {from: jest.fn()},
    ethers: {BigNumber: {from: jest.fn()}, utils},
    utils,
  };
});

import {getMessageView, getRequestSummary} from './walletConnectRequestSummary';

const ACCOUNT_A = '0x1111111111111111111111111111111111111111';
const ACCOUNT_B = '0x2222222222222222222222222222222222222222';

const PERMIT_TYPES = {
  EIP712Domain: [
    {name: 'name', type: 'string'},
    {name: 'chainId', type: 'uint256'},
  ],
  Permit: [
    {name: 'owner', type: 'address'},
    {name: 'value', type: 'uint256'},
  ],
};

const buildPermit = (message: any) =>
  JSON.stringify({
    domain: {chainId: 1, name: 'USDC'},
    message,
    primaryType: 'Permit',
    types: PERMIT_TYPES,
  });

const PERMIT = buildPermit({owner: ACCOUNT_B, value: '1000'});

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

    expect(summary.address).toBe(ACCOUNT_A);
    expect(summary.message.primaryType).toBe('Permit');
  });

  it('binds typed data regardless of parameter order', () => {
    const summary = getRequestSummary(
      buildRequest('eth_signTypedData', [PERMIT, ACCOUNT_A]),
    );

    expect(summary.address).toBe(ACCOUNT_A);
    expect(summary.message.message).toEqual({
      owner: ACCOUNT_B,
      value: '1000',
    });
  });

  it('keeps an eth_sign message that looks like an address', () => {
    const summary = getRequestSummary(
      buildRequest('eth_sign', [ACCOUNT_A, `0x${'61'.repeat(20)}`]),
    );

    expect(summary.address).toBe(ACCOUNT_A);
    expect(summary.message).toBe('a'.repeat(20));
  });

  it('reads personal_sign as [message, account]', () => {
    const summary = getRequestSummary(
      buildRequest('personal_sign', ['0x6869', ACCOUNT_A]),
    );

    expect(summary.address).toBe(ACCOUNT_A);
    expect(summary.message).toBe('hi');
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

  it('shows the solana account the request will be signed with', () => {
    const summary = getRequestSummary(
      buildRequest('solana_signTransaction', {
        feePayer: 'sol-fee-payer',
        instructions: [
          {keys: [{isSigner: true, pubkey: 'a-different-signer'}]},
        ],
        transaction: 'base64-tx',
      }),
    );

    expect(summary.address).toBe('sol-fee-payer');
    expect(summary.message).toBe('base64-tx');
  });

  it('keeps an empty message signable', () => {
    const summary = getRequestSummary(
      buildRequest('personal_sign', ['', ACCOUNT_A]),
    );

    expect(summary.isMethodSupported).toBe(true);
    expect(summary.message).toBe('');
  });

  it('refuses a message that arrives as raw bytes instead of text', () => {
    const summary = getRequestSummary(
      buildRequest('personal_sign', [[255, 0], ACCOUNT_A]),
    );

    expect(summary).toEqual({isMethodSupported: false, kind: 'undecodable'});
  });

  it('accepts typed data without a domain, which signs as the empty domain', () => {
    const summary = getRequestSummary(
      buildRequest('eth_signTypedData_v4', [
        ACCOUNT_A,
        JSON.stringify({
          message: {owner: ACCOUNT_B, value: '1000'},
          types: {Permit: PERMIT_TYPES.Permit},
        }),
      ]),
    );

    expect(summary.isMethodSupported).toBe(true);
    expect(summary.message.domain).toEqual({});
  });

  it('refuses a hex message that cannot be decoded', () => {
    const summary = getRequestSummary(
      buildRequest('eth_sign', [ACCOUNT_A, '0xdeadbeef']),
    );

    expect(summary).toEqual({isMethodSupported: false, kind: 'undecodable'});
  });

  it('refuses typed data whose primary type is ambiguous', () => {
    const summary = getRequestSummary(
      buildRequest('eth_signTypedData_v4', [
        ACCOUNT_A,
        JSON.stringify({
          domain: {chainId: 1},
          message: {owner: ACCOUNT_B},
          types: {
            Permit: [{name: 'owner', type: 'address'}],
            Unused: [{name: 'x', type: 'uint256'}],
          },
        }),
      ]),
    );

    expect(summary).toEqual({isMethodSupported: false, kind: 'undecodable'});
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
  it('surfaces every signed part of an eip-712 payload', () => {
    const summary = getRequestSummary(
      buildRequest('eth_signTypedData_v4', [ACCOUNT_A, PERMIT]),
    );
    const view = getMessageView(summary.message, 'eth_signTypedData_v4');

    expect(view.kind).toBe('fields');
    expect((view as any).value).toEqual({
      domain: {chainId: '1', name: 'USDC'},
      message: {owner: ACCOUNT_B, value: '1000'},
      primaryType: 'Permit',
      types: PERMIT_TYPES,
    });
  });

  it('drops a message field the primary type does not declare', () => {
    const summary = getRequestSummary(
      buildRequest('eth_signTypedData_v4', [
        ACCOUNT_A,
        buildPermit({
          owner: ACCOUNT_B,
          value: '1000',
          youAreApproving: '1 wei',
        }),
      ]),
    );

    expect(summary.message.message).toEqual({
      owner: ACCOUNT_B,
      value: '1000',
    });
  });

  it('formats every typed data variant as fields', () => {
    const payload = {domain: {}, message: {owner: ACCOUNT_B}};

    [
      'eth_signTypedData',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
    ].forEach(method => {
      expect(getMessageView(payload, method).kind).toBe('fields');
    });
  });

  it('never hides sibling fields of a personal_sign payload', () => {
    const signed = JSON.stringify({
      message: 'Login',
      scope: 'transfer all funds',
    });

    expect(getMessageView(signed, 'personal_sign')).toEqual({
      kind: 'raw',
      value: signed,
    });
  });

  it('distinguishes two payloads that differ only in whitespace', () => {
    const compact = getMessageView('{"a":1}', 'personal_sign');
    const spaced = getMessageView('{ "a" : 1 }', 'personal_sign');

    expect(compact).not.toEqual(spaced);
  });

  it('shows an empty object or array as the text that gets signed', () => {
    expect(getMessageView('{}', 'personal_sign')).toEqual({
      kind: 'raw',
      value: '{}',
    });
    expect(getMessageView('[]', 'eth_sign')).toEqual({
      kind: 'raw',
      value: '[]',
    });
  });

  it('keeps a non json message as raw copyable text', () => {
    expect(getMessageView('0x6869', 'personal_sign')).toEqual({
      kind: 'raw',
      value: '0x6869',
    });
  });

  it('does not restructure a non typed data payload', () => {
    expect(getMessageView({a: 1}, 'personal_sign').kind).toBe('raw');
  });
});
