/**
 * @jest-environment-options {"customExportConditions":["node","node-addons"]}
 */
// Exercise the installed SDK, substituting only the asynchronous RN WASM bridge.
// These are adapter tests, not native cryptography or multi-party signing tests.
const {Buffer} = require('buffer');
const {encode} = require('cbor-x');
const {Dkg} = jest.requireActual(
  '@bitgo/sdk-lib-mpc/dist/src/tss/ecdsa-dkls/dkg',
);
const {Dsg} = jest.requireActual(
  '@bitgo/sdk-lib-mpc/dist/src/tss/ecdsa-dkls/dsg',
);
const {DkgState} = require('@bitgo/sdk-lib-mpc/dist/src/tss/ecdsa-dkls/types');

describe('rebased TSS dependency compatibility', () => {
  it.each([
    ['WaitMsg2', undefined, DkgState.Round2],
    ['WaitMsg4', Buffer.from([1]), DkgState.Complete],
  ])(
    'derives restored DKG state from async %s bytes',
    async (round, keyShareBuff, expected) => {
      const bytes = encode({round});
      const toBytes = jest.fn().mockResolvedValue(bytes);
      const fromBytes = jest.fn().mockResolvedValue({toBytes});
      const dkg = await Dkg.restoreSession(
        2,
        2,
        0,
        {dkgSessionBytes: bytes, dkgState: DkgState.InvalidState, keyShareBuff},
        undefined,
        undefined,
        {KeygenSession: {fromBytes}},
      );

      expect(fromBytes).toHaveBeenCalledWith(bytes);
      expect(toBytes).toHaveBeenCalledTimes(1);
      expect(dkg.getSessionData().dkgState).toBe(expected);
    },
  );

  it('preserves seed validation before constructing a native DKG session', async () => {
    const KeygenSession = jest.fn();
    const dkg = new Dkg(2, 2, 0, Buffer.alloc(31), undefined, {KeygenSession});
    await expect(dkg.initDkg()).rejects.toThrow('Seed should be 32 bytes');
    expect(KeygenSession).not.toHaveBeenCalled();
  });

  it('awaits asynchronous key-share, message and session APIs when signing starts', async () => {
    const bytes = encode({round: 'WaitMsg1'});
    const message = {
      payload: jest.fn().mockResolvedValue(new Uint8Array([1, 2])),
      free: jest.fn().mockResolvedValue(undefined),
    };
    const session = {
      createFirstMessage: jest.fn().mockResolvedValue(message),
      toBytes: jest.fn().mockResolvedValue(bytes),
    };
    const keyShare = {partyId: jest.fn().mockResolvedValue(0)};
    const wasm = {
      Keyshare: {fromBytes: jest.fn().mockResolvedValue(keyShare)},
      SignSessionOTVariant: jest.fn().mockImplementation(() => session),
    };
    const dsg = new Dsg(Buffer.from([1]), 0, 'm/0', Buffer.alloc(32), wasm);

    await expect(dsg.init()).resolves.toEqual({
      payload: new Uint8Array([1, 2]),
      from: 0,
    });
    expect(keyShare.partyId).toHaveBeenCalledTimes(1);
    expect(message.free).toHaveBeenCalledTimes(1);
    expect(dsg.getSession()).toBe(Buffer.from(bytes).toString('base64'));
  });

  it('preserves the upstream message-hash length check', async () => {
    const fromBytes = jest.fn();
    const dsg = new Dsg(Buffer.from([1]), 0, 'm/0', Buffer.alloc(31), {
      Keyshare: {fromBytes},
    });
    await expect(dsg.init()).rejects.toThrow('Invalid messageHash length');
    expect(fromBytes).not.toHaveBeenCalled();
  });
});
