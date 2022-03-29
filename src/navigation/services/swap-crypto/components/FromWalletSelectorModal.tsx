import React from 'react';
import {ScrollView, SafeAreaView, View} from 'react-native';
import {useSelector} from 'react-redux';
import {useNavigation} from '@react-navigation/native';
import {RootState} from '../../../../store';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import styled from 'styled-components/native';
import {
  ModalContainer,
  ModalHeader,
  ModalHeaderText,
  ModalHeaderRight,
} from '../styled/SwapCryptoModals';
import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyColumn} from '../../../../components/styled/Containers';
import {H5, SubText, BaseText} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import Button from '../../../../components/button/Button';
import {Wallet} from '../../../../store/wallet/wallet.models';
import {changellySupportedCoins} from '../utils/changelly-utils';

interface FromWalletSelectorModalProps {
  isVisible: boolean;
  customSupportedCurrencies: string[];
  onBackdropPress?: () => void;
  onPress?: (wallet: Wallet) => void;
}

const WalletRow = styled.TouchableOpacity`
  margin: 10px 0;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
`;

const NoWalletsMsg = styled(BaseText)`
  font-size: 15px;
  text-align: center;
  margin-top: 20px;
`;

const CtaContainer = styled.View`
  margin: 20px 15px;
`;

const FromWalletSelectorModal = ({
  isVisible,
  customSupportedCurrencies,
  onPress,
  onBackdropPress,
}: FromWalletSelectorModalProps) => {
  const navigation = useNavigation();
  const allKeys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const allKeysArray = Object.entries(allKeys);

  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={onBackdropPress ? onBackdropPress : () => {}}>
      <ModalContainer>
        <SafeAreaView style={{height: '100%'}}>
          <ModalHeader>
            <ModalHeaderText>Select Source Wallet</ModalHeaderText>
            <ModalHeaderRight>
              <Button
                buttonType={'pill'}
                buttonStyle={'cancel'}
                onPress={onBackdropPress ? onBackdropPress : () => {}}>
                Close
              </Button>
            </ModalHeaderRight>
          </ModalHeader>
          {allKeysArray.length > 0 && (
            <ScrollView>
              {allKeysArray.map(([key, value], index) => {
                return (
                  <View key={key}>
                    <SubText>{value.keyName}</SubText>
                    {value.wallets
                      .filter(wallet =>
                        customSupportedCurrencies.includes(
                          wallet.currencyAbbreviation,
                        ),
                      )
                      .map(wallet => {
                        return (
                          <WalletRow
                            key={wallet.id}
                            onPress={() => {
                              console.log(
                                'Wallet clicked: ',
                                wallet.currencyName,
                              );
                              onPress ? onPress(wallet) : () => {};
                            }}>
                            <CurrencyImage
                              img={
                                CurrencyListIcons[wallet.currencyAbbreviation]
                              }
                            />
                            <CurrencyColumn>
                              <H5>
                                {wallet.walletName
                                  ? wallet.walletName
                                  : wallet.currencyName}
                              </H5>
                              <SubText>
                                {wallet.currencyAbbreviation.toUpperCase()}
                              </SubText>
                            </CurrencyColumn>
                          </WalletRow>
                        );
                      })}
                  </View>
                );
              })}
            </ScrollView>
          )}
          {allKeysArray.length === 0 && (
            <>
              <NoWalletsMsg>
                There are no wallets with funds available to use this feature.
              </NoWalletsMsg>
              {/* <CtaContainer>
                <Button
                  buttonStyle={'primary'}
                  onPress={() => {
                    navigation.navigate('Wallet', {screen: 'CreationOptions'});
                  }}>
                  Create Wallet
                </Button>
              </CtaContainer> */}
            </>
          )}
        </SafeAreaView>
      </ModalContainer>
    </SheetModal>
  );
};

export default FromWalletSelectorModal;
