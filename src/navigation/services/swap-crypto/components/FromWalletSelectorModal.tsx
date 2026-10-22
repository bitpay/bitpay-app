import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView, StyleSheet, View} from 'react-native';
import {useTheme} from '../../../../contexts';
import {NavigationProp, RouteProp} from '@react-navigation/native';
import {WalletGroupParamList} from '../../../../navigation/wallet/WalletGroup';
import GlobalSelect, {
  GlobalSelectModalContext,
} from '../../../wallet/screens/GlobalSelect';
import {Black, LightBlack, White} from '../../../../styles/colors';
import SheetModal from '../../../../components/modal/base/sheet/SheetModal';
import {
  Column,
  CurrencyImageContainer,
} from '../../../../components/styled/Containers';
import {CurrencyImage} from '../../../../components/currency-image/CurrencyImage';
import {H4, H5, SubText, TextAlign} from '../../../../components/styled/Text';
import {SwapCryptoCoin} from '../screens/SwapCryptoRoot';
import {getBadgeImg} from '../../../../utils/helper-methods';
import {SwapCryptoGroupParamList, SwapCryptoScreens} from '../SwapCryptoGroup';
import {SellCryptoCoin} from '../../screens/BuyAndSellRoot';

const styles = StyleSheet.create({
  globalSelectContainer: {
    flex: 1,
  },
  swapCryptoHelpContainer: {
    paddingTop: 20,
    paddingRight: 15,
    paddingBottom: 0,
    paddingLeft: 15,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: '75%',
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  currencyColumn: {
    marginLeft: 8,
  },
});

const GlobalSelectContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.globalSelectContainer,
        {backgroundColor: theme.dark ? Black : White},
        style,
      ]}
      {...rest}
    />
  );
};

const SwapCryptoHelpContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.swapCryptoHelpContainer,
        {backgroundColor: theme.dark ? LightBlack : White},
        style,
      ]}
      {...rest}
    />
  );
};

const RowContainer: React.FC<React.ComponentProps<typeof View>> = ({
  style,
  ...rest
}) => <View style={[styles.rowContainer, style]} {...rest} />;

export const CurrencyColumn: React.FC<React.ComponentProps<typeof Column>> = ({
  style,
  ...rest
}) => <Column style={[styles.currencyColumn, style]} {...rest} />;
interface FromWalletSelectorModalProps {
  isVisible: boolean;
  customSupportedCurrencies?: SwapCryptoCoin[] | SellCryptoCoin[];
  livenetOnly?: boolean;
  onDismiss: (toWallet?: any) => void;
  modalContext?: GlobalSelectModalContext;
  modalTitle?: string;
  navigation: NavigationProp<any>;
  route:
    | RouteProp<WalletGroupParamList, 'GlobalSelect'>
    | RouteProp<SwapCryptoGroupParamList, SwapCryptoScreens.SWAP_CRYPTO_ROOT>;
}

const FromWalletSelectorModal: React.FC<FromWalletSelectorModalProps> = ({
  isVisible,
  customSupportedCurrencies,
  livenetOnly,
  onDismiss,
  modalContext,
  modalTitle,
  navigation,
  route,
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
    <SheetModal
      modalLibrary="bottom-sheet"
      isVisible={isVisible}
      onBackdropPress={() => onDismiss(undefined)}
      fullscreen>
      <GlobalSelectContainer>
        <GlobalSelect
          route={route}
          navigation={navigation}
          useAsModal={true}
          modalTitle={modalTitle}
          customSupportedCurrencies={_customSupportedCurrencies}
          globalSelectOnDismiss={onDismiss}
          modalContext={modalContext}
          livenetOnly={livenetOnly}
          onHelpPress={onHelpPress}
        />

        <SheetModal
          isVisible={swapCryptoHelpVisible}
          onBackdropPress={() => setSwapCryptoHelpVisible(false)}>
          <SwapCryptoHelpContainer>
            <TextAlign align={'center'}>
              {modalContext === 'swapFrom' ? (
                <H4>{t('What can I swap?')}</H4>
              ) : null}
              {modalContext === 'sell' ? (
                <H4>{t('What can I sell?')}</H4>
              ) : null}
            </TextAlign>
            <TextAlign align={'center'}>
              {modalContext === 'swapFrom' ? (
                <SubText>{t('swapFromWalletsConditionMessage')}</SubText>
              ) : null}
              {modalContext === 'sell' ? (
                <SubText>
                  {t(
                    'Below are the available coins/tokens that you can sell from. If you are not able to see some of your wallets, remember that your key must be backed up and have funds not locked due to pending transactions.',
                  )}
                </SubText>
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
