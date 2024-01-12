import * as logActions from '../log/log.actions';
import * as appActions from '../app/app.actions';
import * as Root from '../../Root';
import * as PayPro from '../wallet/effects/paypro/paypro';
import {incomingData} from './scan.effects';
import configureTestStore from '@test/store';
import axios from 'axios';
import {BwcProvider} from '@/lib/bwc';
import {
  GetAddressNetwork,
  bitcoreLibs,
} from '../wallet/effects/address/address';
import {BitpaySupportedEvmCoins} from '@/constants/currencies';
import {startCreateKey} from '../wallet/effects';

/**
 * incomingData Tests
 */
describe('incomingData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.skip('Should handle plain text', async () => {
    const data = ['Gabriel was here'];
    const store = configureTestStore({});
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([false]); // TODO: should be true when we add a text handler
  });

  it('Should handle Join Wallet without created keys', async () => {
    const data =
      '9QRqDLbtasN5Wd37tRag7TKxMJVnCc2979pgs5CEBmGRmYU7kNrVynHdNtuBYxgfNgdj3EEJkHLbtc';
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promiseResult = await store.dispatch(incomingData(data));
    expect(loggerSpy).toHaveBeenCalledWith(
      '[scan] Incoming-data (redirect): Code to join to a multisig wallet',
    );
    expect(promiseResult).toBe(true);
    expect(navigationSpy).toHaveBeenCalledWith('Wallet', {
      params: {
        invitationCode: data,
      },
      screen: 'JoinMultisig',
    });
  });

  it('Should handle Join Wallet with one created key', async () => {
    const data =
      '9QRqDLbtasN5Wd37tRag7TKxMJVnCc2979pgs5CEBmGRmYU7kNrVynHdNtuBYxgfNgdj3EEJkHLbtc';
    const store = configureTestStore({});
    const key = await store.dispatch(
      startCreateKey([
        {chain: 'btc', currencyAbbreviation: 'btc', isToken: false},
      ]),
    );
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promiseResult = await store.dispatch(incomingData(data));
    expect(loggerSpy).toHaveBeenCalledWith(
      '[scan] Incoming-data (redirect): Code to join to a multisig wallet',
    );
    expect(promiseResult).toBe(true);
    expect(navigationSpy).toHaveBeenCalledWith('Wallet', {
      params: {
        key,
        invitationCode: data,
      },
      screen: 'JoinMultisig',
    });
  });

  it('Should handle Join Wallet with more than one created key', async () => {
    const data =
      '9QRqDLbtasN5Wd37tRag7TKxMJVnCc2979pgs5CEBmGRmYU7kNrVynHdNtuBYxgfNgdj3EEJkHLbtc';
    const store = configureTestStore({});
    await store.dispatch(
      startCreateKey([
        {chain: 'btc', currencyAbbreviation: 'btc', isToken: false},
      ]),
    );
    await store.dispatch(
      startCreateKey([
        {chain: 'btc', currencyAbbreviation: 'btc', isToken: false},
      ]),
    );
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promiseResult = await store.dispatch(incomingData(data));
    expect(loggerSpy).toHaveBeenCalledWith(
      '[scan] Incoming-data (redirect): Code to join to a multisig wallet',
    );
    expect(promiseResult).toBe(true);
    expect(navigationSpy).toHaveBeenNthCalledWith(1, 'Wallet', {
      params: {
        onKeySelect: expect.any(Function),
      },
      screen: 'KeyGlobalSelect',
    });
  }, 20000);

  it('Should handle old Join Wallet', async () => {
    const data =
      'RTpopkn5KBnkxuT7x4ummDKx3Lu1LvbntddBC4ssDgaqP7DkojT8ccxaFQEXY4f3huFyMewhHZLbtc';
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const promiseResult = await store.dispatch(incomingData(data));
    expect(loggerSpy).toHaveBeenCalledWith(
      '[scan] Incoming-data (redirect): Code to join to a multisig wallet',
    );
    expect(promiseResult).toBe(true);
  });

  it('Should handle QR Code Export feature', async () => {
    const data = [
      "1|sick arch glare wheat anchor innocent garbage tape raccoon already obey ability|testnet|m/44'/1'/0'|false",
      '2|',
      '3|',
      '1|sick arch glare wheat anchor innocent garbage tape raccoon already obey ability|null|null|false|null',
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true, true, true]);
    for (let i = 0; i < 3; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data (redirect): QR code export feature',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          importQrCodeData: data[i],
        },
        screen: 'Import',
      });
    }
  });

  it('Should handle BitPay Invoices with different coins', async () => {
    const data = [
      'bitcoin:?r=https://bitpay.com/i/CtcM753gnZ4Wpr5pmXU6i9',
      'bitcoincash:?r=https://bitpay.com/i/Rtz1RwWA7kdRRU3Wyo4YDY',
      'ethereum:?r=https://test.bitpay.com/i/VPDDwaG7eaGvFtbyDBq8NR',
    ];
    const mockPayProOptions: PayPro.PayProOptions = {
      paymentId: '10',
      time: '10',
      expires: '2019-11-05T16:29:31.754Z',
      memo: 'Payment request for BitPay invoice FQLHDgV8YWoy4vT8n4pKQe for merchant Johnco',
      payProUrl: 'https://test.bitpay.com/i/FQLHDgV8YWoy4vT8n4pKQe',
      paymentOptions: [
        {
          chain: 'BTC',
          currency: 'BTC',
          decimals: 8,
          estimatedAmount: 10800,
          minerFee: 100,
          network: 'testnet',
          requiredFeeRate: 1,
          selected: false,
        },
        {
          chain: 'BCH',
          currency: 'BCH',
          decimals: 8,
          estimatedAmount: 339800,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 1,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'ETH',
          decimals: 18,
          estimatedAmount: 5255000000000000,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'USDC',
          decimals: 6,
          estimatedAmount: 1000000,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'GUSD',
          decimals: 2,
          estimatedAmount: 100,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'PAX',
          decimals: 18,
          estimatedAmount: 1000000000000000000,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
      ],
      verified: true,
    };
    const store = configureTestStore({});
    const mockData = {data: 'Your mock response data'}; // Your mock response
    (axios.get as jest.Mock).mockResolvedValue(mockData);
    const loggerSpy = jest.spyOn(logActions, 'info');
    const payproSpy = jest.spyOn(PayPro, 'GetPayProOptions');
    (
      payproSpy as jest.MockedFunction<typeof PayPro.GetPayProOptions>
    ).mockImplementation(() => () => Promise.resolve(mockPayProOptions));
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true, true]);
    for (let i = 0; i < 3; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Payment Protocol request',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          payProOptions: mockPayProOptions,
        },
        screen: 'PayProConfirm',
      });
    }
  });

  it('Should handle BitPay Invoices v4 with buyerProvidedEmail', async () => {
    const data = ['https://bitpay.com/i/J13BQxZvokLTg8aSedbk44?c=u'];
    const mockPayProOptions: PayPro.PayProOptions = {
      paymentId: '10',
      time: '10',
      expires: '2019-11-05T16:29:31.754Z',
      memo: 'Payment request for BitPay invoice FQLHDgV8YWoy4vT8n4pKQe for merchant Johnco',
      payProUrl: 'https://test.bitpay.com/i/FQLHDgV8YWoy4vT8n4pKQe',
      paymentOptions: [
        {
          chain: 'BTC',
          currency: 'BTC',
          decimals: 8,
          estimatedAmount: 10800,
          minerFee: 100,
          network: 'testnet',
          requiredFeeRate: 1,
          selected: false,
        },
        {
          chain: 'BCH',
          currency: 'BCH',
          decimals: 8,
          estimatedAmount: 339800,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 1,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'ETH',
          decimals: 18,
          estimatedAmount: 5255000000000000,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'USDC',
          decimals: 6,
          estimatedAmount: 1000000,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'GUSD',
          decimals: 2,
          estimatedAmount: 100,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
        {
          chain: 'ETH',
          currency: 'PAX',
          decimals: 18,
          estimatedAmount: 1000000000000000000,
          minerFee: 0,
          network: 'testnet',
          requiredFeeRate: 4000000000,
          selected: false,
        },
      ],
      verified: true,
    };
    const store = configureTestStore({});
    const mockData = {
      data: {
        data: {
          invoice: {
            buyerProvidedInfo: {
              emailAddress: 'email.com',
            },
            buyerProvidedEmail: 'email.com2',
            status: 'new',
          },
        },
      },
    }; // Your mock response
    (axios.get as jest.Mock).mockResolvedValue(mockData);
    const loggerSpy = jest.spyOn(logActions, 'info');
    const payproSpy = jest.spyOn(PayPro, 'GetPayProOptions');
    (
      payproSpy as jest.MockedFunction<typeof PayPro.GetPayProOptions>
    ).mockImplementation(() => () => Promise.resolve(mockPayProOptions));
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: BitPay invoice',
      );
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 2,
        '[scan] Incoming-data: Payment Protocol request',
      );
    }
  });

  it('Should handle BitPay Invoices v4 without buyerProvidedEmail', async () => {
    const data = ['https://bitpay.com/i/J13BQxZvokLTg8aSedbk44?c=u'];
    const mockPayProOptions: PayPro.PayProOptions = {
      paymentId: '10',
      time: '10',
      expires: '2019-11-05T16:29:31.754Z',
      memo: 'Payment request for BitPay invoice FQLHDgV8YWoy4vT8n4pKQe for merchant Johnco',
      payProUrl: 'https://test.bitpay.com/i/FQLHDgV8YWoy4vT8n4pKQe',
      paymentOptions: [
        {
          chain: 'BTC',
          currency: 'BTC',
          decimals: 8,
          estimatedAmount: 10800,
          minerFee: 100,
          network: 'testnet',
          requiredFeeRate: 1,
          selected: false,
        },
      ],
      verified: true,
    };
    const store = configureTestStore({});
    const mockData = {
      data: {
        data: {
          invoice: {
            buyerProvidedInfo: {
              emailAddress: undefined,
            },
            buyerProvidedEmail: undefined,
            status: 'new',
          },
        },
      },
    }; // Your mock response
    (axios.get as jest.Mock).mockResolvedValue(mockData);
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const payproSpy = jest.spyOn(PayPro, 'GetPayProOptions');
    (
      payproSpy as jest.MockedFunction<typeof PayPro.GetPayProOptions>
    ).mockImplementation(() => () => Promise.resolve(mockPayProOptions));
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: BitPay invoice',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          data: data[i],
        },
        screen: 'EnterBuyerProvidedEmail',
      });
    }
  });

  it('Should handle BitPay invoice web urls', async () => {
    const data = [
      'https://bitpay.com/invoice?v=3&id=J13BQxZvokLTg8aSedbk44&lang=en-US',
    ];
    const mockPayProOptions: PayPro.PayProOptions = {
      paymentId: '10',
      time: '10',
      expires: '2019-11-05T16:29:31.754Z',
      memo: 'Payment request for BitPay invoice FQLHDgV8YWoy4vT8n4pKQe for merchant Johnco',
      payProUrl: 'https://test.bitpay.com/i/FQLHDgV8YWoy4vT8n4pKQe',
      paymentOptions: [
        {
          chain: 'BTC',
          currency: 'BTC',
          decimals: 8,
          estimatedAmount: 10800,
          minerFee: 100,
          network: 'testnet',
          requiredFeeRate: 1,
          selected: false,
        },
      ],
      verified: true,
    };
    const store = configureTestStore({});
    const mockData = {
      data: {
        data: {
          invoice: {
            buyerProvidedInfo: {
              emailAddress: 'email.com',
            },
            buyerProvidedEmail: 'email.com2',
            status: 'new',
          },
        },
      },
    }; // Your mock response
    (axios.get as jest.Mock).mockResolvedValue(mockData);
    const loggerSpy = jest.spyOn(logActions, 'info');
    const payproSpy = jest.spyOn(PayPro, 'GetPayProOptions');
    (
      payproSpy as jest.MockedFunction<typeof PayPro.GetPayProOptions>
    ).mockImplementation(() => () => Promise.resolve(mockPayProOptions));
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: BitPay invoice',
      );
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 2,
        '[scan] Incoming-data: Payment Protocol request',
      );
    }
  });

  it('Should handle BitPay Invoice error', async () => {
    const data = ['bitcoin:?r=https://bitpay.com/i/CtcM753gnZ4Wpr5pmXU6i9'];
    const store = configureTestStore({});
    const mockData = {data: 'Your mock response data'}; // Your mock response
    (axios.get as jest.Mock).mockResolvedValue(mockData);
    const loggerSpy = jest.spyOn(logActions, 'info');
    const payproSpy = jest.spyOn(PayPro, 'GetPayProOptions');
    (
      payproSpy as jest.MockedFunction<typeof PayPro.GetPayProOptions>
    ).mockImplementation(() => () => {
      throw new Error('paypro error');
    });
    const showBottomNotificationModalSpy = jest.spyOn(
      appActions,
      'showBottomNotificationModal',
    );
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    expect(loggerSpy).toHaveBeenCalledWith(
      '[scan] Incoming-data: Payment Protocol request',
    );
    expect(showBottomNotificationModalSpy).toHaveBeenCalledWith({
      type: 'warning',
      title: 'Something went wrong',
      message: 'paypro error',
      enableBackdropDismiss: true,
      actions: [
        {
          text: 'OK',
          action: expect.any(Function),
          primary: true,
        },
      ],
    });
  });

  it('Should handle Bitcoin cash Copay/BitPay format and CashAddr format plain Address', async () => {
    const data = [
      'qr00upv8qjgkym8zng3f663n9qte9ljuqqcs8eep5w',
      'CcnxtMfvBHGTwoKGPSuezEuYNpGPJH6tjN',
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: bch plain address',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i],
            chain: 'bch',
            currency: 'bch',
            destinationTag: undefined,
            email: undefined,
            name: undefined,
            network: 'livenet',
            opts: {
              feePerKb: undefined,
              message: '',
              showEVMWalletsAndTokens: false,
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle ETH plain Address', async () => {
    const data = ['0xb506c911deE6379e3d4c4d0F4A429a70523960Fd'];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: EVM plain address',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i],
            chain: 'eth',
            currency: 'eth',
            destinationTag: undefined,
            email: undefined,
            name: undefined,
            network: undefined, // for showing testnet and livenet wallets
            opts: {
              showEVMWalletsAndTokens: true,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle MATIC plain Address', async () => {
    const data = ['0x0be264522706C703a2c6dDb61488F309a510eA26'];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: EVM plain address',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i],
            chain: 'eth', // yes eth for simplicity
            currency: 'eth', // yes eth for simplicity
            destinationTag: undefined,
            email: undefined,
            name: undefined,
            network: undefined, // for showing testnet and livenet wallets
            opts: {
              showEVMWalletsAndTokens: true,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle XRP plain Address', async () => {
    const data = ['rh3VLyj1GbQjX7eA15BwUagEhSrPHmLkSR'];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: xrp plain address',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i],
            chain: 'xrp',
            currency: 'xrp',
            destinationTag: undefined,
            email: undefined,
            name: undefined,
            network: undefined, // for showing testnet and livenet wallets
            opts: {
              showEVMWalletsAndTokens: false,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle DOGECOIN plain Address', async () => {
    const data = ['DQmgVRe3RJLz6UNoy1hkjuKdYCWCP6VXSW'];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: doge plain address',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i],
            chain: 'doge',
            currency: 'doge',
            destinationTag: undefined,
            email: undefined,
            name: undefined,
            network: 'livenet',
            opts: {
              showEVMWalletsAndTokens: false,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle LITECOIN plain Address', async () => {
    const data = [
      'LMbBz1rbFoXfBTBEdtTGHq1mk4r6iKnHze',
      'ltc1qesyhcljmtnfge44j7kcc0jvqxzcy4r4gz84m9l3etym2kndqwtxsakkxma',
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: ltc plain address',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i],
            chain: 'ltc',
            currency: 'ltc',
            destinationTag: undefined,
            email: undefined,
            name: undefined,
            network: 'livenet',
            opts: {
              showEVMWalletsAndTokens: false,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle Bitcoin cash Copay/BitPay format and CashAddr format URI', async () => {
    const data = [
      'bitcoincash:CcnxtMfvBHGTwoKGPSuezEuYNpGPJH6tjN',
      'bitcoincash:qr00upv8qjgkym8zng3f663n9qte9ljuqqcs8eep5w',
      'bchtest:pzpaleegjrc0cffrmh3nf43lt3e3gu8awqyxxjuew3',
    ];

    const expected = [
      {
        log: '[scan] Incoming-data: BitcoinCash URI',
        network: 'livenet',
      },
      {
        log: '[scan] Incoming-data: bch plain address',
        network: 'livenet',
      },
      {
        log: '[scan] Incoming-data: bch plain address',
        network: 'testnet',
      },
    ];

    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true, true]);
    for (let i = 0; i < 3; i++) {
      const parsed = BwcProvider.getInstance().getBitcoreCash().URI(data[i]);
      let addr = parsed.address ? parsed.address.toString() : '';

      // keep address in original format
      if (parsed.address && data[i].indexOf(addr) < 0) {
        addr = parsed.address.toCashAddress();
      }
      expect(loggerSpy).toHaveBeenNthCalledWith(i + 1, expected[i].log);
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: addr,
            chain: 'bch',
            currency: 'bch',
            network: expected[i].network, // for showing testnet and livenet wallets
            opts: {
              showEVMWalletsAndTokens: false,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle ETH URI as address without amount', async () => {
    const data = ['ethereum:0xb506c911deE6379e3d4c4d0F4A429a70523960Fd'];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Ethereum URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: '0xb506c911deE6379e3d4c4d0F4A429a70523960Fd',
            chain: 'eth',
            currency: 'eth',
            destinationTag: undefined,
            email: undefined,
            name: undefined,
            network: undefined, // for showing testnet and livenet wallets
            opts: {
              feePerKb: undefined,
              message: '',
              showEVMWalletsAndTokens: true,
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle XRP URI as address without amount', async () => {
    const data = ['ripple:rh3VLyj1GbQjX7eA15BwUagEhSrPHmLkSR'];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true]);
    for (let i = 0; i < 1; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Ripple URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: 'rh3VLyj1GbQjX7eA15BwUagEhSrPHmLkSR',
            chain: 'xrp',
            currency: 'xrp',
            destinationTag: undefined,
            opts: {
              showEVMWalletsAndTokens: false,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle DOGE URI as address without amount', async () => {
    const data = [
      'dogecoin:D6NoBXsE7YMy6mS9H31ds9svGNn7qpjiew',
      'dogecoin:nVj1YZn1Mx1Q4JaxEXQMFJAmqGBQQsYvRS',
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Dogecoin URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i].replace('dogecoin:', ''),
            chain: 'doge',
            currency: 'doge',
            network: i === 0 ? 'livenet' : 'testnet',
            opts: {
              showEVMWalletsAndTokens: false,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle LITECOIN URI as address without amount', async () => {
    const data = [
      'litecoin:LMbBz1rbFoXfBTBEdtTGHq1mk4r6iKnHze',
      'litecoin:tltc1q0hpcxfptshfddxuzpewrm4kp8528y5jk9nc4ur',
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Litecoin URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i].replace('litecoin:', ''),
            chain: 'ltc',
            currency: 'ltc',
            network: i === 0 ? 'livenet' : 'testnet',
            opts: {
              showEVMWalletsAndTokens: false,
              feePerKb: undefined,
              message: '',
            },
            type: 'address',
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle ETH URI with amount (value)', async () => {
    const data = [
      {
        uri: 'ethereum:0xb506c911deE6379e3d4c4d0F4A429a70523960Fd?value=1543000000000000000',
        stateParams: {
          params: {
            amount: 1.543,
            context: 'scanner',
            recipient: {
              address: '0xb506c911deE6379e3d4c4d0F4A429a70523960Fd',
              chain: 'eth',
              currency: 'eth',
              opts: {
                message: '',
                showEVMWalletsAndTokens: true,
              },
              type: 'address',
            },
          },
          screen: 'GlobalSelect',
        },
      },
      {
        uri: 'ethereum:0xb506c911deE6379e3d4c4d0F4A429a70523960Fd?value=1543000000000000000?gasPrice=0000400000000000000',
        stateParams: {
          params: {
            amount: 1.543,
            context: 'scanner',
            recipient: {
              address: '0xb506c911deE6379e3d4c4d0F4A429a70523960Fd',
              chain: 'eth',
              currency: 'eth',
              opts: {
                feePerKb: 400000000000000,
                message: '',
                showEVMWalletsAndTokens: true,
              },
              type: 'address',
            },
          },
          screen: 'GlobalSelect',
        },
      },
    ];

    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element.uri))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Ethereum URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(
        i + 1,
        'Wallet',
        data[i].stateParams,
      );
    }
  });

  it('Should handle MATIC URI with amount (value)', async () => {
    const data = [
      {
        uri: 'matic:0xb506c911deE6379e3d4c4d0F4A429a70523960Fd?value=1543000000000000000',
        stateParams: {
          params: {
            amount: 1.543,
            context: 'scanner',
            recipient: {
              address: '0xb506c911deE6379e3d4c4d0F4A429a70523960Fd',
              chain: 'matic',
              currency: 'matic',
              opts: {
                message: '',
                showEVMWalletsAndTokens: true,
              },
              type: 'address',
            },
          },
          screen: 'GlobalSelect',
        },
      },
      {
        uri: 'matic:0xb506c911deE6379e3d4c4d0F4A429a70523960Fd?value=1543000000000000000?gasPrice=0000400000000000000',
        stateParams: {
          params: {
            amount: 1.543,
            context: 'scanner',
            recipient: {
              address: '0xb506c911deE6379e3d4c4d0F4A429a70523960Fd',
              chain: 'matic',
              currency: 'matic',
              opts: {
                feePerKb: 400000000000000,
                message: '',
                showEVMWalletsAndTokens: true,
              },
              type: 'address',
            },
          },
          screen: 'GlobalSelect',
        },
      },
    ];

    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element.uri))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Matic URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(
        i + 1,
        'Wallet',
        data[i].stateParams,
      );
    }
  });

  it('Should handle XRP URI with amount', async () => {
    const data = [
      {
        uri: 'ripple:rh3VLyj1GbQjX7eA15BwUagEhSrPHmLkSR?amount=15',
        stateParams: {
          params: {
            amount: 15,
            context: 'scanner',
            recipient: {
              address: 'rh3VLyj1GbQjX7eA15BwUagEhSrPHmLkSR',
              chain: 'xrp',
              currency: 'xrp',
              opts: {
                message: '',
                showEVMWalletsAndTokens: false,
              },
              type: 'address',
              destinationTag: undefined,
            },
          },
          screen: 'GlobalSelect',
        },
      },
      {
        uri: 'ripple:rh3VLyj1GbQjX7eA15BwUagEhSrPHmLkSR?amount=15&dt=123456',
        stateParams: {
          params: {
            amount: 15,
            context: 'scanner',
            recipient: {
              address: 'rh3VLyj1GbQjX7eA15BwUagEhSrPHmLkSR',
              chain: 'xrp',
              currency: 'xrp',
              opts: {
                message: '',
                showEVMWalletsAndTokens: false,
              },
              type: 'address',
              destinationTag: 123456,
            },
          },
          screen: 'GlobalSelect',
        },
      },
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element.uri))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Ripple URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(
        i + 1,
        'Wallet',
        data[i].stateParams,
      );
    }
  });

  it('Should handle Bitcoin cash Copay/BitPay format and CashAddr format URI with amount', async () => {
    const data = [
      'BITCOINCASH:QZCY06MXSK7HW0RU4KZWTRKXDS6VF8Y34VRM5SF9Z7?amount=1.00000000',
      'bchtest:pzpaleegjrc0cffrmh3nf43lt3e3gu8awqyxxjuew3?amount=12.00000000',
    ];

    const expected = [
      {
        log: '[scan] Incoming-data: BitcoinCash URI',
        amount: 1,
        network: 'livenet',
      },
      {
        log: '[scan] Incoming-data: BitcoinCash URI',
        amount: 12,
        network: 'testnet',
      },
    ];

    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      const parsed = BwcProvider.getInstance().getBitcoreCash().URI(data[i]);
      let addr = parsed.address ? parsed.address.toString() : '';

      // keep address in original format
      if (parsed.address && data[i].indexOf(addr) < 0) {
        addr = parsed.address.toCashAddress();
      }
      expect(loggerSpy).toHaveBeenNthCalledWith(i + 1, expected[i].log);
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          amount: expected[i].amount,
          context: 'scanner',
          recipient: {
            address: addr,
            chain: 'bch',
            currency: 'bch',
            network: expected[i].network,
            type: 'address',
            opts: {
              feePerKb: undefined,
              message: '',
              showEVMWalletsAndTokens: false,
            },
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should handle Bitcoin URI', async () => {
    const data = [
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Genesis Bitcoin Address
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?message=test%20message', // Bitcoin Address with message and not amount
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=1.0000', // Bitcoin Address with amount
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=1.0000&label=Genesis%20Bitcoin%20Address&message=test%20message', // Basic Payment Protocol
    ];
    const expected = [
      {amount: undefined},
      {amount: undefined},
      {amount: 1},
      {amount: 1},
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true, true, true]);
    for (let i = 0; i < 4; i++) {
      const parsed = BwcProvider.getInstance().getBitcore().URI(data[i]);
      const addr = parsed.address ? parsed.address.toString() : '';
      const message = parsed.message || '';
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: Bitcoin URI',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          amount: expected[i].amount,
          context: 'scanner',
          recipient: {
            address: addr,
            chain: 'btc',
            currency: 'btc',
            network: 'livenet',
            type: 'address',
            opts: {
              showEVMWalletsAndTokens: false,
              message,
            },
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should Handle Bitcoin Cash URI with legacy address', async () => {
    const data = 'bitcoincash:1ML5KKKrJEHw3fQqhhajQjHWkh3yKhNZpa';
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const result = await store.dispatch(incomingData(data));
    expect(result).toStrictEqual(true);
    expect(loggerSpy).toHaveBeenNthCalledWith(
      1,
      '[scan] Incoming-data: BitcoinCash URI with legacy address',
    );
    expect(loggerSpy).toHaveBeenNthCalledWith(
      2,
      '[scan] Legacy Bitcoin Address translated to: bitcoincash:qr00upv8qjgkym8zng3f663n9qte9ljuqqcs8eep5w',
    );
    const parsed = BwcProvider.getInstance()
      .getBitcore()
      .URI(data.replace(/^bitcoincash:/, 'bitcoin:'));
    const oldAddr = parsed.address ? parsed.address.toString() : '';
    const a = BwcProvider.getInstance()
      .getBitcore()
      .Address(oldAddr)
      .toObject();
    const addr = BwcProvider.getInstance()
      .getBitcoreCash()
      .Address.fromObject(a)
      .toString();

    expect(navigationSpy).toHaveBeenCalledWith('Wallet', {
      params: {
        context: 'scanner',
        recipient: {
          address: addr,
          chain: 'bch',
          currency: 'bch',
          network: 'livenet',
          type: 'address',
          opts: {
            feePerKb: undefined,
            message: '',
            showEVMWalletsAndTokens: false,
          },
        },
      },
      screen: 'GlobalSelect',
    });
  });

  // TODO: fix this test
  it.skip('Should Handle Testnet Bitcoin Cash URI with legacy address', async () => {
    const data = 'bchtest:mu7ns6LXun5rQiyTJx7yY1QxTzndob4bhJ';
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const result = await store.dispatch(incomingData(data));
    expect(result).toStrictEqual(true);
    expect(loggerSpy).toHaveBeenCalledWith(
      '[scan] Incoming-data: BitcoinCash URI with legacy address',
    );
    const parsed = BwcProvider.getInstance()
      .getBitcore()
      .URI(data.replace(/^bchtest:/, 'bitcoin:'));
    const oldAddr = parsed.address ? parsed.address.toString() : '';
    const a = BwcProvider.getInstance()
      .getBitcore()
      .Address(oldAddr)
      .toObject();
    const addr = BwcProvider.getInstance()
      .getBitcoreCash()
      .Address.fromObject(a)
      .toString();

    expect(navigationSpy).toHaveBeenCalledWith('Wallet', {
      params: {
        context: 'scanner',
        recipient: {
          address: addr,
          chain: 'bch',
          currency: 'bch',
          network: 'testnet',
          type: 'address',
          opts: {
            feePerKb: undefined,
            message: '',
            showEVMWalletsAndTokens: false,
          },
        },
      },
      screen: 'GlobalSelect',
    });
  });

  it('Should handle any type of address/coin using BitPay URI', async () => {
    const extractAddress = (data: string) => {
      const address = data.replace(/^[a-z]+:/i, '').replace(/\?.*/, '');
      const params = /([\?\&]+[a-z]+=(\d+([\,\.]\d+)?))+/i;
      return address.replace(params, '');
    };

    const data = [
      'bitpay:mrNYDWy8ZgmgXVKDb4MM71LmfZWBwGztUK?coin=btc&chain=btc&amount=0.0002&message=asd',
      'bitpay:1HZJoc4ZKMvyAYcYCU1vbmwm3KzZq34EmU?coin=btc&chain=btc&amount=0.0002&message=asd',
      'bitpay:0xDF5C0dd7656bB976aD7285a3Fb80C0F6B9604576?coin=eth&chain=eth&amount=0.0002&message=asd',
      'bitpay:bchtest:qp2gujqu2dsp6zs4kp0pevm2yl8ydx723q2kvfn7tc?coin=bch&chain=bch&amount=0.0002&message=asd',
      'bitpay:bitcoincash:qpcc9qe5ja73k7ekkqrnjfp9tya0r3d5tvpm2yfa0d?coin=bch&chain=bch&amount=0.0002&message=asd',
      'bitpay:rKMATNRkXgxSQMJTpiC4yRNPMMJkz9hjte?coin=xrp&chain=xrp&amount=0.0002&message=asd',
      'bitpay:0xDF5C0dd7656bB976aD7285a3Fb80C0F6B9604576?coin=usdt&chain=eth&amount=0.0002&message=asd&gasPrice=1000000000',
      'bitpay:0x0be264522706C703a2c6dDb61488F309a510eA26?coin=matic&chain=matic&amount=0.0002&message=asd',
      'bitpay:0x0be264522706C703a2c6dDb61488F309a510eA26?coin=usdc&chain=matic&amount=0.0002&message=asd',
    ];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
    for (let i = 0; i < 9; i++) {
      const address = extractAddress(data[i]);
      let params: URLSearchParams = new URLSearchParams(
        data[i].replace(`bitpay:${address}`, ''),
      );
      const message = params.get('message');
      const coin = params.get('coin')!.toLowerCase();
      const chain = params.get('chain');
      const network = Object.keys(bitcoreLibs).includes(coin)
        ? GetAddressNetwork(address, coin as any)
        : undefined;
      let feePerKb;
      if (params.get('gasPrice')) {
        feePerKb = Number(params.get('gasPrice'));
      }
      const showEVMWalletsAndTokens =
        !!BitpaySupportedEvmCoins[coin.toLowerCase()];
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: BitPay URI',
        data[i],
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          amount: 0.0002,
          context: 'scanner',
          recipient: {
            address,
            chain: chain,
            currency: coin,
            network,
            type: 'address',
            opts: {
              showEVMWalletsAndTokens,
              message,
              feePerKb,
            },
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });

  it('Should not handle BitPay URI if address or coin is missing (ScanPage)', async () => {
    const data = [
      'bitpay:?coin=btc&amount=0.0002&message=asd',
      'bitpay:1HZJoc4ZKMvyAYcYCU1vbmwm3KzZq34EmU?amount=0.0002&message=asd',
      'bitpay:0xDF5C0dd7656bB976aD7285a3Fb80C0F6B9604576?amount=0.0002&message=asd',
      'bitpay:bchtest:qp2gujqu2dsp6zs4kp0pevm2yl8ydx723q2kvfn7tc?amount=0.0002&message=asd',
      'bitpay:?coin=bch&amount=0.0002&message=asd',
    ];
    const store = configureTestStore({});
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([false, false, false, false, false]);
  });

  it('Should not handle BitPay URI if address or coin is missing (SendPage)', async () => {
    const data = [
      'bitpay:?coin=btc&amount=0.0002&message=asd',
      'bitpay:1HZJoc4ZKMvyAYcYCU1vbmwm3KzZq34EmU?amount=0.0002&message=asd',
      'bitpay:?coin=eth&amount=0.0002&message=asd',
      'bitpay:bchtest:qp2gujqu2dsp6zs4kp0pevm2yl8ydx723q2kvfn7tc?amount=0.0002&message=asd',
      'bitpay:?coin=bch&amount=0.0002&message=asd',
    ];
    const store = configureTestStore({});
    const promises: any[] = [];
    const keys = await store.dispatch(
      startCreateKey([
        {chain: 'btc', currencyAbbreviation: 'btc', isToken: false},
      ]),
    );
    data.forEach(element =>
      promises.push(
        store.dispatch(incomingData(element, {wallet: keys.wallets[0]})),
      ),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([false, false, false, false, false]);
  });

  it('Should handle Bitcoin Livenet and Testnet Plain Address', async () => {
    const data = [
      '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Genesis Bitcoin Address
      'mpXwg4jMtRhuSpVq4xS3HFHmCmWp9NyGKt', // Genesis Testnet3 Bitcoin Address
    ];
    const expected = ['livenet', 'testnet'];
    const store = configureTestStore({});
    const loggerSpy = jest.spyOn(logActions, 'info');
    const navigationSpy = jest.spyOn(Root.navigationRef, 'navigate');
    const promises: any[] = [];
    data.forEach(element =>
      promises.push(store.dispatch(incomingData(element))),
    );
    const promisesResult = await Promise.all(promises);
    expect(promisesResult).toStrictEqual([true, true]);
    for (let i = 0; i < 2; i++) {
      expect(loggerSpy).toHaveBeenNthCalledWith(
        i + 1,
        '[scan] Incoming-data: btc plain address',
      );
      expect(navigationSpy).toHaveBeenNthCalledWith(i + 1, 'Wallet', {
        params: {
          context: 'scanner',
          recipient: {
            address: data[i],
            chain: 'btc',
            currency: 'btc',
            network: expected[i],
            type: 'address',
            opts: {
              feePerKb: undefined,
              message: '',
              showEVMWalletsAndTokens: false,
            },
          },
        },
        screen: 'GlobalSelect',
      });
    }
  });
});
