/**
 * @jest-environment-options {"customExportConditions": ["node", "require"]}
 */
import {Buffer as RNBuffer} from '@craftzdog/react-native-buffer';
import {mountDklsWorkerHost} from '@test/dklsWebView';
import {restrictBufferApi} from '@test/rnBuffer';

jest.unmock('@bitpay-labs/bitcore-tss');
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

const nodeBuffer = global.Buffer;
global.Buffer = restrictBufferApi(nodeBuffer, RNBuffer);

const {ECDSA, ECIES} = require('@bitpay-labs/bitcore-tss');
const bitcoreLib = require('@bitpay-labs/bitcore-lib');

jest.setTimeout(30000);

const toOtherParties = (messages: any[], partyId: number) =>
  JSON.parse(JSON.stringify(messages.filter(m => m.partyId !== partyId))).map(
    (m: any) => ({
      ...m,
      p2pMessages: m.p2pMessages.filter((p: any) => p.to === partyId),
    }),
  );

const runRounds = async (parties: any[], firstMessages: any[]) => {
  let messages = firstMessages;
  for (let round = 1; round <= 4; round++) {
    messages = await Promise.all(
      parties.map((party, i) => party.nextRound(toOtherParties(messages, i))),
    );
  }
};

describe('TSS ceremony under the React Native runtime', () => {
  const n = 2;
  const m = 2;
  const authKeys = [new bitcoreLib.PrivateKey(), new bitcoreLib.PrivateKey()];
  let unmountDklsWorker: () => void;
  let keychains: any[];

  beforeAll(async () => {
    unmountDklsWorker = await mountDklsWorkerHost();
  });

  afterAll(() => {
    unmountDklsWorker();
    global.Buffer = nodeBuffer;
  });

  it('completes a 2-of-2 key generation and returns a keychain per party', async () => {
    const keygens = authKeys.map(
      (authKey, partyId) =>
        new ECDSA.KeyGen({
          n,
          m,
          partyId,
          seed: bitcoreLib.crypto.Random.getRandomBuffer(32),
          authKey,
        }),
    );

    const firstMessages = await Promise.all(keygens.map(k => k.initJoin()));
    await runRounds(keygens, firstMessages);

    keychains = keygens.map(k => k.getKeyChain());

    expect(keygens.every(k => k.isKeyChainReady())).toBe(true);
    expect(keychains[0].commonKeyChain).toBe(keychains[1].commonKeyChain);
    for (const keychain of keychains) {
      expect(keychain.privateKeyShare.length).toBeGreaterThan(0);
      expect(keychain.reducedPrivateKeyShare.length).toBeGreaterThan(0);
    }
  });

  it('signs a message hash with both parties and produces the same signature', async () => {
    const messageHash = bitcoreLib.crypto.Hash.sha256(
      Buffer.from('tss-ceremony'),
    );
    const signers = authKeys.map(
      (authKey, partyId) =>
        new ECDSA.Sign({
          keychain: keychains[partyId],
          partyId,
          m,
          n,
          derivationPath: 'm/0/0',
          messageHash,
          authKey,
        }),
    );

    const firstMessages = await Promise.all(signers.map(s => s.initJoin()));
    await runRounds(signers, firstMessages);

    const [sig0, sig1] = signers.map(s => s.getSignature());
    expect(sig0).toEqual(sig1);
  });

  it('round-trips an ECIES payload between two parties', () => {
    const [sender, receiver] = authKeys;
    const payload = ECIES.encrypt({
      message: 'session-id:1:btc:livenet:2:2',
      publicKey: receiver.publicKey,
      privateKey: sender,
    });

    const decrypted = ECIES.decrypt({payload, privateKey: receiver});

    expect(decrypted.toString()).toBe('session-id:1:btc:livenet:2:2');
  });
});
