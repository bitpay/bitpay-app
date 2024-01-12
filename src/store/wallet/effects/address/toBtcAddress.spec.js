import {ToBtcAddress} from './address';

/**
 * toBtcAddress Tests
 */
describe('toBtcAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will respond with the address without prefix if not provided', async () => {
    const result = ToBtcAddress('1GqpTUcMUAUCWVWo7FYEjZdNatxcWXT3i1');
    expect(result).toEqual('1GqpTUcMUAUCWVWo7FYEjZdNatxcWXT3i1');
  });

  it('will throw a fatal error if not getting a valid address', async () => {
    expect(() => {
      ToBtcAddress('1GqpTUcMUAUCWV');
    }).toThrow();
  });
});
