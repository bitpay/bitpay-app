import React, {useEffect, useState} from 'react';
import {ScrollView} from 'react-native';
import {useSelector} from 'react-redux';
import {RouteProp} from '@react-navigation/core';
import {useNavigation, useRoute, useTheme} from '@react-navigation/native';
import styled from 'styled-components/native';
import {useAppDispatch} from '../../../../utils/hooks';
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
import {getCountry} from '../../../../lib/location/location';
import {simplexSupportedCoins} from '../utils/simplex-utils';
import {wyreSupportedCoins} from '../utils/wyre-utils';
import {sleep} from '../../../../utils/helper-methods';

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-left: 10px;
`;

const BuyCryptoRoot: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const theme = useTheme();
  const route = useRoute<RouteProp<BuyCryptoStackParamList, 'Root'>>();
  const allKeys = useSelector(({WALLET}: RootState) => WALLET.keys);

  const fromWallet = route.params?.fromWallet;
  const fromAmount = route.params?.amount;

  const [amount, setAmount] = useState<number>(fromAmount ? fromAmount : 0);
  const [selectedWallet, setSelectedWallet] = useState<Wallet>();
  const [walletData, setWalletData] = useState<ItemProps>();
  const [amountModalVisible, setAmountModalVisible] = useState(false);
  const [paymentMethodModalVisible, setPaymentMethodModalVisible] =
    useState(false);
  const [walletSelectorModalVisible, setWalletSelectorModalVisible] =
    useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    PaymentMethodsAvailable.debitCard,
  );
  const [country, setCountry] = useState('US');

  const supportedCoins = [
    ...new Set([...simplexSupportedCoins, ...wyreSupportedCoins]),
  ];

  const env = 'dev'; // TODO: take the correct environment

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
    const keysList = Object.values(allKeys).filter(
      key => key.show && key.backupComplete,
    );

    if (fromWallet && fromWallet.id) {
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
      if (keysList[0]) {
        const firstKey = keysList[0];
        const firstKeyAllWallets: Wallet[] = firstKey.wallets;
        const allowedWallets = firstKeyAllWallets.filter(
          wallet =>
            wallet.credentials &&
            ((wallet.credentials.network === 'livenet' &&
              supportedCoins.includes(wallet.credentials.coin.toLowerCase())) ||
              (env === 'dev' &&
                wallet.credentials.network === 'testnet' &&
                wyreSupportedCoins.includes(
                  wallet.credentials.coin.toLowerCase(),
                ))) &&
            wallet.isComplete(),
        );
        allowedWallets[0]
          ? setSelectedWallet(allowedWallets[0])
          : showError('noWalletsAbleToBuy');
      } else {
        showError('keyNeedsBackup');
      }
    }
  };

  const setWallet = (wallet: Wallet) => {
    if (
      wallet.credentials &&
      ((wallet.credentials.network === 'livenet' &&
        supportedCoins.includes(wallet.credentials.coin.toLowerCase())) ||
        (env === 'dev' &&
          wallet.credentials.network === 'testnet' &&
          wyreSupportedCoins.includes(wallet.credentials.coin.toLowerCase())))
    ) {
      if (wallet.isComplete()) {
        if (allKeys[wallet.keyId].backupComplete) {
          setSelectedWallet(wallet);
        } else {
          showError('keyNeedsBackup');
        }
      } else {
        showError('walletNotCompleted');
      }
    } else {
      showError('walletNotSupported');
    }
  };

  const showError = async (type?: string) => {
    let title, message: string;
    switch (type) {
      case 'walletNotSupported':
        title = 'Wallet not supported';
        message =
          'The selected wallet is currently not supported for buying cryptocurrencies';
        break;
      case 'keyNeedsBackup':
        title = 'Wallet needs backup';
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
        message = 'No wallets available to receive funds.';
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
    const getCountryData = async () => {
      const countryData = await getCountry();
      setCountry(countryData);
    };

    getCountryData().catch(console.error);
    selectFirstAvailableWallet();
  }, []);

  useEffect(() => {
    updateWalletData();
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
                <DataText>
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
              navigation.navigate('BuyCrypto', {
                screen: 'BuyCryptoOffers',
                params: {
                  amount,
                  fiatCurrency: 'USD',
                  coin: selectedWallet?.currencyAbbreviation || '',
                  country,
                  selectedWallet,
                  paymentMethod: selectedPaymentMethod,
                },
              });
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
        customSupportedCurrencies={supportedCoins}
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
      />
    </>
  );
};

export default BuyCryptoRoot;
