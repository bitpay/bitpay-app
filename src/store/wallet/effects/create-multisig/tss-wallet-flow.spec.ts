/**
 * @jest-environment-options {"customExportConditions": ["node", "require"]}
 */
import {Buffer as RNBuffer} from '@craftzdog/react-native-buffer';
import {mountDklsWorkerHost} from '@test/dklsWebView';
import {resetFakeBws} from '@test/fakeBws';
import {restrictBufferApi} from '@test/rnBuffer';

jest.unmock('@bitpay-labs/bitcore-tss');
jest.mock('superagent', () => require('@test/fakeBws').fakeBwsAgent);
jest.mock('buffer', () => {
  const actual = jest.requireActual('buffer');
  return {
    ...actual,
    Buffer: require('@test/rnBuffer').restrictBufferApi(
      actual.Buffer,
      jest.requireActual('buffer/').Buffer,
    ),
  };
});
jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

const nodeBuffer = global.Buffer;
global.Buffer = restrictBufferApi(nodeBuffer, RNBuffer);

const configureTestStore = require('@test/store').default;
const {
  startCreateTSSKey,
  generateJoinerSessionId,
  addCoSignerToTSS,
  startTSSCeremony,
  joinTSSWithCode,
  cancelTSSCeremony,
} = require('./create-multisig');
const {createWalletAddress} = require('../address/address');
const {createTxProposal, publishTx} = require('../send/send');
const {startTSSSigning} = require('../tss-send/tss-send');
const {bootstrapKey} = require('../../../transforms/transforms');
const {BwcProvider} = require('../../../../lib/bwc');

jest.setTimeout(120000);

const RECIPIENT = '0x000000000000000000000000000000000000dEaD';

const settleAll = async (promises: Promise<any>[]) => {
  const results = await Promise.allSettled(promises);
  const failure = results.find(r => r.status === 'rejected');
  if (failure) {
    throw (failure as PromiseRejectedResult).reason;
  }
  return results.map(r => (r as PromiseFulfilledResult<any>).value);
};

const createSigningCallbacks = () => ({
  onStatusChange: jest.fn(),
  onCopayerStatusChange: jest.fn(),
  onRoundUpdate: jest.fn(),
  onProgressUpdate: jest.fn(),
  onComplete: jest.fn(),
  onError: jest.fn(),
});

describe('TSS wallet flow against the real bitcore-wallet-client', () => {
  let unmountDklsWorker: () => void;
  let creatorStore: any;
  let joinerStore: any;
  let creatorKey: any;
  let joinerKey: any;
  const ceremonyKeyIds: string[] = [];

  beforeAll(async () => {
    resetFakeBws();
    unmountDklsWorker = await mountDklsWorkerHost();

    creatorStore = configureTestStore({});
    joinerStore = configureTestStore({});

    const {key} = await creatorStore.dispatch(
      startCreateTSSKey({
        coin: 'eth',
        chain: 'eth',
        network: 'livenet',
        m: 2,
        n: 2,
        myName: 'Creator',
        walletName: 'TSS Wallet',
      }),
    );
    const {sessionId, partyKey} = await joinerStore.dispatch(
      generateJoinerSessionId({name: 'Joiner'}),
    );
    const {joinCode} = await creatorStore.dispatch(
      addCoSignerToTSS({keyId: key.id, joinerSessionId: sessionId, partyId: 1}),
    );
    ceremonyKeyIds.push(key.id);

    [creatorKey, joinerKey] = await settleAll([
      creatorStore.dispatch(startTSSCeremony(key.id)),
      joinerStore.dispatch(
        joinTSSWithCode({
          joinCode,
          partyKey,
          myName: 'Joiner',
          onKeyCreated: (keyId: string) => ceremonyKeyIds.push(keyId),
        }),
      ),
    ]);
  });

  afterAll(() => {
    for (const keyId of ceremonyKeyIds) {
      creatorStore.dispatch(cancelTSSCeremony(keyId));
    }
    unmountDklsWorker();
    global.Buffer = nodeBuffer;
  });

  it('completes the ceremony for the creator and the co-signer', () => {
    expect(creatorKey.tssSession.status).toBe('complete');
    expect(joinerKey.tssSession.status).toBe('complete');
    expect(creatorKey.wallets[0].pendingTssSession).toBeUndefined();
    expect(joinerKey.wallets[0].pendingTssSession).toBeUndefined();
  });

  it('links both parties to the same BWS wallet and shared public key', () => {
    expect(creatorKey.wallets[0].credentials.walletId).toBe(
      joinerKey.wallets[0].credentials.walletId,
    );
    expect(creatorKey.methods.getXPubKey('livenet')).toBe(
      joinerKey.methods.getXPubKey('livenet'),
    );
  });

  it('lets each party read a receive address from its saved wallet', async () => {
    for (const [store, key] of [
      [creatorStore, creatorKey],
      [joinerStore, joinerKey],
    ]) {
      const address = await store.dispatch(
        createWalletAddress({wallet: key.wallets[0], newAddress: false}),
      );

      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });

  it('restores each saved TSS key with the same shared public key after a restart', () => {
    for (const [store, key] of [
      [creatorStore, creatorKey],
      [joinerStore, joinerKey],
    ]) {
      const persisted = JSON.parse(
        JSON.stringify(store.getState().WALLET.keys[key.id]),
      );

      const restored = bootstrapKey(persisted, key.id);

      expect(restored.methods.getXPubKey('livenet')).toBe(
        key.methods.getXPubKey('livenet'),
      );
    }
  });

  it('signs a transaction proposal with both parties into a signature from the wallet address', async () => {
    const creatorWallet = creatorKey.wallets[0];
    const createdTxp = await creatorStore.dispatch(
      createTxProposal(creatorWallet, {
        outputs: [{toAddress: RECIPIENT, amount: 1000, gasLimit: 21000}],
        gasPrice: 1000000000,
      }),
    );
    const txp = await publishTx(creatorWallet, createdTxp);
    const creatorCallbacks = createSigningCallbacks();
    const joinerCallbacks = createSigningCallbacks();

    await settleAll([
      creatorStore.dispatch(
        startTSSSigning({
          key: creatorKey,
          wallet: creatorWallet,
          txp: JSON.parse(JSON.stringify(txp)),
          callbacks: creatorCallbacks,
        }),
      ),
      joinerStore.dispatch(
        startTSSSigning({
          key: joinerKey,
          wallet: joinerKey.wallets[0],
          txp: JSON.parse(JSON.stringify(txp)),
          callbacks: joinerCallbacks,
        }),
      ),
    ]);

    const [signature] = creatorCallbacks.onComplete.mock.calls[0];
    expect(joinerCallbacks.onComplete).toHaveBeenCalledWith(signature);

    const BWC = BwcProvider.getInstance();
    const unsignedTx = BWC.getUtils().buildTx(txp).uncheckedSerialize();
    const signedTx = BWC.getCore().Transactions.applySignature({
      chain: 'ETH',
      tx: Array.isArray(unsignedTx) ? unsignedTx[0] : unsignedTx,
      signature,
    });
    const walletAddress = BWC.getUtils().deriveAddress(
      'P2PKH',
      [],
      'm/0/0',
      1,
      'livenet',
      'eth',
      undefined,
      undefined,
      creatorWallet.credentials.clientDerivedPublicKey,
    ).address;
    expect(BWC.getCore().ethers.Transaction.from(signedTx).from).toBe(
      walletAddress,
    );
  });
});
