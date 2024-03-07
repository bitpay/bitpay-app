import React from 'react';
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
import {HeaderTitle} from '../../../../components/styled/Text';
import Confirm, {
  GiftCardConfirmParamList,
} from '../../../wallet/screens/send/confirm/GiftCardConfirm';
import {useTranslation} from 'react-i18next';
import {Root} from '../../../../Root';
import {
  baseNativeHeaderBackButtonProps,
  baseNavigatorOptions,
} from '../../../../constants/NavigationOptions';
import {HeaderBackButton} from '@react-navigation/elements';
import GiftCardDeeplinkScreen, {
  GiftCardDeeplinkScreenParamList,
} from './GiftCardDeeplink';
import ArchivedGiftCards from './screens/ArchivedGiftCards';

interface GiftCardProps {
  GiftCard: typeof Root;
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

const GiftCardGroup: React.FC<GiftCardProps> = ({GiftCard}) => {
  const {t} = useTranslation();
  return (
    <GiftCard.Group
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
      <GiftCard.Screen
        name={GiftCardScreens.BUY_GIFT_CARD}
        component={BuyGiftCard}
      />
      <GiftCard.Screen
        name={GiftCardScreens.ENTER_EMAIL}
        component={EnterEmail}
        options={{
          headerTitle: () => <HeaderTitle>{t('Enter Email')}</HeaderTitle>,
        }}
      />
      <GiftCard.Screen
        name={GiftCardScreens.ENTER_PHONE}
        component={EnterPhone}
        options={{
          headerTitle: () => <HeaderTitle>{t('Enter Phone')}</HeaderTitle>,
        }}
      />
      <GiftCard.Screen
        name={GiftCardScreens.GIFT_CARD_DETAILS}
        component={GiftCardDetails}
        options={{
          gestureEnabled: false,
        }}
      />
      <GiftCard.Screen
        name={GiftCardScreens.GIFT_CARD_CONFIRM}
        component={Confirm}
        options={{
          gestureEnabled: false,
        }}
      />
      <GiftCard.Screen
        name={GiftCardScreens.GIFT_CARD_DEEPLINK}
        component={GiftCardDeeplinkScreen}
      />
      <GiftCard.Screen
        name={GiftCardScreens.ARCHIVED_GIFT_CARDS}
        component={ArchivedGiftCards}
        options={{
          headerTitle: () => (
            <HeaderTitle>{t('Archived Gift Cards')}</HeaderTitle>
          ),
        }}
      />
    </GiftCard.Group>
  );
};

export default GiftCardGroup;
