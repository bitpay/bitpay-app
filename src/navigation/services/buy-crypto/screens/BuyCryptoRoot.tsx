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
import WalletSelectorModal from '../components/WalletSelectorModal';
import AmountModal from '../components/AmountModal';
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
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {ItemProps} from '../../../../components/list/CurrencySelectionRow';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {RootState} from '../../../../store';
import {
  showBottomNotificationModal,
  dismissBottomNotificationModal,
} from '../../../../store/app/app.actions';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {Action, White, Slate, SlateDark} from '../../../../styles/colors';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {simplexSupportedCoins} from '../utils/simplex-utils';
import {wyreSupportedCoins} from '../utils/wyre-utils';
import {sleep} from '../../../../utils/helper-methods';
import {AppActions} from '../../../../store/app';
import {IsERCToken} from '../../../../store/wallet/utils/currency';
import {isPaymentMethodSupported} from '../utils/buy-crypto-utils';
import {useAnalytics} from '@segment/analytics-react-native';

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

const BuyCryptoRoot: React.FC<
  StackScreenProps<BuyCryptoStackParamList, 'BuyCryptoRoot'>
> = ({navigation, route}) => {
  const analytics = useAnalytics();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const logger = useLogger();
  const allKeys = useAppSelector(({WALLET}: RootState) => WALLET.keys);
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const countryData = useAppSelector(({LOCATION}) => LOCATION.countryData);

  const fromWallet = route.params?.fromWallet;
  const fromAmount = route.params?.amount;
  const fromCurrencyAbbreviation =
    route.params?.currencyAbbreviation?.toLowerCase();

  const [amount, setAmount] = useState<number>(fromAmount ? fromAmount : 0);
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [walletData, setWalletData] = useState<ItemProps>();
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
    ...new Set([...simplexSupportedCoins, ...wyreSupportedCoins]),
  ]);
  const fiatCurrency = 'USD';

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

  const updateWalletData = () => {
    if (selectedWallet) {
      setWalletData(
        SupportedCurrencyOptions.find(
          currency =>
            selectedWallet && currency.id == selectedWallet.credentials.coin,
        ),
      );
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
          buyCryptoSupportedCoins.includes(fromCurrencyAbbreviation)
        ) {
          allowedWallets = allowedWallets.filter(
            wallet => wallet.currencyAbbreviation === fromCurrencyAbbreviation,
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
      ((wallet.credentials.network === 'livenet' &&
        buyCryptoSupportedCoins.includes(
          wallet.credentials.coin.toLowerCase(),
        )) ||
        (__DEV__ &&
          wallet.credentials.network === 'testnet' &&
          wyreSupportedCoins.includes(
            wallet.credentials.coin.toLowerCase(),
          ))) &&
      wallet.isComplete() &&
      (!fromCurrencyAbbreviation ||
        wallet.currencyAbbreviation === fromCurrencyAbbreviation)
    );
  };

  const setWallet = (wallet: Wallet) => {
    if (
      wallet.credentials &&
      ((wallet.credentials.network === 'livenet' &&
        buyCryptoSupportedCoins.includes(
          wallet.credentials.coin.toLowerCase(),
        )) ||
        (__DEV__ &&
          wallet.credentials.network === 'testnet' &&
          wyreSupportedCoins.includes(wallet.credentials.coin.toLowerCase())))
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

  const getLinkedWalletName = () => {
    if (!selectedWallet) {
      return;
    }

    const linkedWallet = keys[selectedWallet.keyId].wallets.find(({tokens}) =>
      tokens?.includes(selectedWallet.id),
    );

    const walletName =
      linkedWallet?.walletName || linkedWallet?.credentials.walletName;
    return `${walletName}`;
  };

  const showTokensInfoSheet = () => {
    const linkedWalletName = getLinkedWalletName();
    dispatch(
      AppActions.showBottomNotificationModal({
        type: 'info',
        title: 'Reminder',
        message: `Keep in mind that once the funds are received in your ${selectedWallet?.currencyAbbreviation.toUpperCase()} wallet, to move them you will need to have enough funds in your Ethereum linked wallet ${
          linkedWalletName ? `(${linkedWalletName}) ` : ' '
        }to pay the ETH miner fees.`,
        enableBackdropDismiss: true,
        actions: [
          {
            text: 'GOT IT',
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
      dispatch(IsERCToken(selectedWallet.currencyAbbreviation))
    ) {
      tokensWarn();
    } else {
      continueToViewOffers();
    }
  };

  const continueToViewOffers = () => {
    analytics.track('BitPay App - Buy Crypto "View Offers"', {
      walletId: selectedWallet!.id,
      fiatAmount: amount,
      fiatCurrency,
      paymentMethod: selectedPaymentMethod.method,
      coin: selectedWallet!.currencyAbbreviation,
      appUser: user?.eid || '',
    });

    navigation.navigate('BuyCryptoOffers', {
      amount,
      fiatCurrency,
      coin: selectedWallet?.currencyAbbreviation || '',
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
          fiatCurrency,
        ) ||
          isPaymentMethodSupported(
            'wyre',
            PaymentMethodsAvailable.applePay,
            selectedWallet.currencyAbbreviation,
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
        fiatCurrency,
      ) ||
      isPaymentMethodSupported(
        'wyre',
        selectedPaymentMethod,
        selectedWallet.currencyAbbreviation,
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
        title = 'Wallet not supported';
        message =
          'The selected wallet is currently not supported for buying cryptocurrencies';
        break;
      case 'needsBackup':
        title = 'Needs backup';
        message =
          'The key of the selected wallet needs backup before being able to receive funds';
        break;
      case 'walletNotCompleted':
        title = 'Incomplete Wallet';
        message =
          'The selected wallet needs to be complete before being able to receive funds';
        break;
      case 'noWalletsAbleToBuy':
        title = 'No wallets';
        message = coin
          ? `No ${coin.toUpperCase()} wallets available to receive funds.`
          : 'No wallets available to receive funds.';
        break;
      case 'keysNoSupportedWallet':
        title = 'Not supported wallets';
        message = coin
          ? `Your keys do not have ${coin.toUpperCase()} wallets able to buy crypto`
          : 'Your keys do not have supported wallets able to buy crypto';
        break;
      case 'emptyKeyList':
        title = 'No keys with supported wallets';
        message =
          'There are no keys with wallets able to receive funds. Remember to backup your keys before using this feature.';
        break;
      default:
        title = 'Error';
        message = 'Unknown Error';
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

    selectFirstAvailableWallet();
  }, []);

  useEffect(() => {
    updateWalletData();
    checkPaymentMethod();
  }, [selectedWallet]);

  return (
    <>
      <ScrollView>
        <BuyCryptoItemCard
          onPress={() => {
            showModal('amount');
          }}>
          <BuyCryptoItemTitle>Amount</BuyCryptoItemTitle>
          <ActionsContainer>
            <SelectedOptionContainer>
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                USD
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
          <BuyCryptoItemTitle>Deposit to</BuyCryptoItemTitle>
          {!selectedWallet && (
            <ActionsContainer>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Destination
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
                  {walletData && (
                    <CoinIconContainer>
                      <CurrencyImage img={walletData.img} size={20} />
                    </CoinIconContainer>
                  )}
                  <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                    {selectedWallet.credentials.coin.toUpperCase()}
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

        <BuyCryptoItemCard
          onPress={() => {
            showModal('paymentMethod');
          }}>
          <BuyCryptoItemTitle>Payment Method</BuyCryptoItemTitle>
          {!selectedPaymentMethod && (
            <ActionsContainer>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Payment Method
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

        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            disabled={!selectedWallet || !amount}
            onPress={() => {
              checkIfErc20Token();
            }}>
            View Offers
          </Button>
        </CtaContainer>
      </ScrollView>

      <AmountModal
        isVisible={amountModalVisible}
        onDismiss={(newAmount?: number) => {
          if (newAmount) {
            setAmount(newAmount);
          }
          hideModal('amount');
        }}
      />

      <WalletSelectorModal
        isVisible={walletSelectorModalVisible}
        customSupportedCurrencies={
          fromCurrencyAbbreviation
            ? [fromCurrencyAbbreviation]
            : buyCryptoSupportedCoins
        }
        modalTitle={'Select Destination'}
        onDismiss={(newWallet?: Wallet) => {
          hideModal('walletSelector');
          if (newWallet) {
            setWallet(newWallet);
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
        currency={fiatCurrency}
      />
    </>
  );
};

export default BuyCryptoRoot;
