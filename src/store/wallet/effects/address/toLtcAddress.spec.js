import {ToLtcAddress} from './address';

/**
 * toLtcAddress Tests
 */
describe('toLtcAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will respond with the address without prefix if not provided', async () => {
    const result = ToLtcAddress('LfmssDyX6iZvbVqHv6t9P6JWXia2JG7mdb');
    expect(result).toEqual('LfmssDyX6iZvbVqHv6t9P6JWXia2JG7mdb');
  });

  it('will throw a fatal error if not getting a valid address', async () => {
    expect(() => {
      ToLtcAddress('LfmssDyX6iZ');
    }).toThrow();
  });
});
