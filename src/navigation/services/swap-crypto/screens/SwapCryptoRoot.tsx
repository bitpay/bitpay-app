import React, {useEffect, useState} from 'react';
import {ActivityIndicator, ScrollView, TouchableOpacity} from 'react-native';
import {useTheme, useNavigation} from '@react-navigation/native';
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
import Button from '../../../../components/button/Button';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {ItemProps} from '../../../../components/list/CurrencySelectionRow';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import WalletSelectorModal from '../components/WalletSelectorModal';
import AmountModal from '../components/AmountModal';
import {
  changellyGetPairsParams,
  changellyGetCurrencies,
  changellyGetFixRateForAmount,
} from '../utils/changelly-utils';
import {getCountry} from '../../../../lib/location/location';
import {useAppDispatch} from '../../../../utils/hooks';
import {sleep} from '../../../../utils/helper-methods';
import {useLogger} from '../../../../utils/hooks/useLogger';
import {GetPrecision} from '../../../../store/wallet/utils/currency';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {
  startOnGoingProcessModal,
  openUrlWithInAppBrowser,
} from '../../../../store/app/app.effects';
import {
  dismissOnGoingProcessModal,
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../store/app/app.actions';
import ArrowDown from '../../../../../assets/img/services/swap-crypto/down-arrow.svg';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';

// Images // TODO: for exchanges images create a component like this: /bitpay-app-v2/src/components/icons/info
import ChangellyLogo from '../../../../../assets/img/services/changelly/changelly-vector-logo.svg';
import ChangellyLogoDm from '../../../../../assets/img/services/changelly/changelly-vector-logo-dark.svg';

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
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [fromWalletSelectorModalVisible, setFromWalletSelectorModalVisible] =
    useState(false);
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const [fromWalletSelected, setFromWalletSelected] = useState<Wallet>();
  const [fromWalletData, setFromWalletData] = useState<ItemProps>();
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

  const isToWalletEnabled = (): boolean => {
    return !!fromWalletSelected;
  };

  const updateWalletData = () => {
    if (fromWalletSelected) {
      setFromWalletData(
        SupportedCurrencyOptions.find(
          currency =>
            fromWalletSelected &&
            currency.id == fromWalletSelected.credentials.coin,
        ),
      );
    }
    if (toWalletSelected) {
      setToWalletData(
        SupportedCurrencyOptions.find(
          currency =>
            toWalletSelected &&
            currency.id == toWalletSelected.credentials.coin,
        ),
      );
    }
  };

  const updateReceivingAmount = () => {
    if (!fromWalletSelected || !toWalletSelected || !amountFrom) {
      setLoading(false);
      return;
    }

    if (fromWalletSelected.balance && fromWalletSelected.balance.sat) {
      const unitToSatoshi = GetPrecision(
        fromWalletSelected.currencyAbbreviation,
      )?.unitToSatoshi;
      const unitDecimals = GetPrecision(
        fromWalletSelected.currencyAbbreviation,
      )?.unitDecimals;
      if (unitToSatoshi && unitDecimals) {
        const satToUnit = 1 / unitToSatoshi;

        const spendableAmount = parseFloat(
          (fromWalletSelected.balance.sat * satToUnit).toFixed(unitDecimals),
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
      coinFrom: fromWalletSelected.currencyAbbreviation,
      coinTo: toWalletSelected.currencyAbbreviation,
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
                action: () => {
                  dispatch(dismissBottomNotificationModal());
                },
                primary: true,
              },
              {
                text: 'Submit a ticket',
                action: async () => {
                  dispatch(dismissBottomNotificationModal());
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
              action: () => {
                dispatch(dismissBottomNotificationModal());
              },
              primary: true,
            },
            {
              text: 'Submit a ticket',
              action: async () => {
                dispatch(dismissBottomNotificationModal());
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
          const msg = `The amount entered is greater than the maximum allowed: ${maxAmount} ${fromWalletSelected.currencyAbbreviation.toUpperCase()}`;
          const actions = [
            {
              text: 'OK',
              action: () => {
                dispatch(dismissBottomNotificationModal());
              },
              primary: true,
            },
            {
              text: 'Use Max Amount',
              action: async () => {
                dispatch(dismissBottomNotificationModal());
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
          //       coin: fromWalletSelected.currencyAbbreviation.toUpperCase(),
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
          const msg = `The amount entered is lower than the minimum allowed: ${minAmount} ${fromWalletSelected.currencyAbbreviation.toUpperCase()}`;
          const actions = [
            {
              text: 'OK',
              action: () => {
                dispatch(dismissBottomNotificationModal());
              },
              primary: true,
            },
            {
              text: 'Use Min Amount',
              action: async () => {
                dispatch(dismissBottomNotificationModal());
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
                action: () => {
                  dispatch(dismissBottomNotificationModal());
                },
                primary: true,
              },
            ],
      }),
    );
  };

  useEffect(() => {
    const getChangellyCurrencies = async () => {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.GENERAL_AWAITING),
      );
      await sleep(400);
      const changellyCurrenciesData = await changellyGetCurrencies(true);

      if (
        changellyCurrenciesData &&
        changellyCurrenciesData.result &&
        changellyCurrenciesData.result.length > 0
      ) {
        const supportedCoinsWithFixRateEnabled = changellyCurrenciesData.result
          .filter(
            (coin: any) =>
              coin.enabled &&
              coin.fixRateEnabled &&
              [...SupportedChains, 'ERC20'].includes(
                coin.protocol.toUpperCase(),
              ),
          )
          .map(({name}: any) => name);

        // TODO: add support to float-rate coins supported by Changelly

        // Intersection
        const supportedCoins = SupportedCurrencies.filter(coin =>
          supportedCoinsWithFixRateEnabled.includes(coin),
        );

        const country = await getCountry();
        const coinsToRemove = !country || country == 'US' ? ['xrp'] : [];
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

    getChangellyCurrencies()
      .then(async () => {
        dispatch(dismissOnGoingProcessModal());
        await sleep(400);
      })
      .catch(err => {
        logger.error('Changelly getCurrencies Error: ' + JSON.stringify(err));
        const msg =
          'Changelly is not available at this moment. Please, try again later.';
        showError(msg);
      });
  }, []);

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
                      <CoinIconContainer>
                        <CurrencyImage img={fromWalletData.img} size={20} />
                      </CoinIconContainer>
                    )}
                    <SelectedOptionText
                      numberOfLines={1}
                      ellipsizeMode={'tail'}>
                      {fromWalletSelected.credentials.coin.toUpperCase()}
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
              <ActionsContainer>
                <BottomDataText>
                  {fromWalletSelected.balance.crypto}{' '}
                  {fromWalletSelected.currencyAbbreviation.toUpperCase()}{' '}
                  available to swap
                </BottomDataText>
              </ActionsContainer>
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
                    if (!isToWalletEnabled()) {
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
                      {toWalletSelected.credentials.coin.toUpperCase()}
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
                    1 {fromWalletSelected?.currencyAbbreviation.toUpperCase()} ~{' '}
                    {rateData?.rate}{' '}
                    {toWalletSelected.currencyAbbreviation.toUpperCase()}
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
              navigation.navigate('SwapCrypto', {
                screen: 'ChangellyCheckout',
                params: {
                  fromWalletSelected: fromWalletSelected!,
                  toWalletSelected: toWalletSelected!,
                  fromWalletData: fromWalletData!,
                  toWalletData: toWalletData!,
                  fixedRateId: rateData!.fixedRateId,
                  amountFrom: amountFrom,
                  rate: rateData!.rate,
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
          {theme.dark ? (
            <ChangellyLogoDm width={100} height={30} />
          ) : (
            <ChangellyLogo width={100} height={30} />
          )}
        </ProviderContainer>
      </ScrollView>

      <WalletSelectorModal
        isVisible={fromWalletSelectorModalVisible}
        customSupportedCurrencies={swapCryptoSupportedCoinsFrom}
        modalContext={'send'}
        modalTitle={'Select Source Wallet'}
        onDismiss={(fromWallet: Wallet) => {
          hideModal('fromWalletSelector');
          if (fromWallet) {
            setFromWalletSelected(fromWallet);
            setToWalletSelected(undefined);
            setAmountFrom(0);
            setLoading(false);
            setToWalletData(undefined);
            setRateData(undefined);

            const coinsTo = cloneDeep(swapCryptoSupportedCoinsFrom).filter(
              coin => coin != fromWallet.currencyAbbreviation.toLowerCase(),
            );
            setSwapCryptoSupportedCoinsTo(coinsTo);
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
            setToWalletSelected(toWallet);
            setRateData(undefined);
          }
        }}
      />

      <AmountModal
        isVisible={amountModalVisible}
        currencyAbbreviation={cloneDeep(
          fromWalletSelected?.currencyAbbreviation,
        )?.toUpperCase()}
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
