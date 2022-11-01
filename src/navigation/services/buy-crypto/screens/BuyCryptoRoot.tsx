import React, {useEffect, useState} from 'react';
import {Platform, ScrollView} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import styled, {useTheme} from 'styled-components/native';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
} from '../../../../utils/hooks';
import {BuyCryptoStackParamList} from '../BuyCryptoStack';
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
  dismissBottomNotificationModal,
  dismissOnGoingProcessModal,
} from '../../../../store/app/app.actions';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {Action, White, Slate, SlateDark} from '../../../../styles/colors';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {getSimplexSupportedCurrencies} from '../utils/simplex-utils';
import {getWyreSupportedCurrencies} from '../utils/wyre-utils';
import {
  getBadgeImg,
  getCurrencyAbbreviation,
  sleep,
} from '../../../../utils/helper-methods';
import {AppActions} from '../../../../store/app';
import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {
  getAvailableFiatCurrencies,
  isPaymentMethodSupported,
} from '../utils/buy-crypto-utils';
import {useTranslation} from 'react-i18next';
import {
  logSegmentEvent,
  startOnGoingProcessModal,
} from '../../../../store/app/app.effects';
import {
  BitpaySupportedCoins,
  BitpaySupportedCurrencies,
} from '../../../../constants/currencies';
import ToWalletSelectorModal, {
  ToWalletSelectorCustomCurrency,
} from '../../components/ToWalletSelectorModal';
import {
  addWallet,
  AddWalletData,
  getDecryptPassword,
} from '../../../../store/wallet/effects/create/create';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {WrongPasswordError} from '../../../wallet/components/ErrorMessages';
import {getCoinAndChainFromCurrencyCode} from '../../../bitpay-id/utils/bitpay-id-utils';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {orderBy} from 'lodash';

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

const BuyCryptoRoot: React.FC<
  StackScreenProps<BuyCryptoStackParamList, 'BuyCryptoRoot'>
> = ({navigation, route}) => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const tokenData = useAppSelector(({WALLET}: RootState) => WALLET.tokenData);
  const countryData = useAppSelector(({LOCATION}) => LOCATION.countryData);
  const defaultAltCurrency = useAppSelector(({APP}) => APP.defaultAltCurrency);

  const fromWallet = route.params?.fromWallet;
  const fromAmount = route.params?.amount;
  const fromCurrencyAbbreviation =
    route.params?.currencyAbbreviation?.toLowerCase();
  const fromChain = route.params?.chain?.toLowerCase();

  const [amount, setAmount] = useState<number>(fromAmount ? fromAmount : 0);
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
  const [buyCryptoSupportedCoins, setbuyCryptoSupportedCoins] = useState([
    ...new Set([
      ...getSimplexSupportedCurrencies(),
      ...getWyreSupportedCurrencies(),
    ]),
  ]);
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

  const selectFirstAvailableWallet = () => {
    const keysList = Object.values(allKeys).filter(key => key.backupComplete);

    if (!keysList[0]) {
      showError('emptyKeyList');
      return;
    }

    if (fromWallet?.id) {
      // Selected wallet from Wallet Details
      let fromWalletData;
      let allWallets: Wallet[] = [];

      keysList.forEach(key => {
        allWallets = [...allWallets, ...key.wallets];
      });

      fromWalletData = allWallets.find(wallet => wallet.id == fromWallet.id);
      if (fromWalletData) {
        setWallet(fromWalletData);
      } else {
        showError('walletNotSupported');
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
        allowedWallets[0]
          ? setSelectedWallet(allowedWallets[0])
          : showError('noWalletsAbleToBuy', fromCurrencyAbbreviation);
      } else {
        showError('keysNoSupportedWallet', fromCurrencyAbbreviation);
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
      ((wallet.network === 'livenet' &&
        buyCryptoSupportedCoins.includes(
          getCurrencyAbbreviation(
            wallet.currencyAbbreviation.toLowerCase(),
            wallet.chain,
          ),
        )) ||
        (__DEV__ &&
          wallet.network === 'testnet' &&
          getWyreSupportedCurrencies().includes(
            getCurrencyAbbreviation(
              wallet.currencyAbbreviation.toLowerCase(),
              wallet.chain,
            ),
          ))) &&
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
      ((wallet.network === 'livenet' &&
        buyCryptoSupportedCoins.includes(
          getCurrencyAbbreviation(
            wallet.currencyAbbreviation.toLowerCase(),
            wallet.chain,
          ),
        )) ||
        (__DEV__ &&
          wallet.network === 'testnet' &&
          getWyreSupportedCurrencies().includes(
            getCurrencyAbbreviation(
              wallet.currencyAbbreviation.toLowerCase(),
              wallet.chain,
            ),
          )))
    ) {
      if (wallet.isComplete()) {
        if (allKeys[wallet.keyId].backupComplete) {
          setSelectedWallet(wallet);
        } else {
          showError('needsBackup');
        }
      } else {
        showError('walletNotCompleted');
      }
    } else {
      showError('walletNotSupported');
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
      logSegmentEvent('track', 'Buy Crypto "View Offers"', {
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
      country: countryData?.shortCode || 'US',
      selectedWallet,
      paymentMethod: selectedPaymentMethod,
    });
  };

  const setDefaultPaymentMethod = () => {
    if (!!selectedWallet && Platform.OS === 'ios') {
      setSelectedPaymentMethod(
        isPaymentMethodSupported(
          'simplex',
          PaymentMethodsAvailable.applePay,
          selectedWallet.currencyAbbreviation,
          selectedWallet.chain,
          fiatCurrency,
        ) ||
          isPaymentMethodSupported(
            'wyre',
            PaymentMethodsAvailable.applePay,
            selectedWallet.currencyAbbreviation,
            selectedWallet.chain,
            fiatCurrency,
          )
          ? PaymentMethodsAvailable.applePay
          : PaymentMethodsAvailable.debitCard,
      );
    } else {
      setSelectedPaymentMethod(PaymentMethodsAvailable.debitCard);
    }
  };

  const checkPaymentMethod = () => {
    if (!selectedWallet || !selectedPaymentMethod) {
      return;
    }
    if (
      selectedPaymentMethod.method == 'sepaBankTransfer' &&
      !countryData?.isEuCountry
    ) {
      setDefaultPaymentMethod();
      return;
    }
    if (
      isPaymentMethodSupported(
        'simplex',
        selectedPaymentMethod,
        selectedWallet.currencyAbbreviation,
        selectedWallet.chain,
        fiatCurrency,
      ) ||
      isPaymentMethodSupported(
        'wyre',
        selectedPaymentMethod,
        selectedWallet.currencyAbbreviation,
        selectedWallet.chain,
        fiatCurrency,
      )
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

  const showError = async (type?: string, coin?: string) => {
    let title, message: string;
    switch (type) {
      case 'walletNotSupported':
        title = t('Wallet not supported');
        message = t(
          'The selected wallet is currently not supported for buying cryptocurrencies',
        );
        break;
      case 'needsBackup':
        title = t('Needs backup');
        message = t(
          'The key of the selected wallet needs backup before being able to receive funds',
        );
        break;
      case 'walletNotCompleted':
        title = t('Incomplete Wallet');
        message = t(
          'The selected wallet needs to be complete before being able to receive funds',
        );
        break;
      case 'noWalletsAbleToBuy':
        title = t('No wallets');
        message = coin
          ? t('No wallets available to receive funds.', {
              coin: coin.toUpperCase(),
            })
          : t('No wallets available to receive funds.');
        break;
      case 'keysNoSupportedWallet':
        title = t('Not supported wallets');
        message = coin
          ? t('Your keys do not have wallets able to buy crypto', {
              coin: coin.toUpperCase(),
            })
          : t('Your keys do not have supported wallets able to buy crypto');
        break;
      case 'emptyKeyList':
        title = t('No keys with supported wallets');
        message = t(
          'There are no keys with wallets able to receive funds. Remember to backup your keys before using this feature.',
        );
        break;
      default:
        title = t('Error');
        message = t('Unknown Error');
        break;
    }
    await sleep(1000);
    dispatch(
      showBottomNotificationModal({
        type: 'error',
        title,
        message,
        enableBackdropDismiss: true,
        actions: [
          {
            text: t('OK'),
            action: () => {
              dispatch(dismissBottomNotificationModal());
            },
            primary: true,
          },
        ],
      }),
    );
  };

  const getLogoUri = (coin: string, _chain: string) => {
    if (
      SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === coin.toLowerCase() &&
          (!chain || chain === _chain),
      )
    ) {
      return SupportedCurrencyOptions.find(
        ({currencyAbbreviation, chain}) =>
          currencyAbbreviation === coin.toLowerCase() &&
          (!chain || chain === _chain),
      )!.img;
    } else if (tokenData[getCurrencyAbbreviation(coin, _chain)]?.logoURI) {
      return tokenData[getCurrencyAbbreviation(coin, _chain)].logoURI;
    } else {
      return undefined;
    }
  };

  useEffect(() => {
    const coinsToRemove =
      !countryData || countryData.shortCode === 'US' ? ['xrp'] : [];

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

    const buyCryptoSupportedCoinsFullObj: ToWalletSelectorCustomCurrency[] =
      supportedCoins
        .map((symbol: string) => {
          const {coin, chain} = getCoinAndChainFromCurrencyCode(symbol);
          return {
            currencyAbbreviation: coin,
            symbol,
            name:
              BitpaySupportedCurrencies[symbol]?.name ||
              tokenData[symbol]?.name,
            chain,
            logoUri: getLogoUri(coin, chain),
          };
        })
        .filter(currency => !!currency.name);

    setBuyCryptoSupportedCoinsFullObj(buyCryptoSupportedCoinsFullObj);

    selectFirstAvailableWallet();
  }, []);

  useEffect(() => {
    checkPaymentMethod();
  }, [selectedWallet]);

  return (
    <>
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
              await dispatch(
                startOnGoingProcessModal(
                  t(OnGoingProcessMessages.ADDING_WALLET),
                ),
              );

              const createdToWallet = await dispatch(
                addWallet(createNewWalletData),
              );
              logger.debug(
                `Added ${createdToWallet?.currencyAbbreviation} wallet from Buy Crypto`,
              );
              dispatch(
                logSegmentEvent('track', 'Created Basic Wallet', {
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
                showError(err.message);
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
      />
    </>
  );
};

export default BuyCryptoRoot;
