/**
 * @jest-environment-options {"customExportConditions": ["node", "require"]}
 */
import type {Verifier as BwcVerifier} from '@bitpay-labs/bitcore-wallet-client';
import {readFileSync} from 'fs';
import type {BwcProvider} from './bwc';

jest.unmock('@solana/kit');
jest.setTimeout(30000);

// Jest gives the test the outer realm's Buffer, ArrayBuffer and Uint8Array.
const realms: (typeof globalThis)[] = [
  globalThis,
  Buffer.constructor('return this')(),
];
const builtInsMissingInHermes = realms.flatMap(
  (realm): [object, string[]][] => [
    [realm.Array.prototype, ['toSorted']],
    [
      Object.getPrototypeOf(realm.Int8Array).prototype,
      ['toSorted', 'toReversed', 'with'],
    ],
    [
      Object.getPrototypeOf(new realm.Int8Array(0).buffer),
      ['transfer', 'transferToFixedLength', 'resize'],
    ],
    [
      Object.getPrototypeOf(Object.getPrototypeOf(new realm.Array().values())),
      [
        'drop',
        'every',
        'filter',
        'find',
        'flatMap',
        'forEach',
        'map',
        'reduce',
        'some',
        'take',
        'toArray',
      ],
    ],
    [realm.Array, ['fromAsync']],
    [realm.Object, ['groupBy']],
    [realm.Map, ['groupBy']],
    [realm, ['Iterator']],
    [realm.JSON, ['rawJSON', 'isRawJSON']],
    [realm.RegExp, ['escape']],
    [realm.Math, ['f16round']],
  ],
);
const originals = builtInsMissingInHermes.flatMap(([owner, names]) =>
  names.map(name => ({
    owner,
    name,
    descriptor: Object.getOwnPropertyDescriptor(owner, name),
  })),
);
let BWC: BwcProvider;

beforeAll(() => {
  originals.forEach(({owner, name}) => {
    if (!Reflect.deleteProperty(owner, name)) {
      throw new Error(`Could not delete ${name}`);
    }
  });
  BWC = require('./bwc').BwcProvider.getInstance();
});

afterAll(() => {
  const notRestored = originals.filter(({owner, name, descriptor}) => {
    try {
      if (descriptor) {
        Object.defineProperty(owner, name, descriptor);
        return false;
      }
      return !Reflect.deleteProperty(owner, name);
    } catch {
      return true;
    }
  });

  expect(notRestored.map(({name}) => name)).toEqual([]);
});

describe('BwcProvider.createKey', () => {
  it.each([
    ['an invalid checksum', 'abandon '.repeat(12).trim()],
    ['an unknown word', `${'abandon '.repeat(11)}zzzzz`],
  ])('throws INVALID_BACKUP without the phrase for %s', (_case, phrase) => {
    let thrown: any;
    try {
      BWC.createKey({seedType: 'mnemonic', seedData: phrase});
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toEqual(new Error('INVALID_BACKUP'));
    expect(thrown.cause).toBeUndefined();
    expect(thrown.stack).not.toContain('abandon');
  });

  it('creates a key from a valid phrase', () => {
    const key = BWC.createKey({
      seedType: 'mnemonic',
      seedData: `${'abandon '.repeat(11)}about`,
    });

    expect(key.fingerPrint).toEqual(expect.any(String));
  });

  it('keeps the Bad Key version error for key objects', () => {
    expect(() =>
      BWC.createKey({seedType: 'object', seedData: {version: 2}}),
    ).toThrow('Bad Key version');
  });
});

describe('BwcProvider without the built-ins missing in Hermes', () => {
  const blockHash = 'GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi';
  let Verifier: typeof BwcVerifier;
  let keys: ReturnType<BwcProvider['createKey']>[];

  beforeAll(() => {
    Verifier = require('@bitpay-labs/bitcore-wallet-client').Verifier;
    keys = [
      `${'abandon '.repeat(11)}about`,
      'legal winner thank year wave sausage worth useful legal winner thank yellow',
      'letter advice cage absurd amount doctor acoustic avoid letter advice cage above',
    ].map(seedData => BWC.createKey({seedType: 'mnemonic', seedData}));
  });

  it('lists the built-ins missing in the Hermes version the app ships', () => {
    expect(
      readFileSync(
        require.resolve('react-native/sdks/hermes-engine/version.properties'),
        'utf8',
      ).trim(),
    ).toBe('HERMES_VERSION_NAME=250829098.0.17');
  });

  it('signs and verifies a message', () => {
    const Utils = BWC.getUtils();
    const signature =
      '3045022100d6186930e4cd9984e3168e15535e2297988555838ad10126d6c20d4ac0e74eb502201095a6319ea0a0de1f1e5fb50f7bf10b8069de10e0083e23dbbf8de9b8e02785';
    const publicKey =
      '03bec86ad4a8a91fe7c11ec06af27246ec55094db3d86098b7d8b2f12afe47627f';

    expect(
      Utils.signMessage(
        'hola',
        '09458c090a69a38368975fb68115df2f4b0ab7d1bc463fc60c67aa1730641d6c',
      ),
    ).toBe(
      '3045022100f2e3369dd4813d4d42aa2ed74b5cf8e364a8fa13d43ec541e4bc29525e0564c302205b37a7d1ca73f684f91256806cdad4b320b4ed3000bee2e388bcec106e0280e0',
    );
    expect(Utils.verifyMessage('hola', signature, publicKey)).toBe(true);
    expect(Utils.verifyMessage('chau', signature, publicKey)).toBe(false);
  });

  it.each([
    {
      chain: 'btc',
      addressType: 'P2PKH',
      copayers: 1,
      address: '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA',
      signatures: [
        [
          '3045022100c0f2f596b8e5020e2557f1fd19021cd75aa6507435359a19ac1062f1d6c3a44102205520605c859a17ebdd0c4ad67c34e4ea05b4bf44a3d506c49db468ea7345a214',
        ],
      ],
    },
    {
      chain: 'btc',
      addressType: 'P2WPKH',
      copayers: 1,
      address: 'bc1qmxrw6qdh5g3ztfcwm0et5l8mvws4eva24kmp8m',
      signatures: [
        [
          '30440220721d97ad60d875d99d067a4ff477f65744dabbd41a1aef6150c0cf96b981e9c302207af3d8b50920c169599539a688424c4402e093926ed4439439647745e215cb20',
        ],
      ],
    },
    {
      chain: 'btc',
      addressType: 'P2TR',
      copayers: 1,
      address: 'bc1plguuppjuw5uk2rpyjnnzvwsuvy5ctswns9fsvhrvn4qt04ns4nmscf9eqf',
      signatures: [[expect.stringMatching(/^[0-9a-f]{128}$/)]],
    },
    {
      chain: 'bch',
      addressType: 'P2PKH',
      copayers: 1,
      address: 'qqyx49mu0kkn9ftfj6hje6g2wfer34yfnq5tahq3q6',
      signatures: [
        [
          '56529e67bd781785430c04ad31f2bae009a2a7635e795d037759797e28ad4b228e26d3ed8ec98b270ab9e32484ddfe18ebee8a4123ab126e8a85d29a56f5de85',
        ],
      ],
    },
    {
      chain: 'ltc',
      addressType: 'P2PKH',
      copayers: 1,
      address: 'LUWPbpM43E2p7ZSh8cyTBEkvpHmr3cB8Ez',
      signatures: [
        [
          '30450221009f0aa518a38c5b51e1549cd8b03801973ff71bbd7455370498975f50eb423c99022017be9d0bb4ebb4eaa8b94b854cc721db8e13eca685e7d61f0e49f00eca89c299',
        ],
      ],
    },
    {
      chain: 'ltc',
      addressType: 'P2WPKH',
      copayers: 1,
      address: 'ltc1qvh20q3zqd8ecsy3puf9md2vmr4f7qzx0gr07tr',
      signatures: [
        [
          '3045022100d50592dbc80947e10dd22884d30fe942386e9811cfefe689d673a9dbac330c2d022060420fdcb8dea1175e2152fce7012a7de85ed3a342f88fe02d4aa26d622ac54b',
        ],
      ],
    },
    {
      chain: 'doge',
      addressType: 'P2PKH',
      copayers: 1,
      address: 'DBus3bamQjgJULBJtYXpEzDWQRwF5iwxgC',
      signatures: [
        [
          '3045022100e94f4a03da710786d3babceecb2b133206029199aead12f683f981d0dc0b673a022058914e9e05dd3b432b166e5cf35f701380a697b4112ca916a0a8ba4bdcde65d5',
        ],
      ],
    },
    {
      chain: 'btc',
      addressType: 'P2SH',
      copayers: 3,
      address: '3B5tF7dWvWKbfaFnu3dHRgRpMRB8cjcT8Z',
      signatures: [
        [
          '3044022035c6c4ba9bda82c08afe554f19ace2265e1fd2db6c2b304dba081488eaf1fe3402203fe8db59bb5ce92a1f81a90b433a6cce6fa656e826489f2dbc060f6841a42a53',
        ],
        [
          '304502210086d663a67baf8b308f27e58ccbc6ad6929d40814d0f8204c5322328e728fb72002201cfa6d149e048d8852483d1a9d86f5312d9f63159be59707cad4bb91b12b7c23',
        ],
      ],
    },
    {
      chain: 'btc',
      addressType: 'P2WSH',
      copayers: 3,
      address: 'bc1qpyvrzl50jmj3yc2h02q3fct2rnw4j3escq60weh2gaxq9tshc9fsdwedx0',
      signatures: [
        [
          '3044022006c0a2caa0cb46182336986bbfff836296ce983a3bfa649264345df8c5356af502201f63a40079b6036f1e5f07cfe67369a7fa396c12122f754c872b392a08466189',
        ],
        [
          '3045022100e75f21dd488fde52762c82377bec0087f5f5d90f0eec8c1b630fed5a2988b91e02200da44f7d7c720577a5bb7e5a7192b2c07094e4fff088a3dccc42d1376e25fa3c',
        ],
      ],
    },
    {
      chain: 'bch',
      addressType: 'P2SH',
      copayers: 3,
      address: 'pqyw9td0rrl623syf8rcwjt9wsfkgelspyc27y4rc6',
      signatures: [
        [
          'd5614bd7af6a57bc9a3deb13f7cc1aeede4c0e3f45146f190c3517b73eab9e9a47495fe7970280e15a677e48640601f219e7113d01eaa1baf45e52611668f19b',
        ],
        [
          '4fe0a0ddd4b5d7761a3403f73b5c600a43c8a9a94c7c0ef20f0ba238df003e94fa9f77bc5570463e6700bc656fb4bec50d1883c50ef3c1bc2d551f783fe95703',
        ],
      ],
    },
    {
      chain: 'ltc',
      addressType: 'P2SH',
      copayers: 3,
      address: 'MRTSvDJ9FjLWRJm9t7TtL8AFDJ3WRw4PkG',
      signatures: [
        [
          '304402204e7be8629548663fd88d6737b9fc285d177ed8366c4a2bd05475cd79a0dac31e022015bcb08446f4243fa28716f8433cedfd2f4cb63c8648e6788e48aa060b65d7e6',
        ],
        [
          '304502210085952a561d4085015f0c9b1148c8312ede42f2df94a8756a2e669da5c01ca74b0220243ec637e958bec468ee14c013cbea704d4844726167202bbd43f9c9ce024797',
        ],
      ],
    },
    {
      chain: 'ltc',
      addressType: 'P2WSH',
      copayers: 3,
      address:
        'ltc1qhp6x2mlnjrkh4ruenz9dpnmadnjwnxgk5t8cpqh39pll5c2xl9hspfttw5',
      signatures: [
        [
          '304402202251626e7ddae965607d627ba416cf646a05480b4d9c5211865d2965ab0bf465022028ee1e4cb09354789173dbcaf12cad6cee63dcd0206cb9572fcbd86cf2a20975',
        ],
        [
          '30440220678a8fd9ba4708d9b95bea2873a28fc559455068ed16de2e7108bdd08668cde6022009666be6e54ab1b3235ee3b751f19c840abb8827bc8a84d2ef8816aa5a95a093',
        ],
      ],
    },
    {
      chain: 'doge',
      addressType: 'P2SH',
      copayers: 3,
      address: 'A1PAHnu5U4bAGCFyY89qGscvJ11xnZixmq',
      signatures: [
        [
          '3045022100d49f59121131c847ff1e5b3caf23370b80c2347540b27945c03d3822ddc9506a02205cf22cd8259671fa8d42fda03e1c14eccd3e64c4e7198557bf02ba111ef8cdc4',
        ],
        [
          '30450221008db8d01a2483b0b7f10b979c355a9d30042097dacf5958183d2e8e3beaeeed690220534b9db7ad6f2479bbc3f4ba2e8cd6a5c5754277f63737427adaffce32bf331b',
        ],
      ],
    },
  ])(
    'derives and signs $chain $addressType with $copayers copayers',
    async ({chain, addressType, copayers, address, signatures}) => {
      const Utils = BWC.getUtils();
      const bitcoreByChain: {[chain: string]: any} = {
        btc: BWC.getBitcore(),
        bch: BWC.getBitcoreCash(),
        ltc: BWC.getBitcoreLtc(),
        doge: BWC.getBitcoreDoge(),
      };
      const m = copayers === 1 ? 1 : 2;
      const credentials = keys.slice(0, copayers).map(key =>
        key.createCredentials(undefined, {
          coin: chain,
          chain,
          network: 'livenet',
          account: 0,
          n: copayers,
          m,
          addressType,
        }),
      );
      const publicKeyRing = credentials.map(({xPubKey}) => ({xPubKey}));
      const receive = Utils.deriveAddress(
        addressType,
        publicKeyRing,
        'm/0/0',
        m,
        'livenet',
        chain,
      );
      const change = Utils.deriveAddress(
        addressType,
        publicKeyRing,
        'm/1/0',
        m,
        'livenet',
        chain,
      );
      const recipient = Utils.deriveAddress(
        addressType,
        publicKeyRing,
        'm/0/1',
        m,
        'livenet',
        chain,
      );
      const txp = {
        chain,
        coin: chain,
        network: 'livenet',
        version: 3,
        addressType,
        requiredSignatures: m,
        signingMethod: chain === 'bch' ? 'schnorr' : undefined,
        inputs: [
          {
            txid: '66e64ef8a3b384164b78453fa8c8194de9a473ba14f89485a0e433699daec140',
            vout: 0,
            satoshis: 1000000,
            address: receive.address,
            path: 'm/0/0',
            publicKeys: receive.publicKeys,
            scriptPubKey: bitcoreByChain[chain].Script.fromAddress(
              receive.address,
            ).toHex(),
          },
        ],
        outputs: [{toAddress: recipient.address, amount: 500000}],
        changeAddress: change,
        outputOrder: [0, 1],
        fee: 10000,
      };
      credentials[0].addPublicKeyRing(publicKeyRing);

      expect(receive.address).toBe(address);
      expect(Verifier.checkAddress(credentials[0], receive)).toBe(true);
      expect(
        Verifier.checkAddress(credentials[0], {...receive, publicKeys: []}),
      ).toBe(false);
      expect(
        Verifier.checkAddress(credentials[0], {
          ...receive,
          address: change.address,
        }),
      ).toBe(false);
      expect(
        await Promise.all(
          credentials
            .slice(0, m)
            .map((copayer, i) => keys[i].sign(copayer.rootPath, txp)),
        ),
      ).toEqual(signatures);
    },
  );

  it.each([
    {
      name: 'eth',
      chain: 'eth',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      to: '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25',
      txp: {nonce: '0', gasPrice: 20000000000, gasLimit: 21000},
      signatures: [
        '0xfb9f85c4ad7d92e38b6354ea4e60ab3adc23caf5becf44ca0b4faf76444ff530719a46aadafc37a7d23f0fa89bdd90f0882693889f159c35ac689fd8eef8e5941b',
      ],
    },
    {
      name: 'eth ERC20',
      chain: 'eth',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      to: '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25',
      txp: {
        nonce: '0',
        gasPrice: 20000000000,
        gasLimit: 60000,
        tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      },
      signatures: [
        '0x36dfa190a2463754149724771b40b0a8e8b056bca7ae6532ac4a7fef96dc21712641fa1dc7fc707c20072aed88df401ea3e3c691c3df5e2b2e8a45f1556824cd1c',
      ],
    },
    {
      name: 'matic',
      chain: 'matic',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      to: '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25',
      txp: {nonce: '0', gasPrice: 20000000000, gasLimit: 21000},
      signatures: [
        '0xf0001f3c119277bdfd2f60301ffb668a5d8bd2fd4f9add51f59428f116e250e15483737b13e7b1f5134bc7f35be24e5e5b98bc32c0f92ff84b6e8efb6c6aa8141c',
      ],
    },
    {
      name: 'arb',
      chain: 'arb',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      to: '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25',
      txp: {nonce: '0', gasPrice: 20000000000, gasLimit: 21000},
      signatures: [
        '0xff234798fd2b2e756c34afb0fe61728d46d46b4f58da656da097d6c2f7c7a29617fbb751874b4438213161b0b7e05a7e1a13918bd677ce262088271d12689c041b',
      ],
    },
    {
      name: 'base',
      chain: 'base',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      to: '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25',
      txp: {nonce: '0', gasPrice: 20000000000, gasLimit: 21000},
      signatures: [
        '0x978cb45edff33bb43e8f57674a07af3a53dcc6f0aeb092c9c404d9a6506512ed056b8502585bc9f5993c62b7fc8ca4cf7901330c3cc2e2fb689c66546bce2c981b',
      ],
    },
    {
      name: 'op',
      chain: 'op',
      address: '0x9858EfFD232B4033E47d90003D41EC34EcaEda94',
      to: '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25',
      txp: {nonce: '0', gasPrice: 20000000000, gasLimit: 21000},
      signatures: [
        '0xc833f82ac0712349967af09b665fd8ece50b3fd66fd56707615598a33c825e435401657966731ccab711d76504a0acb803fa1a46b6b7c7d804612bbcbe0b4fe41c',
      ],
    },
    {
      name: 'xrp',
      chain: 'xrp',
      address: 'rHsMGQEkVNJmpGWs8XUBoTBiAAbwxZN5v3',
      to: 'rpaLPza5oxhJ7V8nFDwPm9F7kmZ16uc8do',
      txp: {fee: 12, nonce: 1},
      signatures: [
        '3045022100BDA5A7535CB22EFEA155A630954417DC5A3E04DC0FC468E7898B51607B7C5EC202206EF0494D5577B282685970C5639D64AB8F921E9706BA425A737942491AD2852A',
      ],
    },
    {
      name: 'sol',
      chain: 'sol',
      address: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
      to: 'BLeUXTx9thHGT7VJUtF9vHEmfMDgW1nnKZ9UVer2CoLX',
      txp: {fee: 5000, blockHash, blockHeight: 100},
      signatures: [
        '5XyghwwS6oG6T1LPLXVxMfXVd9m3zkHzv5Cz3FM5fmWsKLhCSnvxLPYavNs6STQX1tV5qfJbZkqG56si9r6xY3qw',
      ],
    },
    {
      name: 'sol SPL',
      chain: 'sol',
      address: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
      to: 'BLeUXTx9thHGT7VJUtF9vHEmfMDgW1nnKZ9UVer2CoLX',
      txp: {
        fee: 5000,
        blockHash,
        blockHeight: 100,
        tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        fromAta: 'HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk',
      },
      signatures: [
        '4qQfKr9pBtPznEE1Bp7Pi4jrDCgbau36qCV4SiFo2UfiR3qp6yTdmc2VSTu9Ykb1RBN4ZQXpWtijDjpDJLDZ1vbX',
      ],
    },
  ])(
    'derives and signs $name',
    async ({chain, address, to, txp, signatures}) => {
      const credentials = keys[0].createCredentials(undefined, {
        coin: chain,
        chain,
        network: 'livenet',
        account: 0,
        n: 1,
      });
      const derived = BWC.getUtils().deriveAddress(
        'P2PKH',
        [{xPubKey: credentials.xPubKey}],
        'm/0/0',
        1,
        'livenet',
        chain,
        undefined,
        undefined,
        credentials.clientDerivedPublicKey,
      );

      expect(derived.address).toBe(address);
      expect(
        await keys[0].sign(credentials.rootPath, {
          chain,
          coin: chain,
          network: 'livenet',
          from: address,
          outputs: [{toAddress: to, amount: 1000}],
          ...txp,
        }),
      ).toEqual(signatures);
    },
  );
});
