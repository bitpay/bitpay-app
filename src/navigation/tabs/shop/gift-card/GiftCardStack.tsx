import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {
  baseNavigatorOptions,
  baseScreenOptions,
} from '../../../../constants/NavigationOptions';
import {
  CardConfig,
  GiftCard,
  PhoneCountryInfo,
} from '../../../../store/shop/shop.models';
import BuyGiftCard from './screens/BuyGiftCard';
import GiftCardDetails from './screens/GiftCardDetails';
import EnterPhone from './screens/EnterPhone';
import EnterEmail from './screens/EnterEmail';
import {HeaderTitle} from '../../../../components/styled/Text';
import Amount, {AmountParamList} from '../../../wallet/screens/Amount';
import Confirm, {
  GiftCardConfirmParamList,
} from '../../../wallet/screens/send/confirm/GiftCardConfirm';
import {useTranslation} from 'react-i18next';

export type GiftCardStackParamList = {
  BuyGiftCard: {cardConfig: CardConfig};
  EnterEmail: {
    cardConfig: CardConfig;
    initialEmail: string;
    onSubmit: (email: string) => void;
  };
  EnterPhone: {
    cardConfig: CardConfig;
    initialPhone: string;
    initialPhoneCountryInfo: PhoneCountryInfo;
    onSubmit: ({
      phone,
      phoneCountryInfo,
    }: {
      phone: string;
      phoneCountryInfo: PhoneCountryInfo;
    }) => void;
  };
  GiftCardDetails: {cardConfig: CardConfig; giftCard: GiftCard};
  GiftCardAmount: AmountParamList;
  GiftCardConfirm: GiftCardConfirmParamList;
};

export enum GiftCardScreens {
  BUY_GIFT_CARD = 'BuyGiftCard',
  ENTER_EMAIL = 'EnterEmail',
  ENTER_PHONE = 'EnterPhone',
  GIFT_CARD_DETAILS = 'GiftCardDetails',
  GIFT_CARD_DETAILS_MODAL = 'GiftCardDetailsModal',
  GIFT_CARD_AMOUNT = 'GiftCardAmount',
  GIFT_CARD_CONFIRM = 'GiftCardConfirm',
}

const GiftCards = createStackNavigator<GiftCardStackParamList>();

const GiftCardStack = () => {
  const {t} = useTranslation();
  return (
    <GiftCards.Navigator
      initialRouteName={GiftCardScreens.BUY_GIFT_CARD}
      screenOptions={{
        ...baseNavigatorOptions,
        ...baseScreenOptions,
      }}>
      <GiftCards.Screen
        name={GiftCardScreens.BUY_GIFT_CARD}
        component={BuyGiftCard}
      />
      <GiftCards.Screen
        name={GiftCardScreens.ENTER_EMAIL}
        component={EnterEmail}
        options={{
          headerTitle: () => <HeaderTitle>{t('Enter Email')}</HeaderTitle>,
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.ENTER_PHONE}
        component={EnterPhone}
        options={{
          headerTitle: () => <HeaderTitle>{t('Enter Phone')}</HeaderTitle>,
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.GIFT_CARD_DETAILS}
        component={GiftCardDetails}
        options={{
          gestureEnabled: false,
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.GIFT_CARD_AMOUNT}
        component={Amount}
        options={{
          gestureEnabled: false,
        }}
      />
      <GiftCards.Screen
        name={GiftCardScreens.GIFT_CARD_CONFIRM}
        component={Confirm}
        options={{
          gestureEnabled: false,
        }}
      />
    </GiftCards.Navigator>
  );
};

export default GiftCardStack;
