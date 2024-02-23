import React, {useEffect, useRef, useState} from 'react';
import {ScrollView, TouchableOpacity} from 'react-native';
import uuid from 'react-native-uuid';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled, {useTheme} from 'styled-components/native';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
  useMount,
} from '../../../../utils/hooks';
import {SellCryptoScreens, SellCryptoGroupParamList} from '../SellCryptoGroup';
import {
  PaymentMethod,
  PaymentMethodKey,
  PaymentMethodsAvailable,
} from '../../sell-crypto/constants/SellCryptoConstants';
import PaymentMethodsModal from '../../buy-crypto/components/PaymentMethodModal';
import AmountModal from '../../../../components/amount/AmountModal';
import {
  BuyCryptoItemCard,
  BuyCryptoItemTitle,
  ActionsContainer,
  SelectedOptionCol,
  SelectedOptionContainer,
  SelectedOptionText,
  DataText,
  CoinIconContainer,
} from '../../buy-crypto/styled/BuyCryptoCard';
import Button from '../../../../components/button/Button';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {RootState} from '../../../../store';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  Action,
  White,
  Slate,
  SlateDark,
  BitPay,
} from '../../../../styles/colors';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {
  formatFiatAmount,
  getBadgeImg,
  getChainUsingSuffix,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {AppActions} from '../../../../store/app';
import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {
  SellCryptoSupportedExchanges,
  getAvailableSellCryptoFiatCurrencies,
  isPaymentMethodSupported,
  SellCryptoExchangeKey,
} from '../utils/sell-crypto-utils';
import {useTranslation} from 'react-i18next';
import {
  openUrlWithInAppBrowser,
  startOnGoingProcessModal,
} from '../../../../store/app/app.effects';
import {
  BitpaySupportedCoins,
  SUPPORTED_COINS,
  SUPPORTED_ETHEREUM_TOKENS,
  SUPPORTED_MATIC_TOKENS,
} from '../../../../constants/currencies';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {orderBy} from 'lodash';
import {showWalletError} from '../../../../store/wallet/effects/errors/errors';
import {getExternalServicesConfig} from '../../../../store/external-services/external-services.effects';
import {
  SellCryptoConfig,
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
} from '../../../../store/external-services/external-services.types';
import {StackActions} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {
  moonpayGetCurrencies,
  moonpayGetSellQuote,
  moonpayGetSellSignedPaymentUrl,
} from '../../../../store/buy-crypto/effects/moonpay/moonpay';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {APP_DEEPLINK_PREFIX} from '../../../../constants/config';
import {moonpayEnv} from '../../buy-crypto/utils/moonpay-utils';
import FromWalletSelectorModal from '../../swap-crypto/components/FromWalletSelectorModal';
import {MoonpayGetCurrenciesRequestData} from '../../../../store/buy-crypto/buy-crypto.models';
import {
  getChainFromMoonpayNetworkCode,
  getMoonpayFiatListByPayoutMethod,
  getMoonpaySellCurrenciesFixedProps,
  getMoonpaySellFixedCurrencyAbbreviation,
  getMoonpaySellPayoutMethodFormat,
  moonpaySellEnv,
} from '../utils/moonpay-sell-utils';
import {
  MoonpayCurrency,
  MoonpayCurrencyMetadata,
  MoonpayGetSellQuoteData,
  MoonpayGetSellQuoteRequestData,
  MoonpayGetSellSignedPaymentUrlData,
  MoonpayGetSellSignedPaymentUrlRequestData,
  MoonpaySellOrderData,
} from '../../../../store/sell-crypto/sell-crypto.models';
import {Br} from '../../../../components/styled/Containers';
import {
  SellBalanceContainer,
  SellBottomDataText,
  SellCryptoOfferDataText,
  SellCryptoOfferLine,
  SellCryptoOfferText,
  SellTermsContainer,
} from '../styled/SellCryptoCard';
import {TermsText} from '../../buy-crypto/styled/BuyCryptoTerms';
import {SellCryptoActions} from '../../../../store/sell-crypto';
import {startUpdateWalletStatus} from '../../../../store/wallet/effects/status/status';
import InfoSvg from '../../../../../assets/img/info.svg';
import {buildUIFormattedWallet} from '../../../../navigation/wallet/screens/KeyOverview';
import {WalletRowProps} from '../../../../components/list/WalletRow';
import BalanceDetailsModal from '../../../../navigation/wallet/components/BalanceDetailsModal';
import SellCryptoBalanceSkeleton from './SellCryptoBalanceSkeleton';
import cloneDeep from 'lodash.clonedeep';
import SellCryptoLoadingQuoteSkeleton from './SellCryptoQuoteSkeleton';
import haptic from '../../../../components/haptic-feedback/haptic';

export type SellCryptoRootScreenParams =
  | {
      amount?: number;
      fromWallet?: any;
      currencyAbbreviation?: string | undefined; // used from charts and deeplinks.
      chain?: string | undefined; // used from charts and deeplinks.
      partner?: SellCryptoExchangeKey | undefined; // used from deeplinks.
    }
  | undefined;

export interface SellCryptoCoin {
  currencyAbbreviation: string;
  symbol: string;
  chain: string;
  name: string;
  protocol?: string;
  logoUri?: any;
  tokenAddress?: string;
  limits?: {
    min: number | undefined;
    max: number | undefined;
  }; // TODO: add limits interface
}

export interface SellLimits {
  minAmount?: number;
  maxAmount?: number;
}

const SellCryptoRootContainer = styled.SafeAreaView`
  flex: 1;
`;

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

let sellCryptoConfig: SellCryptoConfig | undefined;

const SellCryptoRoot = ({
  route,
  navigation,
}: NativeStackScreenProps<
  SellCryptoGroupParamList,
  SellCryptoScreens.ROOT
>) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const tokenDataByAddress = useAppSelector(
    ({WALLET}: RootState) => WALLET.tokenDataByAddress,
  );
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const tokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenOptionsByAddress,
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const tokenOptions = Object.entries(tokenOptionsByAddress).map(
    ([k, {symbol}]) => {
      const chain = getChainUsingSuffix(k);
      return getCurrencyAbbreviation(symbol.toLowerCase(), chain);
    },
  );
  const SupportedEthereumTokens: string[] = SUPPORTED_ETHEREUM_TOKENS;
  const SupportedMaticTokens: string[] = SUPPORTED_MATIC_TOKENS;
  const SupportedChains: string[] = SUPPORTED_COINS;

  // const context = route.params?.context;
  const fromWallet = route.params?.fromWallet;
  const fromAmount = Number(route.params?.amount || 0); // deeplink params are strings, ensure this is number so offers will work
  const fromCurrencyAbbreviation =
    route.params?.currencyAbbreviation?.toLowerCase();
  const fromChain = route.params?.chain?.toLowerCase();
  const preSetPartner = route.params?.partner?.toLowerCase() as
    | SellCryptoExchangeKey
    | undefined;
  const [amount, setAmount] = useState<number>(fromAmount);
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [loadingWalletFromStatus, setLoadingWalletFromStatus] =
    useState<boolean>(false);
  const [balanceDetailsModalVisible, setBalanceDetailsModalVisible] =
    useState<boolean>(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>();
  const [sellCryptoSupportedCoins, setSellCryptoSupportedCoins] =
    useState<SellCryptoCoin[]>();
  const [fiatCurrency, setFiatCurrency] = useState<string>(
    getAvailableSellCryptoFiatCurrencies().includes(defaultAltCurrency.isoCode)
      ? defaultAltCurrency.isoCode
      : 'USD',
  );
  const [sellLimits, setSellLimits] = useState<SellLimits>({
    minAmount: undefined,
    maxAmount: undefined,
  });
  let minAmount: number, maxAmount: number;
  const [sellQuoteData, setSellQuoteData] = useState<MoonpayGetSellQuoteData>();
  const [uiFormattedWallet, setUiFormattedWallet] = useState<WalletRowProps>();

  const showModal = (id: string) => {
    switch (id) {
      case 'paymentMethod':
        setPaymentMethodModalVisible(true);
        break;
      case 'walletSelector':
        setWalletSelectorModalVisible(true);
        break;
      case 'amount':
        setAmountModalVisible(true);
        break;
      default:
        break;
    }
  };

  const hideModal = (id: string) => {
    switch (id) {
      case 'paymentMethod':
        setPaymentMethodModalVisible(false);
        break;
      case 'walletSelector':
        setWalletSelectorModalVisible(false);
        break;
      case 'amount':
        setAmountModalVisible(false);
        break;
      default:
        break;
    }
  };

  const walletError = async (
    type?: string,
    fromCurrencyAbbreviation?: string,
  ) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    dispatch(showWalletError(type, fromCurrencyAbbreviation));
  };

  const selectFirstAvailableWallet = async () => {
    if (!sellCryptoSupportedCoins || !sellCryptoSupportedCoins[0]) {
      return;
    }

    const keysList = Object.values(allKeys).filter(key => key.backupComplete);

    if (!keysList[0]) {
      walletError('emptyKeyList');
      return;
    }

    if (fromWallet?.id) {
      // Selected wallet from Wallet Details
      let fromWalletData;
      let allWallets: Wallet[] = [];

      keysList.forEach(key => {
        allWallets = [...allWallets, ...key.wallets];
      });

      fromWalletData = allWallets.find(wallet => wallet.id === fromWallet.id);
      if (fromWalletData) {
        setWallet(fromWalletData);
        await sleep(500);
        dispatch(dismissOnGoingProcessModal());
      } else {
        walletError('walletNotSupported');
      }
    } else {
      const availableKeys = keysList.filter(key => {
        return key.wallets && keyHasSupportedWallets(key.wallets);
      });

      if (availableKeys[0]) {
        const firstKey = availableKeys[0];

        const firstKeyAllWallets: Wallet[] = firstKey.wallets;
        let allowedWallets = firstKeyAllWallets.filter(wallet =>
          walletIsSupported(wallet),
        );

        if (
          fromCurrencyAbbreviation &&
          sellCryptoSupportedCoins.some(coin => {
            const symbol = fromChain
              ? getCurrencyAbbreviation(fromCurrencyAbbreviation, fromChain)
              : fromCurrencyAbbreviation;
            return coin.symbol === symbol;
          })
        ) {
          allowedWallets = allowedWallets.filter(
            wallet =>
              wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
              (fromChain ? wallet.chain === fromChain : true),
          );
        }
        if (allowedWallets[0]) {
          setSelectedWallet(allowedWallets[0]);
          await sleep(500);
          dispatch(dismissOnGoingProcessModal());
        } else {
          walletError('noWalletsAbleToBuy', fromCurrencyAbbreviation);
        }
      } else {
        walletError('keysNoSupportedWallet', fromCurrencyAbbreviation);
      }
    }
  };

  const keyHasSupportedWallets = (wallets: Wallet[]): boolean => {
    const supportedWallets = wallets.filter(wallet =>
      walletIsSupported(wallet),
    );
    return !!supportedWallets[0];
  };

  const walletIsSupported = (wallet: Wallet): boolean => {
    return (
      wallet.credentials &&
      (wallet.network === 'livenet' ||
        (__DEV__ &&
          wallet.network === 'testnet' &&
          getCurrencyAbbreviation(
            wallet.currencyAbbreviation.toLowerCase(),
            wallet.chain,
          ) === 'eth')) &&
      wallet.balance?.satSpendable > 0 &&
      sellCryptoSupportedCoins &&
      sellCryptoSupportedCoins.some(coin => {
        const symbol = getCurrencyAbbreviation(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        );
        return coin.symbol === symbol;
      }) &&
      wallet.isComplete() &&
      !wallet.hideWallet &&
      (!fromCurrencyAbbreviation ||
        (wallet.currencyAbbreviation === fromCurrencyAbbreviation &&
          (fromChain ? wallet.chain === fromChain : true)))
    );
  };

  const setWallet = (wallet: Wallet) => {
    if (
      wallet.credentials &&
      (wallet.network === 'livenet' ||
        (__DEV__ &&
          wallet.network === 'testnet' &&
          getCurrencyAbbreviation(
            wallet.currencyAbbreviation.toLowerCase(),
            wallet.chain,
          ) === 'eth')) &&
      sellCryptoSupportedCoins &&
      sellCryptoSupportedCoins.some(coin => {
        const symbol = getCurrencyAbbreviation(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        );
        return coin.symbol === symbol;
      })
    ) {
      if (wallet.isComplete()) {
        if (allKeys[wallet.keyId].backupComplete) {
          if (wallet.balance?.satSpendable > 0) {
            setSelectedWallet(wallet);
          } else {
            walletError('noSpendableFunds');
          }
        } else {
          walletError('needsBackup');
        }
      } else {
        walletError('walletNotCompleted');
      }
    } else {
      walletError('walletNotSupported');
    }
  };

  const getLinkedWallet = () => {
    if (!selectedWallet) {
      return;
    }

    const linkedWallet = allKeys[selectedWallet.keyId].wallets.find(
      ({tokens}) => tokens?.includes(selectedWallet.id),
    );

    return linkedWallet;
  };

  const showTokensInfoSheet = () => {
    const linkedWallet = getLinkedWallet();
    if (!linkedWallet) {
      return;
    }

    const linkedWalletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;

    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: t('Reminder'),
        message: t('linkedWalletWarnMsg', {
          chain: BitpaySupportedCoins[linkedWallet.chain.toLowerCase()].name,
          chainCoin: linkedWallet.currencyAbbreviation.toUpperCase(),
          selectedWallet: selectedWallet?.currencyAbbreviation.toUpperCase(),
          linkedWalletName: linkedWalletName
            ? '(' + linkedWalletName + ')'
            : ' ',
        }),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: () => {
              continueToViewOffers();
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const checkIfErc20Token = () => {
    const tokensWarn = async () => {
      await sleep(600);
      showTokensInfoSheet();
    };
    if (
      !!selectedWallet &&
      IsERCToken(selectedWallet.currencyAbbreviation, selectedWallet.chain)
    ) {
      tokensWarn();
    } else {
      continueToViewOffers();
    }
  };

  const continueToViewOffers = async () => {
    let address: string = '';
    try {
      address = (await dispatch<any>(
        createWalletAddress({wallet: selectedWallet!, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      const reason = 'createWalletAddress Error';
      // showMoonpayError(err, reason); TODO: handle errors
    }

    dispatch(
      Analytics.track('Sell Crypto "View Offers"', {
        fiatAmount: amount,
        fiatCurrency,
        paymentMethod: selectedPaymentMethod!.method,
        coin: selectedWallet!.currencyAbbreviation.toLowerCase(),
        chain: selectedWallet!.chain?.toLowerCase(),
      }),
    );

    const newId = uuid.v4().toString();
    const externalTransactionId = `${selectedWallet!.id}-${newId}`;

    const requestData: MoonpayGetSellSignedPaymentUrlRequestData = {
      env: moonpayEnv,
      baseCurrencyCode: getMoonpaySellFixedCurrencyAbbreviation(
        selectedWallet!.currencyAbbreviation,
        selectedWallet!.chain,
      ),
      baseCurrencyAmount: amount,
      externalTransactionId: externalTransactionId,
      redirectURL:
        APP_DEEPLINK_PREFIX +
        `moonpay?flow=sell&externalId=${externalTransactionId}`,
      refundWalletAddress: address,
      lockAmount: true,
      colorCode: BitPay,
      theme: theme.dark ? 'dark' : 'light',
      // language: reqData.language, TODO: send language?
      quoteCurrencyCode: cloneDeep(fiatCurrency).toLowerCase(),
      showWalletAddressForm: true, // TODO: change this to false
      // unsupportedRegionRedirectUrl: , // TODO: add this parameter
      // skipUnsupportedRegionScreen: // TODO: add this parameter
    };

    let data: MoonpayGetSellSignedPaymentUrlData;
    try {
      data = await moonpayGetSellSignedPaymentUrl(requestData);
    } catch (err) {
      const reason = 'moonpayGetSignedPaymentUrl Error';
      console.log(err, reason);
      // showMoonpayError(err, reason);
      // setOpeningBrowser(false);
      return;
    }

    const newData: MoonpaySellOrderData = {
      env: __DEV__ ? 'dev' : 'prod',
      wallet_id: selectedWallet!.id,
      coin: cloneDeep(selectedWallet!.currencyAbbreviation).toUpperCase(),
      chain: cloneDeep(selectedWallet!.chain).toLowerCase(),
      external_id: externalTransactionId,
      created_on: Date.now(),
      crypto_amount: amount,
      refund_address: address,
      fiat_currency: sellQuoteData?.quoteCurrency?.code
        ? cloneDeep(sellQuoteData.quoteCurrency.code).toUpperCase()
        : fiatCurrency,
      fiat_fee_amount: Number(sellQuoteData!.totalFee),
      fiat_receiving_amount: Number(sellQuoteData!.quoteCurrencyAmount),
      status: 'createdOrder',
      // send_max: // TODO
    };

    dispatch(
      SellCryptoActions.successSellOrderMoonpay({
        moonpaySellOrderData: newData,
      })
    );

    dispatch(openUrlWithInAppBrowser(data.urlWithSignature));
    await sleep(500);
    navigation.goBack();

    // TODO: In the future we will have an offers page similar to "Buy Crypto"
    // navigation.navigate('SellCryptoOffers', {
    //   amount,
    //   fiatCurrency,
    //   coin: selectedWallet?.currencyAbbreviation || '',
    //   chain: selectedWallet?.chain || '',
    //   country: locationData?.countryShortCode || 'US',
    //   selectedWallet: selectedWallet!,
    //   paymentMethod: selectedPaymentMethod,
    //   // sellCryptoConfig,
    // });
  };

  const setDefaultPaymentMethod = () => {
    setSelectedPaymentMethod(PaymentMethodsAvailable.debitCard);
    checkAndSetFiatCurrency(PaymentMethodsAvailable.debitCard.method);
  };

  const checkAndSetFiatCurrency = (paymentMethodKey: PaymentMethodKey) => {
    const fiatList = getMoonpayFiatListByPayoutMethod(paymentMethodKey);
    if (fiatList && fiatList[0] && !fiatList.includes(fiatCurrency)) {
      logger.debug(
        `Updating fiat currency from ${fiatCurrency} to ${fiatList[0]}.`,
      );
      setFiatCurrency(fiatList[0]);
    }
  };

  const checkPaymentMethod = () => {
    if (!selectedWallet || !selectedPaymentMethod) {
      return;
    }
    // if (
    //   selectedPaymentMethod.method === 'sepaBankTransfer' &&
    //   !locationData?.isEuCountry
    // ) {
    //   setDefaultPaymentMethod();
    //   return;
    // }
    if (
      (preSetPartner &&
        SellCryptoSupportedExchanges.includes(preSetPartner) &&
        isPaymentMethodSupported(
          preSetPartner,
          selectedPaymentMethod,
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
          fiatCurrency,
          locationData?.countryShortCode || 'US',
        )) ||
      (!preSetPartner &&
        isPaymentMethodSupported(
          'moonpay',
          selectedPaymentMethod,
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
          fiatCurrency,
          locationData?.countryShortCode || 'US',
        ))
    ) {
      logger.debug(
        `Selected payment method available for ${selectedWallet.currencyAbbreviation} and ${fiatCurrency}`,
      );
      return;
    } else {
      logger.debug(
        `Selected payment method not available for ${selectedWallet.currencyAbbreviation} and ${fiatCurrency}. Set to default.`,
      );
      setDefaultPaymentMethod();
    }
  };
  const checkPaymentMethodRef = useRef(checkPaymentMethod);
  checkPaymentMethodRef.current = checkPaymentMethod;

  const getLogoUri = (_currencyAbbreviation: string, _chain: string) => {
    const foundToken = Object.values(tokenDataByAddress).find(
      token =>
        token.coin === _currencyAbbreviation.toLowerCase() &&
        token.chain === _chain,
    );
    if (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation.toLowerCase() &&
          (!chain || chain === _chain),
      )
    ) {
      return SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation.toLowerCase() &&
          (!chain || chain === _chain),
      )!.img;
    } else if (foundToken?.logoURI) {
      return foundToken.logoURI;
    } else {
      return undefined;
    }
  };

  const init = async () => {
    try {
      dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));
      const requestData: ExternalServicesConfigRequestParams = {
        currentLocationCountry: locationData?.countryShortCode,
        currentLocationState: locationData?.stateShortCode,
        bitpayIdLocationCountry: user?.country,
        bitpayIdLocationState: user?.state,
      };
      const config: ExternalServicesConfig = await dispatch(
        getExternalServicesConfig(requestData),
      );
      sellCryptoConfig = config?.sellCrypto;
      logger.debug('sellCryptoConfig: ' + JSON.stringify(sellCryptoConfig));
    } catch (err) {
      logger.error('getSellCryptoConfig Error: ' + JSON.stringify(err));
    }

    if (sellCryptoConfig?.disabled) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: sellCryptoConfig?.disabledTitle
            ? sellCryptoConfig.disabledTitle
            : t('Out of service'),
          message: sellCryptoConfig?.disabledMessage
            ? sellCryptoConfig.disabledMessage
            : t(
                'This feature is temporarily out of service. Please try again later.',
              ),
          type: 'warning',
          actions: [
            {
              text: t('OK'),
              action: () => {
                navigation.dispatch(StackActions.popToTop());
              },
            },
          ],
          enableBackdropDismiss: true,
          onBackdropDismiss: () => {
            navigation.dispatch(StackActions.popToTop());
          },
        }),
      );
      return;
    }

    if (preSetPartner) {
      logger.debug(
        `preSetPartner: ${preSetPartner} - fromAmount: ${fromAmount} - fromCurrencyAbbreviation: ${fromCurrencyAbbreviation} - fromChain: ${fromChain}`,
      );
    }

    try {
      const requestData: MoonpayGetCurrenciesRequestData = {
        env: moonpaySellEnv,
      }
      // "isSellSupported":true && "supportsTestMode":true && "isSuspended":false && "type":"crypto"
      const moonpayAllCurrencies: MoonpayCurrency[] =
        await moonpayGetCurrencies(requestData);
      const moonpayAllSellCurrencies = moonpayAllCurrencies.filter(currency => {
        return (
          !currency.isSuspended &&
          currency.isSellSupported &&
          currency.type === 'crypto'
        ); // TODO: add this: && (moonpaySellEnv === 'production' || moonpaySellEnv === 'sandbox' && currency.supportsTestMode)
      });

      const moonpayAllSellSupportedCurrenciesFixedProps: MoonpayCurrency[] =
        getMoonpaySellCurrenciesFixedProps(moonpayAllSellCurrencies);

      const allSupportedTokens: string[] = [
        ...tokenOptions,
        ...SupportedEthereumTokens,
        ...SupportedMaticTokens,
      ];

      const moonpaySellSupportedCurrenciesFullObj =
        moonpayAllSellSupportedCurrenciesFixedProps.filter(currency => {
          return (
            currency.metadata?.networkCode &&
            [...SupportedChains].includes(
              getChainFromMoonpayNetworkCode(
                currency.code,
                currency.metadata.networkCode,
              ),
            ) &&
            (['ethereum', 'polygon'].includes(
              currency.metadata.networkCode.toLowerCase(),
            )
              ? allSupportedTokens.includes(
                  getCurrencyAbbreviation(
                    currency.code,
                    getChainFromMoonpayNetworkCode(
                      currency.code,
                      currency.metadata.networkCode,
                    ),
                  ),
                )
              : true)
          );
        });

      const moonpaySellSupportedCurrencies: SellCryptoCoin[] =
        moonpaySellSupportedCurrenciesFullObj.map(
          ({
            code,
            name,
            metadata,
            minSellAmount,
            maxSellAmount,
          }: {
            code: string;
            name: string;
            metadata?: MoonpayCurrencyMetadata;
            minSellAmount?: number;
            maxSellAmount?: number;
          }) => {
            const chain = getChainFromMoonpayNetworkCode(
              code,
              metadata?.networkCode,
            );
            return {
              currencyAbbreviation: code.toLowerCase(),
              symbol: getCurrencyAbbreviation(code, chain),
              name,
              chain,
              protocol: metadata?.networkCode,
              logoUri: getLogoUri(code.toLowerCase(), chain),
              tokenAddress: metadata?.contractAddress,
              limits: {
                min: minSellAmount,
                max: maxSellAmount,
              },
            };
          },
        );

      const moonpaySellSupportedFiatCurrencies = moonpayAllCurrencies.filter(
        currency => {
          return (
            !currency.isSuspended &&
            currency.isSellSupported &&
            currency.type === 'fiat'
          ); // TODO: add this: && (moonpaySellEnv === 'production' || moonpaySellEnv === 'sandbox' && currency.supportsTestMode)
        },
      );

      // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
      const orderedArray = SupportedCurrencyOptions.map(currency =>
        currency.chain
          ? getCurrencyAbbreviation(
              currency.currencyAbbreviation,
              currency.chain,
            )
          : currency.currencyAbbreviation,
      );
      let supportedCoins = orderBy(
        moonpaySellSupportedCurrencies,
        [
          coin => {
            return orderedArray.includes(coin.symbol)
              ? orderedArray.indexOf(coin.symbol)
              : orderedArray.length;
          },
          'name',
        ],
        ['asc', 'asc'],
      );

      const coinsToRemove =
        !locationData || locationData.countryShortCode === 'US' ? ['xrp'] : [];
      coinsToRemove.push('busd');
      if (coinsToRemove.length > 0) {
        logger.debug(
          `Removing ${JSON.stringify(
            coinsToRemove,
          )} from Sell Crypto supported coins`,
        );
        supportedCoins = supportedCoins.filter(
          supportedCoin =>
            !coinsToRemove.includes(supportedCoin.currencyAbbreviation),
        );
      }

      setSellCryptoSupportedCoins(supportedCoins);
    } catch (err) {
      // TODO: handle error
      console.log('============= moonpayGetCurrencies err: ', err);
    }
  };

  const updateWalletStatus = async (
    wallet: Wallet,
    skipStatusUpdate?: boolean,
  ) => {
    if (!wallet) {
      return;
    }

    if (!skipStatusUpdate) {
      setLoadingWalletFromStatus(true);

      const key = allKeys[wallet.keyId];
      try {
        await dispatch(startUpdateWalletStatus({key, wallet, force: true}));
      } catch (err) {
        logger.warn('Failed to update balances from Sell Crypto');
      }
    }

    setLoadingWalletFromStatus(false);
  };

  const openWalletBalanceModal = () => {
    if (!selectedWallet) {
      return;
    }
    const uiFormattedWallet = buildUIFormattedWallet(
      selectedWallet,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      'symbol',
    );

    setUiFormattedWallet(uiFormattedWallet);
    setBalanceDetailsModalVisible(true);
  };

  const showError = async (
    msg?: string,
    title?: string,
    reason?: string,
    actions?: any,
    goBack?: boolean,
  ) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    setLoadingQuote(false);
    await sleep(600);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ? title : t('Error'),
        message: msg ? msg : t('Unknown Error'),
        enableBackdropDismiss: goBack ? false : true,
        actions: actions
          ? actions
          : [
              {
                text: t('OK'),
                action: () => {
                  if (goBack) {
                    navigation.goBack();
                  }
                },
                primary: true,
              },
            ],
      }),
    );
  };

  useMount(() => {
    init();
    setDefaultPaymentMethod();
  });

  useEffect(() => {
    if (sellCryptoSupportedCoins && sellCryptoSupportedCoins.length > 0) {

      const awaitSleep = async (sleepTime: number) => {
        await sleep(sleepTime);
      };

      selectFirstAvailableWallet();

      // dispatch(dismissOnGoingProcessModal());
      // awaitSleep(600);
      // showModal('walletSelector');
    }
  }, [sellCryptoSupportedCoins]);

  useEffect(() => {
    if (selectedWallet) {
      updateWalletStatus(selectedWallet);
    }

    // Set limits
    if (
      selectedWallet &&
      sellCryptoSupportedCoins &&
      sellCryptoSupportedCoins.length > 0
    ) {
      const selectedCoin = sellCryptoSupportedCoins.find(
        coin =>
          coin.symbol ===
          getCurrencyAbbreviation(
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
          ),
      );
      setSellLimits({
        minAmount: selectedCoin?.limits?.min,
        maxAmount: selectedCoin?.limits?.max,
      });
    }

    setSellQuoteData(undefined);
    setAmount(0);

    checkPaymentMethodRef.current();
  }, [selectedWallet]);

  useEffect(() => {
    // get sell quote
    if (!selectedWallet || !selectedPaymentMethod || amount === 0) {return;}

    const _moonpayGetSellQuote = async (
      requestData: MoonpayGetSellQuoteRequestData,
    ) => {
      try {
        setLoadingQuote(true);
        const sellQuote = await moonpayGetSellQuote(requestData);
        if (sellQuote?.quoteCurrencyAmount) {
          sellQuote.totalFee = sellQuote.extraFeeAmount + sellQuote.feeAmount;
          setSellQuoteData(sellQuote);
          setLoadingQuote(false);
        } else {
          if (!sellQuote) {
            logger.error('Moonpay error: No data received');
          }
          if (sellQuote.message && typeof sellQuote.message === 'string') {
            logger.error('Moonpay error: ' + sellQuote.message);
          }
          if (sellQuote.error && typeof sellQuote.error === 'string') {
            logger.error('Moonpay error: ' + sellQuote.error);
          }
          if (sellQuote.errors) {
            logger.error(sellQuote.errors);
          }
          let err = t("Can't get rates at this moment. Please try again later");
          const reason = 'moonpayGetQuote Error. Necessary data not included.';
          showError(err, undefined, reason, undefined, false);
        }
      } catch (err: any) {
        let msg: string = t(
          "Can't get rates at this moment. Please try again later",
        );
        if (typeof err === 'string') {
          msg = msg + `: ${err}`;
        } else if (typeof err?.message === 'string') {
          msg = msg + `: ${err.message}`;
        }
        const reason = 'moonpayGetQuote Error.';
        showError(err, undefined, reason, undefined, false);
      }
    };

    const requestData: MoonpayGetSellQuoteRequestData = {
      env: moonpaySellEnv,
      currencyAbbreviation: getMoonpaySellFixedCurrencyAbbreviation(
        selectedWallet.currencyAbbreviation,
        selectedWallet.chain,
      ),
      quoteCurrencyCode: fiatCurrency,
      baseCurrencyAmount: amount,
      // extraFeePercentage?: number,
      payoutMethod: getMoonpaySellPayoutMethodFormat(
        selectedPaymentMethod.method,
      ),
    };
    _moonpayGetSellQuote(requestData);

    checkPaymentMethodRef.current();
  }, [amount, selectedWallet, selectedPaymentMethod]);

  return (
    <SellCryptoRootContainer>
      <ScrollView>
        <BuyCryptoItemCard
          onPress={() => {
            showModal('walletSelector'); // TODO: change the wallet selector for the correct one
          }}>
          <BuyCryptoItemTitle>{t('Sell from')}</BuyCryptoItemTitle>
          {!selectedWallet && (
            <ActionsContainer>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  {t('Select Wallet')}
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{width: 13, height: 13, color: White}}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
            </ActionsContainer>
          )}
          {selectedWallet && (
            <>
              <ActionsContainer>
                <SelectedOptionContainer style={{minWidth: 120}}>
                  <SelectedOptionCol>
                    <CoinIconContainer>
                      <CurrencyImage
                        img={selectedWallet.img}
                        badgeUri={getBadgeImg(
                          getCurrencyAbbreviation(
                            selectedWallet.currencyAbbreviation,
                            selectedWallet.chain,
                          ),
                          selectedWallet.chain,
                        )}
                        size={20}
                      />
                    </CoinIconContainer>
                    <SelectedOptionText
                      numberOfLines={1}
                      ellipsizeMode={'tail'}>
                      {selectedWallet.currencyAbbreviation.toUpperCase()}
                    </SelectedOptionText>
                  </SelectedOptionCol>
                  <ArrowContainer>
                    <SelectorArrowDown
                      {...{
                        width: 13,
                        height: 13,
                        color: theme.dark ? White : SlateDark,
                      }}
                    />
                  </ArrowContainer>
                </SelectedOptionContainer>
                <SelectedOptionCol>
                  <DataText numberOfLines={1} ellipsizeMode={'tail'}>
                    {selectedWallet.walletName
                      ? selectedWallet.walletName
                      : selectedWallet.currencyName}
                  </DataText>
                  <ArrowContainer>
                    <SelectorArrowRight
                      {...{
                        width: 13,
                        height: 13,
                        color: theme.dark ? White : Slate,
                      }}
                    />
                  </ArrowContainer>
                </SelectedOptionCol>
              </ActionsContainer>

              {selectedWallet?.balance?.cryptoSpendable &&
              !loadingWalletFromStatus ? (
                <SellBalanceContainer style={{marginTop: 14}}>
                  <SellBottomDataText>
                    {selectedWallet.balance.cryptoSpendable}{' '}
                    {selectedWallet.currencyAbbreviation.toUpperCase()}{' '}
                    {t('available to sell')}
                  </SellBottomDataText>
                  {selectedWallet.balance.cryptoSpendable !==
                  selectedWallet.balance.crypto ? (
                    <TouchableOpacity
                      onPress={() => {
                        logger.debug('Balance info clicked');
                        openWalletBalanceModal();
                      }}
                      style={{marginLeft: 8}}>
                      <InfoSvg width={20} height={20} />
                    </TouchableOpacity>
                  ) : null}
                </SellBalanceContainer>
              ) : null}

              {loadingWalletFromStatus && <SellCryptoBalanceSkeleton />}
            </>
          )}
        </BuyCryptoItemCard>

        {selectedWallet ? (
          <BuyCryptoItemCard
            onPress={() => {
              showModal('paymentMethod');
            }}>
            <BuyCryptoItemTitle>{t('Payout Method')}</BuyCryptoItemTitle>
            {!selectedPaymentMethod && (
              <ActionsContainer>
                <SelectedOptionContainer style={{backgroundColor: Action}}>
                  <SelectedOptionText
                    style={{color: White}}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}>
                    t{'Select Payment Method'}
                  </SelectedOptionText>
                  <ArrowContainer>
                    <SelectorArrowDown
                      {...{width: 13, height: 13, color: White}}
                    />
                  </ArrowContainer>
                </SelectedOptionContainer>
              </ActionsContainer>
            )}
            {selectedPaymentMethod && (
              <ActionsContainer>
                <DataText>{selectedPaymentMethod.label}</DataText>
                <SelectedOptionCol>
                  {selectedPaymentMethod.imgSrc}
                  <ArrowContainer>
                    <SelectorArrowRight
                      {...{
                        width: 13,
                        height: 13,
                        color: theme.dark ? White : Slate,
                      }}
                    />
                  </ArrowContainer>
                </SelectedOptionCol>
              </ActionsContainer>
            )}
          </BuyCryptoItemCard>
        ) : null}

        {selectedWallet ? (
          <BuyCryptoItemCard
            onPress={() => {
              showModal('amount');
            }}>
            <BuyCryptoItemTitle>{t('Amount to Sell')}</BuyCryptoItemTitle>
            <ActionsContainer>
              <SelectedOptionContainer>
                <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                  {selectedWallet?.currencyAbbreviation.toUpperCase()}
                </SelectedOptionText>
              </SelectedOptionContainer>
              <SelectedOptionCol>
                {amount && amount > 0 ? (
                  <>
                    <DataText>{amount}</DataText>
                    <ArrowContainer>
                      <SelectorArrowRight
                        {...{
                          width: 13,
                          height: 13,
                          color: theme.dark ? White : Slate,
                        }}
                      />
                    </ArrowContainer>
                  </>
                ) : (
                  <SelectedOptionContainer
                    style={{backgroundColor: Action}}
                    // disabled={false}
                    // onPress={() => {
                    //   showModal('amount');
                    // }}
                  >
                    <SelectedOptionCol>
                      <SelectedOptionText
                        style={{color: White}}
                        numberOfLines={1}
                        ellipsizeMode={'tail'}>
                        {t('Enter Amount')}
                      </SelectedOptionText>
                    </SelectedOptionCol>
                  </SelectedOptionContainer>
                )}
              </SelectedOptionCol>
            </ActionsContainer>
            {amount > 0 ? (
              <>
                <Br />
                {loadingQuote ? (
                  <SellCryptoLoadingQuoteSkeleton />
                ) : sellQuoteData ? (
                  <>
                    {sellQuoteData.totalFee ? (
                      <SellCryptoOfferLine>
                        <SellBalanceContainer>
                          <SellCryptoOfferText>
                            {t('Exchange Fee')}
                          </SellCryptoOfferText>
                          <TouchableOpacity
                            onPress={() => {
                              haptic('impactLight');
                              dispatch(
                                openUrlWithInAppBrowser(
                                  'https://support.moonpay.com/customers/docs/moonpay-fees',
                                ),
                              );
                            }}
                            style={{marginLeft: 8}}>
                            <InfoSvg width={20} height={20} />
                          </TouchableOpacity>
                        </SellBalanceContainer>

                        <SelectedOptionCol>
                          <SellCryptoOfferDataText>
                            {formatFiatAmount(
                              Number(sellQuoteData.totalFee),
                              sellQuoteData.quoteCurrency?.code ?? fiatCurrency,
                              {customPrecision: 'minimal'},
                            )}
                          </SellCryptoOfferDataText>
                        </SelectedOptionCol>
                      </SellCryptoOfferLine>
                    ) : null}
                    <SellCryptoOfferLine>
                      <SellCryptoOfferText>
                        {t('Receiving')}
                      </SellCryptoOfferText>
                      <SelectedOptionCol>
                        <SellCryptoOfferDataText>
                          {formatFiatAmount(
                            Number(sellQuoteData.quoteCurrencyAmount),
                            sellQuoteData.quoteCurrency?.code ?? fiatCurrency,
                            {customPrecision: 'minimal'},
                          )}
                        </SellCryptoOfferDataText>
                      </SelectedOptionCol>
                    </SellCryptoOfferLine>
                  </>
                ) : null}
                <SellTermsContainer>
                  <TermsText>
                    {t(
                      'This is an estimated price quote. The final amount will vary depending on when the Exchange receive your crypto and the fiat currency enabled for the selected payout method.',
                    )}
                  </TermsText>
                  <TermsText>
                    {t('Additional third-party fees may apply.')}
                  </TermsText>
                </SellTermsContainer>
              </>
            ) : null}
          </BuyCryptoItemCard>
        ) : null}

        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            disabled={
              !selectedWallet ||
              !amount ||
              amount <= 0 ||
              !sellQuoteData?.quoteCurrencyAmount
            }
            onPress={() => {
              checkIfErc20Token();
            }}>
            {t('Go to Checkout')}
          </Button>
        </CtaContainer>
      </ScrollView>

      {uiFormattedWallet ? (
        <BalanceDetailsModal
          isVisible={balanceDetailsModalVisible}
          closeModal={() => setBalanceDetailsModalVisible(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}

      <FromWalletSelectorModal
        isVisible={walletSelectorModalVisible}
        customSupportedCurrencies={sellCryptoSupportedCoins}
        livenetOnly={!__DEV__}
        modalContext={'sell'}
        modalTitle={t('Sell From')}
        onDismiss={(selectedWallet: Wallet) => {
          hideModal('walletSelector');
          if (selectedWallet) {
            setSelectedWallet(selectedWallet);
            // updateWalletStatus(selectedWallet);
          }
        }}
      />

      <AmountModal
        isVisible={amountModalVisible}
        modalTitle={t('Sell Amount')}
        limitsOpts={{
          maxWalletAmount:
            // @ts-ignore
            selectedWallet?.balance?.cryptoSpendable?.replaceAll(',', ''),
          limits: sellLimits,
        }}
        cryptoCurrencyAbbreviation={selectedWallet?.currencyAbbreviation.toUpperCase()}
        tokenAddress={selectedWallet?.tokenAddress}
        chain={selectedWallet?.chain}
        context={'sellCrypto'}
        onClose={() => hideModal('amount')}
        onSubmit={newAmount => {
          setAmount(newAmount);
          hideModal('amount');
        }}
      />

      <PaymentMethodsModal
        context={'sellCrypto'}
        onPress={paymentMethod => {
          setSelectedPaymentMethod(paymentMethod);
          hideModal('paymentMethod');
          setAmount(0);
          setLoadingQuote(false);
          setSellQuoteData(undefined);
          checkAndSetFiatCurrency(paymentMethod.method);
          // TODO: setFiatForSelectedPayoutMethod();
        }}
        isVisible={paymentMethodModalVisible}
        onBackdropPress={() => hideModal('paymentMethod')}
        selectedPaymentMethod={selectedPaymentMethod}
        coin={selectedWallet?.currencyAbbreviation}
        chain={selectedWallet?.chain}
        currency={fiatCurrency}
        preSetPartner={preSetPartner}
      />
    </SellCryptoRootContainer>
  );
};

export default SellCryptoRoot;
