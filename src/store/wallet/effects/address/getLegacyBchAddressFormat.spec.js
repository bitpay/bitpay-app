import {GetLegacyBchAddressFormat} from './address';

/**
 * getLegacyBchAddressFormat Tests
 */
describe('getLegacyBchAddressFormat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will convert an address correctly', async () => {
    const result = GetLegacyBchAddressFormat(
      'bitcoincash:qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45',
    );
    expect(result).toEqual('17ZDREWiRYj1BC6iFKM7eBpE33sv34772c');
  });

  it('will throw a fatal error if not getting a valid address', async () => {
    expect(() => {
      GetLegacyBchAddressFormat('bitcoincash:2973');
    }).toThrow();
  });
});
