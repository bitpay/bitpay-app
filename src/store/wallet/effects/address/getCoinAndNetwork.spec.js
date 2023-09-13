import {GetCoinAndNetwork} from './address';
import {ExtractCoinNetworkAddress} from '../../utils/decode-uri';

/**
 * Mock ExtractCoinNetworkAddress
 */
jest.mock('../../utils/decode-uri', () => ({
  ...jest.requireActual('../../utils/decode-uri'),
  ExtractCoinNetworkAddress: jest.fn().mockImplementation(coin => {
    switch (coin) {
      case 'btc':
        return '1GqpTUcMUAUCWVWo7FYEjZdNatxcWXT3i1';
      case 'bch':
        return 'qpr7smnv4xdg7ej70lylsk0p3hrfut5v5c5qpucl45';
      case 'eth':
        return '0xbd644a1decd9aef84c09d3e2d5260325e01e220c';
      case 'xrp':
        return 'r4dgY6Mzob3NVq8CFYdEiPnXKboRScsXRu';
      case 'doge':
        return 'DDTtqnuZ5kfRT5qh2c7sNtqrJmV3iXYdGG';
      case 'ltc':
        return 'LfmssDyX6iZvbVqHv6t9P6JWXia2JG7mdb';
      default:
        return 'default_address';
    }
  }),
}));

/**
 * getCoinAndNetwork Tests
 */
describe('getCoinAndNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will call getCoinAndNetwork immediately', async () => {
    GetCoinAndNetwork('coin_string', 'livenet');
    expect(ExtractCoinNetworkAddress).toHaveBeenCalledWith('coin_string');
    expect(ExtractCoinNetworkAddress).toHaveReturnedWith('default_address');
  });

  it('will return a btc address', async () => {
    const response = await GetCoinAndNetwork('btc', 'livenet');
    expect(response).toEqual({coin: 'btc', network: 'livenet'});
  });

  it('will return bch address', async () => {
    const response = await GetCoinAndNetwork('bch', 'livenet');
    expect(response).toEqual({coin: 'bch', network: 'livenet'});
  });

  it('will return eth address', async () => {
    const response = await GetCoinAndNetwork('eth', 'livenet');
    expect(response).toEqual({coin: 'eth', network: 'livenet'});
  });

  it('will return xrp address', async () => {
    const response = await GetCoinAndNetwork('xrp', 'livenet');
    expect(response).toEqual({coin: 'xrp', network: 'livenet'});
  });

  it('will return doge address', async () => {
    const response = await GetCoinAndNetwork('doge', 'livenet');
    expect(response).toEqual({coin: 'doge', network: 'livenet'});
  });

  it('will return ltc address', async () => {
    const response = await GetCoinAndNetwork('ltc', 'livenet');
    expect(response).toEqual({coin: 'ltc', network: 'livenet'});
  });

  it('will return null if not a valid address', async () => {
    const response = await GetCoinAndNetwork('', 'livenet');
    expect(response).toEqual(null);
  });
});
