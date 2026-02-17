import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, ScrollView, View} from 'react-native';
import {useTheme, useNavigation, useRoute} from '@react-navigation/native';
import {CommonActions, RouteProp} from '@react-navigation/core';
import _ from 'lodash';
import cloneDeep from 'lodash.clonedeep';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
  SUPPORTED_COINS,
  SUPPORTED_TOKENS,
} from '../../../../constants/currencies';
import {
  Action,
  White,
  ProgressBlue,
  Black,
  Slate,
  SlateDark,
  LinkBlue,
  LightBlack,
  Slate10,
  Caution,
  Slate30,
} from '../../../../styles/colors';
import {
  SwapCryptoCard,
  ArrowContainer,
  SelectedOptionCol,
  DataText,
  BottomDataText,
  SpinnerContainer,
  BalanceContainer,
  AmountText,
  SwapCardAmountAndWalletContainer,
  WalletSelector,
  WalletSelectorLeft,
  WalletSelectorName,
  WalletSelectorRight,
  SwapCardHeaderContainer,
  SwapCardHeaderTitle,
  SwapCardBottomRowContainer,
  SwapCardAccountChainsContainer,
  WalletBalanceContainer,
  AmountClickableContainer,
  ArrowBox,
  ArrowBoxContainer,
  OfferContainer,
  ItemDivisor,
  SwapCardAccountText,
  SwapCurrenciesButton,
} from '../styled/SwapCryptoRoot.styled';
import {SwapCryptoGroupParamList, SwapCryptoScreens} from '../SwapCryptoGroup';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import FromWalletSelectorModal from '../components/FromWalletSelectorModal';
import {WalletRowProps} from '../../../../components/list/WalletRow';
import {
  changellyGetPairsParams,
  getChangellyCurrenciesFixedProps,
  getChangellyFixedCurrencyAbbreviation,
  getChangellySupportedChains,
  getChainFromChangellyBlockchain,
  changellyCreateFixTransaction,
  changellyGetFixRateForAmount,
} from '../utils/changelly-utils';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {
  getBadgeImg,
  getChainFromTokenByAddressKey,
  getCurrencyAbbreviation,
  addTokenChainSuffix,
  sleep,
  formatFiatAmount,
  getCWCChain,
  SolanaTokenData,
  getSolanaATAs,
  getOrCreateAssociatedTokenAddress,
} from '../../../../utils/helper-methods';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {
  GetName,
  GetPrecision,
  IsERCToken,
  IsEVMChain,
  IsSVMChain,
  IsVMChain,
} from '../../../../store/wallet/utils/currency';
import {getFeeRatePerKb} from '../../../../store/wallet/effects/fee/fee';
import {
  Wallet,
  SendMaxInfo,
  Key,
  TransactionProposal,
  TSSSigningStatus,
  TSSSigningProgress,
} from '../../../../store/wallet/wallet.models';
import {
  changellyGetCurrencies,
  changellyGetTransactions,
} from '../../../../store/swap-crypto/effects/changelly/changelly';
import {
  dismissBottomNotificationModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import SwapWalletBalanceSvg from '../../../../../assets/img/swap-crypto/swap-wallet-balance.svg';
import ArrowDown from '../../../../../assets/img/swap-crypto/down-arrow.svg';
import InfoSvg from '../../../../../assets/img/info.svg';
import {AppActions} from '../../../../store/app';
import {useTranslation} from 'react-i18next';
import {
  createTxProposal,
  getSendMaxInfo,
  handleCreateTxProposalError,
  publishAndSign,
} from '../../../../store/wallet/effects/send/send';
import {
  FormatAmountStr,
  GetExcludedUtxosMessage,
  parseAmountToStringIfBN,
  SatToUnit,
} from '../../../../store/wallet/effects/amount/amount';
import {orderBy} from 'lodash';
import {
  addWallet,
  AddWalletData,
  getDecryptPassword,
} from '../../../../store/wallet/effects/create/create';
import {
  CustomErrorMessage,
  WrongPasswordError,
} from '../../../wallet/components/ErrorMessages';
import {startUpdateWalletStatus} from '../../../../store/wallet/effects/status/status';
import SwapCryptoLoadingWalletSkeleton from './SwapCryptoLoadingWalletSkeleton';
import SwapCryptoBalanceSkeleton from './SwapCryptoBalanceSkeleton';
import BalanceDetailsModal from '../../../wallet/components/BalanceDetailsModal';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
  SwapCryptoConfig,
} from '../../../../store/external-services/external-services.types';
import {getExternalServicesConfig} from '../../../../store/external-services/external-services.effects';
import {StackActions} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import GlobalSelect from '../../../wallet/screens/GlobalSelect';
import {getExternalServiceSymbol} from '../../utils/external-services-utils';
import {
  ChangellyCurrency,
  ChangellyCurrencyBlockchain,
  ChangellyRateData,
  ChangellyRateResult,
} from '../../../../store/swap-crypto/models/changelly.models';
import {thorswapGetCurrencies} from '../../../../store/swap-crypto/effects/thorswap/thorswap';
import {
  getNameFromThorswapFullName,
  thorswapEnv,
} from '../utils/thorswap-utils';
import {
  ThorswapCurrency,
  ThorswapGetCurrenciesRequestData,
} from '../../../../store/swap-crypto/models/thorswap.models';
import {
  isPairSupported,
  SwapCryptoExchangeKey,
  SwapCryptoSupportedExchanges,
} from '../utils/swap-crypto-utils';
import {
  changellyTxData,
  SwapCryptoLimits,
} from '../../../../store/swap-crypto/swap-crypto.models';
import {H7} from '../../../../components/styled/Text';
import Blockie from '../../../../components/blockie/Blockie';
import {
  buildUIFormattedWallet,
  getEVMAccountName,
  GetProtocolPrefixAddress,
  toFiat,
} from '../../../../store/wallet/utils/wallet';
import {
  useOngoingProcess,
  usePaymentSent,
  useTokenContext,
} from '../../../../contexts';
import {isTSSKey} from '../../../../store/wallet/effects/tss-send/tss-send';
import SwapCryptoOfferSelector, {
  OfferSelectorContainerLeft,
  OfferSelectorContainerRight,
  OfferSelectorText,
  SwapCryptoOffer,
} from '../components/SwapCryptoOfferSelector';
import {createWalletAddress} from '../../../../store/wallet/effects/address/address';
import {BwcProvider} from '../../../../lib/bwc';
import {HEIGHT} from '../../../../components/styled/Containers';
import ChangellyPoliciesModal from '../components/ChangellyPoliciesModal';
import {
  ConfirmHardwareWalletModal,
  SimpleConfirmPaymentState,
} from '../../../../components/modal/confirm-hardware-wallet/ConfirmHardwareWalletModal';
import Transport from '@ledgerhq/hw-transport';
import {BottomNotificationConfig} from '../../../../components/modal/bottom-notification/BottomNotification';
import {useTSSCallbacks} from '../../../../utils/hooks/useTSSCalbacks';
import {currencyConfigs} from '../../../../components/modal/import-ledger-wallet/import-account/SelectLedgerCurrency';
import {Network} from '../../../../constants';
import {
  getLedgerErrorMessage,
  prepareLedgerApp,
} from '../../../../components/modal/import-ledger-wallet/utils';
import TransportBLE from '@ledgerhq/react-native-hw-transport-ble';
import TransportHID from '@ledgerhq/react-native-hid';
import {LISTEN_TIMEOUT, OPEN_TIMEOUT} from '../../../../constants/config';
import {RootStacks} from '../../../../Root';
import {TabsScreens} from '../../../tabs/TabsStack';
import {ExternalServicesSettingsScreens} from '../../../tabs/settings/external-services/ExternalServicesGroup';
import {BWCErrorMessage} from '../../../../constants/BWCError';
import {SwapCryptoActions} from '../../../../store/swap-crypto';
import SwipeButton from '../../../../components/swipe-button/SwipeButton';
import {
  CheckBoxTextContainer,
  PoliciesText,
  RowLabel,
  SwapCheckBoxContainer,
  SwapCheckboxText,
} from '../styled/SwapCryptoCheckout.styled';
import Checkbox from '../../../../components/checkbox/Checkbox';
import SwapCryptoTxDataSkeleton from './SwapCryptoTxDataSkeleton';
import TSSProgressTracker from '../../../wallet/components/TSSProgressTracker';
import SwapCryptoFiatSwitcherIcon from '../../../../components/icons/external-services/swap/SwapCryptoFiatSwitcherIcon';
import BottomAmountModal from '../components/BottomAmountModal';

export type SwapCryptoRootScreenParams =
  | {
      selectedWallet?: Wallet;
      partner?: SwapCryptoExchangeKey;
    }
  | undefined;

export interface SwapLimits {
  minAmount?: number;
  maxAmount?: number;
}

export interface SwapCryptoCoin {
  currencyAbbreviation: string;
  symbol: string;
  chain: string;
  name: string;
  protocol?: string;
  logoUri?: any;
  badgeUri?: any;
  tokenAddress?: string;
  supportedBy?: {
    changelly?: boolean;
    thorswap?: boolean;
  };
}

export interface SwapCryptoExchange {
  key: SwapCryptoExchangeKey;
  showOffer: boolean;
  supportedCoins: SwapCryptoCoin[] | undefined;
  disabled: boolean; // The offer card is shown but with an error message
  offerError: string | undefined;
  limits?: SwapCryptoLimits;
}

export type PreLoadPartnersData = {
  [key in SwapCryptoExchangeKey]: SwapCryptoExchange;
};

const swapCryptoExchangesDefault: PreLoadPartnersData = {
  changelly: {
    key: 'changelly',
    showOffer: true,
    supportedCoins: undefined,
    disabled: false,
    offerError: undefined,
    limits: {
      min: undefined,
      max: undefined,
    },
  },
  thorswap: {
    key: 'thorswap',
    showOffer: true,
    supportedCoins: undefined,
    disabled: false,
    offerError: undefined,
    limits: undefined,
  },
};

const SwapCryptoContainer = styled.SafeAreaView`
  flex: 1;
`;

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const OfferSelectorItemRow = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 48px;
`;

const OfferSelectorContainer = styled.View<{isSmallScreen?: boolean}>`
  /* min-height: ${({isSmallScreen}) => (isSmallScreen ? 140 : 165)}px; */
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#eaeaea')};
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Slate10)};
  border-radius: 12px;
  margin: 0px 15px 15px 15px;
  padding: 0 16px;
`;

let swapCryptoConfig: SwapCryptoConfig | undefined;

const SwapCryptoRoot: React.FC = () => {
  // Timer ref for intervals/timeouts (avoid module scope)
  const countDownRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const {t} = useTranslation();
  const theme = useTheme();
  const _isSmallScreen = HEIGHT < 700;
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const BWC = BwcProvider.getInstance();
  const scrollViewRef = useRef<ScrollView>(null);
  const {showOngoingProcess, hideOngoingProcess} = useOngoingProcess();
  const keys: {[key: string]: Key} = useAppSelector(({WALLET}) => WALLET.keys);
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const {tokenOptionsByAddress, tokenDataByAddress} = useTokenContext();
  const tokenOptions = Object.entries(tokenOptionsByAddress).map(
    ([k, {symbol}]) => {
      const chain = getChainFromTokenByAddressKey(k);
      return getExternalServiceSymbol(symbol.toLowerCase(), chain);
    },
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const route =
    useRoute<
      RouteProp<SwapCryptoGroupParamList, SwapCryptoScreens.SWAP_CRYPTO_ROOT>
    >();
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fromWalletSelectorModalVisible, setFromWalletSelectorModalVisible] =
    useState(false);
  const [toWalletSelectorModalVisible, setToWalletSelectorModalVisible] =
    useState(false);
  const [balanceDetailsModalVisible, setBalanceDetailsModalVisible] =
    useState<boolean>(false);
  const [fromWalletSelected, setFromWalletSelected] = useState<Wallet>();
  const [uiFormattedWallet, setUiFormattedWallet] = useState<WalletRowProps>();
  const [useDefaultToWallet, setUseDefaultToWallet] = useState<boolean>(false);
  const [toWalletSelected, setToWalletSelected] = useState<Wallet>();
  const [amountFrom, setAmountFrom] = useState<number>(0);
  const [confirmedAmountFrom, setConfirmedAmountFrom] = useState<number>();
  const [amountTo, setAmountTo] = useState<number>();
  const [formatedAmountFrom, setFormatedAmountFrom] = useState<string>('');
  const [swapCryptoSupportedCoinsFrom, setSwapCryptoSupportedCoinsFrom] =
    useState<SwapCryptoCoin[]>();
  const [swapCryptoSupportedCoinsTo, setSwapCryptoSupportedCoinsTo] = useState<
    SwapCryptoCoin[]
  >([]);
  const [rateData, setRateData] = useState<ChangellyRateData>();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingEnterAmountBtn, setLoadingEnterAmountBtn] =
    useState<boolean>(false);
  const [loadingWalletFromStatus, setLoadingWalletFromStatus] =
    useState<boolean>(false);
  const [useSendMax, setUseSendMax] = useState<boolean>(false);
  const [sendMaxInfo, setSendMaxInfo] = useState<SendMaxInfo | undefined>();
  const [selectedOffer, setSelectedOffer] = useState<
    SwapCryptoOffer | undefined
  >();
  const [offersLoading, setOffersLoading] = useState<boolean>(false);
  let selectedWallet = route.params?.selectedWallet;
  const allSupportedTokens: string[] = [...tokenOptions, ...SUPPORTED_TOKENS];
  const preSetPartner: SwapCryptoExchangeKey | undefined =
    route.params?.partner &&
    SwapCryptoSupportedExchanges.includes(
      route.params.partner.toLowerCase() as SwapCryptoExchangeKey,
    )
      ? (route.params.partner.toLowerCase() as SwapCryptoExchangeKey)
      : undefined;
  const SupportedChains: string[] = SUPPORTED_COINS;
  const [swapLimits, setSwapLimits] = useState<SwapLimits>({
    minAmount: undefined,
    maxAmount: undefined,
  });
  const [selectedPillValue, setSelectedPillValue] = useState<number | string>();

  // Checkout props
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');
  const [paymentExpired, setPaymentExpired] = useState(false);
  const [resetSwipeButton, setResetSwipeButton] = useState(false);
  // const [amountExpectedFrom, setAmountExpectedFrom] =
  //     useState<number>(amountFrom);
  const [ataOwnerAddress, setAtaOwnerAddress] = useState<string>();
  const [ctxp, setCtxp] = useState<Partial<TransactionProposal>>();
  const [txData, setTxData] = useState<any>();
  const {showPaymentSent, hidePaymentSent} = usePaymentSent();
  const [loadingCreateTx, setLoadingCreateTx] = useState(false);
  const [displayInFiat, setDisplayInFiat] = useState(true);

  const alternativeIsoCode = 'USD';
  let addressFrom: string; // Refund address
  let addressTo: string; // Receiving address
  let payinExtraId: string;
  let status: string;
  let payinAddress: string;

  // Changelly
  const [changellyPoliciesModalVisible, setChangellyPoliciesModalVisible] =
    useState(false);
  const [exchangeTxId, setExchangeTxId] = useState<string>();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showCheckTermsMsg, setShowCheckTermsMsg] = useState(false);

  // Hardware wallet
  const [isConfirmHardwareWalletModalVisible, setConfirmHardwareWalletVisible] =
    useState(false);
  const [hardwareWalletTransport, setHardwareWalletTransport] =
    useState<Transport | null>(null);
  const [confirmHardwareState, setConfirmHardwareState] =
    useState<SimpleConfirmPaymentState | null>(null);
  // use the ref when doing any work that could cause disconnects and cause a new transport to be passed in mid-function
  const transportRef = useRef(hardwareWalletTransport);
  transportRef.current = hardwareWalletTransport;
  const setPromptOpenAppState = (state: boolean) =>
    state && setConfirmHardwareState('selecting');

  // We need a constant fn (no deps) that persists across renders that we can attach to AND detach from transports
  const onDisconnect = useCallback(async () => {
    let retryAttempts = 2;
    let newTp: Transport | null = null;

    // avoid closure values
    const isBle = transportRef.current instanceof TransportBLE;
    const isHid = transportRef.current instanceof TransportHID;
    const shouldReconnect =
      isConfirmHardwareWalletModalVisible && (isBle || isHid);

    if (!shouldReconnect) {
      setHardwareWalletTransport(null);
      return;
    }

    // try to reconnect a few times
    while (!newTp && retryAttempts > 0) {
      if (isBle) {
        newTp = await TransportBLE.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      } else if (isHid) {
        newTp = await TransportHID.create(OPEN_TIMEOUT, LISTEN_TIMEOUT).catch(
          () => null,
        );
      }

      retryAttempts--;
    }

    if (newTp) {
      newTp.on('disconnect', onDisconnect);
    }
    setHardwareWalletTransport(newTp);
  }, []);

  // Threshold Signature Scheme (TSS)
  const [showTSSProgressModal, setShowTSSProgressModal] = useState(false);
  const showTssErrorMessage = useCallback(
    async (config: BottomNotificationConfig) => {
      const msg = config?.message || t('An error occurred during TSS signing');
      const reason = 'TSS Signing Error';
      const title = config?.title || t('TSS Signing Error');
      showError({msg, reason, title, goBack: true, fireAnalytics: true});
    },
    [dispatch],
  );
  const [isTSSWallet, setIsTSSWallet] = useState<boolean>(false);
  const [tssStatus, setTssStatus] = useState<TSSSigningStatus>('initializing');
  const [tssProgress, setTssProgress] = useState<TSSSigningProgress>({
    currentRound: 0,
    totalRounds: 4,
    status: 'pending',
  });
  const [tssCopayers, setTssCopayers] = useState<
    Array<{id: string; name: string; signed: boolean}>
  >([]);

  const tssCallbacks = useTSSCallbacks({
    wallet: fromWalletSelected, // TODO: review if this works with fromWalletSelected being undefined
    setTssStatus,
    setTssProgress,
    setTssCopayers,
    tssCopayers,
    setShowTSSProgressModal,
    setResetSwipeButton,
    showErrorMessage: showTssErrorMessage,
  });

  const showModal = (id: string) => {
    switch (id) {
      case 'fromWalletSelector':
        setFromWalletSelectorModalVisible(true);
        break;
      case 'toWalletSelector':
        setToWalletSelectorModalVisible(true);
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
      case 'fromWalletSelector':
        setFromWalletSelectorModalVisible(false);
        break;
      case 'toWalletSelector':
        setToWalletSelectorModalVisible(false);
        break;
      case 'amount':
        setAmountModalVisible(false);
        break;
      default:
        break;
    }
  };

  // Handle real-time amount changes from AmountModal
  const handleAmountChange = useCallback(
    (newAmount: number, fromPill?: boolean, isValid?: boolean) => {
      setAmountFrom(newAmount);

      if (fromWalletSelected) {
        const {currencyAbbreviation, chain, tokenAddress} = fromWalletSelected;
        const precision = dispatch(
          GetPrecision(currencyAbbreviation, chain, tokenAddress),
        );
        if (precision) {
          const totalSat = newAmount * precision.unitToSatoshi;
          const formatedAmount = formatFiatAmount(
            dispatch(
              toFiat(
                totalSat,
                defaultAltCurrency.isoCode,
                currencyAbbreviation,
                chain,
                rates,
                tokenAddress,
              ),
            ),
            defaultAltCurrency.isoCode,
          );
          setFormatedAmountFrom(formatedAmount);
        }
      }

      // Clear previous offer data when amount changes
      setSelectedOffer(undefined);
      setCtxp(undefined);
      setTxData(undefined);

      if (fromPill) {
        hideModal('amount');
        checkAmount(newAmount);
      }
    },
    [fromWalletSelected, dispatch, defaultAltCurrency.isoCode, rates],
  );

  const handleOnBackdropPress = useCallback(() => {
    hideModal('amount');
    checkAmount(amountFrom);
  }, [amountFrom]);

  const canContinue = useMemo(() => {
    return (
      !!toWalletSelected &&
      !!fromWalletSelected &&
      amountFrom > 0 &&
      !!amountTo &&
      amountTo > 0 &&
      !offersLoading &&
      !!selectedOffer &&
      (selectedOffer.key !== 'changelly' || (!!exchangeTxId && !!termsAccepted))
    );
  }, [
    toWalletSelected,
    fromWalletSelected,
    amountFrom,
    amountTo,
    offersLoading,
    selectedOffer,
    termsAccepted,
    exchangeTxId,
  ]);

  const setSelectedWallet = async (supportedCoins: SwapCryptoCoin[]) => {
    if (selectedWallet) {
      const key = keys[selectedWallet.keyId];

      if (
        !supportedCoins.find(
          coin =>
            coin.symbol ===
            getExternalServiceSymbol(
              selectedWallet!.currencyAbbreviation,
              selectedWallet!.chain,
            ),
        )
      ) {
        const msg = t(
          'Our providers have temporarily disabled exchanges involving coin(chain). Please try a different currency.',
          {
            coin: `${cloneDeep(
              selectedWallet.currencyAbbreviation,
            ).toUpperCase()}`,
            chain: `${cloneDeep(selectedWallet.chain).toUpperCase()}`,
          },
        );
        showError({msg});
        selectedWallet = undefined;
        return;
      }

      try {
        await dispatch(
          startUpdateWalletStatus({key, wallet: selectedWallet, force: true}),
        );
      } catch (err) {
        logger.warn('Failed to update balances from Swap Crypto');
      }
      if (selectedWallet.balance?.satSpendable > 0) {
        setFromWallet(selectedWallet, true);
      } else if (selectedWallet.balance?.satSpendable === 0) {
        setToWallet(selectedWallet);
        setUseDefaultToWallet(true);
      } else {
        logger.warn('It was not possible to set the selected wallet');
      }
    }
    hideOngoingProcess();
  };

  const setFromWallet = async (
    fromWallet: Wallet,
    skipStatusUpdate?: boolean,
  ) => {
    if (!swapCryptoSupportedCoinsFrom) {
      return;
    }
    if (!useDefaultToWallet) {
      setToWalletSelected(undefined);
    }

    if (!skipStatusUpdate) {
      setLoadingWalletFromStatus(true);

      const key = keys[fromWallet.keyId];
      try {
        await dispatch(
          startUpdateWalletStatus({key, wallet: fromWallet, force: true}),
        );
      } catch (err) {
        logger.warn('Failed to update balances from Swap Crypto');
      }
    }

    setAmountFrom(0);
    setConfirmedAmountFrom(undefined);
    setSelectedOffer(undefined);
    setCtxp(undefined);
    setTxData(undefined);
    setSwapLimits({minAmount: undefined, maxAmount: undefined});
    setFormatedAmountFrom('');
    setUseSendMax(false);
    setSendMaxInfo(undefined);
    setSelectedPillValue(undefined);
    setLoading(false);
    setLoadingEnterAmountBtn(false);
    setRateData(undefined);

    let possibleCoinsTo: SwapCryptoCoin[] = [];

    // Only include possible pairs in coinsTo.
    // Do not show exchange offer if coinFrom is not supported.
    Object.values(swapCryptoExchangesDefault).forEach(exchange => {
      if (exchange.supportedCoins && exchange.supportedCoins.length > 0) {
        const isCoinPresentedInExchange = exchange.supportedCoins.find(
          coin =>
            coin.symbol ===
            getExternalServiceSymbol(
              fromWallet.currencyAbbreviation,
              fromWallet.chain,
            ),
        );

        if (exchange.showOffer && isCoinPresentedInExchange) {
          possibleCoinsTo = possibleCoinsTo.concat(exchange.supportedCoins);
          swapCryptoExchangesDefault[exchange.key].showOffer = true;
        } else {
          swapCryptoExchangesDefault[exchange.key].showOffer = false;
        }
      }
    });

    possibleCoinsTo = _.uniqBy(possibleCoinsTo, 'symbol');

    // Only includes coins already included in swapCryptoSupportedCoinsFrom
    possibleCoinsTo = possibleCoinsTo.filter(coin =>
      swapCryptoSupportedCoinsFrom.includes(coin),
    );

    // Remove coinsFrom from possible coinsTo
    const coinsTo = cloneDeep(possibleCoinsTo).filter(
      coin =>
        coin.symbol !==
        getExternalServiceSymbol(
          fromWallet.currencyAbbreviation,
          fromWallet.chain,
        ),
    );

    // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
    const orderedArray = SupportedCurrencyOptions.map(currency =>
      currency.chain
        ? getCurrencyAbbreviation(currency.currencyAbbreviation, currency.chain)
        : currency.currencyAbbreviation,
    );
    let coinsToOrdered = orderBy(
      coinsTo,
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

    setSwapCryptoSupportedCoinsTo(coinsToOrdered);
    setFromWalletSelected(fromWallet);
    setLoadingWalletFromStatus(false);
  };

  const setToWallet = (toWallet: Wallet) => {
    setRateData(undefined);
    setSelectedOffer(undefined);
    setCtxp(undefined);
    setTxData(undefined);
    setSwapLimits({minAmount: undefined, maxAmount: undefined});
    setToWalletSelected(toWallet);
  };

  const swapGetLimits = async () => {
    setLoadingEnterAmountBtn(true);
    setRateData(undefined);
    if (!fromWalletSelected || !toWalletSelected) {
      return;
    }

    const pair =
      getExternalServiceSymbol(
        fromWalletSelected.currencyAbbreviation,
        fromWalletSelected.chain,
      ) +
      '_' +
      getExternalServiceSymbol(
        toWalletSelected.currencyAbbreviation,
        toWalletSelected.chain,
      );
    logger.debug('Updating max and min with pair: ' + pair);

    const enabledExchanges = Object.values(swapCryptoExchangesDefault)
      .filter(
        exchange =>
          (!preSetPartner || exchange.key === preSetPartner) &&
          exchange.showOffer &&
          !exchange.disabled &&
          exchange.supportedCoins &&
          exchange.supportedCoins.length > 0 &&
          isPairSupported(
            exchange.key,
            fromWalletSelected.currencyAbbreviation,
            fromWalletSelected.chain,
            toWalletSelected.currencyAbbreviation,
            toWalletSelected.chain,
            exchange.supportedCoins,
          ),
      )
      .map(exchange => exchange.key);

    const getLimitsPromiseByExchange = (exchange: SwapCryptoExchangeKey) => {
      switch (exchange) {
        case 'changelly':
          return changellyGetLimits(fromWalletSelected, toWalletSelected);
        case 'thorswap':
          return thorswapGetLimits();
        default:
          return Promise.reject('No getLimits function for this partner');
      }
    };

    const getLimitsPromises = enabledExchanges.map(exchange =>
      getLimitsPromiseByExchange(exchange),
    );

    try {
      const responseByExchange = await Promise.allSettled([
        ...getLimitsPromises,
        sleep(400),
      ]);
      const responseByExchangeKey = responseByExchange.map((res, index) => {
        const exchangeKey: SwapCryptoExchangeKey | undefined =
          enabledExchanges[index] ?? undefined;
        return {exchangeKey, promiseRes: res};
      });

      let allLimits: SwapLimits[] = [];

      if (responseByExchangeKey instanceof Array) {
        responseByExchangeKey.forEach((e, index) => {
          if (e.promiseRes.status === 'rejected') {
            logger.debug(
              `Swap crypto getLimits[${
                e.exchangeKey
              }] Rejected: + ${JSON.stringify(e.promiseRes.reason)}`,
            );
          } else if (e.promiseRes.status === 'fulfilled') {
            switch (e.exchangeKey) {
              case 'changelly':
                swapCryptoExchangesDefault.changelly.limits = {
                  min: e.promiseRes.value?.minAmount
                    ? Number(e.promiseRes.value.minAmount)
                    : undefined,
                  max: e.promiseRes.value?.maxAmount
                    ? Number(e.promiseRes.value.maxAmount)
                    : undefined,
                };
                allLimits.push(e.promiseRes.value as SwapLimits);
                break;
              case 'thorswap':
                swapCryptoExchangesDefault.thorswap.limits = {
                  min: e.promiseRes.value?.minAmount
                    ? Number(e.promiseRes.value.minAmount)
                    : undefined,
                  max: e.promiseRes.value?.maxAmount
                    ? Number(e.promiseRes.value.maxAmount)
                    : undefined,
                };
                allLimits.push(e.promiseRes.value as SwapLimits);
                break;
            }
          }
        });

        if (allLimits.length > 0) {
          // If at least one enabled exchange does not have limits, then I set the limits to undefined,
          // this way the user can put any value in Amount modal
          const minMinAmount = allLimits.find(
            limit => limit.minAmount === undefined,
          )
            ? undefined
            : _.minBy(allLimits, 'minAmount')?.minAmount;
          const maxMaxAmount = allLimits.find(
            limit => limit.maxAmount === undefined,
          )
            ? undefined
            : _.maxBy(allLimits, 'maxAmount')?.maxAmount;

          setSwapLimits({
            minAmount: minMinAmount,
            maxAmount: maxMaxAmount,
          });
        }
      }
      setLoadingEnterAmountBtn(false);
    } catch (err) {
      logger.error('Swap crypto getLimits Error: ' + JSON.stringify(err));
      setLoadingEnterAmountBtn(false);
      const msg = t(
        'Swap Crypto feature is not available at this moment. Please try again later.',
      );
      hideOngoingProcess();
      await sleep(200);
      showError({msg});
    }
  };

  const changellyGetLimits = async (
    fromWallet: Wallet,
    toWallet: Wallet,
  ): Promise<SwapLimits | undefined> => {
    const data = {
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        fromWallet.currencyAbbreviation.toLowerCase(),
        fromWallet.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        toWallet.currencyAbbreviation.toLowerCase(),
        toWallet.chain,
      ),
    };
    try {
      const pairParamsData = await changellyGetPairsParams(fromWallet, data);
      if (pairParamsData.error) {
        logger.debug(
          'Changelly getPairsParams Error: ' +
            JSON.stringify(pairParamsData.error),
        );
        return;
      }

      if (
        pairParamsData.result &&
        (pairParamsData.result.length === 0 ||
          (pairParamsData.result[0] &&
            (!pairParamsData.result[0].maxAmountFixed ||
              Number(pairParamsData.result[0].maxAmountFixed) <= 0)))
      ) {
        const errMsg = `Changelly has temporarily disabled ${fromWallet.currencyAbbreviation}(${fromWallet.chain})-${toWallet.currencyAbbreviation}(${toWallet.chain}) pair. If you have further questions please reach out to them.`;
        logger.debug('Changelly getPairsParams Error: ' + errMsg);
        return;
      }

      const changellySwapLimits: SwapLimits = {
        minAmount: Number(pairParamsData.result[0].minAmountFixed),
        maxAmount: Number(pairParamsData.result[0].maxAmountFixed),
      };

      logger.debug(
        `[Changelly] Min amount: ${changellySwapLimits.minAmount} - Max amount: ${changellySwapLimits.maxAmount}`,
      );
      return changellySwapLimits;
    } catch (err) {
      logger.error('Changelly getPairsParams Error: ' + JSON.stringify(err));
    }
  };

  const thorswapGetLimits = (): Promise<SwapLimits | undefined> => {
    // By supporting multiple providers with different dust theresholds and limits considerations, Thorswap no longer maintains an endpoint to obtain the limits for a swap.
    // It was replaced by messages inside the getQuote function
    const thorswapSwapLimits: SwapLimits = {
      minAmount: undefined,
      maxAmount: undefined,
    };

    logger.debug('[Thorswap] Min amount: No limit - Max amount: No limit');
    return Promise.resolve(thorswapSwapLimits);
  };

  const getSendMaxData = (): Promise<any> => {
    return new Promise(async (resolve, reject) => {
      if (!fromWalletSelected) {
        return resolve(undefined);
      }
      try {
        const feeLevel = ['btc', 'eth', 'matic'].includes(
          fromWalletSelected.chain,
        )
          ? 'priority'
          : 'normal';

        const feeRate = await getFeeRatePerKb({
          wallet: fromWalletSelected,
          feeLevel,
        });

        const res = await getSendMaxInfo({
          wallet: fromWalletSelected,
          opts: {
            feePerKb: feeRate,
            excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
            returnInputs: true,
          },
        });
        return resolve(res);
      } catch (err) {
        return reject(err);
      }
    });
  };

  const showError = async (opts: {
    title?: string;
    msg?: string;
    actions?: any[];
    goBack?: boolean;
    reason?: string;
    errorMsgLog?: string;
    fireAnalytics?: boolean;
  }) => {
    hideOngoingProcess();
    await sleep(400);
    setLoading(false);
    setLoadingEnterAmountBtn(false);
    setLoadingCreateTx(false);
    await sleep(600);

    if (opts?.fireAnalytics) {
      dispatch(
        Analytics.track('Failed Crypto Swap', {
          exchange: selectedOffer?.key || 'unknown',
          context: 'SwapCryptoRoot',
          reasonForFailure: opts?.reason || 'unknown',
          errorMsg: opts?.errorMsgLog || 'unknown',
          amountFrom: amountFrom || '',
          fromCoin:
            fromWalletSelected?.currencyAbbreviation?.toLowerCase() || '',
          fromChain: fromWalletSelected?.chain?.toLowerCase() || '',
          toCoin: toWalletSelected?.currencyAbbreviation?.toLowerCase() || '',
          toChain: toWalletSelected?.chain?.toLowerCase() || '',
        }),
      );
    }

    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: opts?.title ?? t('Error'),
        message: opts?.msg ?? t('Unknown Error'),
        onBackdropDismiss: opts?.goBack ? () => navigation.goBack() : () => {},
        enableBackdropDismiss: true,
        actions: opts?.actions ?? [
          {
            text: t('OK'),
            action: async () => {
              if (opts?.goBack) {
                dispatch(dismissBottomNotificationModal());
                await sleep(1000);
                navigation.goBack();
              }
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const getLinkedWallet = () => {
    if (!toWalletSelected) {
      return;
    }

    const linkedWallet = keys[toWalletSelected.keyId].wallets.find(({tokens}) =>
      tokens?.includes(toWalletSelected.id),
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
          selectedWallet: toWalletSelected?.currencyAbbreviation.toUpperCase(),
          linkedWalletName: linkedWalletName
            ? '(' + linkedWalletName + ')'
            : ' ',
        }),
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('GOT IT'),
            action: async () => {
              await sleep(400);
              continueToCheckout();
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const checkAmount = useCallback(
    (amountFrom: number) => {
      if (!fromWalletSelected || !amountFrom) {
        setLoading(false);
        return;
      }

      let msg: string | undefined;
      let amountFromIsInvalid = false;
      let spendableAmount: number | undefined;

      if (fromWalletSelected.balance?.satSpendable) {
        spendableAmount = dispatch(
          SatToUnit(
            fromWalletSelected.balance.satSpendable,
            fromWalletSelected.currencyAbbreviation,
            fromWalletSelected.chain,
            fromWalletSelected.tokenAddress,
          ),
        );
      }

      if (spendableAmount && spendableAmount < amountFrom) {
        msg = t(
          'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals or enter a valid amount.',
        );
        amountFromIsInvalid = true;
      } else if (swapLimits?.minAmount && amountFrom < swapLimits.minAmount) {
        msg = t(
          'You are trying to send less than the minimum amount for this exchange.',
        );
        amountFromIsInvalid = true;
      } else if (swapLimits?.maxAmount && amountFrom > swapLimits.maxAmount) {
        msg = t(
          'You are trying to send more than the maximum amount for this exchange.',
        );
        amountFromIsInvalid = true;
      } else {
        msg = undefined;
        amountFromIsInvalid = false;
      }

      if (amountFromIsInvalid) {
        showError({msg: msg});
        setLoading(false);
        setAmountFrom(0);
        setConfirmedAmountFrom(undefined);
        setSelectedOffer(undefined);
        setCtxp(undefined);
        setTxData(undefined);
        setFormatedAmountFrom('');
        setUseSendMax(false);
        setSendMaxInfo(undefined);
        setSelectedPillValue(undefined);
        setRateData(undefined);
      } else {
        setConfirmedAmountFrom(amountFrom);
      }
    },
    [fromWalletSelected, swapLimits, dispatch, t],
  );

  const checkIfErc20Token = () => {
    const tokensWarn = async () => {
      await sleep(300);
      showTokensInfoSheet();
    };
    if (
      !!toWalletSelected &&
      IsERCToken(toWalletSelected.currencyAbbreviation, toWalletSelected.chain)
    ) {
      tokensWarn();
    } else {
      continueToCheckout();
    }
  };

  const continueToCheckout = () => {
    dispatch(
      Analytics.track('Swap Crypto Offers', {
        fromCoin: fromWalletSelected!.currencyAbbreviation,
        fromChain: fromWalletSelected!.chain,
        toCoin: toWalletSelected!.currencyAbbreviation,
        toChain: toWalletSelected!.chain,
        amountFrom: amountFrom,
      }),
    );
  };

  const filterChangellyCurrenciesConditions = (
    currency: ChangellyCurrency,
  ): boolean => {
    // TODO: accept all Changelly supported tokens => If no wallets: create a custom token wallet

    const changellySupportedChains = getChangellySupportedChains() ?? [];
    const changellySupportedEvmChains =
      getChangellySupportedChains('evm') ?? [];
    const changellySupportedSvmChains =
      getChangellySupportedChains('svm') ?? [];
    const currencyBlockchain = currency.blockchain
      ? cloneDeep(currency.blockchain).toLowerCase()
      : undefined;

    return (
      currency.enabled &&
      currency.fixRateEnabled &&
      !!currencyBlockchain &&
      changellySupportedChains.includes(currencyBlockchain) &&
      // If currency is not EVM => return true
      // If currency is EVM => check tokens
      (!changellySupportedEvmChains.includes(currencyBlockchain) ||
        allSupportedTokens.includes(
          getExternalServiceSymbol(
            currency.name,
            getChainFromChangellyBlockchain(currency.name, currency.blockchain),
          ),
        )) &&
      ((currencyBlockchain === 'solana' && currency.ticker === 'sol') ||
        // If currency is not SVM => return true
        // If currency is SVM => check tokens
        !changellySupportedSvmChains.includes(currencyBlockchain) ||
        allSupportedTokens.includes(
          getExternalServiceSymbol(
            currency.name,
            getChainFromChangellyBlockchain(currency.name, currency.blockchain),
          ),
        ))
    );
  };

  const getLogoUri = (_currencyAbbreviation: string, _chain: string) => {
    const foundToken = Object.values(tokenDataByAddress).find(
      token => token.coin === _currencyAbbreviation && token.chain === _chain,
    );
    if (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation &&
          (!chain || chain === _chain),
      )
    ) {
      return SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === _currencyAbbreviation &&
          (!chain || chain === _chain),
      )!.img;
    } else if (foundToken?.logoURI) {
      return foundToken?.logoURI;
    } else {
      return undefined;
    }
  };

  const getChangellyCurrencies = async () => {
    const changellyCurrenciesData = await changellyGetCurrencies(true);

    if (changellyCurrenciesData?.result?.length) {
      const changellyCurrenciesDataFixedNames: ChangellyCurrency[] =
        getChangellyCurrenciesFixedProps(
          changellyCurrenciesData.result as ChangellyCurrency[],
        );

      const supportedCoinsWithFixRateEnabled: SwapCryptoCoin[] =
        changellyCurrenciesDataFixedNames
          .filter((changellyCurrency: ChangellyCurrency) =>
            filterChangellyCurrenciesConditions(changellyCurrency),
          )
          .map(
            ({
              name,
              fullName,
              protocol,
              blockchain,
              contractAddress,
            }: {
              name: string;
              fullName: string;
              protocol?: string;
              blockchain?: ChangellyCurrencyBlockchain;
              contractAddress?: string;
            }) => {
              const chain = getChainFromChangellyBlockchain(name, blockchain);
              return {
                currencyAbbreviation: name.toLowerCase(),
                symbol: getExternalServiceSymbol(name, chain),
                name: fullName,
                chain,
                protocol,
                blockchain: blockchain?.toLowerCase(),
                logoUri: getLogoUri(name.toLowerCase(), chain),
                badgeUri: getBadgeImg(name.toLowerCase(), chain),
                tokenAddress: contractAddress,
                supportedBy: {changelly: true},
              };
            },
          );

      // TODO: add support to float-rate coins supported by Changelly

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
        supportedCoinsWithFixRateEnabled,
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

      return supportedCoins;
    }
  };

  const filterThorswapCurrenciesConditions = (
    currency: ThorswapCurrency,
  ): boolean => {
    // TODO: accept all Thorswap supported tokens => If no wallets: create a custom token wallet

    return (
      currency.enabled &&
      !!currency.protocol &&
      !!currency.ticker &&
      [...SupportedChains].includes(currency.protocol.toLowerCase()) &&
      (currency.ticker === 'eth' ||
        (['eth', 'matic', 'polygon', 'arb', 'base', 'op'].includes(
          currency.protocol.toLowerCase(),
        )
          ? allSupportedTokens.includes(
              getExternalServiceSymbol(
                currency.ticker.toLowerCase(),
                currency.protocol.toLowerCase(),
              ),
            )
          : true))
    );
  };

  const getThorswapCurrencies = async () => {
    const reqData: ThorswapGetCurrenciesRequestData = {
      env: thorswapEnv,
      categories: 'all',
      includeDetails: true,
    };
    const thorswapCurrenciesData: ThorswapCurrency[] =
      await thorswapGetCurrencies(reqData);

    if (thorswapCurrenciesData?.length) {
      let supportedCoinsWithFixRateEnabled: SwapCryptoCoin[] =
        thorswapCurrenciesData
          .filter((thorswapCurrency: ThorswapCurrency) =>
            filterThorswapCurrenciesConditions(thorswapCurrency),
          )
          .map(
            ({
              name,
              fullName,
              ticker,
              protocol,
              address,
            }: {
              name: string;
              fullName: string;
              ticker: string;
              protocol: string;
              address?: string;
            }) => {
              const getName = (
                ticker: string,
                protocol: string,
                address: string | undefined,
              ): string | undefined => {
                let _name: string | undefined;
                if (address && address !== '') {
                  const tokenAddressSuffix = addTokenChainSuffix(
                    address.toLowerCase(),
                    protocol.toLowerCase(),
                  );
                  _name = BitpaySupportedTokens[tokenAddressSuffix]
                    ? BitpaySupportedTokens[tokenAddressSuffix].name
                    : undefined;
                } else {
                  _name = BitpaySupportedCoins[ticker.toLowerCase()]
                    ? BitpaySupportedCoins[ticker.toLowerCase()].name
                    : undefined;
                }

                return _name;
              };
              return {
                currencyAbbreviation: ticker.toLowerCase(),
                symbol: getExternalServiceSymbol(
                  ticker.toLowerCase(),
                  protocol.toLowerCase(),
                ),
                name:
                  getName(ticker, protocol, address) ??
                  getNameFromThorswapFullName(fullName) ??
                  name,
                chain: protocol.toLowerCase(),
                protocol,
                logoUri: getLogoUri(
                  ticker.toLowerCase(),
                  protocol.toLowerCase(),
                ),
                badgeUri: getBadgeImg(
                  ticker.toLowerCase(),
                  protocol.toLowerCase(),
                ),
                tokenAddress: address && address !== '' ? address : undefined,
                supportedBy: {thorswap: true},
              };
            },
          );

      supportedCoinsWithFixRateEnabled = _.uniqBy(
        supportedCoinsWithFixRateEnabled,
        'symbol',
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
        supportedCoinsWithFixRateEnabled,
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

      return supportedCoins;
    }
  };

  const openWalletBalanceModal = () => {
    if (!fromWalletSelected) {
      return;
    }
    const uiFormattedWallet = buildUIFormattedWallet(
      fromWalletSelected,
      defaultAltCurrency.isoCode,
      rates,
      dispatch,
      'symbol',
    );

    setUiFormattedWallet(uiFormattedWallet);
    setBalanceDetailsModalVisible(true);
  };

  const init = async () => {
    await sleep(100);
    showOngoingProcess('GENERAL_AWAITING');

    try {
      const requestData: ExternalServicesConfigRequestParams = {
        currentLocationCountry: locationData?.countryShortCode,
        currentLocationState: locationData?.stateShortCode,
        bitpayIdLocationCountry: user?.country,
        bitpayIdLocationState: user?.state,
      };
      const config: ExternalServicesConfig = await dispatch(
        getExternalServicesConfig(requestData),
      );
      swapCryptoConfig = config?.swapCrypto;
      logger.debug('swapCryptoConfig: ' + JSON.stringify(swapCryptoConfig));
    } catch (err) {
      logger.error('getSwapCryptoConfig Error: ' + JSON.stringify(err));
    }

    if (swapCryptoConfig?.disabled) {
      hideOngoingProcess();
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: swapCryptoConfig?.disabledTitle
            ? swapCryptoConfig.disabledTitle
            : t('Out of service'),
          message: swapCryptoConfig?.disabledMessage
            ? swapCryptoConfig.disabledMessage
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

    const supportedExchanges: SwapCryptoExchangeKey[] = Object.keys(
      swapCryptoExchangesDefault,
    ) as SwapCryptoExchangeKey[];

    // prevent "getCurrencies" from deleted or disabled exchanges
    supportedExchanges.forEach(exchange => {
      if (swapCryptoConfig && swapCryptoConfig[exchange]) {
        swapCryptoExchangesDefault[exchange].showOffer =
          !swapCryptoConfig[exchange]?.removed;
        swapCryptoExchangesDefault[exchange].disabled =
          !!swapCryptoConfig[exchange]?.disabled;
      }
    });

    const enabledExchanges = Object.values(swapCryptoExchangesDefault)
      .filter(
        exchange =>
          exchange.showOffer &&
          !exchange.disabled &&
          (!preSetPartner || exchange.key === preSetPartner),
      )
      .map(exchange => exchange.key);

    const getCurrenciesPromiseByExchange = (
      exchange: SwapCryptoExchangeKey,
    ) => {
      switch (exchange) {
        case 'changelly':
          return getChangellyCurrencies();
        case 'thorswap':
          return getThorswapCurrencies();
        default:
          return Promise.resolve([]);
      }
    };

    const getCurrenciesPromises = enabledExchanges.map(exchange =>
      getCurrenciesPromiseByExchange(exchange),
    );

    try {
      const responseByExchange = await Promise.allSettled([
        ...getCurrenciesPromises,
        sleep(400),
      ]);
      const responseByExchangeKey = responseByExchange.map((res, index) => {
        const exchangeKey: SwapCryptoExchangeKey | undefined =
          enabledExchanges[index] ?? undefined;
        return {exchangeKey, promiseRes: res};
      });

      let allSupportedCoins: SwapCryptoCoin[] = [];

      if (responseByExchangeKey instanceof Array) {
        responseByExchangeKey.forEach((e, index) => {
          if (e.promiseRes.status === 'rejected') {
            logger.error(
              `Swap crypto getCurrencies[${index}] Rejected: + ${JSON.stringify(
                e.promiseRes.reason,
              )}`,
            );
            if (e.promiseRes.reason instanceof Error) {
              switch (e.exchangeKey) {
                case 'changelly':
                  logger.debug(
                    'getChangellyCurrencies Error: ' +
                      e.promiseRes.reason.message,
                  );
                  swapCryptoExchangesDefault.changelly.showOffer = false;
                  break;
                case 'thorswap':
                  logger.debug(
                    'getThorswapCurrencies Error: ' +
                      e.promiseRes.reason.message,
                  );
                  swapCryptoExchangesDefault.thorswap.showOffer = false;
                  break;
                default:
                  logger.debug('Error: ' + e.promiseRes.reason.message);
                  break;
              }
            }
          } else if (e.promiseRes.status === 'fulfilled') {
            switch (e.exchangeKey) {
              case 'changelly':
                swapCryptoExchangesDefault.changelly.supportedCoins = e
                  .promiseRes.value as SwapCryptoCoin[];
                break;
              case 'thorswap':
                swapCryptoExchangesDefault.thorswap.supportedCoins = e
                  .promiseRes.value as SwapCryptoCoin[];
                break;
              default:
                break;
            }

            allSupportedCoins = [
              ...allSupportedCoins,
              ...((e.promiseRes.value as SwapCryptoCoin[]) || []),
            ];
          }
        });
        if (allSupportedCoins.length > 0) {
          const coinsToRemove =
            !locationData || locationData.countryShortCode === 'US'
              ? ['xrp']
              : [];
          coinsToRemove.push('busd');

          if (coinsToRemove.length > 0) {
            logger.debug(
              `Removing ${JSON.stringify(
                coinsToRemove,
              )} from Swap supported coins`,
            );
            allSupportedCoins = allSupportedCoins.filter(
              supportedCoin =>
                !coinsToRemove.includes(supportedCoin.currencyAbbreviation),
            );
          }

          allSupportedCoins = _.uniqBy(allSupportedCoins, 'symbol');
        }

        // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
        const orderedArray = SupportedCurrencyOptions.map(currency =>
          currency.chain
            ? getCurrencyAbbreviation(
                currency.currencyAbbreviation,
                currency.chain,
              )
            : currency.currencyAbbreviation,
        );
        let allSupportedCoinsOrdered = orderBy(
          allSupportedCoins,
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

        if (allSupportedCoinsOrdered?.length > 0) {
          setSwapCryptoSupportedCoinsFrom(allSupportedCoinsOrdered);
        } else {
          const reason =
            'Swap crypto getCurrencies Error: allSupportedCoins array is empty';
          logger.error(reason);
          const msg = t(
            'Swap Crypto feature is not available at this moment. Please try again later.',
          );
          hideOngoingProcess();
          await sleep(500);
          showError({msg, reason, goBack: true, fireAnalytics: true});
        }
      }
    } catch (err) {
      const reason = 'Swap crypto getCurrencies catch Error';
      logger.error('Swap crypto getCurrencies Error: ' + JSON.stringify(err));
      const msg = t(
        'Swap Crypto feature is not available at this moment. Please try again later.',
      );
      hideOngoingProcess();
      await sleep(500);
      showError({msg, reason, goBack: true, fireAnalytics: true});
    }
  };

  const onDismiss = async (
    toWallet?: Wallet,
    createToWalletData?: AddWalletData,
  ) => {
    hideModal('toWalletSelector');
    if (toWallet?.currencyAbbreviation) {
      setToWallet(toWallet);
    } else if (createToWalletData && isTSSKey(createToWalletData.key)) {
      await dispatch(
        showBottomNotificationModal(
          CustomErrorMessage({
            errMsg: t(
              'You cannot add new wallets to a TSS wallet key. To create another wallet, please start a new TSS wallet setup.',
            ),
            title: t('TSS Wallet Limitation'),
          }),
        ),
      );
    } else if (createToWalletData) {
      try {
        if (createToWalletData.key?.isPrivKeyEncrypted) {
          if (
            !(
              createToWalletData.currency?.isToken &&
              createToWalletData.associatedWallet
            )
          ) {
            logger.debug('Key is Encrypted. Trying to decrypt...');
            await sleep(500);
            const password = await dispatch(
              getDecryptPassword(createToWalletData.key),
            );
            createToWalletData.options.password = password;
          } else {
            logger.debug(
              'Key is Encrypted, but not necessary for tokens. Trying to create wallet...',
            );
          }
        }

        await sleep(500);
        showOngoingProcess('ADDING_WALLET');

        const createdToWallet = await dispatch(addWallet(createToWalletData));
        logger.debug(
          `Added ${createdToWallet?.currencyAbbreviation} wallet from Swap Crypto`,
        );
        dispatch(
          Analytics.track('Created Basic Wallet', {
            coin: createToWalletData.currency.currencyAbbreviation,
            chain: createToWalletData.currency.chain,
            isErc20Token: createToWalletData.currency.isToken,
            context: 'swapCrypto',
          }),
        );
        setToWallet(createdToWallet);
        await sleep(300);
        hideOngoingProcess();
      } catch (err: any) {
        hideOngoingProcess();
        await sleep(500);
        if (err.message === 'invalid password') {
          dispatch(showBottomNotificationModal(WrongPasswordError()));
        } else {
          showError({msg: err.message});
        }
      }
    }
  };

  const paymentTimeControl = (expires: string): void => {
    const expirationTime = Math.floor(new Date(expires).getTime() / 1000);
    setPaymentExpired(false);
    setExpirationTime(expirationTime);

    // Clear any previous interval
    if (countDownRef.current) {
      clearInterval(countDownRef.current);
    }
    countDownRef.current = setInterval(() => {
      setExpirationTime(expirationTime);
    }, 1000);
  };

  const setExpirationTime = (expirationTime: number): void => {
    if (!fromWalletSelected || !toWalletSelected) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);

    if (now > expirationTime) {
      setPaymentExpired(true);
      setRemainingTimeStr('Expired');
      if (countDownRef.current) {
        clearInterval(countDownRef.current);
        countDownRef.current = null;
      }
      dispatch(
        Analytics.track('Failed Crypto Swap', {
          exchange: 'changelly',
          context: 'SwapCryptoRoot - ChangellyCheckout',
          reasonForFailure: 'Time to make the payment expired',
          amountFrom: amountFrom || '',
          fromCoin:
            fromWalletSelected.currencyAbbreviation?.toLowerCase() || '',
          fromChain: fromWalletSelected.chain?.toLowerCase() || '',
          toCoin: toWalletSelected.currencyAbbreviation?.toLowerCase() || '',
          toChain: toWalletSelected.chain?.toLowerCase() || '',
        }),
      );
      return;
    }

    const totalSecs = expirationTime - now;
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    setRemainingTimeStr(('0' + m).slice(-2) + ':' + ('0' + s).slice(-2));
  };

  const createChangellyTransaction = async () => {
    if (
      !fromWalletSelected ||
      !toWalletSelected ||
      !amountFrom ||
      !selectedOffer
    ) {
      return;
    }

    dispatch(
      Analytics.track('Requested Swap Crypto', {
        exchange: 'changelly',
        amountFrom: amountFrom,
        amountTo: selectedOffer.amountReceiving || '',
        coinFrom: fromWalletSelected.currencyAbbreviation?.toLowerCase() || '',
        chainFrom: fromWalletSelected.chain?.toLowerCase() || '',
        coinTo: toWalletSelected.currencyAbbreviation?.toLowerCase() || '',
        chainTo: toWalletSelected.chain?.toLowerCase() || '',
      }),
    );

    try {
      await createFixTransaction(1);
    } catch (err) {
      logger.error(
        'Create Changelly Transaction Error: ' + JSON.stringify(err),
      );
      const msg = t(
        'There was an error while creating the exchange transaction. Please try again later.',
      );
      showError({msg});
    }
  };

  const createFixTransaction = async (tries: number, fixedRateId?: string) => {
    if (
      !fromWalletSelected ||
      !toWalletSelected ||
      !amountFrom ||
      !selectedOffer
    ) {
      return;
    }

    const _fixedRateId =
      fixedRateId ?? (selectedOffer.quoteData as ChangellyRateResult)?.id;

    try {
      addressFrom = (await dispatch<any>(
        createWalletAddress({wallet: fromWalletSelected, newAddress: false}),
      )) as string;
      addressTo = (await dispatch<any>(
        createWalletAddress({wallet: toWalletSelected, newAddress: false}),
      )) as string;
    } catch (err) {
      console.error(err);
      hideOngoingProcess();
      await sleep(400);
      return;
    }

    if (
      fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch' &&
      fromWalletSelected.chain.toLowerCase() === 'bch'
    ) {
      addressFrom = dispatch(
        GetProtocolPrefixAddress(
          fromWalletSelected.currencyAbbreviation,
          fromWalletSelected.network,
          addressFrom,
          fromWalletSelected.chain,
        ),
      );
    }

    const createFixTxData = {
      amountFrom: amountFrom,
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation.toLowerCase(),
        fromWalletSelected.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation.toLowerCase(),
        toWalletSelected.chain,
      ),
      addressTo: cloneDeep(addressTo),
      refundAddress: cloneDeep(addressFrom),
      fixedRateId: cloneDeep(_fixedRateId),
    };

    try {
      const data = await changellyCreateFixTransaction(
        fromWalletSelected,
        createFixTxData,
      );
      if (data.error) {
        logger.error(
          'Changelly createFixTransaction Error: ' + data.error.message,
        );

        if (data.error.message.includes("Can't exchange this currencies")) {
          const msg = t(
            "Can't exchange this currencies, please try again later.",
          );
          const reason = `Can't exchange this currencies error. Trying to exchange from ${fromWalletSelected.currencyAbbreviation.toLowerCase()}_${
            fromWalletSelected.chain
          } to ${toWalletSelected.currencyAbbreviation.toLowerCase()}_${
            toWalletSelected.chain
          }`;
          showError({msg, reason, goBack: true, fireAnalytics: true});
        } else if (
          Math.abs(data.error.code) === 32602 ||
          Math.abs(data.error.code) === 32603
        ) {
          logger.debug(
            'Changelly rateId was expired or already used. Generating a new one',
          );
          if (tries < 2) {
            changellyUpdateReceivingAmount(tries);
          } else {
            const msg = t(
              'Failed to create transaction for Changelly, please try again later.',
            );
            const reason = 'Rate expired or already used';
            showError({msg, reason, goBack: true, fireAnalytics: true});
          }
        } else {
          const reason = 'createFixTransaction Error';
          showError({
            msg: data.error.message,
            reason,
            goBack: true,
            fireAnalytics: true,
          });
        }
        return;
      }

      let changellyFee = 0;
      let apiExtraFee = 0;
      let totalExchangeFee = 0;
      let totalExchangeFeeFiat: string | undefined;

      if (data.result.changellyFee && data.result.apiExtraFee) {
        changellyFee = Number(data.result.changellyFee);
        apiExtraFee = Number(data.result.apiExtraFee);
      } else {
        try {
          const transactionData = await changellyGetTransactions(
            data.result.id,
          );
          if (transactionData.result[0]) {
            if (Number(transactionData.result[0].changellyFee) > 0) {
              changellyFee = Number(transactionData.result[0].changellyFee);
            }
            if (Number(transactionData.result[0].apiExtraFee) > 0) {
              apiExtraFee = Number(transactionData.result[0].apiExtraFee);
            }
          }
        } catch (e) {
          logger.warn(
            `Error getting transactionData with id: ${data.result.id}`,
          );
        }
      }

      if (changellyFee >= 0 && apiExtraFee >= 0) {
        // changellyFee and apiExtraFee (Bitpay fee) are in percents
        const receivingPercentage = 100 - changellyFee - apiExtraFee;
        let exchangeFee =
          (changellyFee * data.result.amountExpectedTo) / receivingPercentage;
        let bitpayFee =
          (apiExtraFee * data.result.amountExpectedTo) / receivingPercentage;
        totalExchangeFee = exchangeFee + bitpayFee;
        logger.debug(
          `Changelly fee: ${exchangeFee} - BitPay fee: ${bitpayFee} - Total fee: ${
            exchangeFee + bitpayFee
          }`,
        );
      }

      if (
        fromWalletSelected.currencyAbbreviation.toLowerCase() === 'bch' &&
        fromWalletSelected.chain.toLowerCase() === 'bch'
      ) {
        payinAddress = BWC.getBitcoreCash()
          .Address(data.result.payinAddress)
          .toString(true);
      } else {
        payinAddress = data.result.payinAddress;
      }

      payinExtraId = data.result.payinExtraId
        ? data.result.payinExtraId
        : undefined; // (destinationTag) Used for coins like: XRP, XLM, EOS, IGNIS, BNB, XMR, ARDOR, DCT, XEM
      setExchangeTxId(data.result.id);
      // setAmountExpectedFrom(Number(data.result.amountExpectedFrom));
      setAmountFrom(Number(data.result.amountExpectedFrom));
      setAmountTo(Number(data.result.amountExpectedTo));
      selectedOffer.amountReceiving = Number(data.result.amountExpectedTo)
        .toFixed(4)
        .replace(/\.?0+$/, '');

      const precisionTo = dispatch(
        GetPrecision(
          toWalletSelected.currencyAbbreviation,
          toWalletSelected.chain,
          toWalletSelected.tokenAddress,
        ),
      );
      if (precisionTo) {
        selectedOffer.amountReceivingFiat = formatFiatAmount(
          dispatch(
            toFiat(
              Number(data.result.amountExpectedTo) * precisionTo.unitToSatoshi,
              defaultAltCurrency.isoCode,
              toWalletSelected.currencyAbbreviation,
              toWalletSelected.chain,
              rates,
              toWalletSelected.tokenAddress,
            ),
          ),
          defaultAltCurrency.isoCode,
          {
            currencyDisplay:
              defaultAltCurrency.isoCode === 'USD' ? 'symbol' : 'code',
          },
        );

        try {
          if (totalExchangeFee >= 0) {
            totalExchangeFeeFiat = formatFiatAmount(
              dispatch(
                toFiat(
                  totalExchangeFee * precisionTo.unitToSatoshi,
                  defaultAltCurrency.isoCode,
                  toWalletSelected.currencyAbbreviation,
                  toWalletSelected.chain,
                  rates,
                  toWalletSelected.tokenAddress,
                ),
              ),
              defaultAltCurrency.isoCode,
              {
                currencyDisplay:
                  defaultAltCurrency.isoCode === 'USD' ? 'symbol' : 'code',
              },
            );
          }
        } catch (err) {
          logger.error('toFiat Error for totalExchangeFeeFiat');
          // continue anyways
        }
      }
      status = data.result.status;

      paymentTimeControl(data.result.payTill);
      const expirationTime = data.result.payTill;

      const precision = dispatch(
        GetPrecision(
          fromWalletSelected.currencyAbbreviation,
          fromWalletSelected.chain,
          fromWalletSelected.tokenAddress,
        ),
      );
      // To Sat
      const depositSat = Number(
        (amountFrom * precision!.unitToSatoshi).toFixed(0),
      );

      try {
        const ctxp = await createTx(
          fromWalletSelected,
          payinAddress,
          depositSat,
          payinExtraId,
        );
        setCtxp(ctxp);
        const minerFee = ctxp.fee;
        let minerFeeFiat: string | undefined;

        try {
          if (minerFee >= 0) {
            minerFeeFiat = formatFiatAmount(
              dispatch(
                toFiat(
                  minerFee,
                  defaultAltCurrency.isoCode,
                  BitpaySupportedCoins[fromWalletSelected.chain]?.feeCurrency,
                  fromWalletSelected.chain,
                  rates,
                  undefined,
                ),
              ),
              defaultAltCurrency.isoCode,
              {
                currencyDisplay:
                  defaultAltCurrency.isoCode === 'USD' ? 'symbol' : 'code',
              },
            );
          }
        } catch (err) {
          logger.error('toFiat Error for minerFee');
          // continue anyways
        }

        const _txData = {
          addressFrom,
          addressTo,
          payinExtraId,
          status,
          payinAddress,
          totalExchangeFee,
          totalExchangeFeeFiat,
          minerFee,
          minerFeeFiat,
          expirationTime,
        };
        setTxData(_txData);

        setLoadingCreateTx(false);
        hideOngoingProcess();
        await sleep(400);

        if (useSendMax) {
          showSendMaxWarning(
            ctxp.coin,
            ctxp.chain,
            fromWalletSelected.tokenAddress,
          );
        }
        return;
      } catch (err: any) {
        const reason = 'createTx Error';
        if (err.code) {
          showError({
            title: err.title,
            msg: err.message,
            reason,
            errorMsgLog: err.code,
            actions: err.actions,
            goBack: true,
            fireAnalytics: true,
          });
          return;
        }

        let msg = t('Error creating transaction');
        let errorMsgLog;

        if (typeof err === 'string') {
          msg = msg + `: ${err}`;
          errorMsgLog = err;
        } else if (typeof err?.message === 'string') {
          msg = msg + `: ${err.message}`;
          errorMsgLog = err.message;
        }

        showError({
          msg,
          reason,
          errorMsgLog,
          goBack: true,
          fireAnalytics: true,
        });
        return;
      }
    } catch (err) {
      const reason = 'createFixTransaction Catch Error';
      logger.error(
        'Changelly createFixTransaction Error: ' + JSON.stringify(err),
      );
      const msg = t(
        'Changelly is not available at this moment. Please try again later.',
      );
      showError({msg, reason, goBack: true, fireAnalytics: true});
      return;
    }
  };

  const createTx = async (
    wallet: Wallet,
    payinAddress: string,
    depositSat: number,
    destTag?: string,
  ): Promise<TransactionProposal> => {
    if (!fromWalletSelected || !toWalletSelected) {
      return Promise.reject(
        'createTx: fromWalletSelected or toWalletSelected is undefined',
      );
    }
    try {
      const message =
        fromWalletSelected.currencyAbbreviation.toUpperCase() +
        ' ' +
        t('to') +
        ' ' +
        toWalletSelected.currencyAbbreviation.toUpperCase();
      let outputs = [];

      outputs.push({
        toAddress: payinAddress,
        amount: depositSat,
        message: message,
      });

      let txp: Partial<TransactionProposal> = {
        toAddress: payinAddress,
        amount: depositSat,
        chain: wallet.chain,
        outputs,
        message: message,
        excludeUnconfirmedUtxos: true, // Do not use unconfirmed UTXOs
        customData: {
          changelly: payinAddress,
          service: 'changelly',
        },
      };

      if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
        if (wallet.tokenAddress) {
          txp.tokenAddress = wallet.tokenAddress;
          if (IsEVMChain(txp.chain!)) {
            if (txp.outputs) {
              for (const output of txp.outputs) {
                if (output.amount) {
                  output.amount = parseAmountToStringIfBN(output.amount);
                }
                if (!output.data) {
                  output.data = BWC.getCore()
                    .Transactions.get({chain: getCWCChain(wallet.chain)})
                    .encodeData({
                      recipients: [
                        {address: output.toAddress, amount: output.amount},
                      ],
                      tokenAddress: wallet.tokenAddress,
                    });
                }
              }
            }
          } else if (IsSVMChain(txp.chain!)) {
            const receiveAddressSolanaTokens: SolanaTokenData[] =
              await getSolanaATAs(wallet?.receiveAddress!, wallet?.network);

            let ataReceiveAddress: SolanaTokenData | undefined;
            if (receiveAddressSolanaTokens) {
              ataReceiveAddress = receiveAddressSolanaTokens.find(
                (item: SolanaTokenData) => {
                  return item.mintAddress === txp.tokenAddress;
                },
              );
            }

            if (ataReceiveAddress) {
              txp.fromAta = ataReceiveAddress.ataAddress;
              txp.decimals = ataReceiveAddress.decimals;
            } else {
              const _ataReceiveAddress =
                await getOrCreateAssociatedTokenAddress({
                  mint: txp.tokenAddress,
                  feePayer: wallet?.receiveAddress!,
                });
              txp.fromAta = _ataReceiveAddress;
              logger.debug(
                `Using ATA Address from getOrCreateAssociatedTokenAddress: ${_ataReceiveAddress}`,
              );
            }

            if (txp.outputs) {
              const payinAddressSolanaTokens: SolanaTokenData[] =
                await getSolanaATAs(payinAddress, wallet?.network);

              let ataPayinAddress: string | undefined;
              if (payinAddressSolanaTokens) {
                ataPayinAddress = payinAddressSolanaTokens.find(
                  (item: SolanaTokenData) => {
                    return item.mintAddress === txp.tokenAddress;
                  },
                )?.ataAddress;
              }

              if (!ataPayinAddress) {
                ataPayinAddress = await getOrCreateAssociatedTokenAddress({
                  mint: txp.tokenAddress,
                  feePayer: payinAddress,
                });
                setAtaOwnerAddress(payinAddress);
                logger.debug(
                  `Using ATA PayinAddress from getOrCreateAssociatedTokenAddress: ${ataPayinAddress}`,
                );
              }

              for (const output of txp.outputs) {
                if (output.toAddress === payinAddress) {
                  output.toAddress = ataPayinAddress;
                }
              }
            }
          }
        }
      }
      if (useSendMax && sendMaxInfo) {
        txp.inputs = sendMaxInfo.inputs;
        txp.fee = sendMaxInfo.fee;
        txp.feePerKb = undefined;
      } else {
        if (['btc', 'eth', 'matic'].includes(wallet.chain)) {
          txp.feeLevel = 'priority';
        } // Avoid expired order due to slow TX confirmation
      }

      if (destTag) {
        txp.destinationTag = Number(destTag);
      }

      const ctxp = await dispatch(createTxProposal(wallet, txp));
      return Promise.resolve(ctxp);
    } catch (err: any) {
      const errStr =
        err instanceof Error
          ? err.message
          : err?.err?.message ?? JSON.stringify(err);
      const log = `changellyCheckout createTxProposal error: ${errStr}`;
      logger.error(log);
      const errorMessageConfig = await dispatch(
        handleCreateTxProposalError(err, undefined, 'swap'),
      );
      return Promise.reject(errorMessageConfig);
    }
  };

  const showSendMaxWarning = async (
    coin: string,
    chain: string,
    tokenAddress: string | undefined,
  ) => {
    if (!sendMaxInfo || !coin) {
      return;
    }

    const warningMsg = dispatch(
      GetExcludedUtxosMessage(coin, chain, tokenAddress, sendMaxInfo),
    );
    const fee = dispatch(SatToUnit(sendMaxInfo.fee, coin, chain, tokenAddress));

    const msg =
      `Because you are sending the maximum amount contained in this wallet, the ${
        dispatch(GetName(chain, chain)) || cloneDeep(chain).toUpperCase()
      } miner fee (${fee} ${coin.toUpperCase()}) will be deducted from the total.` +
      `\n${warningMsg}`;

    await sleep(400);
    dispatch(
      showBottomNotificationModal({
        type: 'warning',
        title: 'Miner Fee Notice',
        message: msg,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'OK',
            action: async () => {
              dispatch(dismissBottomNotificationModal());
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const changellyUpdateReceivingAmount = async (tries: number) => {
    logger.debug(`changellyUpdateReceivingAmount. tries: ${tries}`);
    if (
      !fromWalletSelected ||
      !toWalletSelected ||
      !amountFrom ||
      !selectedOffer
    ) {
      return;
    }
    const fixRateForAmountData = {
      amountFrom: amountFrom,
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation.toLowerCase(),
        fromWalletSelected.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation.toLowerCase(),
        toWalletSelected.chain,
      ),
    };

    try {
      const data = await changellyGetFixRateForAmount(
        fromWalletSelected,
        fixRateForAmountData,
      );
      if (data.error) {
        const msg =
          t('Changelly getFixRateForAmount Error: ') + data.error.message;
        const reason = 'getFixRateForAmount Error';
        showError({msg, reason, goBack: true, fireAnalytics: true});
        return;
      }
      const fixedRateId = data.result[0].id;
      setAmountTo(Number(data.result[0].amountTo));
      selectedOffer.amountReceiving = Number(data.result[0].amountTo)
        .toFixed(4)
        .replace(/\.?0+$/, '');

      const precisionTo = dispatch(
        GetPrecision(
          toWalletSelected.currencyAbbreviation,
          toWalletSelected.chain,
          toWalletSelected.tokenAddress,
        ),
      );
      if (precisionTo) {
        selectedOffer.amountReceivingFiat = formatFiatAmount(
          dispatch(
            toFiat(
              Number(data.result[0].amountTo) * precisionTo.unitToSatoshi,
              defaultAltCurrency.isoCode,
              toWalletSelected.currencyAbbreviation,
              toWalletSelected.chain,
              rates,
              toWalletSelected.tokenAddress,
            ),
          ),
          defaultAltCurrency.isoCode,
          {
            currencyDisplay:
              defaultAltCurrency.isoCode === 'USD' ? 'symbol' : 'code',
          },
        );
      }

      await createFixTransaction(++tries, fixedRateId);
    } catch (err) {
      logger.error(JSON.stringify(err));
      let msg = t(
        'Changelly is not available at this moment. Please try again later.',
      );
      const reason = 'getFixRateForAmount Error';
      showError({msg, reason, goBack: true, fireAnalytics: true});
    }
  };

  const makePayment = async ({transport}: {transport?: Transport}) => {
    if (!fromWalletSelected || !ctxp) {
      throw new Error(`No necessary data to make the payment`);
    }

    const key = keys[fromWalletSelected.keyId];
    const isUsingHardwareWallet = !!transport;

    if (isTSSWallet) {
      if (!key.isPrivKeyEncrypted) setShowTSSProgressModal(true);
      setTssStatus('initializing');
    }

    try {
      if (isUsingHardwareWallet) {
        const {chain, network} = fromWalletSelected.credentials;
        const configFn = currencyConfigs[chain];
        if (!configFn) {
          throw new Error(`Unsupported currency: ${chain.toUpperCase()}`);
        }
        const params = configFn(network as Network);
        await prepareLedgerApp(
          params.appName,
          transportRef,
          setHardwareWalletTransport,
          onDisconnect,
          setPromptOpenAppState,
        );
        setConfirmHardwareState('sending');
        await sleep(500);
        await dispatch(
          publishAndSign({
            txp: ctxp! as TransactionProposal,
            key,
            wallet: fromWalletSelected,
            transport,
            ataOwnerAddress,
          }),
        );
        setConfirmHardwareState('complete');
        await sleep(1000);
        setConfirmHardwareWalletVisible(false);
      } else {
        const broadcastedTx = await dispatch(
          publishAndSign({
            txp: ctxp! as TransactionProposal,
            key,
            wallet: fromWalletSelected,
            ataOwnerAddress,
            ...(isTSSWallet && {tssCallbacks}),
            ...(isTSSWallet && {setShowTSSProgressModal}),
          }),
        );

        if (isTSSWallet && broadcastedTx?.txid) {
          setTssStatus('complete');
          await sleep(1500);
          setShowTSSProgressModal(false);
        }
      }
      saveChangellyTx();

      showPaymentSent({
        onCloseModal,
        title:
          fromWalletSelected?.credentials?.n > 1
            ? t('Payment Sent')
            : t('Payment Accepted'),
      });

      await sleep(1200);
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            {
              name: RootStacks.TABS,
              params: {screen: TabsScreens.HOME},
            },
            {
              name: ExternalServicesSettingsScreens.CHANGELLY_SETTINGS,
            },
          ],
        }),
      );
    } catch (err: any) {
      if (isTSSWallet) {
        setShowTSSProgressModal(false);
      }

      if (isUsingHardwareWallet) {
        setConfirmHardwareWalletVisible(false);
        setConfirmHardwareState(null);
        err = getLedgerErrorMessage(err);
      }
      await sleep(500);
      setResetSwipeButton(true);
      switch (err) {
        case 'invalid password':
          dispatch(showBottomNotificationModal(WrongPasswordError()));
          break;
        case 'password canceled':
          break;
        case 'biometric check failed':
          break;
        case 'user denied transaction':
          break;
        default:
          logger.error(JSON.stringify(err));
          let msg = t('Uh oh, something went wrong. Please try again later');
          const reason = 'publishAndSign Error';
          let errorMsgLog: string | undefined;
          if (typeof err === 'string') {
            errorMsgLog = err;
            msg = `${msg}.\n${BWCErrorMessage(err)}`;
          } else if (typeof err?.message === 'string') {
            errorMsgLog = err.message;
            msg = `${msg}.\n${BWCErrorMessage(err)}`;
          }
          showError({
            msg,
            reason,
            errorMsgLog,
            goBack: true,
            fireAnalytics: true,
          });
      }
    }
  };

  const onCloseModal = async () => {
    hidePaymentSent();
  };

  // on hardware wallet disconnect, just clear the cached transport object
  // errors will be thrown and caught as needed in their respective workflows
  const disconnectFn = () => setHardwareWalletTransport(null);
  const disconnectFnRef = useRef(disconnectFn);
  disconnectFnRef.current = disconnectFn;

  const onHardwareWalletPaired = (args: {transport: Transport}) => {
    const {transport} = args;

    transport.on('disconnect', disconnectFnRef.current);

    setHardwareWalletTransport(transport);
    makePayment({transport});
  };

  const onSwipeComplete = async () => {
    try {
      logger.debug('Swipe completed. Making payment...');
      const key = keys[fromWalletSelected!.keyId];
      if (key.hardwareSource) {
        await onSwipeCompleteHardwareWallet(key);
      } else {
        await makePayment({});
      }
    } catch (err) {
      logger.error('onSwipeComplete Error: ' + JSON.stringify(err));
    }
  };

  const onSwipeCompleteHardwareWallet = async (key: Key) => {
    if (key.hardwareSource === 'ledger') {
      if (hardwareWalletTransport) {
        setConfirmHardwareWalletVisible(true);
        await makePayment({transport: hardwareWalletTransport});
      } else {
        setConfirmHardwareWalletVisible(true);
      }
    } else {
      const msg = t('Uh oh, something went wrong. Please try again later');
      const reason = 'Unsupported hardware wallet';
      showError({msg, reason, goBack: true, fireAnalytics: true});
    }
  };

  const saveChangellyTx = () => {
    if (!toWalletSelected || !fromWalletSelected) {
      logger.error(
        'saveChangellyTx: toWalletSelected or fromWalletSelected is undefined',
      );
      return;
    }
    if (!txData || !selectedOffer) {
      logger.error('saveChangellyTx: txData is undefined');
      return;
    }
    const newData: changellyTxData = {
      exchangeTxId: exchangeTxId!,
      date: Date.now(),
      amountTo: amountTo!,
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
      chainTo: toWalletSelected.chain.toLowerCase(),
      addressTo: txData.addressTo,
      walletIdTo: toWalletSelected.id,
      amountFrom: amountFrom!,
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
      chainFrom: fromWalletSelected.chain.toLowerCase(),
      refundAddress: txData.addressFrom,
      payinAddress: txData.payinAddress,
      payinExtraId: txData.payinExtraId,
      totalExchangeFee: txData.totalExchangeFee!,
      status: txData.status,
      isTSSWallet: isTSSWallet,
    };

    dispatch(
      SwapCryptoActions.successTxChangelly({
        changellyTxData: newData,
      }),
    );

    logger.debug('Saved swap with: ' + JSON.stringify(newData));

    dispatch(
      Analytics.track('Successful Crypto Swap', {
        fromCoin: fromWalletSelected.currencyAbbreviation,
        fromChain: fromWalletSelected.chain || '',
        toCoin: toWalletSelected.currencyAbbreviation,
        toChain: toWalletSelected.chain || '',
        amountFrom: amountFrom,
        exchange: 'changelly',
      }),
    );
  };

  useEffect(() => {
    init();

    return () => {
      if (countDownRef.current) {
        clearInterval(countDownRef.current);
        countDownRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (swapCryptoSupportedCoinsFrom) {
      setSelectedWallet(swapCryptoSupportedCoinsFrom);
    }
  }, [swapCryptoSupportedCoinsFrom]);

  useEffect(() => {
    setIsTSSWallet(
      fromWalletSelected ? isTSSKey(keys[fromWalletSelected.keyId]) : false,
    );
  }, [fromWalletSelected]);

  useEffect(() => {
    swapGetLimits();
  }, [fromWalletSelected, toWalletSelected]);

  useEffect(() => {
    if (selectedOffer) {
      if (countDownRef.current) {
        clearInterval(countDownRef.current);
        countDownRef.current = null;
      }
      setLoadingCreateTx(true);
      logger.debug(`${selectedOffer.key} offer selected. Creating Tx...`);
      switch (selectedOffer.key) {
        case 'changelly':
          createChangellyTransaction();
          return;

        case 'thorswap':
          return;
      }
    }
  }, [selectedOffer]);

  useEffect(() => {
    if (!resetSwipeButton) {
      return;
    }
    const timer = setTimeout(() => {
      setResetSwipeButton(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [resetSwipeButton]);

  return (
    <>
      <SwapCryptoContainer>
        <ScrollView ref={scrollViewRef}>
          <SwapCryptoCard style={{marginTop: 8}}>
            <SwapCardHeaderContainer
              noMargin={
                !fromWalletSelected ||
                (!IsVMChain(fromWalletSelected.chain) && !toWalletSelected)
              }>
              <SwapCardHeaderTitle>{t('From')}</SwapCardHeaderTitle>
              {fromWalletSelected && IsVMChain(fromWalletSelected.chain) ? (
                <SwapCardAccountChainsContainer>
                  {loadingWalletFromStatus ? (
                    <SelectedOptionCol>
                      <SwapCryptoLoadingWalletSkeleton />
                    </SelectedOptionCol>
                  ) : (
                    <>
                      <Blockie
                        size={12}
                        seed={fromWalletSelected.receiveAddress}
                      />
                      <SwapCardAccountText
                        ellipsizeMode="tail"
                        numberOfLines={1}
                        style={{flexShrink: 1, marginLeft: 6}}>
                        {getEVMAccountName(fromWalletSelected, keys)
                          ? getEVMAccountName(fromWalletSelected, keys)
                          : `${
                              IsSVMChain(fromWalletSelected.chain)
                                ? 'Solana Account'
                                : 'EVM Account'
                            }${
                              Number(fromWalletSelected.credentials.account) ===
                              0
                                ? ''
                                : ` (${fromWalletSelected.credentials.account})`
                            }`}
                      </SwapCardAccountText>
                    </>
                  )}
                </SwapCardAccountChainsContainer>
              ) : null}
            </SwapCardHeaderContainer>
            <SwapCardAmountAndWalletContainer>
              <WalletSelector
                style={
                  !fromWalletSelected && !loadingWalletFromStatus
                    ? {backgroundColor: Action}
                    : {}
                }
                disabled={swapCryptoSupportedCoinsFrom?.length === 0}
                key={
                  swapCryptoSupportedCoinsFrom?.length === 0
                    ? 'swapFromEnabled'
                    : 'swapFromDisabled'
                }
                onPress={() => {
                  showModal('fromWalletSelector');
                }}>
                <WalletSelectorLeft>
                  {loadingWalletFromStatus ? (
                    <SelectedOptionCol>
                      <SwapCryptoLoadingWalletSkeleton />
                    </SelectedOptionCol>
                  ) : (
                    <>
                      {fromWalletSelected ? (
                        <>
                          <CurrencyImage
                            img={fromWalletSelected.img}
                            badgeUri={getBadgeImg(
                              getCurrencyAbbreviation(
                                fromWalletSelected.currencyAbbreviation,
                                fromWalletSelected.chain,
                              ),
                              fromWalletSelected.chain,
                            )}
                            size={20}
                          />
                          <WalletSelectorName
                            ellipsizeMode="tail"
                            numberOfLines={1}>
                            {fromWalletSelected.walletName
                              ? fromWalletSelected.walletName
                              : fromWalletSelected.currencyName}
                          </WalletSelectorName>
                        </>
                      ) : (
                        <WalletSelectorName
                          ellipsizeMode="tail"
                          numberOfLines={1}
                          style={{fontWeight: '500', color: White}}>
                          {t('Choose Wallet')}
                        </WalletSelectorName>
                      )}
                    </>
                  )}
                </WalletSelectorLeft>
                <WalletSelectorRight>
                  {loadingWalletFromStatus ? null : (
                    <ArrowContainer style={{marginRight: 10, marginLeft: 5}}>
                      <SelectorArrowRight
                        {...{
                          width: 7,
                          height: 11,
                          color: fromWalletSelected
                            ? theme.dark
                              ? Slate
                              : SlateDark
                            : White,
                        }}
                      />
                    </ArrowContainer>
                  )}
                </WalletSelectorRight>
              </WalletSelector>
              {toWalletSelected && fromWalletSelected ? (
                <>
                  {loadingEnterAmountBtn ? (
                    <SpinnerContainer style={{height: 40}}>
                      <ActivityIndicator color={ProgressBlue} />
                    </SpinnerContainer>
                  ) : (
                    <>
                      {!loadingWalletFromStatus ? (
                        <AmountClickableContainer
                          onPress={() => {
                            showModal('amount');
                          }}>
                          {displayInFiat ? (
                            <AmountText
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              textLength={
                                !amountFrom || amountFrom === 0
                                  ? formatFiatAmount(
                                      0,
                                      defaultAltCurrency.isoCode,
                                    )?.length
                                  : formatedAmountFrom?.length
                              }>
                              {!amountFrom || amountFrom === 0
                                ? formatFiatAmount(
                                    0,
                                    defaultAltCurrency.isoCode,
                                  )
                                : formatedAmountFrom}
                            </AmountText>
                          ) : (
                            <AmountText
                              numberOfLines={1}
                              ellipsizeMode="tail"
                              textLength={
                                !amountFrom || amountFrom === 0
                                  ? 4
                                  : cloneDeep(amountFrom)
                                      .toFixed(6)
                                      .replace(/\.?0+$/, '')?.length
                              }>
                              {!amountFrom || amountFrom === 0
                                ? '0'
                                : cloneDeep(amountFrom)
                                    .toFixed(6)
                                    .replace(/\.?0+$/, '')}
                            </AmountText>
                          )}
                        </AmountClickableContainer>
                      ) : (
                        <View />
                      )}
                    </>
                  )}
                </>
              ) : (
                <View />
              )}
            </SwapCardAmountAndWalletContainer>
            {fromWalletSelected ? (
              <SwapCardBottomRowContainer>
                <>
                  <SelectedOptionCol justifyContent="left">
                    {fromWalletSelected?.balance?.cryptoSpendable ? (
                      !loadingWalletFromStatus ? (
                        <>
                          <WalletBalanceContainer>
                            <SwapWalletBalanceSvg />
                          </WalletBalanceContainer>
                          <BalanceContainer>
                            <BottomDataText>
                              {/* TODO: cut the cryptoSpendable to limit the decimals that are displayed */}
                              {fromWalletSelected.balance.cryptoSpendable}{' '}
                              {fromWalletSelected.currencyAbbreviation.toUpperCase()}{' '}
                            </BottomDataText>
                            {fromWalletSelected.balance.cryptoSpendable !==
                            fromWalletSelected.balance.crypto ? (
                              <TouchableOpacity
                                onPress={() => {
                                  logger.debug('Balance info clicked');
                                  openWalletBalanceModal();
                                }}
                                style={{marginRight: 8}}>
                                <InfoSvg width={20} height={20} />
                              </TouchableOpacity>
                            ) : null}
                          </BalanceContainer>
                        </>
                      ) : (
                        <SwapCryptoBalanceSkeleton />
                      )
                    ) : null}
                  </SelectedOptionCol>
                </>
                <>
                  <SelectedOptionCol justifyContent="right">
                    {fromWalletSelected &&
                    !loadingWalletFromStatus &&
                    toWalletSelected ? (
                      <>
                        {displayInFiat ? (
                          <DataText
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            style={{
                              marginRight: 8,
                            }}>
                            {!amountFrom || amountFrom === 0
                              ? '0.00' +
                                ` ${fromWalletSelected.currencyAbbreviation.toUpperCase()}`
                              : cloneDeep(amountFrom)
                                  .toFixed(6)
                                  .replace(/\.?0+$/, '') +
                                ` ${fromWalletSelected.currencyAbbreviation.toUpperCase()}`}
                          </DataText>
                        ) : (
                          <DataText
                            style={{
                              marginRight: 8,
                            }}>
                            {!amountFrom || amountFrom === 0
                              ? formatFiatAmount(0, defaultAltCurrency.isoCode)
                              : formatedAmountFrom}
                          </DataText>
                        )}
                      </>
                    ) : null}
                    {fromWalletSelected &&
                    !loadingWalletFromStatus &&
                    toWalletSelected ? (
                      <SwapCurrenciesButton
                        onPress={() => {
                          setDisplayInFiat(!displayInFiat);
                        }}>
                        <SwapCryptoFiatSwitcherIcon width={24} height={24} />
                      </SwapCurrenciesButton>
                    ) : null}
                  </SelectedOptionCol>
                </>
              </SwapCardBottomRowContainer>
            ) : null}
          </SwapCryptoCard>

          <ArrowBoxContainer>
            <ArrowBox>
              <ArrowDown fill={theme.dark ? LinkBlue : Action} />
            </ArrowBox>
          </ArrowBoxContainer>

          <SwapCryptoCard style={{marginTop: 0}}>
            <SwapCardHeaderContainer
              noMargin={
                !toWalletSelected ||
                (!IsVMChain(toWalletSelected.chain) && !selectedOffer)
              }>
              <SwapCardHeaderTitle
                style={{opacity: !fromWalletSelected ? 0.2 : 1}}>
                {t('To')}
              </SwapCardHeaderTitle>
              {toWalletSelected && IsVMChain(toWalletSelected.chain) ? (
                <SwapCardAccountChainsContainer>
                  <Blockie size={12} seed={toWalletSelected.receiveAddress} />
                  <SwapCardAccountText
                    ellipsizeMode="tail"
                    numberOfLines={1}
                    style={{flexShrink: 1, marginLeft: 6}}>
                    {getEVMAccountName(toWalletSelected, keys)
                      ? getEVMAccountName(toWalletSelected, keys)
                      : `${
                          IsSVMChain(toWalletSelected.chain)
                            ? 'Solana Account'
                            : 'EVM Account'
                        }${
                          Number(toWalletSelected.credentials.account) === 0
                            ? ''
                            : ` (${toWalletSelected.credentials.account})`
                        }`}
                  </SwapCardAccountText>
                </SwapCardAccountChainsContainer>
              ) : null}
            </SwapCardHeaderContainer>
            <SwapCardAmountAndWalletContainer>
              <WalletSelector
                style={
                  !toWalletSelected
                    ? {
                        backgroundColor: Action,
                        opacity: fromWalletSelected ? 1 : 0.2,
                      }
                    : {}
                }
                key={fromWalletSelected ? 'swapToEnabled' : 'swapToDisabled'}
                onPress={() => {
                  if (useDefaultToWallet || !fromWalletSelected) {
                    return;
                  }
                  showModal('toWalletSelector');
                }}>
                <WalletSelectorLeft>
                  {toWalletSelected ? (
                    <>
                      <CurrencyImage
                        img={toWalletSelected.img}
                        badgeUri={getBadgeImg(
                          getCurrencyAbbreviation(
                            toWalletSelected.currencyAbbreviation,
                            toWalletSelected.chain,
                          ),
                          toWalletSelected.chain,
                        )}
                        size={20}
                      />
                      <WalletSelectorName
                        ellipsizeMode="tail"
                        numberOfLines={1}>
                        {toWalletSelected.walletName
                          ? toWalletSelected.walletName
                          : toWalletSelected.currencyName}
                      </WalletSelectorName>
                    </>
                  ) : (
                    <WalletSelectorName
                      ellipsizeMode="tail"
                      numberOfLines={1}
                      style={{fontWeight: '500', color: White}}>
                      {t('Choose Crypto')}
                    </WalletSelectorName>
                  )}
                </WalletSelectorLeft>
                <WalletSelectorRight>
                  {loadingWalletFromStatus ||
                  (selectedWallet &&
                    !selectedWallet?.balance?.satSpendable) ? null : (
                    <ArrowContainer style={{marginRight: 10, marginLeft: 5}}>
                      <SelectorArrowRight
                        {...{
                          width: 7,
                          height: 11,
                          color: toWalletSelected
                            ? theme.dark
                              ? Slate
                              : SlateDark
                            : White,
                        }}
                      />
                    </ArrowContainer>
                  )}
                </WalletSelectorRight>
              </WalletSelector>
              {toWalletSelected ? (
                offersLoading ||
                // Next line is a workaround
                // The `getQuote` received amount from changelly is not exactly the same as the amount after `createFixTransaction`. This prevents an exchange of amounts between when the quote is obtained and when the transaction is successfully created.
                (selectedOffer?.key === 'changelly' &&
                  (loadingCreateTx || !txData)) ? (
                  <SpinnerContainer style={{height: 40}}>
                    <ActivityIndicator color={ProgressBlue} />
                  </SpinnerContainer>
                ) : displayInFiat ? (
                  <>
                    {selectedOffer?.amountReceivingFiat ? (
                      <AmountText
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        textLength={selectedOffer.amountReceivingFiat?.length}>
                        {selectedOffer.amountReceivingFiat}
                      </AmountText>
                    ) : (
                      <AmountText
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        textLength={
                          formatFiatAmount(0, defaultAltCurrency.isoCode)
                            ?.length
                        }>
                        {formatFiatAmount(0, defaultAltCurrency.isoCode)}
                      </AmountText>
                    )}
                  </>
                ) : (
                  <>
                    {selectedOffer ? (
                      <AmountClickableContainer onPress={() => {}}>
                        {selectedOffer.amountReceiving ? (
                          <AmountText
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            textLength={selectedOffer.amountReceiving?.length}>
                            {selectedOffer.amountReceiving || 0}
                          </AmountText>
                        ) : null}
                      </AmountClickableContainer>
                    ) : (
                      <View>
                        <AmountText
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          textLength={4}>
                          {'0'}
                        </AmountText>
                      </View>
                    )}
                  </>
                )
              ) : (
                <View />
              )}
            </SwapCardAmountAndWalletContainer>
            {toWalletSelected ? (
              <SwapCardBottomRowContainer>
                <>
                  <SelectedOptionCol justifyContent="left">
                    {toWalletSelected?.balance?.cryptoSpendable &&
                    !loadingWalletFromStatus ? (
                      <>
                        <WalletBalanceContainer>
                          <SwapWalletBalanceSvg />
                        </WalletBalanceContainer>
                        <BalanceContainer>
                          <BottomDataText>
                            {/* TODO: cut the cryptoSpendable to limit the decimals that are displayed */}
                            {toWalletSelected.balance.cryptoSpendable}{' '}
                            {toWalletSelected.currencyAbbreviation.toUpperCase()}{' '}
                          </BottomDataText>
                        </BalanceContainer>
                      </>
                    ) : null}
                  </SelectedOptionCol>
                </>
                <>
                  <SelectedOptionCol justifyContent="right">
                    {offersLoading ||
                    // Next line is a workaround
                    (selectedOffer?.key === 'changelly' &&
                      (loadingCreateTx || !txData)) ? (
                      <SwapCryptoTxDataSkeleton />
                    ) : (
                      <>
                        {displayInFiat ? (
                          <>
                            {selectedOffer ? (
                              <>
                                {selectedOffer?.amountReceiving ? (
                                  <DataText
                                    numberOfLines={1}
                                    ellipsizeMode="tail">
                                    {selectedOffer?.amountReceiving +
                                      ` ${toWalletSelected.currencyAbbreviation.toUpperCase()}`}
                                  </DataText>
                                ) : null}
                              </>
                            ) : (
                              <DataText numberOfLines={1} ellipsizeMode="tail">
                                {'0.00' +
                                  ` ${toWalletSelected.currencyAbbreviation.toUpperCase()}`}
                              </DataText>
                            )}
                          </>
                        ) : (
                          <>
                            {selectedOffer?.amountReceivingFiat ? (
                              <DataText>
                                {selectedOffer.amountReceivingFiat}
                              </DataText>
                            ) : (
                              <DataText numberOfLines={1} ellipsizeMode="tail">
                                {formatFiatAmount(
                                  0,
                                  defaultAltCurrency.isoCode,
                                )}
                              </DataText>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </SelectedOptionCol>
                </>
              </SwapCardBottomRowContainer>
            ) : null}
            {!rateData?.amountTo && loading && (
              <SpinnerContainer>
                <ActivityIndicator color={ProgressBlue} />
              </SpinnerContainer>
            )}
          </SwapCryptoCard>

          {fromWalletSelected &&
          toWalletSelected &&
          isTSSWallet &&
          amountFrom ? (
            <TSSProgressTracker
              status={tssStatus}
              progress={tssProgress}
              createdBy={fromWalletSelected?.walletName || 'You'}
              date={new Date()}
              wallet={fromWalletSelected}
              copayers={tssCopayers}
              onCopayersInitialized={setTssCopayers}
              isModalVisible={showTSSProgressModal}
              onModalVisibilityChange={setShowTSSProgressModal}
              context={'swapCrypto'}
            />
          ) : null}

          <OfferContainer>
            {fromWalletSelected &&
            toWalletSelected &&
            amountFrom &&
            confirmedAmountFrom ? (
              <OfferSelectorContainer isSmallScreen={_isSmallScreen}>
                <SwapCryptoOfferSelector
                  amountFrom={confirmedAmountFrom}
                  coinFrom={fromWalletSelected.currencyAbbreviation}
                  chainFrom={fromWalletSelected.chain}
                  coinTo={toWalletSelected.currencyAbbreviation}
                  chainTo={toWalletSelected.chain}
                  selectedWalletFrom={fromWalletSelected}
                  selectedWalletTo={toWalletSelected}
                  swapCryptoConfig={swapCryptoConfig}
                  // country={country ?? 'US'}
                  preSetPartner={preSetPartner}
                  preLoadPartnersData={swapCryptoExchangesDefault}
                  useSendMax={useSendMax}
                  sendMaxInfo={sendMaxInfo}
                  onSelectOffer={setSelectedOffer}
                  setOffersLoading={setOffersLoading}
                  // getWarnMsg={getWarnMsg}
                  swapLimits={swapLimits}
                />
                {fromWalletSelected && toWalletSelected ? (
                  <>
                    <ItemDivisor />
                    <OfferSelectorItemRow>
                      <OfferSelectorContainerLeft>
                        <OfferSelectorText>
                          {t('Network Fee')}
                        </OfferSelectorText>
                      </OfferSelectorContainerLeft>
                      <OfferSelectorContainerRight>
                        {txData && !loadingCreateTx && !offersLoading ? (
                          <OfferSelectorText style={{textAlign: 'right'}}>
                            {displayInFiat && txData.minerFeeFiat ? (
                              <>{txData.minerFeeFiat}</>
                            ) : (
                              <>
                                {dispatch(
                                  FormatAmountStr(
                                    // @ts-ignore
                                    BitpaySupportedCoins[
                                      fromWalletSelected.chain
                                    ]?.feeCurrency,
                                    fromWalletSelected.chain,
                                    undefined,
                                    txData.minerFee,
                                  ),
                                )}
                              </>
                            )}
                          </OfferSelectorText>
                        ) : (
                          <SwapCryptoTxDataSkeleton />
                        )}
                      </OfferSelectorContainerRight>
                    </OfferSelectorItemRow>
                    <ItemDivisor />
                    <OfferSelectorItemRow>
                      <OfferSelectorContainerLeft>
                        <OfferSelectorText>
                          {t('Exchange Fee')}
                        </OfferSelectorText>
                      </OfferSelectorContainerLeft>
                      <OfferSelectorContainerRight>
                        {txData && !loadingCreateTx && !offersLoading ? (
                          <OfferSelectorText style={{textAlign: 'right'}}>
                            {displayInFiat && txData.totalExchangeFeeFiat ? (
                              <>{txData.totalExchangeFeeFiat}</>
                            ) : (
                              <>
                                {Number(txData.totalExchangeFee).toFixed(6)}{' '}
                                {toWalletSelected.currencyAbbreviation.toUpperCase()}
                              </>
                            )}
                          </OfferSelectorText>
                        ) : (
                          <SwapCryptoTxDataSkeleton />
                        )}
                      </OfferSelectorContainerRight>
                    </OfferSelectorItemRow>
                    <ItemDivisor />
                    <OfferSelectorItemRow>
                      <OfferSelectorContainerLeft>
                        <OfferSelectorText>{t('Expires')}</OfferSelectorText>
                      </OfferSelectorContainerLeft>
                      <OfferSelectorContainerRight>
                        {txData &&
                        !loadingCreateTx &&
                        !offersLoading &&
                        !!remainingTimeStr ? (
                          <OfferSelectorText
                            style={{
                              textAlign: 'right',
                              color: paymentExpired
                                ? Caution
                                : theme.dark
                                ? Slate30
                                : SlateDark,
                            }}>
                            {remainingTimeStr}
                          </OfferSelectorText>
                        ) : (
                          <SwapCryptoTxDataSkeleton />
                        )}
                      </OfferSelectorContainerRight>
                    </OfferSelectorItemRow>
                  </>
                ) : null}
              </OfferSelectorContainer>
            ) : null}
          </OfferContainer>

          {selectedOffer?.key === 'changelly' ? (
            <>
              {!termsAccepted && showCheckTermsMsg ? (
                <RowLabel style={{color: Caution, marginLeft: 15}}>
                  {t('Tap the checkbox to accept and continue.')}
                </RowLabel>
              ) : null}
              <SwapCheckBoxContainer>
                <Checkbox
                  radio={false}
                  onPress={() => {
                    setTermsAccepted(prevTermsAccepted => {
                      const nextTermsAccepted = !prevTermsAccepted;
                      setShowCheckTermsMsg(!nextTermsAccepted);
                      return nextTermsAccepted;
                    });
                  }}
                  checked={termsAccepted}
                />
                <CheckBoxTextContainer>
                  <SwapCheckboxText>
                    {t(
                      'I acknowledge completion of my transaction may be subject to AML/KYC verification by Changelly. Review Changelly policies ',
                    )}
                    <PoliciesText
                      onPress={() => setChangellyPoliciesModalVisible(true)}>
                      {t('here')}
                    </PoliciesText>
                    .
                  </SwapCheckboxText>
                </CheckBoxTextContainer>
              </SwapCheckBoxContainer>
            </>
          ) : null}
        </ScrollView>

        {fromWalletSelected &&
        keys[fromWalletSelected.keyId]?.hardwareSource ? (
          <ConfirmHardwareWalletModal
            isVisible={isConfirmHardwareWalletModalVisible}
            state={confirmHardwareState}
            hardwareSource={keys[fromWalletSelected.keyId].hardwareSource!}
            transport={hardwareWalletTransport}
            currencyLabel={BitpaySupportedCoins[fromWalletSelected.chain]?.name}
            onBackdropPress={() => {
              setConfirmHardwareWalletVisible(false);
              setResetSwipeButton(true);
              setConfirmHardwareState(null);
            }}
            onPaired={onHardwareWalletPaired}
          />
        ) : null}

        {!paymentExpired ? (
          <>
            {!canContinue ? (
              <TouchableOpacity
                onPress={() => {
                  scrollViewRef?.current?.scrollToEnd({animated: true});
                  setShowCheckTermsMsg(true);
                }}>
                <SwipeButton
                  title={'Slide to swap'}
                  disabled={true}
                  onSwipeComplete={() => {}}
                />
              </TouchableOpacity>
            ) : (
              <SwipeButton
                title={'Slide to swap'}
                disabled={false}
                onSwipeComplete={onSwipeComplete}
                forceReset={resetSwipeButton}
              />
            )}
          </>
        ) : null}

        <ChangellyPoliciesModal
          isVisible={changellyPoliciesModalVisible}
          onDismiss={() => {
            setChangellyPoliciesModalVisible(false);
          }}
        />
      </SwapCryptoContainer>

      {uiFormattedWallet ? (
        <BalanceDetailsModal
          isVisible={balanceDetailsModalVisible}
          closeModal={() => setBalanceDetailsModalVisible(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}

      <FromWalletSelectorModal
        route={route}
        navigation={navigation as any}
        isVisible={fromWalletSelectorModalVisible}
        customSupportedCurrencies={
          useDefaultToWallet && toWalletSelected
            ? swapCryptoSupportedCoinsFrom?.filter(
                coin =>
                  coin.symbol !==
                  getExternalServiceSymbol(
                    toWalletSelected.currencyAbbreviation,
                    toWalletSelected.chain,
                  ),
              )
            : swapCryptoSupportedCoinsFrom
        }
        livenetOnly={true}
        modalContext={'swapFrom'}
        modalTitle={t('Crypto to Swap')}
        onDismiss={(fromWallet: Wallet) => {
          hideModal('fromWalletSelector');
          if (fromWallet?.currencyAbbreviation) {
            setFromWallet(fromWallet);
          }
        }}
      />

      <SheetModal
        modalLibrary="bottom-sheet"
        isVisible={toWalletSelectorModalVisible}
        onBackdropPress={() => onDismiss()}
        fullscreen>
        <GlobalSelectContainer>
          <GlobalSelect
            route={route}
            navigation={navigation as any}
            modalContext={'swapTo'}
            livenetOnly={true}
            useAsModal={true}
            modalTitle={t('Swap To')}
            customToSelectCurrencies={swapCryptoSupportedCoinsTo}
            globalSelectOnDismiss={onDismiss}
          />
        </GlobalSelectContainer>
      </SheetModal>

      <BottomAmountModal
        amountEnteredIsFiat={displayInFiat}
        isVisible={amountModalVisible}
        modalTitle={t('Swap Amount')}
        context={'swapCrypto'}
        limitsOpts={{
          maxWalletAmount:
            // @ts-ignore
            fromWalletSelected?.balance?.cryptoSpendable?.replaceAll(',', ''),
          limits: swapLimits,
        }}
        cryptoCurrencyAbbreviation={fromWalletSelected?.currencyAbbreviation.toUpperCase()}
        tokenAddress={fromWalletSelected?.tokenAddress}
        chain={fromWalletSelected?.chain}
        initialAmount={amountFrom}
        onAmountChange={handleAmountChange}
        onBackdropPress={handleOnBackdropPress}
        pillsOpts={{
          selectedValue: selectedPillValue,
          onPillPress: async pillValue => {
            // Clean previous state related to amount when a pill is pressed
            setUseSendMax(false);
            setSendMaxInfo(undefined);
            setConfirmedAmountFrom(undefined);
            setSelectedOffer(undefined);
            setCtxp(undefined);
            setTxData(undefined);

            setSelectedPillValue(pillValue);
            if (pillValue === 'max') {
              if (!fromWalletSelected) {
                return;
              }

              setCtxp(undefined);
              setTxData(undefined);
              setSelectedOffer(undefined);

              let newAmount: number | undefined;

              if (
                IsERCToken(
                  fromWalletSelected.currencyAbbreviation,
                  fromWalletSelected.chain,
                )
              ) {
                setUseSendMax(true);
                setSendMaxInfo(undefined);
                newAmount = Number(
                  // @ts-ignore
                  fromWalletSelected.balance.cryptoSpendable.replaceAll(
                    ',',
                    '',
                  ),
                );
              } else {
                setUseSendMax(true);
                const data = await getSendMaxData();
                setSendMaxInfo(data);
                if (data?.amount) {
                  newAmount = dispatch(
                    SatToUnit(
                      data.amount,
                      fromWalletSelected.currencyAbbreviation,
                      fromWalletSelected.chain,
                      fromWalletSelected.tokenAddress,
                    ),
                  );
                }
              }

              if (newAmount) {
                handleAmountChange(newAmount, true);
              }
            }
          },
        }}
      />
    </>
  );
};

export default SwapCryptoRoot;
