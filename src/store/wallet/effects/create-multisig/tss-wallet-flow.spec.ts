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
afterAll(() => {
  global.Buffer = nodeBuffer;
});

const configureTestStore = require('@test/store').default;
const {
  startCreateTSSKey,
  generateJoinerSessionId,
  addCoSignerToTSS,
  startTSSCeremony,
  createTSSChainWallets,
  joinTSSWithCode,
  cancelTSSCeremony,
} = require('./create-multisig');
const {createWalletAddress} = require('../address/address');
const {createTxProposal, publishTx} = require('../send/send');
const {startTSSSigning} = require('../tss-send/tss-send');
const {
  bootstrapKey,
  bootstrapWallets,
} = require('../../../transforms/transforms');
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

describe.each([
  {network: 'livenet', n: 2},
  {network: 'testnet', n: 3},
])('TSS wallet flow against real BWC ($network, 2-of-$n)', ({network, n}) => {
  let unmountDklsWorker: () => void;
  let creatorStore: any;
  let joinerStore: any;
  let creatorKey: any;
  let joinerKey: any;
  let stores: any[];
  let keys: any[];
  const ceremonyKeyIds: string[] = [];

  beforeAll(async () => {
    resetFakeBws();
    unmountDklsWorker = await mountDklsWorkerHost();

    creatorStore = configureTestStore({});
    stores = [
      creatorStore,
      ...Array.from({length: n - 1}, () => configureTestStore({})),
    ];
    joinerStore = stores[1];

    const {key: pendingKey} = await creatorStore.dispatch(
      startCreateTSSKey({
        coin: 'eth',
        chain: 'eth',
        network,
        m: 2,
        n,
        myName: 'Creator',
        walletName: 'TSS Wallet',
      }),
    );
    const invitations: any[] = [];
    for (let partyId = 1; partyId < n; partyId++) {
      const {sessionId, partyKey} = await stores[partyId].dispatch(
        generateJoinerSessionId({name: `Joiner ${partyId}`}),
      );
      const {joinCode} = await creatorStore.dispatch(
        addCoSignerToTSS({
          keyId: pendingKey.id,
          joinerSessionId: sessionId,
          partyId,
        }),
      );
      invitations.push({joinCode, partyKey, partyId});
    }
    ceremonyKeyIds.push(pendingKey.id);

    keys = await settleAll([
      creatorStore.dispatch(startTSSCeremony(pendingKey.id)),
      ...invitations.map(({joinCode, partyKey, partyId}) =>
        stores[partyId].dispatch(
          joinTSSWithCode({
            joinCode,
            partyKey,
            myName: `Joiner ${partyId}`,
            onKeyCreated: (keyId: string) => ceremonyKeyIds.push(keyId),
          }),
        ),
      ),
    ]);
    const primaryWalletIds = keys.map((key, index) => {
      const persisted = stores[index].getState().WALLET.keys[key.id];
      expect(persisted.tssSession.status).toBe('complete');
      expect(persisted.wallets[0].credentials.publicKeyRing).toHaveLength(n);
      return persisted.wallets[0].credentials.walletId;
    });
    keys = await settleAll(
      keys.map((key, index) =>
        stores[index].dispatch(createTSSChainWallets(key.id)),
      ),
    );
    expect(keys.map(key => key.wallets[0].credentials.walletId)).toEqual(
      primaryWalletIds,
    );
    [creatorKey, joinerKey] = keys;
  });

  afterAll(() => {
    for (const keyId of ceremonyKeyIds) {
      creatorStore.dispatch(cancelTSSCeremony(keyId));
    }
    unmountDklsWorker();
  });

  it('completes the ceremony for every party', () => {
    for (const key of keys) {
      expect(key.tssSession.status).toBe('complete');
      expect(key.wallets[0].pendingTssSession).toBeUndefined();
    }
  });

  it('links every party to the same BWS wallet and shared public key', () => {
    for (const key of keys) {
      expect(key.wallets[0].credentials.walletId).toBe(
        creatorKey.wallets[0].credentials.walletId,
      );
      expect(key.methods.getXPubKey(network)).toBe(
        creatorKey.methods.getXPubKey(network),
      );
    }
  });

  it('saves matching BWS wallets for every EVM chain in every key', () => {
    expect(
      creatorKey.wallets.map((w: any) => [
        w.credentials.chain,
        w.credentials.coin,
      ]),
    ).toEqual([
      ['eth', 'eth'],
      ['matic', 'matic'],
      ['arb', 'eth'],
      ['base', 'eth'],
      ['op', 'eth'],
    ]);
    for (const key of keys) {
      expect(key.wallets.map((w: any) => w.credentials.walletId)).toEqual(
        creatorKey.wallets.map((w: any) => w.credentials.walletId),
      );
      expect(
        new Set(key.wallets.map((w: any) => w.credentials.walletId)).size,
      ).toBe(5);
      expect(
        new Set(key.wallets.map((w: any) => w.credentials.walletPrivKey)).size,
      ).toBe(5);
    }
    for (const wallet of keys.flatMap(key => key.wallets)) {
      expect(wallet.isComplete()).toBe(true);
      expect(wallet.credentials.walletPrivKey).toBeTruthy();
      expect(wallet.credentials.network).toBe(network);
      expect(wallet.credentials.publicKeyRing).toHaveLength(n);
      expect(wallet.credentials.m).toBe(1);
      expect(wallet.credentials.n).toBe(1);
    }
  });

  it('gives every chain wallet the address of the shared key', async () => {
    for (const [index, key] of keys.entries()) {
      const store = stores[index];
      const addresses = await Promise.all(
        key.wallets.map((wallet: any) =>
          store.dispatch(createWalletAddress({wallet, newAddress: false})),
        ),
      );

      expect(new Set(addresses)).toEqual(new Set([addresses[0]]));
    }
  });

  it('lets each party read a receive address from its saved wallet', async () => {
    for (const [index, key] of keys.entries()) {
      const store = stores[index];
      const address = await store.dispatch(
        createWalletAddress({wallet: key.wallets[0], newAddress: false}),
      );

      expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });

  it('restores each saved TSS key with the same shared public key after a restart', () => {
    for (const [index, key] of keys.entries()) {
      const store = stores[index];
      const persisted = JSON.parse(
        JSON.stringify(store.getState().WALLET.keys[key.id]),
      );

      const restored = bootstrapKey(persisted, key.id);

      expect(restored.methods.getXPubKey(network)).toBe(
        key.methods.getXPubKey(network),
      );
      expect(restored.wallets.map((w: any) => w.credentials.walletId)).toEqual(
        key.wallets.map((w: any) => w.credentials.walletId),
      );
    }
  });

  it.each(['eth', 'arb'])(
    'signs a %s transaction with restored keys into a signature from its address',
    async chain => {
      const restoredKeys = [creatorKey, joinerKey].map((key, index) => {
        const restored = bootstrapKey(
          JSON.parse(
            JSON.stringify(stores[index].getState().WALLET.keys[key.id]),
          ),
          key.id,
        );
        restored.wallets = bootstrapWallets(restored.wallets);
        return restored;
      });
      const creatorWallet = restoredKeys[0].wallets.find(
        (wallet: any) => wallet.chain === chain,
      );
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
            key: restoredKeys[0],
            wallet: creatorWallet,
            txp: JSON.parse(JSON.stringify(txp)),
            callbacks: creatorCallbacks,
          }),
        ),
        joinerStore.dispatch(
          startTSSSigning({
            key: restoredKeys[1],
            wallet: restoredKeys[1].wallets.find(
              (wallet: any) => wallet.chain === chain,
            ),
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
        chain: chain.toUpperCase(),
        tx: Array.isArray(unsignedTx) ? unsignedTx[0] : unsignedTx,
        signature,
      });
      const walletAddress = BWC.getUtils().deriveAddress(
        'P2PKH',
        [],
        'm/0/0',
        1,
        network,
        chain,
        undefined,
        undefined,
        creatorWallet.credentials.clientDerivedPublicKey,
      ).address;
      expect(BWC.getCore().ethers.Transaction.from(signedTx).from).toBe(
        walletAddress,
      );
    },
  );
});
