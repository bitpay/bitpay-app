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
} from '../styled/BuyCryptoModals';
import {CurrencyListIcons} from '../../../../constants/SupportedCurrencyOptions';
import {CurrencyColumn} from '../../../../components/styled/Containers';
import {H5, SubText, BaseText} from '../../../../components/styled/Text';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import Button from '../../../../components/button/Button';

// TODO: This component is for testing purposes only. It will be replaced when we finally have a "coin and wallet selector" component implemented

interface WalletSelectorModalProps {
  isVisible: boolean;
  onBackdropPress?: () => void;
  onPress?: (wallet: any) => any;
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

const WalletSelectorModal = ({
  isVisible,
  onPress,
  onBackdropPress,
}: WalletSelectorModalProps) => {
  const navigation = useNavigation();
  const allKeys = useSelector(({WALLET}: RootState) => WALLET.keys);
  const allKeysArray = Object.entries(allKeys);

  return (
    <SheetModal
      isVisible={isVisible}
      onBackdropPress={onBackdropPress ? onBackdropPress : () => {}}>
      <ModalContainer>
        <SafeAreaView>
          <ModalHeader>
            <ModalHeaderText>Select a wallet</ModalHeaderText>
            <ModalHeaderRight>
              <Button
                buttonType={'pill'}
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
                    <SubText>Key {index + 1}</SubText>
                    {value.wallets.map(wallet => {
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
                            img={CurrencyListIcons[wallet.currencyAbbreviation]}
                          />
                          <CurrencyColumn>
                            <H5>{wallet.currencyName}</H5>
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
                There are no wallets available to deposit funds.
              </NoWalletsMsg>
              <CtaContainer>
                <Button
                  buttonStyle={'primary'}
                  onPress={() => {
                    navigation.navigate('Wallet', {screen: 'CreationOptions'});
                  }}>
                  Create Wallet
                </Button>
              </CtaContainer>
            </>
          )}
        </SafeAreaView>
      </ModalContainer>
    </SheetModal>
  );
};

export default WalletSelectorModal;
