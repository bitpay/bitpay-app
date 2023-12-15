import React, {useEffect, useRef, useState} from 'react';
import {Platform, ScrollView} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import styled, {useTheme} from 'styled-components/native';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
  useMount,
} from '../../../../utils/hooks';
import {BuyCryptoScreens, BuyCryptoStackParamList} from '../BuyCryptoStack';
import {PaymentMethodsAvailable} from '../constants/BuyCryptoConstants';
import PaymentMethodsModal from '../components/PaymentMethodModal';
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
} from '../styled/BuyCryptoCard';
import Button from '../../../../components/button/Button';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {RootState} from '../../../../store';
import {
  showBottomNotificationModal,
  dismissOnGoingProcessModal,
} from '../../../../store/app/app.actions';
import {getBuyCryptoFiatLimits} from '../../../../store/buy-crypto/buy-crypto.effects';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {Action, White, Slate, SlateDark} from '../../../../styles/colors';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {AppActions} from '../../../../store/app';
import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {
  BuyCryptoExchangeKey,
  BuyCryptoSupportedExchanges,
  getAvailableFiatCurrencies,
  getBuyCryptoSupportedCoins,
  isPaymentMethodSupported,
} from '../utils/buy-crypto-utils';
import {useTranslation} from 'react-i18next';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {
  BitpaySupportedCoins,
  BitpaySupportedTokens,
} from '../../../../constants/currencies';
import ToWalletSelectorModal, {
  ToWalletSelectorCustomCurrency,
} from '../../components/ToWalletSelectorModal';
import {
  addWallet,
  AddWalletData,
  getDecryptPassword,
} from '../../../../store/wallet/effects/create/create';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {getCoinAndChainFromCurrencyCode} from '../../../bitpay-id/utils/bitpay-id-utils';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {orderBy} from 'lodash';
import {showWalletError} from '../../../../store/wallet/effects/errors/errors';
import {getExternalServicesConfig} from '../../../../store/external-services/external-services.effects';
import {
  BuyCryptoConfig,
  ExternalServicesConfig,
  ExternalServicesConfigRequestParams,
} from '../../../../store/external-services/external-services.types';
import {StackActions} from '@react-navigation/native';
import {Analytics} from '../../../../store/analytics/analytics.effects';

export type BuyCryptoRootScreenParams =
  | {
      amount: number;
      fromWallet?: any;
      buyCryptoOpts?: any;
      currencyAbbreviation?: string | undefined; // used from charts and deeplinks.
      chain?: string | undefined; // used from charts and deeplinks.
      partner?: BuyCryptoExchangeKey | undefined; // used from deeplinks.
    }
  | undefined;

const BuyCryptoRootContainer = styled.SafeAreaView`
  flex: 1;
`;

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

let buyCryptoConfig: BuyCryptoConfig | undefined;

const BuyCryptoRoot: React.VFC<
  NativeStackScreenProps<BuyCryptoStackParamList, BuyCryptoScreens.ROOT>
> = ({navigation, route}) => {
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

  const fromWallet = route.params?.fromWallet;
  const fromAmount = Number(route.params?.amount || 0); // deeplink params are strings, ensure this is number so offers will work
  const fromCurrencyAbbreviation =
    route.params?.currencyAbbreviation?.toLowerCase();
  const fromChain = route.params?.chain?.toLowerCase();
  const preSetPartner = route.params?.partner?.toLowerCase() as
    | BuyCryptoExchangeKey
    | undefined;
  const [amount, setAmount] = useState<number>(fromAmount);
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    Platform.OS === 'ios'
      ? PaymentMethodsAvailable.applePay
      : PaymentMethodsAvailable.debitCard,
  );
  const [buyCryptoSupportedCoins, setbuyCryptoSupportedCoins] = useState(
    getBuyCryptoSupportedCoins(locationData, preSetPartner),
  );
  const [buyCryptoSupportedCoinsFullObj, setBuyCryptoSupportedCoinsFullObj] =
    useState<ToWalletSelectorCustomCurrency[]>([]);
  const fiatCurrency = getAvailableFiatCurrencies().includes(
    defaultAltCurrency.isoCode,
  )
    ? defaultAltCurrency.isoCode
    : 'USD';

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
          buyCryptoSupportedCoins.includes(
            fromChain
              ? getCurrencyAbbreviation(fromCurrencyAbbreviation, fromChain)
              : fromCurrencyAbbreviation,
          )
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
      wallet.network === 'livenet' &&
      buyCryptoSupportedCoins.includes(
        getCurrencyAbbreviation(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        ),
      ) &&
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
      wallet.network === 'livenet' &&
      buyCryptoSupportedCoins.includes(
        getCurrencyAbbreviation(
          wallet.currencyAbbreviation.toLowerCase(),
          wallet.chain,
        ),
      )
    ) {
      if (wallet.isComplete()) {
        if (allKeys[wallet.keyId].backupComplete) {
          setSelectedWallet(wallet);
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

  const continueToViewOffers = () => {
    dispatch(
      Analytics.track('Buy Crypto "View Offers"', {
        fiatAmount: amount,
        fiatCurrency,
        paymentMethod: selectedPaymentMethod.method,
        coin: selectedWallet!.currencyAbbreviation.toLowerCase(),
        chain: selectedWallet!.chain?.toLowerCase(),
      }),
    );

    navigation.navigate('BuyCryptoOffers', {
      amount,
      fiatCurrency,
      coin: selectedWallet?.currencyAbbreviation || '',
      chain: selectedWallet?.chain || '',
      country: locationData?.countryShortCode || 'US',
      selectedWallet: selectedWallet!,
      paymentMethod: selectedPaymentMethod,
      buyCryptoConfig,
      preSetPartner,
    });
  };

  const setDefaultPaymentMethod = () => {
    if (!!selectedWallet && Platform.OS === 'ios') {
      if (
        preSetPartner &&
        BuyCryptoSupportedExchanges.includes(preSetPartner)
      ) {
        setSelectedPaymentMethod(
          isPaymentMethodSupported(
            preSetPartner,
            PaymentMethodsAvailable.applePay,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
            locationData?.countryShortCode || 'US',
          )
            ? PaymentMethodsAvailable.applePay
            : PaymentMethodsAvailable.debitCard,
        );
      } else {
        setSelectedPaymentMethod(
          isPaymentMethodSupported(
            'banxa',
            PaymentMethodsAvailable.applePay,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
            locationData?.countryShortCode || 'US',
          ) ||
            isPaymentMethodSupported(
              'moonpay',
              PaymentMethodsAvailable.applePay,
              selectedWallet.currencyAbbreviation,
              selectedWallet.chain,
              fiatCurrency,
              locationData?.countryShortCode || 'US',
            ) ||
            isPaymentMethodSupported(
              'ramp',
              PaymentMethodsAvailable.applePay,
              selectedWallet.currencyAbbreviation,
              selectedWallet.chain,
              fiatCurrency,
            ) ||
            isPaymentMethodSupported(
              'sardine',
              PaymentMethodsAvailable.applePay,
              selectedWallet.currencyAbbreviation,
              selectedWallet.chain,
              fiatCurrency,
              locationData?.countryShortCode || 'US',
            ) ||
            isPaymentMethodSupported(
              'simplex',
              PaymentMethodsAvailable.applePay,
              selectedWallet.currencyAbbreviation,
              selectedWallet.chain,
              fiatCurrency,
            )
            ? PaymentMethodsAvailable.applePay
            : PaymentMethodsAvailable.debitCard,
        );
      }
    } else {
      setSelectedPaymentMethod(PaymentMethodsAvailable.debitCard);
    }
  };

  const checkPaymentMethod = () => {
    if (!selectedWallet || !selectedPaymentMethod) {
      return;
    }
    if (
      selectedPaymentMethod.method === 'sepaBankTransfer' &&
      !locationData?.isEuCountry
    ) {
      setDefaultPaymentMethod();
      return;
    }
    if (
      (preSetPartner &&
        BuyCryptoSupportedExchanges.includes(preSetPartner) &&
        isPaymentMethodSupported(
          preSetPartner,
          selectedPaymentMethod,
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
          fiatCurrency,
          locationData?.countryShortCode || 'US',
        )) ||
      (!preSetPartner &&
        (isPaymentMethodSupported(
          'banxa',
          PaymentMethodsAvailable.applePay,
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
          fiatCurrency,
          locationData?.countryShortCode || 'US',
        ) ||
          isPaymentMethodSupported(
            'moonpay',
            selectedPaymentMethod,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
            locationData?.countryShortCode || 'US',
          ) ||
          isPaymentMethodSupported(
            'ramp',
            selectedPaymentMethod,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
          ) ||
          isPaymentMethodSupported(
            'sardine',
            selectedPaymentMethod,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
            locationData?.countryShortCode || 'US',
          ) ||
          isPaymentMethodSupported(
            'simplex',
            selectedPaymentMethod,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
          )))
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
      buyCryptoConfig = config?.buyCrypto;
      logger.debug('buyCryptoConfig: ' + JSON.stringify(buyCryptoConfig));
    } catch (err) {
      logger.error('getBuyCryptoConfig Error: ' + JSON.stringify(err));
    }

    if (buyCryptoConfig?.disabled) {
      dispatch(dismissOnGoingProcessModal());
      await sleep(600);
      dispatch(
        AppActions.showBottomNotificationModal({
          title: buyCryptoConfig?.disabledTitle
            ? buyCryptoConfig.disabledTitle
            : t('Out of service'),
          message: buyCryptoConfig?.disabledMessage
            ? buyCryptoConfig.disabledMessage
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

    const limits = dispatch(
      getBuyCryptoFiatLimits(preSetPartner, fiatCurrency),
    );

    if (limits.min !== undefined && amount < limits.min) {
      setAmount(limits.min);
    }
    if (limits.max !== undefined && amount > limits.max) {
      setAmount(limits.max);
    }

    const coinsToRemove =
      !locationData || locationData.countryShortCode === 'US' ? ['xrp'] : [];

    if (coinsToRemove.length > 0) {
      coinsToRemove.forEach((coin: string) => {
        const index = buyCryptoSupportedCoins.indexOf(coin);
        if (index > -1) {
          logger.debug(`Removing ${coin} from Buy Crypto supported coins`);
          buyCryptoSupportedCoins.splice(index, 1);
        }
      });
      setbuyCryptoSupportedCoins(buyCryptoSupportedCoins);
    }

    // Sort the array with our supported coins first and then the unsupported ones sorted alphabetically
    const orderedArray = SupportedCurrencyOptions.map(currency =>
      currency.chain
        ? getCurrencyAbbreviation(currency.currencyAbbreviation, currency.chain)
        : currency.currencyAbbreviation,
    );
    const supportedCoins = orderBy(
      buyCryptoSupportedCoins,
      [
        (symbol: string) => {
          return orderedArray.includes(symbol)
            ? orderedArray.indexOf(symbol)
            : orderedArray.length;
        },
        'name',
      ],
      ['asc', 'asc'],
    );

    const initialBuyCryptoSupportedCoinsFullObj: ToWalletSelectorCustomCurrency[] =
      supportedCoins
        .map((symbol: string) => {
          const {coin, chain} = getCoinAndChainFromCurrencyCode(symbol);
          const foundToken = Object.values({
            ...BitpaySupportedTokens,
            ...tokenDataByAddress,
          }).find(token => token.coin === coin && token.chain === chain);
          return {
            currencyAbbreviation: coin,
            symbol,
            name: (BitpaySupportedCoins[symbol]?.name || foundToken?.name)!,
            chain,
            logoUri: getLogoUri(coin, chain),
            tokenAddress: foundToken?.address,
          };
        })
        .filter(currency => !!currency.name);

    setBuyCryptoSupportedCoinsFullObj(initialBuyCryptoSupportedCoinsFullObj);

    selectFirstAvailableWallet();
  };

  useMount(() => {
    init();
  });

  useEffect(() => {
    checkPaymentMethodRef.current();
  }, [selectedWallet]);

  return (
    <BuyCryptoRootContainer>
      <ScrollView>
        <BuyCryptoItemCard
          onPress={() => {
            showModal('amount');
          }}>
          <BuyCryptoItemTitle>{t('Amount')}</BuyCryptoItemTitle>
          <ActionsContainer>
            <SelectedOptionContainer>
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                {fiatCurrency}
              </SelectedOptionText>
            </SelectedOptionContainer>
            <SelectedOptionCol>
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
            </SelectedOptionCol>
          </ActionsContainer>
        </BuyCryptoItemCard>

        <BuyCryptoItemCard
          onPress={() => {
            showModal('walletSelector');
          }}>
          <BuyCryptoItemTitle>{t('Deposit to')}</BuyCryptoItemTitle>
          {!selectedWallet && (
            <ActionsContainer>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  {t('Select Destination')}
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
                  <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
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
          )}
        </BuyCryptoItemCard>

        {!!selectedWallet && (
          <BuyCryptoItemCard
            onPress={() => {
              showModal('paymentMethod');
            }}>
            <BuyCryptoItemTitle>{t('Payment Method')}</BuyCryptoItemTitle>
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
        )}

        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            disabled={!selectedWallet || !amount}
            onPress={() => {
              checkIfErc20Token();
            }}>
            {t('View Offers')}
          </Button>
        </CtaContainer>
      </ScrollView>

      <AmountModal
        isVisible={amountModalVisible}
        context={'buyCrypto'}
        onSubmit={newAmount => {
          setAmount(newAmount);
          hideModal('amount');
        }}
        onClose={() => hideModal('amount')}
      />

      <ToWalletSelectorModal
        isVisible={walletSelectorModalVisible}
        modalContext={'buyCrypto'}
        disabledChain={undefined}
        customSupportedCurrencies={buyCryptoSupportedCoinsFullObj}
        livenetOnly={!__DEV__}
        modalTitle={t('Select Destination')}
        onDismiss={async (
          newWallet?: Wallet,
          createNewWalletData?: AddWalletData,
        ) => {
          hideModal('walletSelector');
          if (newWallet?.currencyAbbreviation) {
            setWallet(newWallet);
          } else if (createNewWalletData) {
            try {
              if (createNewWalletData.key.isPrivKeyEncrypted) {
                logger.debug('Key is Encrypted. Trying to decrypt...');
                await sleep(500);
                const password = await dispatch(
                  getDecryptPassword(createNewWalletData.key),
                );
                createNewWalletData.options.password = password;
              }

              await sleep(500);
              await dispatch(startOnGoingProcessModal('ADDING_WALLET'));

              const createdToWallet = await dispatch(
                addWallet(createNewWalletData),
              );
              logger.debug(
                `Added ${createdToWallet?.currencyAbbreviation} wallet from Buy Crypto`,
              );
              dispatch(
                Analytics.track('Created Basic Wallet', {
                  coin: createNewWalletData.currency.currencyAbbreviation,
                  chain: createNewWalletData.currency.chain,
                  isErc20Token: createNewWalletData.currency.isToken,
                  context: 'buyCrypto',
                }),
              );
              setWallet(createdToWallet);
              await sleep(300);
              dispatch(dismissOnGoingProcessModal());
            } catch (err: any) {
              dispatch(dismissOnGoingProcessModal());
              await sleep(500);
              if (err.message === 'invalid password') {
                dispatch(showBottomNotificationModal(WrongPasswordError()));
              } else {
                walletError(err.message);
              }
            }
          }
        }}
      />

      <PaymentMethodsModal
        onPress={paymentMethod => {
          setSelectedPaymentMethod(paymentMethod);
          hideModal('paymentMethod');
        }}
        isVisible={paymentMethodModalVisible}
        onBackdropPress={() => hideModal('paymentMethod')}
        selectedPaymentMethod={selectedPaymentMethod}
        coin={selectedWallet?.currencyAbbreviation}
        chain={selectedWallet?.chain}
        currency={fiatCurrency}
        preSetPartner={preSetPartner}
      />
    </BuyCryptoRootContainer>
  );
};

export default BuyCryptoRoot;
