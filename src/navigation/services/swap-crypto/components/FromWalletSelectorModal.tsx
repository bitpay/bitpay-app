import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import GlobalSelect, {
  GlobalSelectModalContext,
} from '../../../wallet/screens/GlobalSelect';
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
import {SwapCryptoCoin} from '../screens/SwapCryptoRoot';
import {getBadgeImg} from '../../../../utils/helper-methods';

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
interface FromWalletSelectorModalProps {
  isVisible: boolean;
  customSupportedCurrencies?: SwapCryptoCoin[];
  livenetOnly?: boolean;
  onDismiss: (toWallet?: any) => void;
  modalContext?: GlobalSelectModalContext;
  modalTitle?: string;
}

const FromWalletSelectorModal: React.FC<FromWalletSelectorModalProps> = ({
  isVisible,
  customSupportedCurrencies,
  livenetOnly,
  onDismiss,
  modalContext,
  modalTitle,
}) => {
  const {t} = useTranslation();
  const [swapCryptoHelpVisible, setSwapCryptoHelpVisible] = useState(false);

  const _customSupportedCurrencies = customSupportedCurrencies?.map(
    ({symbol}) => symbol,
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
              <H4>{t('What can I swap?')}</H4>
            </TextAlign>
            <TextAlign align={'center'}>
              {modalContext === 'send' ? (
                <SubText>{t('swapFromWalletsConditionMessage')}</SubText>
              ) : null}
            </TextAlign>
            <ScrollView style={{marginTop: 20}}>
              {customSupportedCurrencies?.map((currency, index) => (
                <RowContainer key={index}>
                  <CurrencyImageContainer>
                    <CurrencyImage
                      img={currency.logoUri}
                      badgeUri={getBadgeImg(
                        currency.currencyAbbreviation,
                        currency.chain,
                      )}
                    />
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

export default FromWalletSelectorModal;
