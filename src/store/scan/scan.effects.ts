import {WalletScreens} from '../../navigation/wallet/WalletGroup';
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
  IsValidEVMAddress,
  IsValidSVMAddress,
  IsValidEthereumUri,
  IsValidMaticUri,
  IsValidBaseUri,
  IsValidArbUri,
  IsValidOpUri,
  IsValidSolUri,
  isValidBuyCryptoUri,
  isValidSellCryptoUri,
  isValidMoonpayUri,
  IsValidImportPrivateKey,
  IsValidJoinCode,
  IsValidLitecoinAddress,
  IsValidLitecoinUri,
  IsValidPayPro,
  isValidRampUri,
  IsValidRippleAddress,
  IsValidRippleUri,
  isValidSardineUri,
  isValidTransakUri,
  isValidSimplexUri,
  isValidWalletConnectUri,
  IsBitPayInvoiceWebUrl,
  isValidBanxaUri,
  IsValidPrivateKey,
  isValidSwapCryptoUri,
  IsValidAddKeyPath,
  IsValidSolanaPay,
} from '../wallet/utils/validations';
import {APP_DEEPLINK_PREFIX} from '../../constants/config';
import {BuyCryptoActions} from '../buy-crypto';
import {SellCryptoActions} from '../sell-crypto';
import {
  BanxaIncomingData,
  BanxaStatusKey,
  MoonpayIncomingData,
  SardineIncomingData,
  SardinePaymentData,
  SimplexIncomingData,
  TransakIncomingData,
  TransakStatusKey,
} from '../buy-crypto/buy-crypto.models';
import {RampIncomingData} from '../buy-crypto/models/ramp.models';
import {LogActions} from '../log';
import {startOnGoingProcessModal} from '../app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../app/app.actions';
import {
  getCurrencyAbbreviation,
  getSolanaTokenInfo,
  sleep,
} from '../../utils/helper-methods';
import {BwcProvider} from '../../lib/bwc';
import {
  createProposalAndBuildTxDetails,
  handleCreateTxProposalError,
} from '../wallet/effects/send/send';
import {Key, Token, Wallet} from '../wallet/wallet.models';
import {FormatAmount} from '../wallet/effects/amount/amount';
import {ButtonState} from '../../components/button/Button';
import {Linking} from 'react-native';
import {
  BitcoreLibs,
  bitcoreLibs,
  GetAddressNetwork,
  GetCoinAndNetwork,
} from '../wallet/effects/address/address';
import {Network} from '../../constants';
import BitPayIdApi from '../../api/bitpay';
import axios from 'axios';
import {t} from 'i18next';
import {
  CustomErrorMessage,
  GeneralError,
} from '../../navigation/wallet/components/ErrorMessages';
import {StackActions} from '@react-navigation/native';
import {
  BitpaySupportedEvmCoins,
  BitpaySupportedSvmCoins,
} from '../../constants/currencies';
import {Analytics} from '../analytics/analytics.effects';
import {parseUri} from '@walletconnect/utils';
import {Invoice} from '../shop/shop.models';
import {calculateUsdToAltFiat} from '../buy-crypto/buy-crypto.effects';
import {IsUtxoChain} from '../wallet/utils/currency';
import {BWCErrorMessage} from '../../constants/BWCError';
import {walletConnectV2OnSessionProposal} from '../wallet-connect-v2/wallet-connect-v2.effects';
import {MoonpaySellIncomingData} from '../sell-crypto/models/moonpay-sell.models';
import {findWalletById} from '../wallet/utils/wallet';
import {MoonpaySellCheckoutProps} from '../../navigation/services/sell-crypto/screens/MoonpaySellCheckout';
import {MoonpaySettingsProps} from '../../navigation/tabs/settings/external-services/screens/MoonpaySettings';
import {RampSettingsProps} from '../../navigation/tabs/settings/external-services/screens/RampSettings';
import {SimplexSettingsProps} from '../../navigation/tabs/settings/external-services/screens/SimplexSettings';
import {getMoonpaySellFixedCurrencyAbbreviation} from '../../navigation/services/sell-crypto/utils/moonpay-sell-utils';
import {SellCryptoScreens} from '../../navigation/services/sell-crypto/SellCryptoGroup';
import {SwapCryptoScreens} from '../../navigation/services/swap-crypto/SwapCryptoGroup';
import {SimplexSellIncomingData} from '../sell-crypto/models/simplex-sell.models';
import {ExternalServicesSettingsScreens} from '../../navigation/tabs/settings/external-services/ExternalServicesGroup';
import {BitpaySupportedTokenOptsByAddress} from '../../constants/tokens';
import {getTokenContractInfo} from '../wallet/effects/status/status';
import {SolanaPayOpts} from '../../navigation/wallet/screens/send/confirm/Confirm';

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
    const coin = opts?.wallet?.currencyAbbreviation?.toLowerCase();
    const chain = opts?.wallet?.credentials?.chain.toLowerCase();
    let handled = true;

    try {
      if (IsBitPayInvoiceWebUrl(data)) {
        const invoiceId = new URLSearchParams(data).get('id');
        const origin = new URL(data).origin;
        data = `${origin}/i/${invoiceId}`;
      }
      if (IsValidBitPayInvoice(data)) {
        dispatch(handleUnlock(data, opts?.wallet));
      }
      // Paypro
      else if (IsValidPayPro(data)) {
        dispatch(goToPayPro(data, undefined, undefined, opts?.wallet));
        // Plain Address (Bitcoin)
      }
      // SolanaPay
      else if (IsValidSolanaPay(data)) {
        dispatch(handleSolanaPay(data, opts?.wallet));
        // Plain Address (Bitcoin)
      } else if (IsValidBitcoinAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'btc', chain || 'btc', opts));
        // Plain Address (Bitcoin Cash)
      } else if (IsValidBitcoinCashAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'bch', chain || 'bch', opts));
        // EVM Address (Ethereum/Matic)
      } else if (IsValidEVMAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'eth', chain || 'eth', opts)); // using eth for simplicity
        // SVM Address (Sol/SLP)
      } else if (IsValidSVMAddress(data)) {
        dispatch(handlePlainAddress(data, coin || 'sol', chain || 'sol', opts)); // using sol for simplicity
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
        // Arb URI
      } else if (IsValidArbUri(data)) {
        dispatch(handleArbUri(data, opts?.wallet));
        // Base URI
      } else if (IsValidBaseUri(data)) {
        dispatch(handleBaseUri(data, opts?.wallet));
        // Op URI
      } else if (IsValidOpUri(data)) {
        dispatch(handleOpUri(data, opts?.wallet));
      } // SOL URI
      else if (IsValidSolUri(data)) {
        dispatch(handleSolUri(data, opts?.wallet));
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
        dispatch(handleWalletConnectUri(data));
        // Buy Crypto
      } else if (isValidBuyCryptoUri(data)) {
        dispatch(handleBuyCryptoUri(data));
        // Sell Crypto
      } else if (isValidSellCryptoUri(data)) {
        dispatch(handleSellCryptoUri(data));
        // Swap Crypto
      } else if (isValidSwapCryptoUri(data)) {
        dispatch(handleSwapCryptoUri(data));
        // Banxa
      } else if (isValidBanxaUri(data)) {
        dispatch(handleBanxaUri(data));
        // Moonpay
      } else if (isValidMoonpayUri(data)) {
        dispatch(handleMoonpayUri(data));
        // Ramp
      } else if (isValidRampUri(data)) {
        dispatch(handleRampUri(data));
        // Sardine
      } else if (isValidSardineUri(data)) {
        dispatch(handleSardineUri(data));
        // Simplex
      } else if (isValidSimplexUri(data)) {
        dispatch(handleSimplexUri(data));
        // Transak
      } else if (isValidTransakUri(data)) {
        dispatch(handleTransakUri(data));
        // BitPay URI
      } else if (IsValidBitPayUri(data)) {
        dispatch(handleBitPayUri(data, opts?.wallet));
        // Check Private Key
      } else if (IsValidPrivateKey(data)) {
        dispatch(handlePrivateKey(data));
        return true;
        // Go to Add Key
      } else if (IsValidAddKeyPath(data)) {
        dispatch(goToAddKey(data));
        // Import private key
      } else if (IsValidImportPrivateKey(data)) {
        dispatch(goToImport(data));
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
  (
    data: string,
    replaceNavigationRoute?: boolean,
    invoice?: Invoice,
    wallet?: Wallet,
  ): Effect =>
  async dispatch => {
    dispatch(dismissOnGoingProcessModal());
    const invoiceId = data.split('/i/')[1].split('?')[0];
    const payProUrl = GetPayProUrl(data);
    const {host} = new URL(payProUrl);
    dispatch(LogActions.info('[scan] Incoming-data: Payment Protocol request'));
    try {
      dispatch(startOnGoingProcessModal('FETCHING_PAYMENT_INFO'));
      const payProOptions = await dispatch(GetPayProOptions(payProUrl));
      const getInvoiceResponse = await axios.get(
        `https://${host}/invoices/${invoiceId}`,
      );
      const {
        data: {data: fetchedInvoice},
      } = getInvoiceResponse as {data: {data: Invoice}};
      const _invoice: Invoice = invoice || fetchedInvoice;

      dispatch(dismissOnGoingProcessModal());

      if (replaceNavigationRoute) {
        navigationRef.dispatch(
          StackActions.replace(WalletScreens.PAY_PRO_CONFIRM, {
            payProOptions,
            invoice: _invoice,
            wallet,
          }),
        );
        return;
      }
      navigationRef.navigate(WalletScreens.PAY_PRO_CONFIRM, {
        payProOptions,
        invoice: _invoice,
        wallet,
      });
    } catch (e: any) {
      dispatch(dismissOnGoingProcessModal());
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
  (data: string, wallet?: Wallet): Effect =>
  async dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: BitPay invoice'));

    const invoiceId = data.split('/i/')[1].split('?')[0];
    const network = data.includes('test.bitpay.com')
      ? Network.testnet
      : Network.mainnet;
    const result = await dispatch(unlockInvoice(invoiceId, network));

    if (result === 'unlockSuccess') {
      dispatch(goToPayPro(data, undefined, undefined, wallet));
      return;
    }

    const {host} = new URL(GetPayProUrl(data));

    // QueryParam c=u is used in BitPay invoice payment URL when BitPayApp is the selected wallet.
    const context = getParameterByName('c', data);

    try {
      const {data: invoice} = await axios.get(
        `https://${host}/invoiceData/${invoiceId}`,
      );
      if (invoice) {
        if (context === 'u') {
          const {
            invoice: {
              buyerEmailAddress,
              buyerProvidedInfo: {emailAddress},
              buyerProvidedEmail,
              status,
            },
          } = invoice;

          if (
            emailAddress ||
            buyerProvidedEmail ||
            buyerEmailAddress ||
            status !== 'new'
          ) {
            dispatch(goToPayPro(data, undefined, undefined, wallet));
          } else {
            navigationRef.navigate('EnterBuyerProvidedEmail', {data});
          }
        } else {
          const _invoice = invoice?.invoice || invoice;
          dispatch(goToPayPro(data, undefined, _invoice, wallet));
        }
        return;
      }
    } catch {}

    if (context === 'u') {
      dispatch(goToPayPro(data, undefined, undefined, wallet));
      return;
    }

    switch (result) {
      case 'pairingRequired':
        navigationRef.navigate('Login', {
          onLoginSuccess: () => {
            navigationRef.navigate('Tabs', {screen: 'Home'});
            dispatch(incomingData(data));
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
      solanaPayOpts?: SolanaPayOpts;
    };
  }): Effect<Promise<void>> =>
  async dispatch => {
    try {
      if (!wallet) {
        navigationRef.navigate('GlobalSelect', {
          context: 'scanner',
          recipient: {
            ...recipient,
            ...{
              opts: {
                showEVMWalletsAndTokens:
                  !!BitpaySupportedEvmCoins[recipient.currency.toLowerCase()], // no wallet selected - if EVM address show all evm wallets and tokens in next view
                showSVMWalletsAndTokens:
                  !!BitpaySupportedSvmCoins[recipient.currency.toLowerCase()], // no wallet selected - if SVM address show all svm wallets and tokens in next view
                message: opts?.message || '',
                feePerKb: opts?.feePerKb,
                solanaPayOpts: opts?.solanaPayOpts,
              },
            },
          },
          amount,
        });
        return Promise.resolve();
      }

      if (setButtonState) {
        setButtonState('loading');
      } else {
        dispatch(startOnGoingProcessModal('CREATING_TXP'));
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
      navigationRef.navigate('Confirm', {
        wallet,
        recipient,
        txp,
        txDetails,
        amount,
        message: opts?.message || '',
        sendMax: opts?.sendMax,
        solanaPayOpts: opts?.solanaPayOpts,
      });
      sleep(300).then(() => setButtonState?.(null));
    } catch (err: any) {
      if (setButtonState) {
        setButtonState('failed');
        sleep(1000).then(() => setButtonState?.(null));
      } else {
        dispatch(dismissOnGoingProcessModal());
      }
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err),
      );
      dispatch(
        showBottomNotificationModal({
          ...errorMessageConfig,
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
    opts,
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
      solanaPayOpts?: SolanaPayOpts;
    };
  }): Effect<Promise<void>> =>
  async dispatch => {
    if (!wallet) {
      navigationRef.navigate('GlobalSelect', {
        context: 'scanner',
        recipient: {
          ...recipient,
          ...{
            opts: {
              showEVMWalletsAndTokens:
                !!BitpaySupportedEvmCoins[recipient.currency.toLowerCase()], // no wallet selected - if EVM address show all evm wallets and tokens in next view
              showSVMWalletsAndTokens:
                !!BitpaySupportedSvmCoins[recipient.currency.toLowerCase()], // no wallet selected - if SVM address show all svm wallets and tokens in next view
              message: opts?.message || '',
              feePerKb: opts?.feePerKb,
            },
          },
        },
      });
      return Promise.resolve();
    }
    navigationRef.navigate(WalletScreens.AMOUNT, {
      sendMaxEnabled: true,
      cryptoCurrencyAbbreviation: coin.toUpperCase(),
      chain,
      tokenAddress: wallet.tokenAddress,
      onAmountSelected: async (amount, setButtonState, amountOpts) => {
        dispatch(
          goToConfirm({
            recipient,
            amount: Number(amount),
            wallet,
            setButtonState,
            opts: {...opts, ...amountOpts},
          }),
        );
      },
    });
  };

const handlePrivateKey =
  (scannedPrivateKey: string, wallet?: Wallet): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('[scan] Incoming-data: private key'));
    navigationRef.navigate(WalletScreens.PAPER_WALLET, {
      scannedPrivateKey,
    });
  };

const goToAddKey =
  (data?: string): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Go to Add key path', data));
    dispatch(
      Analytics.track('Clicked create, import or join', {
        context: 'DeepLink',
      }),
    );

    navigationRef.reset({
      index: 1,
      routes: [
        {
          name: 'Tabs',
          params: {screen: 'Home'},
        },
        {
          name: 'CreationOptions',
        },
      ],
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
        navigationRef.navigate(WalletScreens.WALLET_DETAILS, {
          walletId: fullWalletObj.credentials.walletId,
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

const handleSolanaPay =
  (data: string, wallet?: Wallet): Effect<void> =>
  async (dispatch, getState) => {
    dispatch(LogActions.info('[scan] Incoming-data: SolanaPay URI'));

    const network = getState().APP.network;
    const walletState = getState().WALLET;

    const tokenOptionsByAddress: {[key in string]: Token} = {
      ...BitpaySupportedTokenOptsByAddress,
      ...walletState.tokenOptionsByAddress,
      ...walletState.customTokenOptionsByAddress,
    };

    let coin = 'sol';
    const chain = 'sol';

    const parsed = new URL(data);
    const recipientAddress = parsed.pathname.replace('/', '');
    const amount = parsed.searchParams.get('amount');
    const splTokenAddress = parsed.searchParams.get('spl-token');
    const reference = parsed.searchParams.get('reference');
    const memo = parsed.searchParams.get('memo');
    const label = parsed.searchParams.get('label');
    const message = parsed.searchParams.get('message');

    let tokenContractInfo: Token | undefined;

    if (splTokenAddress) {
      const addrData = GetCoinAndNetwork(splTokenAddress, network, chain);
      const isValid =
        addrData?.coin.toLowerCase() && network === addrData?.network;

      if (!isValid) {
        dispatch(
          LogActions.warn(
            `[SolanaPay] Invalid SPL tokenAddress: ${splTokenAddress}`,
          ),
        );
        return;
      }

      dispatch(
        LogActions.debug(
          `[SolanaPay] Valid SPL tokenAddress: ${splTokenAddress}. Getting tokenContractInfo`,
        ),
      );

      tokenContractInfo =
        tokenOptionsByAddress?.[
          getCurrencyAbbreviation(splTokenAddress, chain)
        ];
      if (!tokenContractInfo) {
        dispatch(
          LogActions.debug(
            '[SolanaPay] Contract info not present in token options - consulting bitcore',
          ),
        );

        try {
          const contractInfo = await getSolanaTokenInfo(
            splTokenAddress,
            'livenet',
          );

          dispatch(
            LogActions.debug(
              '[SolanaPay] Contract info from bitcore: ' +
                JSON.stringify(contractInfo),
            ),
          );

          if (!contractInfo) {
            dispatch(
              LogActions.warn(
                '[SolanaPay] It was not possible to obtain the necessary data for the SPL Token from bitcore',
              ),
            );
            await sleep(300);
            dispatch(
              showBottomNotificationModal({
                type: 'warning',
                title: t('SolanaPay Error'),
                message: `It was not possible to obtain the necessary data for the SPL Token: ${splTokenAddress}`,
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
            return;
          }

          (coin = contractInfo.symbol?.toLowerCase()),
            (tokenContractInfo = {
              symbol: coin,
              name: contractInfo.name,
              address: splTokenAddress,
              decimals: contractInfo.decimals,
            });
        } catch (err) {
          const errorMsg =
            err instanceof Error ? err.message : JSON.stringify(err);
          dispatch(
            LogActions.warn(
              `[SolanaPay] It was not possible to obtain the necessary data for the SPL Token from bitcore. Err: ${errorMsg}`,
            ),
          );
          await sleep(300);
          dispatch(
            showBottomNotificationModal({
              type: 'warning',
              title: t('SolanaPay Error'),
              message: `It was not possible to obtain the necessary data for the SPL Token: ${splTokenAddress}`,
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
          return;
        }
      }
    }

    const recipient = {
      type: 'address',
      currency: tokenContractInfo?.symbol ?? coin, // Review this, get coin from splToken address
      chain,
      address: recipientAddress,
      tokenAddress: splTokenAddress ?? undefined,
    };

    if (!amount) {
      dispatch(
        goToAmount({
          coin,
          chain,
          recipient,
          wallet,
          opts: {
            message: message ?? undefined,
            solanaPayOpts: {
              reference,
              memo,
              label,
              message,
            },
          },
        }),
      );
    } else {
      dispatch(LogActions.debug('[SolanaPay] Validating amount...'));
      const isValidSolanaPayAmount = (
        amount: string | null | undefined,
      ): boolean => {
        if (!amount || typeof amount !== 'string') {
          return false;
        }
        // validate positive decimal number
        const decimalPattern = /^\d+(\.\d+)?$/;
        if (!decimalPattern.test(amount)) {
          return false;
        }
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) {
          return false;
        }
        // validate 9 decimals max
        const decimalPlaces = amount.includes('.')
          ? amount.split('.')[1].length
          : 0;
        if (decimalPlaces > 9) {
          return false;
        }

        return true;
      };

      if (isValidSolanaPayAmount(amount)) {
        dispatch(LogActions.debug('[SolanaPay] Valid amount. Go to confirm.'));
        dispatch(
          goToConfirm({
            recipient,
            amount: Number(amount),
            wallet,
            opts: {
              message: message ?? undefined,
              solanaPayOpts: {
                reference,
                memo,
                label,
                message,
              },
            },
          }),
        );
      } else {
        dispatch(LogActions.warn('[SolanaPay] Invalid amount'));
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('SolanaPay Error'),
            message: t(
              'The payment request is invalid: the "amount" field is missing or incorrectly formatted.',
            ),
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
        return;
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
        dispatch(FormatAmount(coin, chain, undefined, parsed.amount, true)),
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
        dispatch(FormatAmount(coin, chain, undefined, parsed.amount, true)),
      );
      dispatch(goToConfirm({recipient, amount, wallet, opts: {message}}));
    }
  };

const handleBitcoinCashUriLegacyAddress =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(
      LogActions.info(
        '[scan] Incoming-data: BitcoinCash URI with legacy address',
      ),
    );
    const coin = 'bch';
    const chain = 'bch';
    const parsed = BwcProvider.getInstance()
      .getBitcore()
      .URI(data.replace(/^(bitcoincash:|bchtest:|bchreg:)/, 'bitcoin:'));

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
        dispatch(FormatAmount(coin, chain, undefined, parsed.amount, true)),
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
        dispatch(
          FormatAmount(coin, chain, undefined, Number(parsedAmount), true),
        ),
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
    const coin = 'pol';
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
        dispatch(
          FormatAmount(coin, chain, undefined, Number(parsedAmount), true),
        ),
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

const handleArbUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Arb URI'));
    const coin = 'eth';
    const chain = 'arb';
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
        dispatch(
          FormatAmount(coin, chain, undefined, Number(parsedAmount), true),
        ),
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

const handleBaseUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Base URI'));
    const coin = 'eth';
    const chain = 'base';
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
        dispatch(
          FormatAmount(coin, chain, undefined, Number(parsedAmount), true),
        ),
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

const handleOpUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Op URI'));
    const coin = 'eth';
    const chain = 'op';
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
        dispatch(
          FormatAmount(coin, chain, undefined, Number(parsedAmount), true),
        ),
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

const handleSolUri =
  (data: string, wallet?: Wallet): Effect<void> =>
  dispatch => {
    dispatch(LogActions.info('[scan] Incoming-data: Sol URI'));
    const coin = 'sol';
    const chain = 'sol';
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
        dispatch(
          FormatAmount(coin, chain, undefined, Number(parsedAmount), true),
        ),
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
      destinationTag: destinationTag ? Number(destinationTag) : undefined,
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
        dispatch(FormatAmount(coin, chain, undefined, parsed.amount, true)),
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
        dispatch(FormatAmount(coin, chain, undefined, parsed.amount, true)),
      );
      dispatch(goToConfirm({recipient, amount, wallet, opts: {message}}));
    }
  };

const handleBuyCryptoUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(
      LogActions.info('Incoming-data (redirect): Buy crypto pre-set: ' + data),
    );

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const partner = getParameterByName('partner', res)?.toLowerCase();
    const amount = getParameterByName('amount', res);
    let coin = getParameterByName('coin', res)?.toLowerCase();
    let chain = getParameterByName('chain', res)?.toLowerCase();

    let _amount: number | undefined;
    if (amount) {
      const {APP} = getState();
      const altCurrency = APP.defaultAltCurrency?.isoCode;
      _amount =
        altCurrency === 'USD'
          ? Number(amount)
          : dispatch(
              calculateUsdToAltFiat(Number(amount), altCurrency || 'USD'),
            );
    }

    if (coin && !chain) {
      if (IsUtxoChain(coin)) {
        chain = coin;
      } else {
        coin = undefined;
      }
    }

    dispatch(
      Analytics.track('Clicked Buy Crypto', {
        context: 'DeepLink',
        coin: coin || '',
        chain: chain || '',
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
          name: 'BuyCryptoRoot',
          params: {
            partner,
            amount: _amount,
            currencyAbbreviation: coin,
            chain,
          },
        },
      ],
    });
  };

const handleSellCryptoUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(
      LogActions.info('Incoming-data (redirect): Sell crypto pre-set: ' + data),
    );

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const partner = getParameterByName('partner', res)?.toLowerCase();
    const amount = getParameterByName('amount', res);
    let coin = getParameterByName('coin', res)?.toLowerCase();
    let chain = getParameterByName('chain', res)?.toLowerCase();

    let _amount: number | undefined;
    if (amount) {
      const {APP} = getState();
      const altCurrency = APP.defaultAltCurrency?.isoCode;
      _amount =
        altCurrency === 'USD'
          ? Number(amount)
          : dispatch(
              calculateUsdToAltFiat(Number(amount), altCurrency || 'USD'),
            );
    }

    if (coin && !chain) {
      if (IsUtxoChain(coin)) {
        chain = coin;
      } else {
        coin = undefined;
      }
    }

    dispatch(
      Analytics.track('Clicked Sell Crypto', {
        context: 'DeepLink',
        coin: coin || '',
        chain: chain || '',
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
          name: SellCryptoScreens.ROOT,
          params: {
            partner,
            amount: _amount,
            currencyAbbreviation: coin,
            chain,
            fromDeeplink: true,
          },
        },
      ],
    });
  };

const handleSwapCryptoUri =
  (data: string): Effect<void> =>
  dispatch => {
    dispatch(
      LogActions.info('Incoming-data (redirect): Swap crypto pre-set: ' + data),
    );

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const partner = getParameterByName('partner', res)?.toLowerCase();

    dispatch(
      Analytics.track('Clicked Swap Crypto', {
        context: 'DeepLink',
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
          name: SwapCryptoScreens.SWAP_CRYPTO_ROOT,
          params: {
            partner,
          },
        },
      ],
    });
  };

const handleBanxaUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Banxa URL: ' + data));
    if (
      data.indexOf('banxaCancelled') >= 0 ||
      data.indexOf('banxaFailed') >= 0
    ) {
      return;
    }

    if (data === 'banxa') {
      return;
    }

    const res = data.replace(new RegExp('&amp;', 'g'), '&');

    const banxaExternalId = getParameterByName('externalId', res);
    if (!banxaExternalId) {
      dispatch(LogActions.warn('No banxaExternalId present. Do not redir'));
      return;
    }

    const status =
      (getParameterByName('orderStatus', res) as BanxaStatusKey) ??
      (getParameterByName('status', res) as BanxaStatusKey);

    const stateParams: BanxaIncomingData = {
      banxaExternalId,
      status,
    };

    dispatch(
      BuyCryptoActions.updatePaymentRequestBanxa({
        banxaIncomingData: stateParams,
      }),
    );

    const {BUY_CRYPTO} = getState();
    const order = BUY_CRYPTO.banxa[banxaExternalId];
    if (order) {
      dispatch(
        Analytics.track('Purchased Buy Crypto', {
          exchange: 'banxa',
          fiatAmount: order?.fiat_total_amount || '',
          fiatCurrency: order?.fiat_total_amount_currency || '',
          coin: order?.coin?.toLowerCase() || '',
          chain: order?.chain?.toLowerCase() || '',
        }),
      );
    }

    navigationRef.reset({
      index: 2,
      routes: [
        {
          name: 'Tabs',
          params: {screen: 'Home'},
        },
        {
          name: 'BanxaSettings',
          params: {incomingPaymentRequest: stateParams},
        },
      ],
    });
  };

const handleMoonpayUri =
  (data: string): Effect<void> =>
  async (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Moonpay URL: ' + data));

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const externalId = getParameterByName('externalId', res);
    if (!externalId) {
      dispatch(LogActions.warn('No externalId present. Do not redir'));
      return;
    }

    const moonpayFlow = getParameterByName('flow', res);

    if (moonpayFlow === 'sell') {
      // Moonpay Sell Crypto Flow
      const transactionId = getParameterByName('transactionId', res);
      const baseCurrencyCode = getParameterByName('baseCurrencyCode', res);
      const baseCurrencyAmount = getParameterByName('baseCurrencyAmount', res);
      const depositWalletAddress = getParameterByName(
        'depositWalletAddress',
        res,
      );

      if (!depositWalletAddress) {
        dispatch(
          LogActions.warn('No depositWalletAddress present. Do not redir'),
        );
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Something went wrong'),
            message: t(
              "The MoonPay deposit address is not present. Can't continue.",
            ),
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
        return;
      }

      const {SELL_CRYPTO} = getState();
      const order = SELL_CRYPTO.moonpay[externalId];

      if (!order) {
        dispatch(
          LogActions.warn(
            `No sell order found for externalId: ${externalId}. Do not redir`,
          ),
        );
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Something went wrong'),
            message: t(
              'It seems that the order id: {{transactionId}} was not created from this wallet or has been deleted. Please try creating a new order from our Sell Crypto feature.',
              {transactionId},
            ),
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
        return;
      }

      if (
        [
          'bitpayTxSent',
          'bitpayCanceled',
          'pending',
          'completed',
          'failed',
        ].includes(order.status)
      ) {
        let title: string, message: string;
        switch (order.status) {
          case 'bitpayTxSent':
          case 'pending':
            title = t('Crypto funds already sent');
            message = t(
              'The crypto funds from this order id: {{transactionId}} have already been sent to MoonPay.',
              {transactionId: order.transaction_id},
            );
            break;
          case 'completed':
            title = t('Order already completed');
            message = t(
              'The sell order for the id: {{transactionId}} has already been completed.',
              {transactionId: order.transaction_id},
            );
            break;
          case 'failed':
          case 'bitpayCanceled':
            title = t('Failed Order');
            message = t(
              'Cannot continue because sell order with id: {{transactionId}} has failed for some reason or has been canceled. Please try creating a new order from our Sell Crypto feature.',
              {transactionId: order.transaction_id},
            );
            break;
        }
        dispatch(
          LogActions.warn(
            `Sell order status: ${order.status} for externalId: ${externalId}. Do not redir`,
          ),
        );
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: title!,
            message: message!,
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
        return;
      }

      if (
        !baseCurrencyCode ||
        baseCurrencyCode !==
          getMoonpaySellFixedCurrencyAbbreviation(order.coin, order.chain)
      ) {
        dispatch(
          LogActions.warn(
            `baseCurrencyCode mismatch: ${baseCurrencyCode} !== ${getMoonpaySellFixedCurrencyAbbreviation(
              order.coin,
              order.chain,
            )}. Do not redir`,
          ),
        );
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Something went wrong'),
            message: t(
              "Crypto currency mismatch: {{baseCurrencyCode}} / {{moonpaySellFixedCurrency}} from the order id: {{externalId}}. Can't continue.",
              {
                baseCurrencyCode,
                moonpaySellFixedCurrency:
                  getMoonpaySellFixedCurrencyAbbreviation(
                    order.coin,
                    order.chain,
                  ),
                externalId,
              },
            ),
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
        return;
      }

      if (
        baseCurrencyAmount &&
        Number(baseCurrencyAmount) !== Number(order?.crypto_amount)
      ) {
        dispatch(
          LogActions.warn(
            `baseCurrencyAmount mismatch: ${Number(
              baseCurrencyAmount,
            )} !== ${Number(order?.crypto_amount)}. Do not redir`,
          ),
        );
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Something went wrong'),
            message: t(
              "Crypto amount mismatch: {{baseCurrencyAmount}} / {{cryptoAmount}} from the order id: {{transactionId}}. Can't continue.",
              {
                baseCurrencyAmount,
                cryptoAmount: order?.crypto_amount,
                transactionId,
              },
            ),
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
        return;
      }

      const stateParams: MoonpaySellIncomingData = {
        externalId,
        transactionId,
        status: 'bitpayPending',
        baseCurrencyAmount:
          Number(baseCurrencyAmount) ?? Number(order?.crypto_amount),
        depositWalletAddress,
      };

      dispatch(
        SellCryptoActions.updateSellOrderMoonpay({
          moonpaySellIncomingData: stateParams,
        }),
      );

      dispatch(
        Analytics.track('Sell Crypto Order Created', {
          exchange: 'moonpay',
          cryptoAmount:
            Number(baseCurrencyAmount) ?? Number(order?.crypto_amount),
          fiatAmount: order?.fiat_receiving_amount || '',
          fiatCurrency: order?.fiat_currency || '',
          coin: order?.coin?.toLowerCase() || '',
          chain: order?.chain?.toLowerCase() || '',
        }),
      );

      const keys = Object.values(getState().WALLET.keys);
      const wallets = Object.values(keys).flatMap(k => k.wallets);

      const fullWalletObj = findWalletById(wallets, order?.wallet_id);

      if (!fullWalletObj) {
        dispatch(
          LogActions.warn(
            `No Wallet id (${order?.wallet_id}) present. Do not redir`,
          ),
        );
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Something went wrong'),
            message: t("The origin wallet is not found. Can't continue."),
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
        return;
      }

      const sellCheckoutParams: MoonpaySellCheckoutProps = {
        sellCryptoExternalId: externalId,
        wallet: fullWalletObj as Wallet,
        toAddress: depositWalletAddress,
        amount: Number(baseCurrencyAmount) ?? Number(order?.crypto_amount),
        useSendMax: order?.send_max,
      };

      navigationRef.reset({
        index: 1,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Home'},
          },
          {
            name: 'MoonpaySellCheckout',
            params: sellCheckoutParams,
          },
        ],
      });
    } else {
      // Moonpay Buy Crypto Flow
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
        Analytics.track('Purchased Buy Crypto', {
          exchange: 'moonpay',
          fiatAmount: order?.fiat_total_amount || '',
          fiatCurrency: order?.fiat_total_amount_currency || '',
          coin: order?.coin?.toLowerCase() || '',
          chain: order?.chain?.toLowerCase() || '',
        }),
      );

      const moonpaySettingsParams: MoonpaySettingsProps = {
        incomingPaymentRequest: {
          externalId,
          transactionId,
          status,
          flow: 'buy',
        },
      };

      navigationRef.reset({
        index: 2,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Home'},
          },
          {
            name: 'MoonpaySettings',
            params: {moonpaySettingsParams},
          },
        ],
      });
    }
  };

const handleRampUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Ramp URL: ' + data));

    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const rampExternalId = getParameterByName('rampExternalId', res);
    if (!rampExternalId) {
      dispatch(LogActions.warn('No rampExternalId present. Do not redir'));
      return;
    }

    const walletId = getParameterByName('walletId', res);
    const status = getParameterByName('status', res);

    const stateParams: RampIncomingData = {
      rampExternalId,
      walletId,
      status,
    };

    dispatch(
      BuyCryptoActions.updatePaymentRequestRamp({
        rampIncomingData: stateParams,
      }),
    );

    const {BUY_CRYPTO} = getState();
    const order = BUY_CRYPTO.ramp[rampExternalId];

    dispatch(
      Analytics.track('Purchased Buy Crypto', {
        exchange: 'ramp',
        fiatAmount: order?.fiat_total_amount || '',
        fiatCurrency: order?.fiat_total_amount_currency || '',
        coin: order?.coin?.toLowerCase() || '',
        chain: order?.chain?.toLowerCase() || '',
      }),
    );

    const rampSettingsParams: RampSettingsProps = {
      incomingPaymentRequest: {
        flow: 'buy',
        rampExternalId,
        walletId,
        status,
      },
    };

    navigationRef.reset({
      index: 2,
      routes: [
        {
          name: 'Tabs',
          params: {screen: 'Home'},
        },
        {
          name: 'RampSettings',
          params: {incomingPaymentRequest: rampSettingsParams},
        },
      ],
    });
  };

const handleSardineUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Sardine URL: ' + data));

    data = data.replace('?order_id', '&order_id');
    const res = data.replace(new RegExp('&amp;', 'g'), '&');
    const sardineExternalId = getParameterByName('sardineExternalId', res);
    if (!sardineExternalId) {
      dispatch(LogActions.warn('No sardineExternalId present. Do not redir'));
      return;
    }

    const order_id = getParameterByName('order_id', res);
    const walletId = getParameterByName('walletId', res)!;
    const status = getParameterByName('status', res)!;
    const chain = getParameterByName('chain', res)!;
    const address = getParameterByName('address', res)!;
    const createdOn = getParameterByName('createdOn', res);
    const cryptoAmount = getParameterByName('cryptoAmount', res);
    const coin = getParameterByName('coin', res)!;
    const env = (getParameterByName('env', res) as 'dev' | 'prod')!;
    const fiatBaseAmount = getParameterByName('fiatBaseAmount', res)!;
    const fiatTotalAmount = getParameterByName('fiatTotalAmount', res)!;
    const fiatTotalAmountCurrency = getParameterByName(
      'fiatTotalAmountCurrency',
      res,
    )!;

    const newData: SardinePaymentData = {
      address,
      chain,
      created_on: Number(createdOn),
      crypto_amount: Number(cryptoAmount),
      coin,
      env,
      external_id: sardineExternalId,
      fiat_base_amount: Number(fiatBaseAmount),
      fiat_total_amount: Number(fiatTotalAmount),
      fiat_total_amount_currency: fiatTotalAmountCurrency,
      order_id,
      status,
      user_id: walletId,
    };

    dispatch(
      BuyCryptoActions.successPaymentRequestSardine({
        sardinePaymentData: newData,
      }),
    );

    if (order_id) {
      dispatch(
        Analytics.track('Purchased Buy Crypto', {
          exchange: 'sardine',
          fiatAmount: Number(fiatTotalAmount) || '',
          fiatCurrency: fiatTotalAmountCurrency || '',
          coin: coin?.toLowerCase() || '',
          chain: chain?.toLowerCase() || '',
        }),
      );

      const stateParams: SardineIncomingData = {
        sardineExternalId,
        walletId,
        status,
        order_id,
      };

      navigationRef.reset({
        index: 2,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Home'},
          },
          {
            name: 'SardineSettings',
            params: {incomingPaymentRequest: stateParams},
          },
        ],
      });
    }
  };

const handleSimplexUri =
  (data: string): Effect<void> =>
  async (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Simplex URL: ' + data));

    const res = data.replace(new RegExp('&amp;', 'g'), '&');

    const simplexFlow = getParameterByName('flow', res);

    if (simplexFlow === 'sell') {
      // Simplex Sell Crypto Flow
      const externalId = getParameterByName('externalId', res);
      if (!externalId) {
        dispatch(LogActions.warn('No externalId present. Do not redir'));
        return;
      }

      const success = getParameterByName('success', res);
      const sendMax = getParameterByName('sendMax', res);

      dispatch(
        LogActions.debug(
          `Return from Simplex checkout page for Sell Order with externalId: ${externalId} | success: ${success} | sendMax: ${sendMax}`,
        ),
      );

      const {SELL_CRYPTO} = getState();
      const order = SELL_CRYPTO.simplex[externalId];

      if (!order) {
        dispatch(
          LogActions.warn(
            `No sell order found for externalId: ${externalId}. Do not redir`,
          ),
        );
        await sleep(300);
        dispatch(
          showBottomNotificationModal({
            type: 'warning',
            title: t('Something went wrong'),
            message: t(
              'It seems that the order id: {{externalId}} was not created from this wallet or has been deleted.',
              {externalId},
            ),
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
        return;
      }

      const stateParams: SimplexSellIncomingData = {
        simplexExternalId: externalId,
        status: 'bitpayFromCheckout', // We cannot currently know whether it comes from a success or a fail process
      };

      dispatch(
        SellCryptoActions.updateSellOrderSimplex({
          simplexSellIncomingData: stateParams,
        }),
      );

      const simplexSettingsParams: SimplexSettingsProps = {
        incomingPaymentRequest: {
          externalId,
          flow: 'sell',
        },
      };

      navigationRef.reset({
        index: 2,
        routes: [
          {
            name: 'Tabs',
            params: {screen: 'Home'},
          },
          {
            name: ExternalServicesSettingsScreens.SIMPLEX_SETTINGS,
            params: simplexSettingsParams,
          },
        ],
      });
    } else {
      // Simplex Buy Crypto Flow
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
        Analytics.track('Purchased Buy Crypto', {
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
            name: 'SimplexSettings',
            params: {incomingPaymentRequest: {...stateParams, flow: 'buy'}},
          },
        ],
      });
    }
  };

const handleTransakUri =
  (data: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(LogActions.info('Incoming-data (redirect): Transak URL: ' + data));

    const res = data.replace(new RegExp('&amp;', 'g'), '&');

    const transakExternalId = getParameterByName('partnerOrderId', res);
    if (!transakExternalId) {
      dispatch(LogActions.warn('No transakExternalId present. Do not redir'));
      return;
    }

    const order_id = getParameterByName('orderId', res);
    const status = getParameterByName('status', res) as
      | TransakStatusKey
      | undefined;

    const stateParams: TransakIncomingData = {
      transakExternalId,
      status,
      order_id,
    };

    dispatch(
      BuyCryptoActions.updatePaymentRequestTransak({
        transakIncomingData: stateParams,
      }),
    );

    if (order_id) {
      const {BUY_CRYPTO} = getState();
      const order = BUY_CRYPTO.transak[transakExternalId];

      dispatch(
        Analytics.track('Purchased Buy Crypto', {
          exchange: 'transak',
          fiatAmount: order?.fiat_total_amount || '',
          fiatCurrency: order?.fiat_total_amount_currency || '',
          coin: order?.coin?.toLowerCase() || '',
          chain: order?.chain?.toLowerCase() || '',
        }),
      );
    }

    navigationRef.reset({
      index: 2,
      routes: [
        {
          name: 'Tabs',
          params: {screen: 'Home'},
        },
        {
          name: 'TransakSettings',
          params: {incomingPaymentRequest: stateParams},
        },
      ],
    });
  };

const handleWalletConnectUri =
  (data: string): Effect<void> =>
  async (dispatch, getState) => {
    try {
      if (isValidWalletConnectUri(data)) {
        const {version} = parseUri(data);
        if (version === 1) {
          const errMsg = t(
            'The URI corresponds to WalletConnect v1.0, which was shut down on June 28.',
          );
          throw errMsg;
        } else {
          let decodedUri: string;
          try {
            const url = new URL(data);
            const rawUri = url.searchParams.get('uri');
            try {
              decodedUri = rawUri ? decodeURIComponent(rawUri) : data;
            } catch {
              decodedUri = rawUri || data;
            }
            await dispatch(walletConnectV2OnSessionProposal(decodedUri));
          } catch {
            await dispatch(walletConnectV2OnSessionProposal(data));
          }
          navigationRef.navigate('WalletConnectRoot', {});
        }
      } else {
        const errMsg = t('The URI does not correspond to WalletConnect.');
        throw errMsg;
      }
    } catch (e: any) {
      const proposal = getState().WALLET_CONNECT_V2.proposal;
      if (
        typeof e === 'object' &&
        e !== null &&
        e.message?.includes('Pairing already exists:')
      ) {
        if (proposal) {
          navigationRef.navigate('WalletConnectRoot', {uri: data});
        } else {
          dispatch(
            showBottomNotificationModal(
              CustomErrorMessage({
                errMsg: t(
                  'Pairing already exists. Please try refreshing the QR code by reloading the website.',
                ),
                title: t('Uh oh, something went wrong'),
              }),
            ),
          );
        }
      } else {
        dispatch(
          showBottomNotificationModal(
            CustomErrorMessage({
              errMsg: BWCErrorMessage(e),
              title: t('Uh oh, something went wrong'),
            }),
          ),
        );
      }
    }
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
    dispatch(
      LogActions.info(
        `[scan] Incoming-data: ${coin.toUpperCase()} chain plain address`,
      ),
    );
    const network = Object.keys(bitcoreLibs).includes(coin)
      ? GetAddressNetwork(address, coin as keyof BitcoreLibs)
      : undefined; // There is no way to tell if an evm address is testnet or livenet so let's skip the network filter
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

const goToImport =
  (importQrCodeData: string): Effect<void> =>
  (dispatch, getState) => {
    dispatch(
      LogActions.info(
        '[scan] Incoming-data (redirect): QR code export feature',
      ),
    );
    navigationRef.navigate(WalletScreens.IMPORT, {
      importQrCodeData,
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
      navigationRef.navigate('JoinMultisig', {
        invitationCode: data,
      });
    } else if (keys.length === 1) {
      navigationRef.navigate('JoinMultisig', {
        key: keys[0],
        invitationCode: data,
      });
    } else {
      navigationRef.navigate(WalletScreens.KEY_GLOBAL_SELECT, {
        onKeySelect: (selectedKey: Key) => {
          navigationRef.navigate(WalletScreens.JOIN_MULTISIG, {
            key: selectedKey,
            invitationCode: data,
          });
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
