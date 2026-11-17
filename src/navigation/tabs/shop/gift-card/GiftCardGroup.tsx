import React from 'react';
import {t as i18nextT} from 'i18next';
const t = i18nextT as (key: string) => string;
import {Theme} from '@react-navigation/native';
import {useStackScreenOptions} from '../../../utils/headerHelpers';
import {HeaderTitle} from '../../../../components/styled/Text';
import {Root} from '../../../../Root';
import ArchivedGiftCards from './screens/ArchivedGiftCards';
import GiftCardDeeplinkScreen, {
  GiftCardDeeplinkScreenParamList,
} from './GiftCardDeeplink';
import {
  CardConfig,
  CardConfigMap,
  GiftCard,
  PhoneCountryInfo,
} from '../../../../store/shop/shop.models';
import BuyGiftCard from './screens/BuyGiftCard';
import GiftCardDetails from './screens/GiftCardDetails';
import EnterPhone from './screens/EnterPhone';
import EnterEmail from './screens/EnterEmail';
import Confirm, {
  GiftCardConfirmParamList,
} from '../../../wallet/screens/send/confirm/GiftCardConfirm';

interface GiftCardProps {
  GiftCard: typeof Root;
  theme: Theme;
}

export type GiftCardGroupParamList = {
  ArchivedGiftCards: {
    giftCards: GiftCard[];
    supportedGiftCardMap: CardConfigMap;
  };
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
  GiftCardConfirm: GiftCardConfirmParamList;
  GiftCardDeeplink: GiftCardDeeplinkScreenParamList;
};

export enum GiftCardScreens {
  ARCHIVED_GIFT_CARDS = 'ArchivedGiftCards',
  BUY_GIFT_CARD = 'BuyGiftCard',
  ENTER_EMAIL = 'EnterEmail',
  ENTER_PHONE = 'EnterPhone',
  GIFT_CARD_DETAILS = 'GiftCardDetails',
  GIFT_CARD_DETAILS_MODAL = 'GiftCardDetailsModal',
  GIFT_CARD_CONFIRM = 'GiftCardConfirm',
  GIFT_CARD_DEEPLINK = 'GiftCardDeeplink',
}

const GiftCardGroup = ({GiftCard: GiftCardStack, theme}: GiftCardProps) => {
  const commonOptions = useStackScreenOptions(theme);
  return (
    <GiftCardStack.Group screenOptions={commonOptions}>
      <GiftCardStack.Screen
        name={GiftCardScreens.BUY_GIFT_CARD}
        component={BuyGiftCard}
      />
      <GiftCardStack.Screen
        name={GiftCardScreens.ENTER_EMAIL}
        component={EnterEmail}
        options={{
          headerTitle: () => <HeaderTitle>{t('Enter Email')}</HeaderTitle>,
        }}
      />
      <GiftCardStack.Screen
        name={GiftCardScreens.ENTER_PHONE}
        component={EnterPhone}
        options={{
          headerTitle: () => <HeaderTitle>{t('Enter Phone')}</HeaderTitle>,
        }}
      />
      <GiftCardStack.Screen
        name={GiftCardScreens.GIFT_CARD_DETAILS}
        component={GiftCardDetails}
        options={{
          gestureEnabled: false,
        }}
      />
      <GiftCardStack.Screen
        name={GiftCardScreens.GIFT_CARD_CONFIRM}
        component={Confirm}
        options={{
          gestureEnabled: false,
        }}
      />
      <GiftCardStack.Screen
        name={GiftCardScreens.GIFT_CARD_DEEPLINK}
        component={GiftCardDeeplinkScreen}
      />
      <GiftCardStack.Screen
        name={GiftCardScreens.ARCHIVED_GIFT_CARDS}
        component={ArchivedGiftCards}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Archived Gift Cards')}</HeaderTitle>
          ),
        }}
      />
    </GiftCardStack.Group>
  );
};

export default GiftCardGroup;
