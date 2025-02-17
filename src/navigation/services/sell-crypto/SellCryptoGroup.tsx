import React from 'react';
import {HeaderTitle} from '../../../components/styled/Text';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../Root';
import {baseNavigatorOptions} from '../../../constants/NavigationOptions';
import HeaderBackButton from '../../../components/back/HeaderBackButton';
import SellCryptoRoot, {
  SellCryptoRootScreenParams,
} from './screens/SellCryptoRoot';
import MoonpaySellCheckout, {
  MoonpaySellCheckoutProps,
} from './screens/MoonpaySellCheckout';
import RampSellCheckout, {
  RampSellCheckoutProps,
} from './screens/RampSellCheckout';
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
  RampSellCheckout: RampSellCheckoutProps;
  SimplexSellCheckout: SimplexSellCheckoutProps;
};

export enum SellCryptoScreens {
  ROOT = 'SellCryptoRoot',
  SELL_CRYPTO_OFFERS = 'SellCryptoOffers',
  MOONPAY_SELL_CHECKOUT = 'MoonpaySellCheckout',
  RAMP_SELL_CHECKOUT = 'RampSellCheckout',
  SIMPLEX_SELL_CHECKOUT = 'SimplexSellCheckout',
}

const SellCryptoGroup: React.FC<SellCryptoProps> = ({SellCrypto}) => {
  const {t} = useTranslation();
  return (
    <SellCrypto.Group
      screenOptions={() => ({
        ...baseNavigatorOptions,
        headerLeft: () => <HeaderBackButton />,
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
        name={SellCryptoScreens.RAMP_SELL_CHECKOUT}
        component={RampSellCheckout}
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
