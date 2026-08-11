jest.mock('secp256k1', () => jest.requireActual('secp256k1/elliptic'));

const BitAuth = require('bitauth/lib/bitauth-node');
const metroConfig = require('../../metro.config');

describe('BitAuth Metro implementation', () => {
  it.each(['ios', 'android'])(
    'aliases bitauth to the CBC-free production signer on %s',
    platform => {
      const resolveRequest = jest.fn(
        (_context: unknown, moduleName: string) => moduleName,
      );

      metroConfig.resolver.resolveRequest(
        {resolveRequest},
        'bitauth',
        platform,
      );

      expect(resolveRequest).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringMatching(/bitauth\/lib\/bitauth-node\.js$/),
        platform,
      );
    },
  );

  it('preserves signing without exporting the CBC helpers', () => {
    const privateKey =
      '0000000000000000000000000000000000000000000000000000000000000001';
    const publicKey = BitAuth.getPublicKeyFromPrivateKey(privateKey);
    const signature = BitAuth.sign('bitpay-test-vector', privateKey);

    expect(publicKey).toBe(
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    );
    expect(signature.toString('hex')).toBe(
      '304402205807d12cfc30686cca25b7e7e5e3154875e10e13ce0dd26f5b502d42bea7b83402204832b41c3bc3713511b48cd27ac661d9102357330b4c66f5112af592c3aa2b29',
    );
    expect(
      BitAuth.verifySignature('bitpay-test-vector', publicKey, signature),
    ).toBe(true);
    expect(BitAuth.encrypt).toBeUndefined();
    expect(BitAuth.decrypt).toBeUndefined();
  });
});
