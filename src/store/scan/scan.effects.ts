import {WalletScreens} from '../../navigation/wallet/WalletStack';
import {navigationRef} from '../../Root';
import {Effect} from '../index';
import {GetPayProOptions} from '../wallet/effects/paypro/paypro';
import {
  ExtractBitPayUriAddress,
  GetPayProUrl,
} from '../wallet/utils/decode-uri';
import isEqual from 'lodash.isequal';
import {
  IsValidBitcoinAddress,
  IsValidBitcoinCashAddress,
  IsValidBitcoinCashUri,
  IsValidBitcoinCashUriWithLegacyAddress,
  IsValidBitcoinUri,
  IsValidBitPayInvoice,
  IsValidBitPayUri,
  IsValidDogecoinAddress,
  IsValidDogecoinUri,
  IsValidEthereumAddress,
  IsValidEthereumUri,
  IsValidMaticUri,
  IsValidMaticAddress,
  isValidMoonpayUri,
  IsValidImportPrivateKey,
  IsValidJoinCode,
  IsValidLitecoinAddress,
  IsValidLitecoinUri,
  IsValidPayPro,
  IsValidRippleAddress,
  IsValidRippleUri,
  isValidSimplexUri,
  isValidWalletConnectUri,
  isValidWyreUri,
} from '../wallet/utils/validations';
import {APP_DEEPLINK_PREFIX} from '../../constants/config';
import {BuyCryptoActions} from '../buy-crypto';
import {
  MoonpayIncomingData,
  SimplexIncomingData,
  WyrePaymentData,
} from '../buy-crypto/buy-crypto.models';
import {LogActions} from '../log';
import {logSegmentEvent, startOnGoingProcessModal} from '../app/app.effects';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../app/app.actions';
import {sleep} from '../../utils/helper-methods';
import {BwcProvider} from '../../lib/bwc';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../wallet/effects/send/send';
import {Key, Wallet} from '../wallet/wallet.models';
import {FormatAmount} from '../wallet/effects/amount/amount';
import {ButtonState} from '../../components/button/Button';
import {InteractionManager, Linking} from 'react-native';
import {
  BitcoreLibs,
  bitcoreLibs,
  GetAddressNetwork,
} from '../wallet/effects/address/address';
import {Network} from '../../constants';
import BitPayIdApi from '../../api/bitpay';
import axios from 'axios';
import {t} from 'i18next';
import {GeneralError} from '../../navigation/wallet/components/ErrorMessages';
import {StackActions} from '@react-navigation/native';
import {BitpaySupportedEvmCoins} from '../../constants/currencies';

export const incomingData =
  (
    data: string,
    opts?: {
      wallet?: Wallet;
      context?: string;
      name?: string;
      email?: string;
      destinationTag?: number;
    },
  ): Effect<Promise<boolean>> =>
  async dispatch => {
    // wait to close blur
    await sleep(200);
    const coin = opts?.wallet?.currencyAbbreviation?.toLowerCase();
    const chain = opts?.wallet?.credentials?.chain.toLowerCase();
    let handled = true;

    try {
      if (IsValidBitPayInvoice(data)) {
        dispatch(handleUnlock(data));
      }
      // Paypro
      else if (IsValidPayPro(data)) {
        dispatch(goToPayPro(data));
        // Plain Address (Bitcoin)
      } else if (IsValidBitcoinAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'btc', chain || 'btc', opts));
        // Plain Address (Bitcoin Cash)
      } else if (IsValidBitcoinCashAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'bch', chain || 'bch', opts));
        // Address (Ethereum)
      } else if (IsValidEthereumAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'eth', chain || 'eth', opts));
        // Address (Matic)
      } else if (IsValidMaticAddress(data)) {
        dispatch(
          handlePlainAddress(data, coin || 'matic', chain || 'matic', opts),
        );
        // Address (Ripple)
      } else if (IsValidRippleAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'xrp', chain || 'xrp', opts));
        // Plain Address (Doge)
      } else if (IsValidDogecoinAddress(data)) {
        dispatch(
          handlePlainAddress(data, coin || 'doge', chain || 'doge', opts),
        );
        // Plain Address (Litecoin)
      } else if (IsValidLitecoinAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'ltc', chain || 'ltc', opts));
        // Bitcoin  URI
      } else if (IsValidBitcoinUri(data)) {
        dispatch(handleBitcoinUri(data, opts?.wallet));
        // Bitcoin Cash URI
      } else if (IsValidBitcoinCashUri(data)) {
        dispatch(handleBitcoinCashUri(data, opts?.wallet));
        // Bitcoin Cash URI using Bitcoin Core legacy address
      } else if (IsValidBitcoinCashUriWithLegacyAddress(data)) {
        dispatch(handleBitcoinCashUriLegacyAddress(data, opts?.wallet));
        // Ethereum URI
      } else if (IsValidEthereumUri(data)) {
        dispatch(handleEthereumUri(data, opts?.wallet));
        // Matic URI
      } else if (IsValidMaticUri(data)) {
        dispatch(handleMaticUri(data, opts?.wallet));
        // Ripple URI
      } else if (IsValidRippleUri(data)) {
        dispatch(handleRippleUri(data, opts?.wallet));
        // Dogecoin URI
      } else if (IsValidDogecoinUri(data)) {
        dispatch(handleDogecoinUri(data, opts?.wallet));
        // Litecoin URI
      } else if (IsValidLitecoinUri(data)) {
        dispatch(handleLitecoinUri(data, opts?.wallet));
        // Wallet Connect URI
      } else if (isValidWalletConnectUri(data)) {
        handleWalletConnectUri(data);
        // Moonpay
      } else if (isValidMoonpayUri(data)) {
        dispatch(handleMoonpayUri(data));
        // Simplex
      } else if (isValidSimplexUri(data)) {
        dispatch(handleSimplexUri(data));
        // Wyre
      } else if (isValidWyreUri(data)) {
        dispatch(handleWyreUri(data));
        // BitPay URI
      } else if (IsValidBitPayUri(data)) {
        dispatch(handleBitPayUri(data, opts?.wallet));
        // Import Private Key
      } else if (IsValidImportPrivateKey(data)) {
        goToImport(data);
        // Join multisig wallet
      } else if (IsValidJoinCode(data)) {
        dispatch(goToJoinWallet(data));
      } else {
        handled = false;
      }
    } catch (err) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(300);
      throw err;
    }

    return handled;
  };

const getParameterByName = (name: string, url: string): string | undefined => {
  if (!url) {
    return undefined;
  }
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  const results = regex.exec(url);
  if (!results) {
    return undefined;
  }
  if (!results[2]) {
    return '';
  }
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

const goToPayPro =
  (data: string, replaceNavigationRoute?: boolean): Effect =>
  async dispatch => {
    dispatch(dismissOnGoingProcessModal());

    dispatch(
      startOnGoingProcessModal(
        //  t('Fetching payment options...')
        t(OnGoingProcessMessages.FETCHING_PAYMENT_OPTIONS),
      ),
    );

    const payProUrl = GetPayProUrl(data);

    try {
      const payProOptions = await GetPayProOptions(payProUrl);
      dispatch(dismissOnGoingProcessModal());

      if (replaceNavigationRoute) {
        navigationRef.dispatch(
          StackActions.replace('Wallet', {
            screen: WalletScreens.PAY_PRO_CONFIRM,
            params: {
              payProOptions,
            },
          }),
        );
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        navigationRef.navigate('Wallet', {
          screen: WalletScreens.PAY_PRO_CONFIRM,
          params: {
            payProOptions,
          },
        });
      });
    } catch (e: any) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(400);

      dispatch(
        showBottomNotificationModal({
          type: 'warning',
          title: t('Something went wrong'),
          message: e?.message,
          enableBackdropDismiss: true,
          actions: [
            {
              text: t('OK'),
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    }
  };

const handleUnlock =
  (data: string): Effect =>
  async dispatch => {
    const invoiceId = data.split('/i/')[1].split('?')[0];
    const network = data.includes('test.bitpay.com')
      ? Network.testnet
      : Network.mainnet;
    const result = await dispatch(unlockInvoice(invoiceId, network));

    if (result === 'unlockSuccess') {
      dispatch(goToPayPro(data));
      return;
    }

    const {host} = new URL(GetPayProUrl(data));

    try {
      const invoice = await axios.get(
        `https://${host}/invoiceData/${invoiceId}`,
      );
      if (invoice) {
        const context = getParameterByName('c', data);
        if (context === 'u') {
          const {
            data: {
              invoice: {
                buyerProvidedInfo: {emailAddress},
                buyerProvidedEmail,
                status,
              },
            },
          } = invoice;
          if (emailAddress || buyerProvidedEmail || status !== 'new') {
            dispatch(goToPayPro(data));
          } else {
            navigationRef.navigate('Wallet', {
              screen: 'EnterBuyerProvidedEmail',
              params: {data},
            });
          }
        } else {
          dispatch(goToPayPro(data));
        }
        return;
      }
    } catch {}
    switch (result) {
      case 'pairingRequired':
        navigationRef.navigate('Auth', {
          screen: 'Login',
          params: {
            onLoginSuccess: () => {
              navigationRef.navigate('Tabs', {screen: 'Home'});
              dispatch(incomingData(data));
            },
          },
        });
        break;

      // needs verification - send to bitpay id verify
      case 'userShopperNotFound':
      case 'tierNotMet':
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Verification Required'),
            enableBackdropDismiss: false,
            message: t('To complete this payment please verify your account.'),
            actions: [
              {
                text: t('Verify'),
                action: () => {
                  Linking.openURL(
                    `https://${host}/id/verify?context=unlockv&id=${invoiceId}`,
                  );
                },
              },
              {
                text: t('Cancel'),
                action: () => {},
              },
            ],
          }),
        );
        break;
      default:
        dispatch(showBottomNotificationModal(GeneralError()));
        break;
    }
  };

const unlockInvoice =
  (invoiceId: string, network: Network): Effect<Promise<string>> =>
  async (dispatch, getState) => {
    const {BITPAY_ID, APP} = getState();

    if (APP.network !== network) {
      return 'networkMismatch';
    }

    const token = BITPAY_ID.apiToken[APP.network];

    const isPaired = !!token;
    if (!isPaired) {
      return 'pairingRequired';
    }

    try {
      const tokens = (await BitPayIdApi.getInstance()
        .request('getProductTokens', token)
        .then(res => {
          if (res.data.error) {
            throw new Error(res.data.error);
          }
          return res.data;
        })) as [{facade: string; token: string; name: string}];

      const {token: userShopperToken} =
        tokens.find(({facade}: {facade: string}) => facade === 'userShopper') ||
        {};

      if (!userShopperToken) {
        return 'userShopperNotFound';
      }

      try {
        const unlockInvoiceResponse = await BitPayIdApi.getInstance()
          .request('unlockInvoice', userShopperToken, {invoiceId})
          .then(res => {
            if (res.data.error) {
              throw new Error(res.data.error);
            }

            return res.data;
          });

        const {data} = unlockInvoiceResponse as {data: any};
        const {meetsRequiredTier} = data;

        if (!meetsRequiredTier) {
          return 'tierNotMet';
        }

        return 'unlockSuccess';
      } catch (e) {
        return 'invalidInvoice';
      }
    } catch (e) {
      return 'somethingWentWrong';
    }
  };

const goToConfirm =
  ({
    recipient,
    amount,
    wallet,
    setButtonState,
    opts,
  }: {
    recipient: {
      type: string;
      address: string;
      email?: string;
      currency: string;
      chain: string;
      destinationTag?: number;
      network?: Network;
    };
    amount: number;
    wallet?: Wallet;
    setButtonState?: (state: ButtonState) => void;
    opts?: {
      sendMax?: boolean | undefined;
      message?: string;
      feePerKb?: number;
    };
  }): Effect<Promise<void>> =>
  async dispatch => {
    try {
      if (!wallet) {
        navigationRef.navigate('Wallet', {
          screen: 'GlobalSelect',
          params: {
            context: 'scanner',
            recipient: {
              ...recipient,
              ...{
                opts: {
                  showERC20Tokens:
                    !!BitpaySupportedEvmCoins[recipient.currency.toLowerCase()], // no wallet selected - if ETH address show token wallets in next view
                  message: opts?.message || '',
                },
              },
            },
            amount,
          },
        });
        return Promise.resolve();
      }

      if (setButtonState) {
        setButtonState('loading');
      } else {
        dispatch(
          startOnGoingProcessModal(
            // t('Creating Transaction')
            t(OnGoingProcessMessages.CREATING_TXP),
          ),
        );
      }

      const {txDetails, txp} = await dispatch(
        createProposalAndBuildTxDetails({
          wallet,
          recipient,
          amount,
          ...opts,
        }),
      );
      if (setButtonState) {
        setButtonState('success');
      } else {
        dispatch(dismissOnGoingProcessModal());
      }
      await sleep(300);
      navigationRef.navigate('Wallet', {
        screen: 'Confirm',
        params: {
          wallet,
          recipient,
          txp,
          txDetails,
          amount,
          message: opts?.message || '',
          sendMax: opts?.sendMax,
        },
      });
      sleep(300).then(() => setButtonState?.(null));
    } catch (err: any) {
      if (setButtonState) {
        setButtonState('failed');
      } else {
        dispatch(dismissOnGoingProcessModal());
      }
      const [errorMessageConfig] = await Promise.all([
        dispatch(handleCreateTxProposalError(err)),
        sleep(400),
      ]);
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {
                if (setButtonState) {
                  setButtonState(undefined);
                }
              },
            },
          ],
        }),
      );
    }
  };

export const goToAmount =
  ({
    coin,
    chain,
    recipient,
    wallet,
    opts: urlOpts,
  }: {
    coin: string;
    chain: string;
    recipient: {
      type: string;
      email?: string;
      address: string;
      currency: string;
      chain: string;
      network?: Network;
      destinationTag?: number;
    };
    wallet?: Wallet;
    opts?: {
      message?: string;
      feePerKb?: number;
    };
  }): Effect<Promise<void>> =>
  async dispatch => {
    if (!wallet) {
      navigationRef.navigate('Wallet', {
        screen: 'GlobalSelect',
        params: {
          context: 'scanner',
          recipient: {
            ...recipient,
            ...{
              opts: {
                showERC20Tokens:
                  !!BitpaySupportedEvmCoins[recipient.currency.toLowerCase()], // no wallet selected - if ETH address show token wallets in next view
              },
            },
          },
        },
      });
      return Promise.resolve();
    }
    navigationRef.navigate('Wallet', {
      screen: WalletScreens.AMOUNT,
      params: {
        sendMaxEnabled: true,
        cryptoCurrencyAbbreviation: coin.toUpperCase(),
        chain,
        onAmountSelected: async (amount, setButtonState, amountOpts) => {
          dispatch(
            goToConfirm({
              recipient,
              amount: Number(amount),
              wallet,
              setButtonState,
              opts: {...urlOpts, ...amountOpts},
            }),
          );
        },
      },
    });
  };

const handleBitPayUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('[scan] Incoming-data: BitPay URI', data));

    // From Braze (push notifications)
    if (data.includes('wallet?')) {
      const params: URLSearchParams = new URLSearchParams(
        data.replace(APP_DEEPLINK_PREFIX + 'wallet?', ''),
      );
      const walletIdHashed = params.get('walletId')!;
      const tokenAddress = params.get('tokenAddress');
      const multisigContractAddress = params.get('multisigContractAddress');

      const keys = Object.values(getState().WALLET.keys);

      const fullWalletObj = findWallet(
        keys,
        walletIdHashed,
        tokenAddress,
        multisigContractAddress,
      );

      if (fullWalletObj) {
        navigationRef.navigate('Wallet', {
          screen: WalletScreens.WALLET_DETAILS,
          params: {
            walletId: fullWalletObj.credentials.walletId,
          },
        });
      }
    } else {
      const address = ExtractBitPayUriAddress(data);
      const params: URLSearchParams = new URLSearchParams(
        data.replace(`bitpay:${address}`, ''),
      );
      const message = params.get('message') || undefined;
      let feePerKb;
      const coin = params.get('coin')!;
      const _chain = params.get('chain')!;

      if (params.get('gasPrice')) {
        feePerKb = Number(params.get('gasPrice'));
      }
      const chain = _chain || wallet!.chain;
      const network = Object.keys(bitcoreLibs).includes(coin)
        ? GetAddressNetwork(address, coin as keyof BitcoreLibs)
        : undefined;

      let recipient = {
        type: 'address',
        currency: coin,
        chain,
        address,
        network,
      };

      if (!params.get('amount')) {
        dispatch(goToAmount({coin, chain, recipient, wallet, opts: {message}}));
      } else {
        const amount = Number(params.get('amount'));
        dispatch(
          goToConfirm({
            recipient,
            amount,
            wallet,
            opts: {message, feePerKb},
          }),
        );
      }
    }
  };

const handleBitcoinUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Bitcoin URI'));
    const coin = 'btc';
    const chain = 'btc';
    const parsed = BwcProvider.getInstance().getBitcore().URI(data);
    const address = parsed.address ? parsed.address.toString() : '';
    const message = parsed.message;
    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
      network: address && GetAddressNetwork(address, coin),
    };
    if (parsed.r) {
      dispatch(goToPayPro(parsed.r));
    } else if (!parsed.amount) {
      dispatch(goToAmount({coin, chain, recipient, wallet, opts: {message}}));
    } else {
      const amount = Number(
        dispatch(FormatAmount(coin, chain, parsed.amount, true)),
      );
      dispatch(goToConfirm({recipient, amount, wallet, opts: {message}}));
    }
  };

const handleBitcoinCashUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: BitcoinCash URI'));
    const coin = 'bch';
    const chain = 'bch';
    const parsed = BwcProvider.getInstance().getBitcoreCash().URI(data);
    const message = parsed.message;
    let address = parsed.address ? parsed.address.toString() : '';

    // keep address in original format
    if (parsed.address && data.indexOf(address) < 0) {
      address = parsed.address.toCashAddress();
    }

    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
      network: address && GetAddressNetwork(address, coin),
    };
    if (parsed.r) {
      dispatch(goToPayPro(parsed.r));
    } else if (!parsed.amount) {
      dispatch(goToAmount({coin, chain, recipient, wallet, opts: {message}}));
    } else {
      const amount = Number(
        dispatch(FormatAmount(coin, chain, parsed.amount, true)),
      );
      dispatch(goToConfirm({recipient, amount, wallet, opts: {message}}));
    }
  };

const handleBitcoinCashUriLegacyAddress =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(
      LogActions.info(
        '[scan] Incoming-data: Bitcoin Cash URI with legacy address',
      ),
    );
    const coin = 'bch';
    const chain = 'bch';
    const parsed = BwcProvider.getInstance()
      .getBitcore()
      .URI(data.replace(/^(bitcoincash:|bchtest:)/, 'bitcoin:'));

    const oldAddr = parsed.address ? parsed.address.toString() : '';
    if (!oldAddr) {
      dispatch(
        LogActions.info('[scan] Could not parse Bitcoin Cash legacy address'),
      );
    }

    const a = BwcProvider.getInstance()
      .getBitcore()
      .Address(oldAddr)
      .toObject();
    const address = BwcProvider.getInstance()
      .getBitcoreCash()
      .Address.fromObject(a)
      .toString();
    const message = parsed.message;

    // Translate address
    dispatch(
      LogActions.info(
        '[scan] Legacy Bitcoin Address translated to: ' + address,
      ),
    );
    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
      network: address && GetAddressNetwork(address, coin),
    };
    if (parsed.r) {
      dispatch(goToPayPro(parsed.r));
    } else if (!parsed.amount) {
      dispatch(goToAmount({coin, chain, recipient, wallet, opts: {message}}));
    } else {
      const amount = Number(
        dispatch(FormatAmount(coin, chain, parsed.amount, true)),
      );
      dispatch(goToConfirm({recipient, amount, wallet, opts: {message}}));
    }
  };

const handleEthereumUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Ethereum URI'));
    const coin = 'eth';
    const chain = 'eth';
    const value = /[\?\&]value=(\d+([\,\.]\d+)?)/i;
    const gasPrice = /[\?\&]gasPrice=(\d+([\,\.]\d+)?)/i;
    let feePerKb;
    if (gasPrice.exec(data)) {
      feePerKb = Number(gasPrice.exec(data)![1]);
    }
    const address = ExtractBitPayUriAddress(data);
    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
    };
    if (!value.exec(data)) {
      dispatch(goToAmount({coin, chain, recipient, wallet, opts: {feePerKb}}));
    } else {
      const parsedAmount = value.exec(data)![1];
      const amount = Number(
        dispatch(FormatAmount(coin, chain, Number(parsedAmount), true)),
      );
      dispatch(
        goToConfirm({
          recipient,
          amount,
          wallet,
          opts: {feePerKb},
        }),
      );
    }
  };

const handleMaticUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Matic URI'));
    const coin = 'matic';
    const chain = 'matic';
    const value = /[\?\&]value=(\d+([\,\.]\d+)?)/i;
    const gasPrice = /[\?\&]gasPrice=(\d+([\,\.]\d+)?)/i;
    let feePerKb;
    if (gasPrice.exec(data)) {
      feePerKb = Number(gasPrice.exec(data)![1]);
    }
    const address = ExtractBitPayUriAddress(data);
    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
    };
    if (!value.exec(data)) {
      dispatch(goToAmount({coin, chain, recipient, wallet, opts: {feePerKb}}));
    } else {
      const parsedAmount = value.exec(data)![1];
      const amount = Number(
        dispatch(FormatAmount(coin, chain, Number(parsedAmount), true)),
      );
      dispatch(
        goToConfirm({
          recipient,
          amount,
          wallet,
          opts: {feePerKb},
        }),
      );
    }
  };

const handleRippleUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Ripple URI'));
    const coin = 'xrp';
    const chain = 'xrp';
    const amountParam = /[\?\&]amount=(\d+([\,\.]\d+)?)/i;
    const tagParam = /[\?\&]dt=(\d+([\,\.]\d+)?)/i;
    let destinationTag;

    if (tagParam.exec(data)) {
      destinationTag = tagParam.exec(data)![1];
    }
    const address = ExtractBitPayUriAddress(data);
    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
      destinationTag: Number(destinationTag),
    };
    if (!amountParam.exec(data)) {
      dispatch(goToAmount({coin, chain, recipient, wallet}));
    } else {
      const parsedAmount = amountParam.exec(data)![1];
      const amount = Number(parsedAmount);
      dispatch(
        goToConfirm({
          recipient,
          amount,
          wallet,
        }),
      );
    }
  };

const handleDogecoinUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Dogecoin URI'));
    const coin = 'doge';
    const chain = 'doge';
    const parsed = BwcProvider.getInstance().getBitcoreDoge().URI(data);
    const address = parsed.address ? parsed.address.toString() : '';
    const message = parsed.message;

    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
      network: address && GetAddressNetwork(address, coin),
    };

    if (parsed.r) {
      dispatch(goToPayPro(parsed.r));
    } else if (!parsed.amount) {
      dispatch(goToAmount({coin, chain, recipient, wallet, opts: {message}}));
    } else {
      const amount = Number(
        dispatch(FormatAmount(coin, chain, parsed.amount, true)),
      );
      dispatch(goToConfirm({recipient, amount, wallet, opts: {message}}));
    }
  };

const handleLitecoinUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Litecoin URI'));
    const coin = 'ltc';
    const chain = 'ltc';
    const parsed = BwcProvider.getInstance().getBitcoreLtc().URI(data);
    const address = parsed.address ? parsed.address.toString() : '';
    const message = parsed.message;

    const recipient = {
      type: 'address',
      currency: coin,
      chain,
      address,
      network: address && GetAddressNetwork(address, coin),
    };
    if (parsed.r) {
      dispatch(goToPayPro(parsed.r));
    } else if (!parsed.amount) {
      dispatch(goToAmount({coin, chain, recipient, wallet, opts: {message}}));
    } else {
      const amount = Number(
        dispatch(FormatAmount(coin, chain, parsed.amount, true)),
      );
      dispatch(goToConfirm({recipient, amount, wallet, opts: {message}}));
    }
  };

const handleMoonpayUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Moonpay URL: ' + data));

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const externalId = getParameterByName('externalId', res);
    if (!externalId) {
      dispatch(LogActions.warn('No externalId present. Do not redir'));
      return;
    }

    const transactionId = getParameterByName('transactionId', res);
    const status = getParameterByName('transactionStatus', res);

    const stateParams: MoonpayIncomingData = {
      externalId,
      transactionId,
      status,
    };

    dispatch(
      BuyCryptoActions.updatePaymentRequestMoonpay({
        moonpayIncomingData: stateParams,
      }),
    );

    const {BUY_CRYPTO} = getState();
    const order = BUY_CRYPTO.moonpay[externalId];

    dispatch(
      logSegmentEvent('track', 'Purchased Buy Crypto', {
        exchange: 'moonpay',
        fiatAmount: order?.fiat_total_amount || '',
        fiatCurrency: order?.fiat_total_amount_currency || '',
        coin: order?.coin || '',
      }),
    );

    navigationRef.reset({
      index: 2,
      routes: [
        {
          name: 'Tabs',
          params: {screen: 'Home'},
        },
        {
          name: 'ExternalServicesSettings',
          params: {
            screen: 'MoonpaySettings',
            params: {incomingPaymentRequest: stateParams},
          },
        },
      ],
    });
  };

const handleSimplexUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Simplex URL: ' + data));

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const paymentId = getParameterByName('paymentId', res);
    if (!paymentId) {
      dispatch(LogActions.warn('No paymentId present. Do not redir'));
      return;
    }

    const success = getParameterByName('success', res);
    const quoteId = getParameterByName('quoteId', res);
    const userId = getParameterByName('userId', res);

    const stateParams: SimplexIncomingData = {
      success,
      paymentId,
      quoteId,
      userId,
    };

    dispatch(
      BuyCryptoActions.updatePaymentRequestSimplex({
        simplexIncomingData: stateParams,
      }),
    );

    const {BUY_CRYPTO} = getState();
    const order = BUY_CRYPTO.simplex[paymentId];

    dispatch(
      logSegmentEvent('track', 'Purchased Buy Crypto', {
        exchange: 'simplex',
        fiatAmount: order?.fiat_total_amount || '',
        fiatCurrency: order?.fiat_total_amount_currency || '',
        coin: order?.coin?.toLowerCase() || '',
        chain: order?.chain?.toLowerCase() || '',
      }),
    );

    navigationRef.reset({
      index: 2,
      routes: [
        {
          name: 'Tabs',
          params: {screen: 'Home'},
        },
        {
          name: 'ExternalServicesSettings',
          params: {
            screen: 'SimplexSettings',
            params: {incomingPaymentRequest: stateParams},
          },
        },
      ],
    });
  };

const handleWyreUri =
  (data: string): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('Incoming-data (redirect): Wyre URL: ' + data));

    if (data.indexOf('wyreError') >= 0) {
      navigationRef.navigate('ExternalServicesSettings', {
        screen: 'WyreSettings',
        params: {
          paymentRequestError: true,
        },
      });
      return;
    }

    if (data === 'wyre') {
      return;
    }
    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const orderId = getParameterByName('id', res);
    if (!orderId) {
      dispatch(LogActions.warn('No orderId present. Do not redir'));
      return;
    }

    const walletId = getParameterByName('walletId', res);
    const destCurrency = getParameterByName('destCurrency', res);
    const destChain = getParameterByName('destChain', res);
    const sourceCurrency = getParameterByName('sourceCurrency', res);
    const sourceAmount = getParameterByName('sourceAmount', res);

    const stateParams: WyrePaymentData = {
      orderId,
      transferId: getParameterByName('transferId', res),
      owner: getParameterByName('owner', res),
      accountId: getParameterByName('accountId', res),
      walletId,
      dest: getParameterByName('dest', res),
      destAmount: getParameterByName('destAmount', res),
      destChain,
      destCurrency,
      purchaseAmount: getParameterByName('purchaseAmount', res),
      sourceAmount,
      sourceCurrency,
      status: getParameterByName('status', res),
      createdAt: getParameterByName('createdAt', res),
      paymentMethodName: getParameterByName('paymentMethodName', res),
      blockchainNetworkTx: getParameterByName('blockchainNetworkTx', res),
      env: __DEV__ ? 'dev' : 'prod',
      created_on: Date.now(),
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestWyre({
        wyrePaymentData: stateParams,
      }),
    );

    dispatch(
      logSegmentEvent('track', 'Purchased Buy Crypto', {
        exchange: 'wyre',
        fiatAmount: sourceAmount || '',
        fiatCurrency: sourceCurrency || '',
        coin: destCurrency?.toLowerCase() || '',
        chain: destChain?.toLowerCase() || '',
      }),
    );

    navigationRef.reset({
      index: 2,
      routes: [
        {
          name: 'Tabs',
          params: {screen: 'Home'},
        },
        {
          name: 'ExternalServicesSettings',
          params: {
            screen: 'WyreSettings',
            params: {incomingPaymentRequest: stateParams},
          },
        },
      ],
    });
  };

const handleWalletConnectUri = (data: string) => {
  navigationRef.navigate('WalletConnect', {
    screen: 'Root',
    params: {
      uri: data,
    },
  });
};

const handlePlainAddress =
  (
    address: string,
    coin: string,
    chain: string,
    opts?: {
      wallet?: Wallet;
      context?: string;
      name?: string;
      email?: string;
      destinationTag?: number;
    },
  ): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info(`[scan] Incoming-data: ${coin} plain address`));
    const network = Object.keys(bitcoreLibs).includes(coin)
      ? GetAddressNetwork(address, coin as keyof BitcoreLibs)
      : undefined; // There is no way to tell if an eth address is kovan or livenet so let's skip the network filter
    const recipient = {
      type: opts?.context || 'address',
      name: opts?.name,
      email: opts?.email,
      currency: coin,
      chain,
      address,
      network,
      destinationTag: opts?.destinationTag,
    };
    dispatch(goToAmount({coin, chain, recipient, wallet: opts?.wallet}));
  };

const goToImport = (importQrCodeData: string): void => {
  navigationRef.navigate('Wallet', {
    screen: WalletScreens.IMPORT,
    params: {
      importQrCodeData,
    },
  });
};

const goToJoinWallet =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(
      LogActions.info(
        '[scan] Incoming-data (redirect): Code to join to a multisig wallet',
      ),
    );
    const keys = Object.values(getState().WALLET.keys);
    if (!keys.length) {
      navigationRef.navigate('Wallet', {
        screen: 'JoinMultisig',
        params: {
          invitationCode: data,
        },
      });
    } else if (keys.length === 1) {
      navigationRef.navigate('Wallet', {
        screen: 'JoinMultisig',
        params: {
          key: keys[0],
          invitationCode: data,
        },
      });
    } else {
      navigationRef.navigate('Wallet', {
        screen: WalletScreens.KEY_GLOBAL_SELECT,
        params: {
          onKeySelect: (selectedKey: Key) => {
            navigationRef.navigate('Wallet', {
              screen: WalletScreens.JOIN_MULTISIG,
              params: {
                key: selectedKey,
                invitationCode: data,
              },
            });
          },
        },
      });
    }
  };

const findWallet = (
  keys: Key[],
  walletIdHashed: string,
  tokenAddress: string | null,
  multisigContractAddress?: string | null,
) => {
  let walletIdHash;
  const sjcl = BwcProvider.getInstance().getSJCL();

  const wallets = Object.values(keys).flatMap(k => k.wallets);

  const wallet = wallets.find(w => {
    if (tokenAddress || multisigContractAddress) {
      const walletId = w.credentials.walletId;
      const lastHyphenPosition = walletId.lastIndexOf('-');
      const walletIdWithoutTokenAddress = walletId.substring(
        0,
        lastHyphenPosition,
      );
      walletIdHash = sjcl.hash.sha256.hash(walletIdWithoutTokenAddress);
    } else {
      walletIdHash = sjcl.hash.sha256.hash(w.credentials.walletId);
    }
    return isEqual(walletIdHashed, sjcl.codec.hex.fromBits(walletIdHash));
  });

  return wallet;
};

export const setBuyerProvidedEmail =
  (data: string, email: string): Effect<Promise<void>> =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const invoiceId = data.split('/i/')[1].split('?')[0];
        const {host} = new URL(GetPayProUrl(data));
        const body = {
          buyerProvidedEmail: email,
          invoiceId,
        };
        const {
          data: {status},
        } = await axios.post(
          `https://${host}/invoiceData/setBuyerProvidedEmail`,
          body,
        );
        if (status === 'success') {
          dispatch(goToPayPro(data, true));
          return resolve();
        } else {
          return reject();
        }
      } catch (e) {
        return reject();
      }
    });
  };
