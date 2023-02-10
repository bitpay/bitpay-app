import {createWalletAddress} from './address';
import {configureTestStore} from '../../../../store';
import {successGetReceiveAddress} from '../../wallet.actions';
import {ValidateCoinAddress} from '../../utils/validations';

/**
 * Mock successGetReceiveAddress
 */
jest.mock('../../wallet.actions', () => ({
  ...jest.requireActual('../../wallet.actions'),
  successGetReceiveAddress: jest.fn().mockImplementation(() => {
    return {type: 'MOCK'};
  }),
}));

/**
 * Mock ValidateCoinAddress
 */
jest.mock('../../utils/validations', () => ({
  ...jest.requireActual('../../utils/validations'),
  ValidateCoinAddress: jest.fn().mockImplementation(address => {
    return address !== 'ERROR_ADDRESS';
  }),
}));

/**
 * createWalletAddress Tests
 */
describe('createWalletAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('will reject promise if wallet is not defined', async () => {
    const store = configureTestStore({});
    await expect(
      store.dispatch(createWalletAddress({wallet: null, newAddress: false})),
    ).rejects.toEqual(undefined);
  });

  it('will return cached wallet Address if newAddress is false (success)', async () => {
    const store = configureTestStore({});
    const result = await store.dispatch(
      createWalletAddress({
        wallet: {receiveAddress: 'RECEIVE_ADDRESS'},
        newAddress: false,
      }),
    );
    expect(result).toEqual('RECEIVE_ADDRESS');
  });

  it('will return multisigContractAddress if set on multisigEthInfo (success)', async () => {
    const store = configureTestStore({});
    const result = await store.dispatch(
      createWalletAddress({
        wallet: {
          credentials: {
            multisigEthInfo: {
              multisigContractAddress: 'ETH_MULTISIG',
            },
          },
        },
        newAddress: true,
      }),
    );
    expect(result).toEqual('ETH_MULTISIG');
  });

  it('will call the createAddress method on wallet and return general error if present in callback (error)', async () => {
    const store = configureTestStore({});
    const wallet = {
      id: 'WALLET_ID',
      createAddress: jest.fn().mockImplementation((opts, callback) => {
        callback(true);
      }),
      credentials: {},
    };
    await expect(
      store.dispatch(
        createWalletAddress({
          wallet: wallet,
          newAddress: true,
        }),
      ),
    ).rejects.toEqual({
      error: true,
      type: 'GENERAL_ERROR',
    });
    expect(wallet.createAddress).toHaveBeenCalled();
  });

  it('will respond with general error on getMainAddresses (error)', async () => {
    const store = configureTestStore({});
    const wallet = {
      id: 'WALLET_ID',
      createAddress: jest.fn().mockImplementation((opts, callback) => {
        callback({name: 'MAIN_ADDRESS_GAP_REACHED'});
      }),
      getMainAddresses: jest.fn().mockImplementation((opts, callback) => {
        callback(true);
      }),
      credentials: {},
    };
    await expect(
      store.dispatch(
        createWalletAddress({
          wallet: wallet,
          newAddress: true,
        }),
      ),
    ).rejects.toEqual({
      error: true,
      type: 'MAIN_ADDRESS_GAP_REACHED',
    });
  });

  it('will return address in getMainAddresses callback if present (success)', async () => {
    const store = configureTestStore({});
    const wallet = {
      id: 'WALLET_ID',
      keyId: 'WALLET_KEY_ID',
      createAddress: jest.fn().mockImplementation((opts, callback) => {
        callback({name: 'MAIN_ADDRESS_GAP_REACHED'});
      }),
      getMainAddresses: jest.fn().mockImplementation((opts, callback) => {
        callback(null, [{address: 'RECEIVE_ADDRESS'}]);
      }),
      credentials: {},
    };
    const result = await store.dispatch(
      createWalletAddress({
        wallet: wallet,
        newAddress: true,
      }),
    );
    expect(result).toEqual('RECEIVE_ADDRESS');
    expect(successGetReceiveAddress).toHaveBeenCalledWith({
      keyId: 'WALLET_KEY_ID',
      walletId: 'WALLET_ID',
      receiveAddress: 'RECEIVE_ADDRESS',
    });
  });

  it('will invalidate coin address (error)', async () => {
    const store = configureTestStore({});
    const wallet = {
      id: 'WALLET_ID',
      createAddress: jest.fn().mockImplementation((opts, callback) => {
        callback(null, {
          address: 'ERROR_ADDRESS',
          coin: 'BTC',
        });
      }),
      credentials: {
        network: 'MAINNET',
      },
    };
    await expect(
      store.dispatch(
        createWalletAddress({
          wallet: wallet,
          newAddress: true,
        }),
      ),
    ).rejects.toEqual({
      error: 'ERROR_ADDRESS',
      type: 'INVALID_ADDRESS_GENERATED',
    });
    expect(ValidateCoinAddress).toHaveBeenCalledWith(
      'ERROR_ADDRESS',
      'BTC',
      'MAINNET',
    );
  });

  it('will return address in createWalletAddress callback if present (success)', async () => {
    const store = configureTestStore({});
    const wallet = {
      id: 'WALLET_ID',
      keyId: 'WALLET_KEY_ID',
      createAddress: jest.fn().mockImplementation((opts, callback) => {
        callback(null, {
          address: 'RECEIVE_ADDRESS',
          coin: 'BTC',
        });
      }),
      credentials: {
        token: {
          address: 'token',
        },
      },
    };
    const result = await store.dispatch(
      createWalletAddress({
        wallet: wallet,
        newAddress: true,
      }),
    );
    expect(result).toEqual('RECEIVE_ADDRESS');
    expect(successGetReceiveAddress).toHaveBeenCalledWith({
      keyId: 'WALLET_KEY_ID',
      walletId: 'WALLET_ID',
      receiveAddress: 'RECEIVE_ADDRESS',
    });
  });

  // NOTES:
  // createAddress does not have a default reject for the promise
  // I don't believe wallet.id.replace(`-${token.address}`, ''); does anything??
});
