import React, {useEffect, useState} from 'react';
import styled from 'styled-components/native';
import cloneDeep from 'lodash.clonedeep';
import {
  // ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  // Linking,
  // Text,
} from 'react-native';
import {
  Action,
  LightBlack,
  NeutralSlate,
  SlateDark,
  White,
  Slate,
} from '../../../../styles/colors';
import {BaseText} from '../../../../components/styled/Text';
import ArrowDown from '../../../../../assets/img/services/swap-crypto/down-arrow.svg';
import SelectorArrowDown from '../../../../../assets/img/selector-arrow-down.svg';
import Button from '../../../../components/button/Button';
import FromWalletSelectorModal from '../components/FromWalletSelectorModal';
import ToWalletSelectorModal from '../components/ToWalletSelectorModal';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {SupportedCurrencyOptions} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {ItemProps} from '../../../../components/list/CurrencySelectionRow';
import {useTheme} from '@react-navigation/native';
import SelectorArrowRight from '../../../../../assets/img/selector-arrow-right.svg';
import {changellySupportedCoins, changellyGetCurrencies, changellyGetFixRateForAmount} from '../utils/changelly-utils';
import {Currencies} from '../../../../constants/currencies';
import AmountModal from '../components/AmountModal';
import {GetPrecision} from '../../../../store/wallet/utils/currency';

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const SwapCryptoCard = styled.View`
  border: 1px solid ${({theme: {dark}}) => (dark ? LightBlack : '#eaeaea')};
  border-radius: 9px;
  margin: 20px 15px;
  padding: 14px;
`;

const SummaryTitle = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
  margin-bottom: 15px;
`;

const ArrowContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
`;

const SelectorArrowContainer = styled.View`
  margin-left: 10px;
`;

const ActionsContainer = styled.View`
  display: flex;
  justify-content: space-between;
  flex-direction: row;
  align-items: center;
`;

const SelectedOptionContainer = styled.TouchableOpacity`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0px 14px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : NeutralSlate)};
  border-radius: 12px;
  opacity: ${({disabled}) => (disabled ? 0.2 : 1)};
`;

const SelectedOptionText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 16px;
  font-weight: 500;
`;

const SelectedOptionCol = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const CoinIconContainer = styled.View`
  width: 30px;
  height: 25px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const DataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 18px;
`;

const BottomDataText = styled(BaseText)`
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  font-size: 14px;
  margin-top: 14px;
`;

const SwapCryptoRoot: React.FC = () => {
  const theme = useTheme();
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
  const [swapCryptoSupportedCoinsFrom, setSwapCryptoSupportedCoinsFrom] = useState<string[]>([]);
  const [swapCryptoSupportedCoinsTo, setSwapCryptoSupportedCoinsTo] = useState<string[]>([]);

  const SupportedCurrencies = Object.keys(Currencies) as string[];

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
    return (!!toWalletSelected && !!fromWalletSelected && amountFrom > 0);
  }

  const isToWalletEnabled = (): boolean => {
    return (!!fromWalletSelected);
  }

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
    if (
      !fromWalletSelected ||
      !toWalletSelected ||
      !amountFrom
    ) {
      // this.loading = false;
      return;
    }

    console.log('======= executing updateReceivingAmount');

    if (
      fromWalletSelected.balance &&
      fromWalletSelected.balance.sat
    ) {
      const unitToSatoshi = GetPrecision(fromWalletSelected.currencyAbbreviation)?.unitToSatoshi;
      const unitDecimals = GetPrecision(fromWalletSelected.currencyAbbreviation)?.unitDecimals;
      if (unitToSatoshi && unitDecimals) {
        const satToUnit = 1 / unitToSatoshi;
  
        const spendableAmount = parseFloat((fromWalletSelected.balance.sat * satToUnit).toFixed(unitDecimals));
  
        // const spendableAmount = this.txFormatProvider.satToUnit(
        //   fromWalletSelected.balance.sat,
        //   fromWalletSelected.coin
        // );
  
        if (spendableAmount < amountFrom) {
          // this.loading = false;
          showError('You are trying to send more funds than you have available. Make sure you do not have funds locked by pending transaction proposals or enter a valid amount.');
          return;
        }
      }
    }

    const pair =
      fromWalletSelected.currencyAbbreviation + '_' + toWalletSelected.currencyAbbreviation;
    console.log('Updating receiving amount with pair: ' + pair);

    const data = {
      amountFrom: amountFrom,
      coinFrom: fromWalletSelected.currencyAbbreviation,
      coinTo: toWalletSelected.currencyAbbreviation
    };
    changellyGetFixRateForAmount(fromWalletSelected, data)
      .then((data: any) => {
        if (data.error) {
          const msg = 'Changelly getFixRateForAmount Error: ' + data.error.message;
          showError(msg);
          return;
        }

        console.log('=========changellyGetFixRateForAmount data:', data);

        // fixedRateId = data.result[0].id;
        // amountTo = Number(data.result[0].amountTo);
        // rate = Number(data.result[0].result); // result == rate
        // loading = false;
      })
      .catch((err: any) => {
        console.log('Changelly getFixRateForAmount Error: ', err);
        showError('Changelly is not available at this moment. Please, try again later.');
      });
  };

  const showError = (message: string) => {
    console.log('Error: ' + message);
  }

  useEffect(() => {
    const country = 'US';
    const getChangellyCurrencies = async () => {
      const changellyCurrenciesData = await changellyGetCurrencies(true);
      console.log('====== changellyCurrenciesData: ', changellyCurrenciesData);

      if (
        changellyCurrenciesData &&
        changellyCurrenciesData.result &&
        changellyCurrenciesData.result.length > 0
      ) {
        const supportedCoinsWithFixRateEnabled = changellyCurrenciesData.result
          .filter((coin: any) => coin.enabled && coin.fixRateEnabled)
          .map(({ name }: any) => name);

        // TODO: add support to float-rate coins supported by Changelly

        // Intersection
        const supportedCoins = SupportedCurrencies.filter(coin => supportedCoinsWithFixRateEnabled.includes(coin));

        const coinsToRemove = country == 'US' ? ['xrp'] : [];
        coinsToRemove.forEach((coin: string) => {
          const index = supportedCoins.indexOf(coin);
          if (index > -1) {
            console.log(
              `Removing ${coin.toUpperCase()} from Changelly supported coins`
            );
            supportedCoins.splice(index, 1);
          }
        });
        setSwapCryptoSupportedCoinsFrom(supportedCoins);
      }
    };

    getChangellyCurrencies().catch(console.error);
  }, []);

  useEffect(() => {
    updateWalletData();
  }, [fromWalletSelected, toWalletSelected]);

  useEffect(() => {
    updateReceivingAmount();
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
                  console.log('Swap crypto card clicked 1');
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
                    console.log('Swap crypto card clicked 1');
                    showModal('fromWalletSelector');
                  }}>
                  <SelectedOptionCol>
                    {fromWalletData && (
                      <CoinIconContainer>
                        <CurrencyImage img={fromWalletData.img} size={20} />
                      </CoinIconContainer>
                    )}
                    <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
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
                <BottomDataText>{fromWalletSelected.balance.crypto} {fromWalletSelected.currencyAbbreviation.toUpperCase()} available to swap</BottomDataText>
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
                if (!isToWalletEnabled()) return;
                console.log('Swap crypto card clicked 2');
                showModal('walletSelector');
              }}>
              <SelectedOptionText
                style={{color: White}}
                numberOfLines={1}
                ellipsizeMode={'tail'}>
                Select Wallet
              </SelectedOptionText>
              <SelectorArrowContainer>
                <SelectorArrowDown {...{width: 13, height: 13, color: White}} />
              </SelectorArrowContainer>
            </SelectedOptionContainer>
          </ActionsContainer>
          )}
          {toWalletSelected && (
            <ActionsContainer>
              <SelectedOptionContainer
                style={{minWidth: 120}}
                onPress={() => {
                  if (!isToWalletEnabled()) return;
                  console.log('Swap crypto card clicked 2');
                  showModal('walletSelector');
                }}>
                <SelectedOptionCol>
                  {toWalletData && (
                    <CoinIconContainer>
                      <CurrencyImage img={toWalletData.img} size={20} />
                    </CoinIconContainer>
                  )}
                  <SelectedOptionText numberOfLines={1} ellipsizeMode={'tail'}>
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
              <SelectedOptionCol>
                <DataText>
                  {toWalletSelected.walletName
                    ? toWalletSelected.walletName
                    : toWalletSelected.currencyName}
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
        </SwapCryptoCard>

        <CtaContainer>
          <Button
            buttonStyle={'primary'}
            disabled={!canContinue()}
            onPress={() => {
              // navigation.navigate('SwapCrypto', {
              //   screen: 'SwapCryptoCheckout',
              //   params: {
              //     amount,
              //     fiatCurrency: 'USD',
              //     coin: selectedWallet?.currencyAbbreviation || '',
              //     country,
              //     selectedWallet,
              //     paymentMethod: selectedPaymentMethod,
              //   },
              // });
            }}>
            Continue
          </Button>
        </CtaContainer>
      </ScrollView>

      <FromWalletSelectorModal
        onPress={(fromWallet: Wallet) => {
          hideModal('fromWalletSelector');
          setFromWalletSelected(fromWallet);
          // const coinsTo = cloneDeep(swapCryptoSupportedCoinsFrom).splice(swapCryptoSupportedCoinsFrom.indexOf(fromWallet.credentials.coin), 1);
          const coinsTo = cloneDeep(swapCryptoSupportedCoinsFrom).filter(coin => coin != fromWallet.credentials.coin);
          // debugger;
          // const index = swapCryptoSupportedCoinsFrom.indexOf(fromWallet.credentials.coin);
          // let coinsTo: string[] = [];
          // if (index > -1) {
          //   console.log(
          //     `Removing ${fromWallet.credentials.coin.toUpperCase()} from Changelly supported coins`
          //   );
          //   const daga = cloneDeep(swapCryptoSupportedCoinsFrom);
          //   coinsTo = daga.splice(index, 1);
          // }
          setSwapCryptoSupportedCoinsTo(coinsTo);
        }}
        customSupportedCurrencies={swapCryptoSupportedCoinsFrom}
        isVisible={fromWalletSelectorModalVisible}
        onBackdropPress={() => hideModal('fromWalletSelector')}
      />

      <ToWalletSelectorModal
        isVisible={walletSelectorModalVisible}
        customSupportedCurrencies={swapCryptoSupportedCoinsTo}
        onDismiss={(toWallet?: Wallet) => {
          hideModal('walletSelector');
          if (toWallet) {
            setToWalletSelected(toWallet);
          }
        }}
      />

      <AmountModal
        isVisible={amountModalVisible}
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
