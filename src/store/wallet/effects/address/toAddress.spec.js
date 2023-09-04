import * as Address from './address';

/**
 * toAddress Tests
 */
describe('toAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will return address as-is if no abbreviation is passed', async () => {
    const response = await Address.ToAddress('1GqpTUcMUAUCWV');
    expect(response).toEqual('1GqpTUcMUAUCWV');
  });
});
