import React, {useState} from 'react';
import GlobalSelect, {
  GlobalSelectModalContext,
} from '../../../../navigation/wallet/screens/GlobalSelect';
import {Black, LightBlack, White} from '../../../../styles/colors';
import styled from 'styled-components/native';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {ScrollView} from 'react-native';
import {
  Column,
  CurrencyImageContainer,
} from '../../../../components/styled/Containers';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {H4, H5, SubText, TextAlign} from '../../../../components/styled/Text';
import {swapCryptoCoin} from '../screens/SwapCryptoRoot';

const GlobalSelectContainer = styled.View`
  flex: 1;
  background-color: ${({theme: {dark}}) => (dark ? Black : White)};
`;

const SwapCryptoHelpContainer = styled.View`
  padding: 20px 15px 0px 15px;
  background: ${({theme: {dark}}) => (dark ? LightBlack : White)};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  height: 75%;
`;

const RowContainer = styled.View`
  flex-direction: row;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 10px;
`;

export const CurrencyColumn = styled(Column)`
  margin-left: 8px;
`;
interface WalletSelectorModalProps {
  isVisible: boolean;
  customSupportedCurrencies?: swapCryptoCoin[];
  livenetOnly?: boolean;
  onDismiss: (toWallet?: any) => void;
  modalContext?: GlobalSelectModalContext;
  modalTitle?: string;
}

const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({
  isVisible,
  customSupportedCurrencies,
  livenetOnly,
  onDismiss,
  modalContext,
  modalTitle,
}) => {
  const [swapCryptoHelpVisible, setSwapCryptoHelpVisible] = useState(false);

  const _customSupportedCurrencies = customSupportedCurrencies?.map(
    ({currencyAbbreviation}) => currencyAbbreviation,
  );

  const onHelpPress = () => {
    setSwapCryptoHelpVisible(true);
  };

  return (
    <SheetModal isVisible={isVisible} onBackdropPress={onDismiss}>
      <GlobalSelectContainer>
        <GlobalSelect
          useAsModal={true}
          modalContext={modalContext}
          modalTitle={modalTitle}
          customSupportedCurrencies={_customSupportedCurrencies}
          onDismiss={onDismiss}
          livenetOnly={livenetOnly}
          onHelpPress={onHelpPress}
        />

        <SheetModal
          isVisible={swapCryptoHelpVisible}
          onBackdropPress={() => setSwapCryptoHelpVisible(false)}>
          <SwapCryptoHelpContainer>
            <TextAlign align={'center'}>
              <H4>What can I swap?</H4>
            </TextAlign>
            <TextAlign align={'center'}>
              {modalContext === 'send' ? (
                <SubText>
                  Below are the available coins/tokens that you can swap from.
                  If you are not able to see some of your wallets, remember that
                  your key must be backed up and have funds not locked due to
                  pending transactions.
                </SubText>
              ) : (
                <SubText>
                  Below are the available coins/tokens that you can swap to. If
                  you are not able to see some of your wallets, remember that
                  your key must be backed up.
                </SubText>
              )}
            </TextAlign>
            <ScrollView style={{marginTop: 20}}>
              {customSupportedCurrencies?.map((currency, index) => (
                <RowContainer key={index}>
                  <CurrencyImageContainer>
                    <CurrencyImage img={currency.logoUri} />
                  </CurrencyImageContainer>
                  <CurrencyColumn>
                    <H5>{currency.name}</H5>
                    {currency?.currencyAbbreviation ? (
                      <SubText>
                        {currency.currencyAbbreviation.toUpperCase()}
                      </SubText>
                    ) : null}
                  </CurrencyColumn>
                </RowContainer>
              ))}
            </ScrollView>
          </SwapCryptoHelpContainer>
        </SheetModal>
      </GlobalSelectContainer>
    </SheetModal>
  );
};

export default WalletSelectorModal;
