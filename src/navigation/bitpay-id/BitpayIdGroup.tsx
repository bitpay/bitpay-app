import React from 'react';
import {Theme} from '@react-navigation/native';
import Button from '../../components/button/Button';
import haptic from '../../components/haptic-feedback/haptic';
import {HeaderRightContainer} from '../../components/styled/Containers';
import {HeaderTitle} from '../../components/styled/Text';
import {BitPayIdEffects} from '../../store/bitpay-id';
import {ShopEffects} from '../../store/shop';
import {useAppDispatch, useAppSelector} from '../../utils/hooks';
import PairingScreen, {
  BitPayIdPairingScreenParamList,
} from './screens/BitPayIdPairingScreen';
import Profile from './screens/ProfileSettings';
import ReceiveSettings from './screens/ReceiveSettings';
import {useTranslation} from 'react-i18next';
import ReceivingEnabled from './screens/ReceivingEnabled';
import EnableTwoFactor, {
  EnableTwoFactorScreenParamList,
} from './screens/EnableTwoFactor';
import TwoFactorEnabled, {
  TwoFactorEnabledScreenParamList,
} from './screens/TwoFactorEnabled';
import {Root, navigationRef} from '../../Root';
import {useStackScreenOptions} from '../utils/headerHelpers';

interface BitpayIdProps {
  BitpayId: typeof Root;
  theme: Theme;
}

export type BitpayIdGroupParamList = {
  BitPayIdPairingScreen: BitPayIdPairingScreenParamList;
  BitPayIdProfile: undefined;
  ReceiveSettings: undefined;
  ReceivingEnabled: undefined;
  EnableTwoFactor: EnableTwoFactorScreenParamList;
  TwoFactorEnabled: TwoFactorEnabledScreenParamList;
};

export enum BitpayIdScreens {
  PAIRING = 'BitPayIdPairingScreen',
  PROFILE = 'BitPayIdProfile',
  RECEIVE_SETTINGS = 'ReceiveSettings',
  RECEIVING_ENABLED = 'ReceivingEnabled',
  ENABLE_TWO_FACTOR = 'EnableTwoFactor',
  TWO_FACTOR = 'TwoFactor',
  TWO_FACTOR_ENABLED = 'TwoFactorEnabled',
}

const BitpayIdGroup: React.FC<BitpayIdProps> = ({BitpayId, theme}) => {
  const commonOptions = useStackScreenOptions(theme);
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );

  return (
    <BitpayId.Group screenOptions={commonOptions}>
      <BitpayId.Screen
        name={BitpayIdScreens.PAIRING}
        component={PairingScreen}
        options={{
          headerTitle: () => <HeaderTitle>{t('Pairing...')}</HeaderTitle>,
        }}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.PROFILE}
        component={Profile}
        options={{
          headerRight: () => {
            return (
              <HeaderRightContainer>
                {user ? (
                  <Button
                    buttonType={'pill'}
                    onPress={async () => {
                      haptic('impactLight');

                      await dispatch(BitPayIdEffects.startDisconnectBitPayId());
                      dispatch(ShopEffects.startFetchCatalog());

                      navigationRef.navigate('Tabs', {
                        screen: 'Home',
                      });
                    }}>
                    {t('Log Out')}
                  </Button>
                ) : (
                  <Button
                    buttonType={'pill'}
                    onPress={() => {
                      haptic('impactLight');
                      navigationRef.navigate('Login');
                    }}>
                    {t('Log In')}
                  </Button>
                )}
              </HeaderRightContainer>
            );
          },
        }}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.RECEIVE_SETTINGS}
        component={ReceiveSettings}
        options={{
          headerTitle: () => <HeaderTitle>{t('Receive Settings')}</HeaderTitle>,
        }}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.RECEIVING_ENABLED}
        component={ReceivingEnabled}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.ENABLE_TWO_FACTOR}
        component={EnableTwoFactor}
      />
      <BitpayId.Screen
        name={BitpayIdScreens.TWO_FACTOR_ENABLED}
        component={TwoFactorEnabled}
        options={{
          headerLeft: () => null,
        }}
      />
    </BitpayId.Group>
  );
};

export default BitpayIdGroup;
