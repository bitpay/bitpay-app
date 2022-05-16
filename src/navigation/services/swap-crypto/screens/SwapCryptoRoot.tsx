import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  InteractionManager,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useTheme, useNavigation, useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import cloneDeep from 'lodash.clonedeep';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {Currencies} from '../../../../constants/currencies';
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
} from '../styled/SwapCryptoRoot.styled';
import {SwapCryptoStackParamList} from '../SwapCryptoStack';
import Button from '../../../../components/button/Button';
import ChangellyLogo from '../../../../components/icons/external-services/changelly/changelly-logo';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {ItemProps} from '../../../../components/list/CurrencySelectionRow';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import WalletSelectorModal from '../components/WalletSelectorModal';
import AmountModal from '../components/AmountModal';
import {
  changellyGetPairsParams,
  changellyGetFixRateForAmount,
} from '../utils/changelly-utils';
import {useAppDispatch, useAppSelector} from '../../../../utils/hooks';
import {sleep} from '../../../../utils/helper-methods';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {GetPrecision} from '../../../../store/wallet/utils/currency';
import {Wallet} from '../../../../store/wallet/wallet.models';
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
import analytics from '@segment/analytics-react-native';

export interface RateData {
  fixedRateId: string;
  amountTo: number;
  rate: number;
}

const SwapCryptoRoot: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const logger = useLogger();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const countryData = useAppSelector(({LOCATION}) => LOCATION.countryData);
  const route = useRoute<RouteProp<SwapCryptoStackParamList, 'Root'>>();
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fromWalletSelectorModalVisible, setFromWalletSelectorModalVisible] =
    useState(false);
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const [fromWalletSelected, setFromWalletSelected] = useState<Wallet>();
  const [fromWalletData, setFromWalletData] = useState<ItemProps>();
  const [useDefaultToWallet, setUseDefaultToWallet] = useState<boolean>(false);
  const [toWalletSelected, setToWalletSelected] = useState<Wallet>();
  const [toWalletData, setToWalletData] = useState<ItemProps>();
  const [amountFrom, setAmountFrom] = useState<number>(0);
  const [swapCryptoSupportedCoinsFrom, setSwapCryptoSupportedCoinsFrom] =
    useState<string[]>([]);
  const [swapCryptoSupportedCoinsTo, setSwapCryptoSupportedCoinsTo] = useState<
    string[]
  >([]);
  const [rateData, setRateData] = useState<RateData>();
  const [loading, setLoading] = useState<boolean>(false);

  const selectedWallet = route.params?.selectedWallet;
  const SupportedCurrencies: string[] = Object.keys(Currencies);
  const SupportedChains: string[] = [
    ...new Set(Object.values(Currencies).map(({chain}: any) => chain)),
  ];
  let minAmount: number, maxAmount: number;

  const showModal = (id: string) => {
    switch (id) {
      case 'fromWalletSelector':
        setFromWalletSelectorModalVisible(true);
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
      case 'fromWalletSelector':
        setFromWalletSelectorModalVisible(false);
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

  const canContinue = (): boolean => {
    return (
      !!toWalletSelected &&
      !!fromWalletSelected &&
      amountFrom > 0 &&
      !!rateData &&
      !!rateData.fixedRateId
    );
  };

  const setSelectedWallet = () => {
    if (selectedWallet) {
      if (selectedWallet.balance?.satSpendable > 0) {
        setFromWallet(selectedWallet);
      } else if (selectedWallet.balance?.satSpendable === 0) {
        setToWallet(selectedWallet);
        setUseDefaultToWallet(true);
      } else {
        logger.warn('It was not possible to set the selected wallet');
      }
    }
  };

  const setFromWallet = (fromWallet: Wallet) => {
    setFromWalletSelected(fromWallet);
    if (!useDefaultToWallet) {
      setToWalletSelected(undefined);
      setToWalletData(undefined);
    }
    setAmountFrom(0);
    setLoading(false);
    setRateData(undefined);

    const coinsTo = cloneDeep(swapCryptoSupportedCoinsFrom).filter(
      coin => coin !== fromWallet.currencyAbbreviation.toLowerCase(),
    );

    setSwapCryptoSupportedCoinsTo(coinsTo);
  };

  const setToWallet = (toWallet: Wallet) => {
    setToWalletSelected(toWallet);
    setRateData(undefined);
  };

  const isToWalletEnabled = (): boolean => {
    return !!fromWalletSelected;
  };

  const updateWalletData = () => {
    if (fromWalletSelected) {
      setFromWalletData(
        SupportedCurrencyOptions.find(
          ({id}) => id === fromWalletSelected?.credentials.coin,
        ),
      );
    }
    if (toWalletSelected) {
      setToWalletData(
        SupportedCurrencyOptions.find(
          ({id}) => id === toWalletSelected?.credentials.coin,
        ),
      );
    }
  };

  const updateReceivingAmount = () => {
    if (!fromWalletSelected || !toWalletSelected || !amountFrom) {
      setLoading(false);
      return;
    }

    if (fromWalletSelected.balance?.satSpendable) {
      const {unitToSatoshi, unitDecimals} =
        dispatch(GetPrecision(fromWalletSelected.currencyAbbreviation)) || {};
      if (unitToSatoshi && unitDecimals) {
        const satToUnit = 1 / unitToSatoshi;

        const spendableAmount = parseFloat(
          (fromWalletSelected.balance.satSpendable * satToUnit).toFixed(
            unitDecimals,
          ),
        );

        if (spendableAmount < amountFrom) {
          const msg =
            'You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals or enter a valid amount.';
          showError(msg);
          setLoading(false);
          setAmountFrom(0);
          setRateData(undefined);
          return;
        }
      }
    }

    const pair =
      fromWalletSelected.currencyAbbreviation.toLowerCase() +
      '_' +
      toWalletSelected.currencyAbbreviation.toLowerCase();
    logger.debug('Updating receiving amount with pair: ' + pair);

    const data = {
      amountFrom: amountFrom,
      coinFrom: fromWalletSelected.currencyAbbreviation.toLowerCase(),
      coinTo: toWalletSelected.currencyAbbreviation.toLowerCase(),
    };
    changellyGetFixRateForAmount(fromWalletSelected, data)
      .then((data: any) => {
        if (data.error) {
          const msg =
            'Changelly getFixRateForAmount Error: ' + data.error.message;
          showError(msg);
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
        const title = 'Changelly Error';
        const msg =
          'Changelly is not available at this moment. Please, try again later.';
        showError(msg, title);
      });
  };

  const changellyGetRates = () => {
    setRateData(undefined);
    if (!fromWalletSelected || !toWalletSelected || !amountFrom) {
      return;
    }

    setLoading(true);
    let pair =
      fromWalletSelected.currencyAbbreviation.toLowerCase() +
      '_' +
      toWalletSelected.currencyAbbreviation.toLowerCase();
    logger.debug('Updating max and min with pair: ' + pair);

    const data = {
      coinFrom: fromWalletSelected.currencyAbbreviation,
      coinTo: toWalletSelected.currencyAbbreviation,
    };
    changellyGetPairsParams(fromWalletSelected, data)
      .then(async (data: any) => {
        if (data.error) {
          let msg: string;
          const title = 'Changelly Error';
          if (
            Math.abs(data.error.code) == 32602 &&
            data.error.message.indexOf('Invalid currency:') != -1
          ) {
            const actions = [
              {
                text: 'OK',
                action: () => {},
                primary: true,
              },
              {
                text: 'Submit a ticket',
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
            msg = `${data.error.message}. This is a temporary Changelly decision. If you have further questions please reach out to them.`;
            showError(msg, title, actions);
          } else {
            msg = 'Changelly getPairsParams Error: ' + data.error.message;
            showError(msg);
          }
          return;
        }

        if (
          data.result &&
          data.result[0] &&
          Number(data.result[0].maxAmountFixed) <= 0
        ) {
          const title = 'Changelly Error';
          const actions = [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
            {
              text: 'Submit a ticket',
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
          const msg = `Changelly has temporarily disabled ${fromWalletSelected.currencyAbbreviation}-${toWalletSelected.currencyAbbreviation} pair. If you have further questions please reach out to them.`;
          showError(msg, title, actions);
          return;
        }

        minAmount = Number(data.result[0].minAmountFixed);
        maxAmount = Number(data.result[0].maxAmountFixed);
        logger.debug(`Min amount: ${minAmount} - Max amount: ${maxAmount}`);

        // TODO: send max
        // if (useSendMax && shouldUseSendMax()) {
        //   // onGoingProcessProvider.set('calculatingSendMax');
        //   sendMaxInfo = await getSendMaxInfo();
        //   if (sendMaxInfo) {
        //     console.log('Send max info', sendMaxInfo);
        //     amountFrom = txFormatProvider.satToUnit(
        //       sendMaxInfo.amount,
        //       fromWalletSelected.currencyAbbreviation
        //     );
        //     estimatedFee = txFormatProvider.satToUnit(
        //       sendMaxInfo.fee,
        //       fromWalletSelected.currencyAbbreviation
        //     );
        //   }
        // }
        // onGoingProcessProvider.clear();

        if (amountFrom > maxAmount) {
          const msg = `The amount entered is greater than the maximum allowed: ${maxAmount} ${fromWalletData?.currencyAbbreviation}`;
          const actions = [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
            {
              text: 'Use Max Amount',
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
          // TODO: Handle min amount if useSendMax is true
          // if (useSendMax && shouldUseSendMax()) {
          //   let msg;
          //   if (sendMaxInfo) {
          //     const warningMsg = exchangeCryptoProvider.verifyExcludedUtxos(
          //       fromWalletSelected.currencyAbbreviation,
          //       sendMaxInfo
          //     );
          //     msg = !_.isEmpty(warningMsg) ? warningMsg : '';
          //   }

          //   const errorActionSheet = actionSheetProvider.createInfoSheet(
          //     'send-max-min-amount',
          //     {
          //       amount: amountFrom,
          //       fee: estimatedFee,
          //       minAmount: minAmount,
          //       coin: fromWalletData.currencyAbbreviation,
          //       msg
          //     }
          //   );
          //   errorActionSheet.present();
          //   errorActionSheet.onDidDismiss(() => {
          //     setLoading(false);
          //     useSendMax = null;
          //     amountFrom = null;
          //     amountTo = null;
          //     estimatedFee = null;
          //     sendMaxInfo = null;
          //     rate = null;
          //     fixedRateId = null;
          //   });
          //   return;
          // } else {
          const msg = `The amount entered is lower than the minimum allowed: ${minAmount} ${fromWalletData?.currencyAbbreviation}`;
          const actions = [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
            {
              text: 'Use Min Amount',
              action: async () => {
                setAmountFrom(minAmount);
                await sleep(400);
              },
              primary: true,
            },
          ];

          showError(msg, undefined, actions);
          return;
          // }
        }
        updateReceivingAmount();
      })
      .catch(err => {
        logger.error('Changelly getPairsParams Error: ' + JSON.stringify(err));
        const msg =
          'Changelly is not available at this moment. Please, try again later.';
        showError(msg);
      });
  };

  const showError = async (msg?: string, title?: string, actions?: any) => {
    dispatch(dismissOnGoingProcessModal());
    await sleep(400);
    setLoading(false);
    await sleep(600);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title: title ? title : 'Error',
        message: msg ? msg : 'Unknown Error',
        enableBackdropDismiss: true,
        actions: actions
          ? actions
          : [
              {
                text: 'OK',
                action: () => {},
                primary: true,
              },
            ],
      }),
    );
  };

  const getChangellyCurrencies = async () => {
    const changellyCurrenciesData = await changellyGetCurrencies(true);

    if (changellyCurrenciesData?.result?.length) {
      const supportedCoinsWithFixRateEnabled = changellyCurrenciesData.result
        .filter(
          (coin: any) =>
            coin.enabled &&
            coin.fixRateEnabled &&
            [...SupportedChains, 'ERC20'].includes(coin.protocol.toUpperCase()),
        )
        .map(({name}: any) => name);

      // TODO: add support to float-rate coins supported by Changelly

      // Intersection
      const supportedCoins = SupportedCurrencies.filter(coin =>
        supportedCoinsWithFixRateEnabled.includes(coin),
      );

      const coinsToRemove =
        !countryData || countryData.shortCode === 'US' ? ['xrp'] : [];
      if (selectedWallet?.balance?.satSpendable === 0) {
        coinsToRemove.push(selectedWallet.currencyAbbreviation.toLowerCase());
      }
      coinsToRemove.forEach((coin: string) => {
        const index = supportedCoins.indexOf(coin);
        if (index > -1) {
          logger.debug(`Removing ${coin} from Changelly supported coins`);
          supportedCoins.splice(index, 1);
        }
      });
      setSwapCryptoSupportedCoinsFrom(supportedCoins);
    }
  };

  useEffect(() => {
    InteractionManager.runAfterInteractions(async () => {
      try {
        dispatch(
          startOnGoingProcessModal(OnGoingProcessMessages.GENERAL_AWAITING),
        );
        await Promise.all([getChangellyCurrencies(), sleep(400)]);
        dispatch(dismissOnGoingProcessModal());
      } catch (err) {
        logger.error('Changelly getCurrencies Error: ' + JSON.stringify(err));
        const msg =
          'Changelly is not available at this moment. Please, try again later.';
        dispatch(dismissOnGoingProcessModal());
        await sleep(200);
        showError(msg);
      }
    });
  }, []);

  useEffect(() => {
    setSelectedWallet();
  }, [swapCryptoSupportedCoinsFrom]);

  useEffect(() => {
    updateWalletData();
  }, [fromWalletSelected, toWalletSelected]);

  useEffect(() => {
    changellyGetRates();
  }, [fromWalletSelected, toWalletSelected, amountFrom]);

  return (
    <>
      <ScrollView>
        <SwapCryptoCard>
          <SummaryTitle>From</SummaryTitle>
          {!fromWalletSelected && (
            <ActionsContainer>
              <SelectedOptionContainer
                style={{backgroundColor: Action}}
                disabled={swapCryptoSupportedCoinsFrom.length === 0}
                onPress={() => {
                  showModal('fromWalletSelector');
                }}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Wallet
                </SelectedOptionText>
                <SelectorArrowContainer>
                  <SelectorArrowDown
                    {...{width: 13, height: 13, color: White}}
                  />
                </SelectorArrowContainer>
              </SelectedOptionContainer>
            </ActionsContainer>
          )}
          {fromWalletSelected && (
            <>
              <ActionsContainer>
                <SelectedOptionContainer
                  style={{minWidth: 120}}
                  onPress={() => {
                    showModal('fromWalletSelector');
                  }}>
                  <SelectedOptionCol>
                    {fromWalletData && (
                      <>
                        <CoinIconContainer>
                          <CurrencyImage img={fromWalletData.img} size={20} />
                        </CoinIconContainer>
                        <SelectedOptionText
                          numberOfLines={1}
                          ellipsizeMode={'tail'}>
                          {fromWalletData.currencyAbbreviation}
                        </SelectedOptionText>
                      </>
                    )}
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
                  <TouchableOpacity
                    onPress={() => {
                      showModal('amount');
                    }}>
                    <DataText>
                      {amountFrom && amountFrom > 0 ? amountFrom : '0.00'}
                    </DataText>
                  </TouchableOpacity>
                </SelectedOptionCol>
              </ActionsContainer>
              {fromWalletSelected.balance?.crypto ? (
                <ActionsContainer>
                  <BottomDataText>
                    {fromWalletSelected.balance.crypto}{' '}
                    {fromWalletData?.currencyAbbreviation} available to swap
                  </BottomDataText>
                </ActionsContainer>
              ) : null}
            </>
          )}
        </SwapCryptoCard>

        <ArrowContainer>
          <ArrowDown />
        </ArrowContainer>

        <SwapCryptoCard>
          <SummaryTitle>To</SummaryTitle>
          {!toWalletSelected && (
            <ActionsContainer>
              <SelectedOptionContainer
                style={{backgroundColor: Action}}
                disabled={!isToWalletEnabled()}
                onPress={() => {
                  if (!isToWalletEnabled()) {
                    return;
                  }
                  showModal('walletSelector');
                }}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Wallet
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
                    showModal('walletSelector');
                  }}>
                  <SelectedOptionCol>
                    {toWalletData && (
                      <CoinIconContainer>
                        <CurrencyImage img={toWalletData.img} size={20} />
                      </CoinIconContainer>
                    )}
                    <SelectedOptionText
                      numberOfLines={1}
                      ellipsizeMode={'tail'}>
                      {toWalletData?.currencyAbbreviation}
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
                <ActionsContainer alignEnd={true}>
                  <BottomDataText>
                    1 {fromWalletData?.currencyAbbreviation} ~ {rateData?.rate}{' '}
                    {toWalletData?.currencyAbbreviation}
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
              analytics.track('BitPay App - Requested Swap Crypto', {
                fromWalletId: fromWalletSelected!.id,
                toWalletId: toWalletSelected!.id,
                fromCoin: fromWalletSelected!.currencyAbbreviation,
                toCoin: toWalletSelected!.currencyAbbreviation,
                amountFrom: amountFrom,
                exchange: 'changelly',
                appUser: user?.eid || '',
              });
              navigation.navigate('SwapCrypto', {
                screen: 'ChangellyCheckout',
                params: {
                  fromWalletSelected: fromWalletSelected!,
                  toWalletSelected: toWalletSelected!,
                  fromWalletData: fromWalletData!,
                  toWalletData: toWalletData!,
                  fixedRateId: rateData!.fixedRateId,
                  amountFrom: amountFrom,
                  // useSendMax: useSendMax,
                  // sendMaxInfo: sendMaxInfo
                },
              });
            }}>
            Continue
          </Button>
        </CtaContainer>
        <ProviderContainer>
          <ProviderLabel>Provided By</ProviderLabel>
          <ChangellyLogo width={100} height={30} />
        </ProviderContainer>
      </ScrollView>

      <WalletSelectorModal
        isVisible={fromWalletSelectorModalVisible}
        customSupportedCurrencies={swapCryptoSupportedCoinsFrom}
        livenetOnly={true}
        modalContext={'send'}
        modalTitle={'Select Source Wallet'}
        onDismiss={(fromWallet: Wallet) => {
          hideModal('fromWalletSelector');
          if (fromWallet) {
            setFromWallet(fromWallet);
          }
        }}
      />

      <WalletSelectorModal
        isVisible={walletSelectorModalVisible}
        customSupportedCurrencies={swapCryptoSupportedCoinsTo}
        modalTitle={'Select Destination'}
        onDismiss={(toWallet?: Wallet) => {
          hideModal('walletSelector');
          if (toWallet) {
            setToWallet(toWallet);
          }
        }}
      />

      <AmountModal
        isVisible={amountModalVisible}
        currencyAbbreviation={fromWalletData?.currencyAbbreviation}
        onDismiss={(newAmount?: number) => {
          if (newAmount) {
            setAmountFrom(newAmount);
          }
          hideModal('amount');
        }}
      />
    </>
  );
};

export default SwapCryptoRoot;
