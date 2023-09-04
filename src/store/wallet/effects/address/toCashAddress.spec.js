import {ToCashAddress} from './address';

/**
 * toCashAddress Tests
 */
describe('toCashAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will respond with the address without prefix if not provided', async () => {
    const result = ToCashAddress('qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45');
    expect(result).toEqual('qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45');
  });

  it('will respond with the address with prefix if not provided', async () => {
    const result = ToCashAddress(
      'qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45',
      'bitcoincash',
    );
    expect(result).toEqual(
      'bitcoincash:qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45',
    );
  });

  it('will throw a fatal error if getting a legacy address', async () => {
    expect(() => {
      ToCashAddress('17ZDREWiRYj1BC6iFKM7eBpE33sv34772c');
    }).toThrow();
  });

  it('will throw a fatal error if not getting a valid address', async () => {
    expect(() => {
      ToCashAddress('17ZDREWiRY');
    }).toThrow();
  });
});
