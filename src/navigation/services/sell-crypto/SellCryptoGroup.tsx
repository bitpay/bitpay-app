import React from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';
import SellCryptoRoot, {
  SellCryptoRootScreenParams,
} from './screens/SellCryptoRoot';
import MoonpaySellCheckout, {
  MoonpaySellCheckoutProps,
} from './screens/MoonpaySellCheckout';

interface SellCryptoProps {
  SellCrypto: typeof Root;
}

export type SellCryptoGroupParamList = {
  SellCryptoRoot: SellCryptoRootScreenParams;
  MoonpaySellCheckout: MoonpaySellCheckoutProps;
};

export enum SellCryptoScreens {
  ROOT = 'SellCryptoRoot',
  MOONPAY_SELL_CHECKOUT = 'MoonpaySellCheckout',
}

const SellCryptoGroup: React.FC<SellCryptoProps> = ({SellCrypto}) => {
  const {t} = useTranslation();
  return (
    <SellCrypto.Group
      screenOptions={({navigation}) => ({
        ...baseNavigatorOptions,
        headerLeft: () => (
          <HeaderBackButton
            onPress={() => {
              navigation.goBack();
            }}
            {...baseNativeHeaderBackButtonProps}
          />
        ),
      })}>
      <SellCrypto.Screen
        name={SellCryptoScreens.ROOT}
        component={SellCryptoRoot}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sell Crypto')}</HeaderTitle>,
        }}
      />
      <SellCrypto.Screen
        name={SellCryptoScreens.MOONPAY_SELL_CHECKOUT}
        component={MoonpaySellCheckout}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sell Crypto')}</HeaderTitle>,
        }}
      />
    </SellCrypto.Group>
  );
};

export default SellCryptoGroup;
