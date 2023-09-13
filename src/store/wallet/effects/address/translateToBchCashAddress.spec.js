import {TranslateToBchCashAddress} from './address';

/**
 * translateToBchCashAddress Tests
 */
describe('translateToBchCashAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will convert an address correctly', async () => {
    const result = TranslateToBchCashAddress(
      '17ZDREWiRYj1BC6iFKM7eBpE33sv34772c',
    );
    expect(result).toEqual(
      'bitcoincash:qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45',
    );
  });

  it('will throw a fatal error if not getting a valid address', async () => {
    expect(() => {
      TranslateToBchCashAddress('17ZDREWiRY');
    }).toThrow();
  });
});
