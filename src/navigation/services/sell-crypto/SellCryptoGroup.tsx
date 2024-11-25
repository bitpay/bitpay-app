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
import SimplexSellCheckout, {
  SimplexSellCheckoutProps,
} from './screens/SimplexSellCheckout';
import SellCryptoOffers, {
  SellCryptoOffersScreenParams,
} from './screens/SellCryptoOffers';

interface SellCryptoProps {
  SellCrypto: typeof Root;
}

export type SellCryptoGroupParamList = {
  SellCryptoRoot: SellCryptoRootScreenParams;
  SellCryptoOffers: SellCryptoOffersScreenParams;
  MoonpaySellCheckout: MoonpaySellCheckoutProps;
  SimplexSellCheckout: SimplexSellCheckoutProps;
};

export enum SellCryptoScreens {
  ROOT = 'SellCryptoRoot',
  SELL_CRYPTO_OFFERS = 'SellCryptoOffers',
  MOONPAY_SELL_CHECKOUT = 'MoonpaySellCheckout',
  SIMPLEX_SELL_CHECKOUT = 'SimplexSellCheckout',
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
          headerTitle: () => <HeaderTitle>{t('Order Summary')}</HeaderTitle>,
        }}
      />
      <SellCrypto.Screen
        name={SellCryptoScreens.SELL_CRYPTO_OFFERS}
        component={SellCryptoOffers}
        options={{
          headerTitle: () => <HeaderTitle>{t('Offers')}</HeaderTitle>,
        }}
      />
      <SellCrypto.Screen
        name={SellCryptoScreens.MOONPAY_SELL_CHECKOUT}
        component={MoonpaySellCheckout}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sell Crypto')}</HeaderTitle>,
        }}
      />
      <SellCrypto.Screen
        name={SellCryptoScreens.SIMPLEX_SELL_CHECKOUT}
        component={SimplexSellCheckout}
        options={{
          headerTitle: () => <HeaderTitle>{t('Sell Crypto')}</HeaderTitle>,
        }}
      />
    </SellCrypto.Group>
  );
};

export default SellCryptoGroup;
