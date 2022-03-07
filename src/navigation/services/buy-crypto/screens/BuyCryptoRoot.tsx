import React, {useEffect, useState} from 'react';
import {ScrollView} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {RouteProp} from '@react-navigation/core';
import {useNavigation, useRoute} from '@react-navigation/native';
import styled from 'styled-components/native';
import {BuyCryptoStackParamList} from '../BuyCryptoStack';
import {PaymentMethodsAvailable} from '../constants/BuyCryptoConstants';
import PaymentMethodsModal from '../components/PaymentMethodModal';
import WalletSelectorModal from '../components/WalletSelectorModal';
import AmountModal from '../components/AmountModal';
import {
  BuyCryptoItemCard,
  BuyCryptoItemTitle,
  ActionsContainer,
  SelectedOptionContainer,
  SelectedOptionText,
  DataText,
  CoinIconContainer,
} from '../styled/BuyCryptoCard';
import Button from '../../../../components/button/Button';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {ItemProps} from '../../../../components/list/CurrencySelectionRow';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {RootState} from '../../../../store';
import {AppActions} from '../../../../store/app';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {startOnGoingProcessModal} from '../../../../store/app/app.effects';
import {Action, White} from '../../../../styles/colors';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import {getCountry} from '../../../../lib/location/location';

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const ArrowContainer = styled.View`
  margin-right: 5px;
`;

const BuyCryptoRoot: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<BuyCryptoStackParamList, 'Root'>>();
  const allKeys: any = useSelector(({WALLET}: RootState) => WALLET.keys);

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
    setWalletData(
      SupportedCurrencyOptions.find(
        wallet =>
          selectedWallet && wallet.id == selectedWallet.credentials.coin,
      ),
    );
  };

  useEffect(() => {
    dispatch(startOnGoingProcessModal(OnGoingProcessMessages.GENERAL_AWAITING));

    const getCountryData = async () => {
      const countryData = await getCountry();
      setCountry(countryData);
    };

    const keysList = Object.values(allKeys).filter((key: any) => key.show);

    if (fromWallet && fromWallet.id) {
      let fromWalletData;
      let allWallets: any[] = [];

      keysList.forEach((key: any) => {
        allWallets = [...allWallets, ...key.wallets];
      });

      fromWalletData = allWallets.find(wallet => wallet.id == fromWallet.id);
      fromWalletData
        ? setSelectedWallet(fromWalletData)
        : console.log('Error setting wallet from params');
    } else {
      if (allKeys) {
        const firstKey: any = keysList[0];
        const firstKeyAllWallets: any[] = firstKey.wallets;
        const allowedWallets = firstKeyAllWallets.filter(
          wallet =>
            wallet.credentials && wallet.credentials.network == 'livenet',
        );
        setSelectedWallet(allowedWallets[0]);
      }
    }

    getCountryData().catch(console.error);

    setTimeout(() => {
      dispatch(AppActions.dismissOnGoingProcessModal());
    }, 1000);
  }, []);

  useEffect(() => {
    updateWalletData();
  }, [selectedWallet]);

  return (
    <>
      <ScrollView>
        <BuyCryptoItemCard>
          <BuyCryptoItemTitle>Amount</BuyCryptoItemTitle>
          <ActionsContainer
            onPress={() => {
              // navigation.goBack();
              showModal('amount');
            }}>
            <SelectedOptionContainer>
              <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                USD
              </SelectedOptionText>
            </SelectedOptionContainer>
            <DataText>{amount}</DataText>
          </ActionsContainer>
        </BuyCryptoItemCard>

        <BuyCryptoItemCard>
          <BuyCryptoItemTitle>Deposit to</BuyCryptoItemTitle>
          {!selectedWallet && (
            <ActionsContainer
              onPress={() => {
                showModal('walletSelector');
              }}>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Destination
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{width: 20, height: 20, color: 'white'}}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
            </ActionsContainer>
          )}
          {selectedWallet && (
            <ActionsContainer
              onPress={() => {
                showModal('walletSelector');
              }}>
              <SelectedOptionContainer>
                {walletData && (
                  <CoinIconContainer>
                    <CurrencyImage img={walletData.img} size={25} />
                  </CoinIconContainer>
                )}
                <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
                  {selectedWallet.credentials.coin.toUpperCase()}
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{width: 20, height: 20, color: 'white'}}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
              <DataText>{selectedWallet.currencyName}</DataText>
            </ActionsContainer>
          )}
        </BuyCryptoItemCard>

        <BuyCryptoItemCard>
          <BuyCryptoItemTitle>Payment Method</BuyCryptoItemTitle>
          {!selectedPaymentMethod && (
            <ActionsContainer
              onPress={() => {
                showModal('paymentMethod');
              }}>
              <SelectedOptionContainer style={{backgroundColor: Action}}>
                <SelectedOptionText
                  style={{color: White}}
                  numberOfLines={1}
                  ellipsizeMode={'tail'}>
                  Select Payment Method
                </SelectedOptionText>
                <ArrowContainer>
                  <SelectorArrowDown
                    {...{width: 20, height: 20, color: 'white'}}
                  />
                </ArrowContainer>
              </SelectedOptionContainer>
            </ActionsContainer>
          )}
          {selectedPaymentMethod && (
            <ActionsContainer
              onPress={() => {
                showModal('paymentMethod');
              }}>
              <DataText>{selectedPaymentMethod.label}</DataText>
              {selectedPaymentMethod && selectedPaymentMethod.imgSrc}
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
        openedFrom={'buyCrypto'}
        isVisible={amountModalVisible}
        onDismiss={(newAmount?: number) => {
          console.log(
            'Dismissing Amount Modal and setting new amount: ',
            newAmount,
          );
          if (newAmount) {
            setAmount(newAmount);
          }
          setAmountModalVisible(false);
        }}
      />

      <WalletSelectorModal
        onPress={wallet => {
          setSelectedWallet(wallet);
          hideModal('walletSelector');
        }}
        isVisible={walletSelectorModalVisible}
        onBackdropPress={() => hideModal('walletSelector')}
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
