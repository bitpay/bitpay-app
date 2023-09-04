import {GetMainAddresses} from './address';

/**
 * getMainAddresses Tests
 */
describe('getMainAddresses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will respond with addresses if no errors are in callback', async () => {
    const result = await GetMainAddresses(
      {
        getMainAddresses: jest.fn().mockImplementation((opts, callback) => {
          callback(false, 'ADDRESSES');
        }),
      },
      {
        doNotVerify: true,
      },
    );
    expect(result).toEqual('ADDRESSES');
  });

  it('will reject promise if callback has error', async () => {
    await expect(
      GetMainAddresses(
        {
          getMainAddresses: jest.fn().mockImplementation((opts, callback) => {
            callback('ERROR');
          }),
        },
        {
          doNotVerify: true,
        },
      ),
    ).rejects.toEqual('ERROR');
  });
});
