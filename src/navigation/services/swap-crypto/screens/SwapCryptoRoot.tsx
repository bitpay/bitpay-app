import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, TouchableOpacity} from 'react-native';
import {useTheme, useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import cloneDeep from 'lodash.clonedeep';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {
  BitpaySupportedCoins,
  SUPPORTED_COINS,
  SUPPORTED_ETHEREUM_TOKENS,
  SUPPORTED_EVM_COINS,
  SUPPORTED_MATIC_TOKENS,
} from '../../../../constants/currencies';
import {
  Action,
  SlateDark,
  White,
  ProgressBlue,
} from '../../../../styles/colors';
import {
  CtaContainer,
  SwapCryptoCard,
  SummaryTitle,
  ArrowContainer,
  SelectorArrowContainer,
  ActionsContainer,
  SelectedOptionContainer,
  SelectedOptionText,
  SelectedOptionCol,
  CoinIconContainer,
  DataText,
  BottomDataText,
  ProviderContainer,
  ProviderLabel,
  SpinnerContainer,
  BalanceContainer,
} from '../styled/SwapCryptoRoot.styled';
import {SwapCryptoStackParamList} from '../SwapCryptoStack';
import Button from '../../../../components/button/Button';
import ChangellyLogo from '../../../../components/icons/external-services/changelly/changelly-logo';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import FromWalletSelectorModal from '../components/FromWalletSelectorModal';
import ToWalletSelectorModal from '../../components/ToWalletSelectorModal';
import AmountModal from '../../../../components/amount/AmountModal';
import {
  changellyGetPairsParams,
  changellyGetFixRateForAmount,
  ChangellyCurrency,
  getChangellyCurrenciesFixedProps,
  getChangellyFixedCurrencyAbbreviation,
} from '../utils/changelly-utils';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {
  getBadgeImg,
  getChainUsingSuffix,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {getFeeRatePerKb} from '../../../../store/wallet/effects/fee/fee';
import {Wallet, SendMaxInfo} from '../../../../store/wallet/wallet.models';
import {changellyGetCurrencies} from '../../../../store/swap-crypto/effects/changelly/changelly';
import {
  startOnGoingProcessModal,
  openUrlWithInAppBrowser,
} from '../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
} from '../../../../store/app/app.actions';
import ArrowDown from '../../../../../assets/img/services/swap-crypto/down-arrow.svg';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import InfoSvg from '../../../../../assets/img/info.svg';
import {AppActions} from '../../../../store/app';
import {useTranslation} from 'react-i18next';
import {getSendMaxInfo} from '../../../../store/wallet/effects/send/send';
import {
  GetExcludedUtxosMessage,
  SatToUnit,
} from '../../../../store/wallet/effects/amount/amount';
import {orderBy} from 'lodash';
import {
  addWallet,
  AddWalletData,
  getDecryptPassword,
} from '../../../../store/wallet/effects/create/create';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {startUpdateWalletStatus} from '../../../../store/wallet/effects/status/status';
import SwapCryptoLoadingWalletSkeleton from './SwapCryptoLoadingWalletSkeleton';
import SwapCryptoBalanceSkeleton from './SwapCryptoBalanceSkeleton';
import BalanceDetailsModal from '../../../wallet/components/BalanceDetailsModal';
import {buildUIFormattedWallet} from '../../../wallet/screens/KeyOverview';
import {
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
  SwapCryptoConfig,
} from '../../../../store/external-services/external-services.types';
import {getExternalServicesConfig} from '../../../../store/external-services/external-services.effects';
import {StackActions} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import styled from 'styled-components/native';

export interface RateData {
  fixedRateId: string;
  amountTo: number;
  rate: number;
}

export interface SwapOpts {
  maxWalletAmount?: string;
  swapLimits: SwapLimits;
}

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
  tokenAddress?: string;
}

export const getChainFromChangellyProtocol = (
  currencyAbbreviation: string,
  protocol?: string,
): string => {
  switch (protocol?.toLowerCase()) {
    case 'erc20':
      return 'eth';
    case 'matic':
      return 'matic';
    default:
      return currencyAbbreviation.toLowerCase();
  }
};

const SwapCryptoContainer = styled.SafeAreaView`
  flex: 1;
`;

let swapCryptoConfig: SwapCryptoConfig | undefined;

const SwapCryptoRoot: React.FC = () => {
  const {t} = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const locationData = useAppSelector(({LOCATION}) => LOCATION.locationData);
  const network = useAppSelector(({APP}) => APP.network);
  const user = useAppSelector(({BITPAY_ID}) => BITPAY_ID.user[network]);
  const tokenDataByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenDataByAddress,
  );
  const tokenOptionsByAddress = useAppSelector(
    ({WALLET}) => WALLET.tokenOptionsByAddress,
  );
  const tokenOptions = Object.entries(tokenOptionsByAddress).map(
    ([k, {symbol}]) => {
      const chain = getChainUsingSuffix(k);
      return getCurrencyAbbreviation(symbol.toLowerCase(), chain);
    },
  );
  const {rates} = useAppSelector(({RATE}) => RATE);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);
  const route = useRoute<RouteProp<SwapCryptoStackParamList, 'Root'>>();
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fromWalletSelectorModalVisible, setFromWalletSelectorModalVisible] =
    useState(false);
  const [toWalletSelectorModalVisible, setToWalletSelectorModalVisible] =
    useState(false);
  const [balanceDetailsModalVisible, setBalanceDetailsModalVisible] =
    useState<boolean>(false);
  const [fromWalletSelected, setFromWalletSelected] = useState<Wallet>();
  const [uiFormattedWallet, setUiFormattedWallet] = useState<any>();
  const [useDefaultToWallet, setUseDefaultToWallet] = useState<boolean>(false);
  const [toWalletSelected, setToWalletSelected] = useState<Wallet>();
  const [amountFrom, setAmountFrom] = useState<number>(0);
  const [swapCryptoSupportedCoinsFrom, setSwapCryptoSupportedCoinsFrom] =
    useState<SwapCryptoCoin[]>();
  const [swapCryptoSupportedCoinsTo, setSwapCryptoSupportedCoinsTo] = useState<
    SwapCryptoCoin[]
  >([]);
  const [rateData, setRateData] = useState<RateData>();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingEnterAmountBtn, setLoadingEnterAmountBtn] =
    useState<boolean>(false);
  const [loadingWalletFromStatus, setLoadingWalletFromStatus] =
    useState<boolean>(false);
  const [useSendMax, setUseSendMax] = useState<boolean>(false);
  const [sendMaxInfo, setSendMaxInfo] = useState<SendMaxInfo | undefined>();

  let selectedWallet = route.params?.selectedWallet;
  const SupportedEthereumTokens: string[] = SUPPORTED_ETHEREUM_TOKENS;
  const SupportedMaticTokens: string[] = SUPPORTED_MATIC_TOKENS;
  const SupportedChains: string[] = SUPPORTED_COINS;
  const [swapLimits, setSwapLimits] = useState<SwapLimits>({
    minAmount: undefined,
    maxAmount: undefined,
  });
  let minAmount: number, maxAmount: number;

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

  const canContinue = (): boolean => {
    return (
      !!toWalletSelected &&
      !!fromWalletSelected &&
      amountFrom > 0 &&
      !!rateData &&
      !!rateData.fixedRateId
    );
  };

  const setSelectedWallet = async () => {
    if (selectedWallet) {
      const key = keys[selectedWallet.keyId];
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
    dispatch(dismissOnGoingProcessModal());
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
    setUseSendMax(false);
    setSendMaxInfo(undefined);
    setLoading(false);
    setLoadingEnterAmountBtn(false);
    setRateData(undefined);

    const coinsTo = cloneDeep(swapCryptoSupportedCoinsFrom).filter(
      coin =>
        SUPPORTED_EVM_COINS.includes(coin.currencyAbbreviation) ||
        (!SUPPORTED_EVM_COINS.includes(coin.currencyAbbreviation) &&
          coin.symbol !==
            getCurrencyAbbreviation(
              fromWallet.currencyAbbreviation,
              fromWallet.chain,
            )),
    );

    setSwapCryptoSupportedCoinsTo(coinsTo);
    setFromWalletSelected(fromWallet);
    setLoadingWalletFromStatus(false);
  };

  const setToWallet = (toWallet: Wallet) => {
    setRateData(undefined);
    setToWalletSelected(toWallet);
  };

  const isToWalletEnabled = (): boolean => {
    return !!fromWalletSelected;
  };

  const updateReceivingAmount = () => {
    if (!fromWalletSelected || !toWalletSelected || !amountFrom) {
      setLoading(false);
      return;
    }

    setLoading(true);

    if (fromWalletSelected.balance?.satSpendable) {
      const spendableAmount = dispatch(
        SatToUnit(
          fromWalletSelected.balance.satSpendable,
          fromWalletSelected.currencyAbbreviation,
          fromWalletSelected.chain,
          fromWalletSelected.tokenAddress,
        ),
      );

      if (!!spendableAmount && spendableAmount < amountFrom) {
        const msg = t(
          'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals or enter a valid amount.',
        );
        showError(msg);
        setLoading(false);
        setAmountFrom(0);
        setUseSendMax(false);
        setSendMaxInfo(undefined);
        setRateData(undefined);
        return;
      }
    }

    const pair =
      getCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation,
        fromWalletSelected.chain,
      ) +
      '_' +
      getCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation,
        toWalletSelected.chain,
      );
    logger.debug('Updating receiving amount with pair: ' + pair);

    const data = {
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
    changellyGetFixRateForAmount(fromWalletSelected, data)
      .then((data: any) => {
        if (data.error) {
          const msg =
            t('Changelly getFixRateForAmount Error: ') + data.error.message;
          showError(msg);
          return;
        }

        if (data.result?.length === 0) {
          showChangellyPairDisabledError(fromWalletSelected, toWalletSelected);
          return;
        }

        const newRateData: RateData = {
          fixedRateId: data.result[0].id,
          amountTo: Number(data.result[0].amountTo),
          rate: Number(data.result[0].result), // result == rate
        };
        setRateData(newRateData);
        setLoading(false);
      })
      .catch(err => {
        logger.error(
          'Changelly getFixRateForAmount Error: ' + JSON.stringify(err),
        );
        const title = t('Changelly Error');
        const msg = t(
          'Changelly is not available at this moment. Please try again later.',
        );
        showError(msg, title);
      });
  };

  const changellyGetPairParams = () => {
    setLoadingEnterAmountBtn(true);
    setRateData(undefined);
    if (!fromWalletSelected || !toWalletSelected) {
      return;
    }

    const pair =
      getCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation,
        fromWalletSelected.chain,
      ) +
      '_' +
      getCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation,
        toWalletSelected.chain,
      );
    logger.debug('Updating max and min with pair: ' + pair);

    const data = {
      coinFrom: getChangellyFixedCurrencyAbbreviation(
        fromWalletSelected.currencyAbbreviation.toLowerCase(),
        fromWalletSelected.chain,
      ),
      coinTo: getChangellyFixedCurrencyAbbreviation(
        toWalletSelected.currencyAbbreviation.toLowerCase(),
        toWalletSelected.chain,
      ),
    };
    changellyGetPairsParams(fromWalletSelected, data)
      .then(async (data: any) => {
        if (data.error) {
          let msg: string;
          const title = t('Changelly Error');
          if (
            Math.abs(data.error.code) == 32602 &&
            data.error.message.indexOf('Invalid currency:') != -1
          ) {
            const actions = [
              {
                text: t('OK'),
                action: () => {},
                primary: true,
              },
              {
                text: t('Submit a ticket'),
                action: async () => {
                  await sleep(1000);
                  dispatch(
                    openUrlWithInAppBrowser(
                      'https://support.changelly.com/en/support/tickets/new',
                    ),
                  );
                },
                primary: true,
              },
            ];
            msg =
              data.error.message +
              '.' +
              t(
                'This is a temporary Changelly decision. If you have further questions please reach out to them.',
              );
            showError(msg, title, actions);
          } else {
            msg = t('Changelly getPairsParams Error: ') + data.error.message;
            showError(msg);
          }
          return;
        }

        if (
          data.result &&
          (data.result.length === 0 ||
            (data.result[0] &&
              (!data.result[0].maxAmountFixed ||
                Number(data.result[0].maxAmountFixed) <= 0)))
        ) {
          showChangellyPairDisabledError(fromWalletSelected, toWalletSelected);
          setLoadingEnterAmountBtn(false);
          return;
        }

        minAmount = Number(data.result[0].minAmountFixed);
        maxAmount = Number(data.result[0].maxAmountFixed);
        setSwapLimits({
          minAmount,
          maxAmount,
        });
        logger.debug(
          `Min amount: ${Number(
            data.result[0].minAmountFixed,
          )} - Max amount: ${Number(data.result[0].maxAmountFixed)}`,
        );

        setLoadingEnterAmountBtn(false);

        if (amountFrom) {
          if (amountFrom > maxAmount) {
            const msg =
              t('The amount entered is greater than the maximum allowed: ') +
              maxAmount +
              ' ' +
              fromWalletSelected.currencyAbbreviation.toUpperCase();
            const actions = [
              {
                text: t('OK'),
                action: () => {},
                primary: true,
              },
              {
                text: t('Use Max Amount'),
                action: async () => {
                  setAmountFrom(maxAmount);
                  await sleep(400);
                  // updateReceivingAmount();
                },
                primary: true,
              },
            ];

            showError(msg, undefined, actions);
            return;
          }
          if (amountFrom < minAmount) {
            if (useSendMax && sendMaxInfo) {
              let msg = '';
              if (sendMaxInfo) {
                const warningMsg = dispatch(
                  GetExcludedUtxosMessage(
                    fromWalletSelected.currencyAbbreviation,
                    fromWalletSelected.chain,
                    fromWalletSelected.tokenAddress,
                    sendMaxInfo,
                  ),
                );
                msg = warningMsg;
              }

              const estimatedFee = dispatch(
                SatToUnit(
                  sendMaxInfo.fee,
                  fromWalletSelected.currencyAbbreviation,
                  fromWalletSelected.chain,
                  fromWalletSelected.tokenAddress,
                ),
              );
              const coin =
                fromWalletSelected.currencyAbbreviation.toUpperCase();

              const ErrMsg =
                `As the estimated miner fee to complete the transaction is ${estimatedFee} ${coin}, the maximum spendable amount of your wallet is ${amountFrom} ${coin} which is lower than the minimum allowed by the exchange: ${minAmount} ${coin}.` +
                `\n${msg}`;
              showError(ErrMsg);
              return;
            } else {
              const msg =
                t('The amount entered is lower than the minimum allowed: ') +
                minAmount +
                ' ' +
                fromWalletSelected.currencyAbbreviation.toUpperCase();
              const actions = [
                {
                  text: t('OK'),
                  action: () => {},
                  primary: true,
                },
                {
                  text: t('Use Min Amount'),
                  action: async () => {
                    setAmountFrom(minAmount);
                    await sleep(400);
                  },
                  primary: true,
                },
              ];

              showError(msg, undefined, actions);
              return;
            }
          }
        }
        updateReceivingAmount();
      })
      .catch(err => {
        logger.error('Changelly getPairsParams Error: ' + JSON.stringify(err));
        const msg = t(
          'Changelly is not available at this moment. Please try again later.',
        );
        setLoadingEnterAmountBtn(false);
        showError(msg);
      });
  };

  const showChangellyPairDisabledError = (
    fromWallet: Wallet,
    toWallet: Wallet,
  ) => {
    const title = t('Changelly Error');
    const actions = [
      {
        text: t('OK'),
        action: () => {},
        primary: true,
      },
      {
        text: t('Submit a ticket'),
        action: async () => {
          await sleep(1000);
          dispatch(
            openUrlWithInAppBrowser(
              'https://support.changelly.com/en/support/tickets/new',
            ),
          );
        },
        primary: true,
      },
    ];
    const msg = t(
      'Changelly has temporarily disabled - pair. If you have further questions please reach out to them.',
      {
        fromWalletSelected: `${fromWallet.currencyAbbreviation.toUpperCase()}(${fromWallet.chain.toUpperCase()})`,
        toWalletSelected: `${toWallet.currencyAbbreviation.toUpperCase()}(${toWallet.chain.toUpperCase()})`,
      },
    );
    showError(msg, title, actions);
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

  const showError = async (
    msg?: string,
    title?: string,
    actions?: any,
    goBack?: boolean,
  ) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    setLoading(false);
    setLoadingEnterAmountBtn(false);
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
      Analytics.track('Requested Swap Crypto', {
        fromCoin: fromWalletSelected!.currencyAbbreviation,
        fromChain: fromWalletSelected!.chain,
        toCoin: toWalletSelected!.currencyAbbreviation,
        toChain: toWalletSelected!.chain,
        amountFrom: amountFrom,
        exchange: 'changelly',
      }),
    );
    navigation.navigate('SwapCrypto', {
      screen: 'ChangellyCheckout',
      params: {
        fromWalletSelected: fromWalletSelected!,
        toWalletSelected: toWalletSelected!,
        fixedRateId: rateData!.fixedRateId,
        amountFrom: amountFrom,
        useSendMax: IsERCToken(
          fromWalletSelected!.currencyAbbreviation,
          fromWalletSelected!.chain,
        )
          ? false
          : useSendMax,
        sendMaxInfo: sendMaxInfo,
      },
    });
  };

  const filterChangellyCurrenciesConditions = (
    currency: ChangellyCurrency,
  ): boolean => {
    // TODO: accept all Changelly supported tokens => If no wallets: create a custom token wallet
    const allSupportedTokens: string[] = [
      ...tokenOptions,
      ...SupportedEthereumTokens,
      ...SupportedMaticTokens,
    ];
    return (
      currency.enabled &&
      currency.fixRateEnabled &&
      !!currency.protocol &&
      [...SupportedChains, 'erc20', 'matic'].includes(
        currency.protocol.toLowerCase(),
      ) &&
      (currency.ticker === 'maticpolygon' ||
        (['erc20', 'matic'].includes(currency.protocol.toLowerCase())
          ? allSupportedTokens.includes(
              getCurrencyAbbreviation(
                currency.name,
                getChainFromChangellyProtocol(currency.name, currency.protocol),
              ),
            )
          : true))
    );
  };

  const getChangellyCurrencies = async () => {
    const changellyCurrenciesData = await changellyGetCurrencies(true);

    if (changellyCurrenciesData?.result?.length) {
      const getLogoUri = (_currencyAbbreviation: string, _chain: string) => {
        const foundToken = Object.values(tokenDataByAddress).find(
          token =>
            token.coin === _currencyAbbreviation && token.chain === _chain,
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
              contractAddress,
            }: {
              name: string;
              fullName: string;
              protocol?: string;
              contractAddress?: string;
            }) => {
              const chain = getChainFromChangellyProtocol(name, protocol);
              return {
                currencyAbbreviation: name.toLowerCase(),
                symbol: getCurrencyAbbreviation(name, chain),
                name: fullName,
                chain,
                protocol,
                logoUri: getLogoUri(name.toLowerCase(), chain),
                tokenAddress: contractAddress,
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

      if (supportedCoins.length === 0) {
        const msg = t(
          'Our partner Changelly is not currently available. Please try again later.',
        );
        showError(msg, undefined, undefined, true);
      }

      if (selectedWallet?.chain && selectedWallet?.currencyAbbreviation) {
        const selectedWalletSymbol = getCurrencyAbbreviation(
          selectedWallet!.currencyAbbreviation,
          selectedWallet!.chain,
        );
        const isSelectedWalletSymbolEnabled = supportedCoins.find(
          supportedCoin => supportedCoin.symbol === selectedWalletSymbol,
        );
        if (!isSelectedWalletSymbolEnabled) {
          logger.error(
            `Changelly has temporarily disabled fixed-rates swaps for ${selectedWalletSymbol}`,
          );
          const actions = [
            {
              text: t('OK'),
              action: () => {
                navigation.goBack();
              },
              primary: true,
            },
            {
              text: t('Submit a ticket'),
              action: async () => {
                await sleep(1000);
                dispatch(
                  openUrlWithInAppBrowser(
                    'https://support.changelly.com/en/support/tickets/new',
                  ),
                );
                navigation.goBack();
              },
              primary: true,
            },
          ];
          const selectedCoin = cloneDeep(
            selectedWallet.currencyAbbreviation,
          ).toUpperCase();
          const selectedChain = cloneDeep(selectedWallet.chain).toUpperCase();
          const title = t('Changelly Error');
          const msg = t(
            'Changelly has temporarily disabled fixed-rate swaps for the selected wallet (selectedCoin-selectedChain). If you have further questions please reach out to them.',
            {
              selectedCoin,
              selectedChain,
            },
          );
          selectedWallet = undefined;
          showError(msg, title, actions, true);
          return;
        }
      }

      const coinsToRemove =
        !locationData || locationData.countryShortCode === 'US' ? ['xrp'] : [];
      coinsToRemove.push('busd');
      if (selectedWallet?.balance?.satSpendable === 0) {
        coinsToRemove.push(selectedWallet.currencyAbbreviation.toLowerCase());
      }
      if (coinsToRemove.length > 0) {
        logger.debug(
          `Removing ${JSON.stringify(
            coinsToRemove,
          )} from Changelly supported coins`,
        );
        supportedCoins = supportedCoins.filter(
          supportedCoin =>
            !coinsToRemove.includes(supportedCoin.currencyAbbreviation),
        );
      }

      setSwapCryptoSupportedCoinsFrom(supportedCoins);
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
    dispatch(startOnGoingProcessModal('GENERAL_AWAITING'));

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
      dispatch(dismissOnGoingProcessModal());
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

    try {
      await Promise.all([getChangellyCurrencies(), sleep(400)]);
    } catch (err) {
      logger.error('Changelly getCurrencies Error: ' + JSON.stringify(err));
      const msg = t(
        'Changelly is not available at this moment. Please try again later.',
      );
      dispatch(dismissOnGoingProcessModal());
      await sleep(200);
      showError(msg);
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (swapCryptoSupportedCoinsFrom) {
      setSelectedWallet();
    }
  }, [swapCryptoSupportedCoinsFrom]);

  useEffect(() => {
    changellyGetPairParams();
  }, [fromWalletSelected, toWalletSelected]);

  useEffect(() => {
    updateReceivingAmount();
  }, [amountFrom]);

  return (
    <>
      <SwapCryptoContainer>
        <ScrollView>
          <SwapCryptoCard>
            <SummaryTitle>{t('From')}</SummaryTitle>
            {!fromWalletSelected && !loadingWalletFromStatus && (
              <ActionsContainer>
                <SelectedOptionContainer
                  style={{backgroundColor: Action}}
                  disabled={swapCryptoSupportedCoinsFrom?.length === 0}
                  onPress={() => {
                    showModal('fromWalletSelector');
                  }}>
                  <SelectedOptionText
                    style={{color: White}}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}>
                    {t('Select Wallet')}
                  </SelectedOptionText>
                  <SelectorArrowContainer>
                    <SelectorArrowDown
                      {...{width: 13, height: 13, color: White}}
                    />
                  </SelectorArrowContainer>
                </SelectedOptionContainer>
              </ActionsContainer>
            )}
            {(fromWalletSelected || loadingWalletFromStatus) && (
              <>
                <ActionsContainer>
                  <SelectedOptionContainer
                    style={{minWidth: 120}}
                    onPress={() => {
                      showModal('fromWalletSelector');
                    }}>
                    {fromWalletSelected && !loadingWalletFromStatus ? (
                      <SelectedOptionCol>
                        <CoinIconContainer>
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
                        </CoinIconContainer>
                        <SelectedOptionText
                          numberOfLines={1}
                          ellipsizeMode={'tail'}>
                          {fromWalletSelected.walletName
                            ? fromWalletSelected.walletName
                            : fromWalletSelected.currencyName}
                        </SelectedOptionText>
                      </SelectedOptionCol>
                    ) : (
                      <SelectedOptionCol>
                        <SwapCryptoLoadingWalletSkeleton />
                      </SelectedOptionCol>
                    )}
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

                  {toWalletSelected ? (
                    <>
                      {loadingEnterAmountBtn ? (
                        <SpinnerContainer>
                          <ActivityIndicator color={ProgressBlue} />
                        </SpinnerContainer>
                      ) : (
                        <>
                          {!(amountFrom && amountFrom > 0) && !useSendMax ? (
                            <SelectedOptionContainer
                              style={{backgroundColor: Action}}
                              disabled={false}
                              onPress={() => {
                                showModal('amount');
                              }}>
                              <SelectedOptionCol>
                                <SelectedOptionText
                                  style={{color: White}}
                                  numberOfLines={1}
                                  ellipsizeMode={'tail'}>
                                  {t('Enter Amount')}
                                </SelectedOptionText>
                              </SelectedOptionCol>
                            </SelectedOptionContainer>
                          ) : (
                            <SelectedOptionCol>
                              <TouchableOpacity
                                onPress={() => {
                                  showModal('amount');
                                }}>
                                {useSendMax ? (
                                  <DataText style={{fontSize: 14}}>
                                    {t('Maximum Amount')}
                                  </DataText>
                                ) : (
                                  <DataText>
                                    {amountFrom && amountFrom > 0
                                      ? amountFrom
                                      : '0.00'}
                                  </DataText>
                                )}
                              </TouchableOpacity>
                            </SelectedOptionCol>
                          )}
                        </>
                      )}
                    </>
                  ) : null}
                </ActionsContainer>
                {fromWalletSelected?.balance?.cryptoSpendable &&
                !loadingWalletFromStatus ? (
                  <BalanceContainer style={{marginTop: 14}}>
                    <BottomDataText>
                      {fromWalletSelected.balance.cryptoSpendable}{' '}
                      {fromWalletSelected.currencyAbbreviation.toUpperCase()}{' '}
                      {t('available to swap')}
                    </BottomDataText>
                    {fromWalletSelected.balance.cryptoSpendable !==
                    fromWalletSelected.balance.crypto ? (
                      <TouchableOpacity
                        onPress={() => {
                          logger.debug('Balance info clicked');
                          openWalletBalanceModal();
                        }}
                        style={{marginLeft: 8}}>
                        <InfoSvg width={20} height={20} />
                      </TouchableOpacity>
                    ) : null}
                  </BalanceContainer>
                ) : null}

                {loadingWalletFromStatus && <SwapCryptoBalanceSkeleton />}
              </>
            )}
          </SwapCryptoCard>

          <ArrowContainer>
            <ArrowDown />
          </ArrowContainer>

          <SwapCryptoCard>
            <SummaryTitle>{t('To')}</SummaryTitle>
            {!toWalletSelected && (
              <ActionsContainer>
                <SelectedOptionContainer
                  style={{backgroundColor: Action}}
                  disabled={!isToWalletEnabled()}
                  onPress={() => {
                    if (!isToWalletEnabled()) {
                      return;
                    }
                    showModal('toWalletSelector');
                  }}>
                  <SelectedOptionText
                    style={{color: White}}
                    numberOfLines={1}
                    ellipsizeMode={'tail'}>
                    {t('Select Crypto')}
                  </SelectedOptionText>
                  <SelectorArrowContainer>
                    <SelectorArrowDown
                      {...{width: 13, height: 13, color: White}}
                    />
                  </SelectorArrowContainer>
                </SelectedOptionContainer>
              </ActionsContainer>
            )}
            {toWalletSelected && (
              <>
                <ActionsContainer>
                  <SelectedOptionContainer
                    style={{minWidth: 120}}
                    onPress={() => {
                      if (useDefaultToWallet || !isToWalletEnabled()) {
                        return;
                      }
                      showModal('toWalletSelector');
                    }}>
                    <SelectedOptionCol>
                      <CoinIconContainer>
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
                      </CoinIconContainer>
                      <SelectedOptionText
                        numberOfLines={1}
                        ellipsizeMode={'tail'}>
                        {toWalletSelected.walletName
                          ? toWalletSelected.walletName
                          : toWalletSelected.currencyName}
                      </SelectedOptionText>
                    </SelectedOptionCol>
                    {!useDefaultToWallet && (
                      <ArrowContainer>
                        <SelectorArrowDown
                          {...{
                            width: 13,
                            height: 13,
                            color: theme.dark ? White : SlateDark,
                          }}
                        />
                      </ArrowContainer>
                    )}
                  </SelectedOptionContainer>
                  {rateData?.amountTo && !loading && (
                    <SelectedOptionCol>
                      <DataText>{rateData?.amountTo}</DataText>
                    </SelectedOptionCol>
                  )}
                  {!rateData?.amountTo && loading && (
                    <SpinnerContainer>
                      <ActivityIndicator color={ProgressBlue} />
                    </SpinnerContainer>
                  )}
                </ActionsContainer>
                {rateData?.rate && (
                  <ActionsContainer style={{marginTop: 14}} alignEnd={true}>
                    <BottomDataText>
                      1 {fromWalletSelected?.currencyAbbreviation.toUpperCase()}{' '}
                      ~ {rateData?.rate}{' '}
                      {toWalletSelected?.currencyAbbreviation.toUpperCase()}
                    </BottomDataText>
                  </ActionsContainer>
                )}
              </>
            )}
          </SwapCryptoCard>

          <CtaContainer>
            <Button
              buttonStyle={'primary'}
              disabled={!canContinue()}
              onPress={() => {
                checkIfErc20Token();
              }}>
              {t('Continue')}
            </Button>
          </CtaContainer>
          <ProviderContainer>
            <ProviderLabel>{t('Provided By')}</ProviderLabel>
            <ChangellyLogo width={100} height={30} />
          </ProviderContainer>
        </ScrollView>
      </SwapCryptoContainer>

      {uiFormattedWallet ? (
        <BalanceDetailsModal
          isVisible={balanceDetailsModalVisible}
          closeModal={() => setBalanceDetailsModalVisible(false)}
          wallet={uiFormattedWallet}
        />
      ) : null}

      <FromWalletSelectorModal
        isVisible={fromWalletSelectorModalVisible}
        customSupportedCurrencies={swapCryptoSupportedCoinsFrom}
        livenetOnly={true}
        modalContext={'send'}
        modalTitle={t('Swap From')}
        onDismiss={(fromWallet: Wallet) => {
          hideModal('fromWalletSelector');
          if (fromWallet?.currencyAbbreviation) {
            setFromWallet(fromWallet);
          }
        }}
      />

      <ToWalletSelectorModal
        isVisible={toWalletSelectorModalVisible}
        modalContext={'swapCrypto'}
        // disabledChain to prevent show chain selected as source, but show the available tokens
        disabledChain={
          fromWalletSelected
            ? getCurrencyAbbreviation(
                fromWalletSelected.currencyAbbreviation,
                fromWalletSelected.chain,
              )
            : undefined
        }
        customSupportedCurrencies={swapCryptoSupportedCoinsTo}
        livenetOnly={true}
        modalTitle={t('Swap To')}
        onDismiss={async (
          toWallet?: Wallet,
          createToWalletData?: AddWalletData,
        ) => {
          hideModal('toWalletSelector');
          if (toWallet?.currencyAbbreviation) {
            setToWallet(toWallet);
          } else if (createToWalletData) {
            try {
              if (createToWalletData.key.isPrivKeyEncrypted) {
                logger.debug('Key is Encrypted. Trying to decrypt...');
                await sleep(500);
                const password = await dispatch(
                  getDecryptPassword(createToWalletData.key),
                );
                createToWalletData.options.password = password;
              }

              await sleep(500);
              await dispatch(startOnGoingProcessModal('ADDING_WALLET'));

              const createdToWallet = await dispatch(
                addWallet(createToWalletData),
              );
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
              dispatch(dismissOnGoingProcessModal());
            } catch (err: any) {
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              if (err.message === 'invalid password') {
                dispatch(showBottomNotificationModal(WrongPasswordError()));
              } else {
                showError(err.message);
              }
            }
          }
        }}
      />

      <AmountModal
        isVisible={amountModalVisible}
        modalTitle={t('Swap Amount')}
        swapOpts={{
          maxWalletAmount:
            // @ts-ignore
            fromWalletSelected?.balance?.cryptoSpendable?.replaceAll(',', ''),
          swapLimits,
        }}
        cryptoCurrencyAbbreviation={fromWalletSelected?.currencyAbbreviation.toUpperCase()}
        tokenAddress={fromWalletSelected?.tokenAddress}
        chain={fromWalletSelected?.chain}
        onClose={() => hideModal('amount')}
        onSubmit={newAmount => {
          hideModal('amount');
          setUseSendMax(false);
          setSendMaxInfo(undefined);
          setAmountFrom(newAmount);
        }}
        onSendMaxPressed={async () => {
          hideModal('amount');

          if (!fromWalletSelected) {
            return;
          }

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
              fromWalletSelected.balance.cryptoSpendable.replaceAll(',', ''),
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
            setAmountFrom(newAmount);
          }
        }}
      />
    </>
  );
};

export default SwapCryptoRoot;
