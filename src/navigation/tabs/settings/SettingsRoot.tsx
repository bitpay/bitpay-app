import {useNavigation} from '@react-navigation/core';
import React, {ReactElement} from 'react';
import styled, {useTheme} from 'styled-components/native';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {StyleProp, TextStyle, View} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import Avatar from '../../../components/avatar/BitPayIdAvatar';
import {
  ActiveOpacity,
  Hr,
  ScreenGutter,
  Setting,
  SettingIcon,
  SettingTitle,
} from '../../../components/styled/Containers';
import {useTranslation} from 'react-i18next';
import {RootState} from '../../../store';
import {AppActions} from '../../../store/app';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
import General from './components/General';
import {Feather, LightBlack} from '../../../styles/colors';
import Security from './components/Security';
import Notifications from './components/Notifications';
import Connections from './components/Connections';
import About from './components/About';

interface HomeSetting {
  title: string;
  onPress: () => void;
  show: boolean;
  subListComponent: ReactElement;
}

export const SettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

export const Settings = styled.ScrollView`
  padding: 10px ${ScreenGutter};
`;

export const SettingsHome = styled.ScrollView`
  padding: 10px 0;
`;

const BitPayIdSettingsLink = styled(Setting)`
  height: auto;
  margin-bottom: 32px;
`;

const BitPayIdAvatarContainer = styled.View`
  margin-right: ${ScreenGutter};
`;

const BitPayIdUserContainer = styled.View`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
`;

const BitPayIdSettingTitle = styled(SettingTitle)`
  color: ${({theme}) => theme.colors.text};
  flex-grow: 1;
`;

const BitPayIdUserText = styled.Text<{bold?: boolean}>`
  display: flex;
  font-size: 14px;
  line-height: 19px;
  font-weight: ${({bold}) => (bold ? 700 : 400)};
  color: ${({theme}) => theme.colors.text};
`;

const DropdownSetting = styled(Setting)`
  background-color: ${({theme: {dark}}) => (dark ? LightBlack : Feather)};
  padding: 0 ${ScreenGutter};
`;

const SettingsHomeScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const user = useSelector<RootState, User | null>(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const pinLockActive = useSelector(({APP}: RootState) => APP.pinLockActive);
  const biometricLockActive = useSelector(
    ({APP}: RootState) => APP.biometricLockActive,
  );
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};

  const SETTINGS: HomeSetting[] = [
    {
      title: t('General'),
      onPress: () => {},
      show: true,
      subListComponent: <General />,
    },
    {
      title: t('Security'),
      onPress: () => {
        if (biometricLockActive) {
          dispatch(AppActions.showBiometricModal());
        }
        if (pinLockActive) {
          dispatch(AppActions.showPinModal({type: 'check'}));
        }
      },
      show: true,
      subListComponent: <Security />,
    },
    {
      // Settings for Buy/Swap Crypto will be momentarily commented
      title: t('External Services'),
      onPress: () => {},
      show: true,
      subListComponent: <Notifications />,
    },
    {
      title: t('Connections'),
      onPress: () => {},
      show: true,
      subListComponent: <Connections />,
    },
    {
      title: t('About BitPay'),
      onPress: () => {},
      show: true,
      subListComponent: <About />,
    },
  ];

  return (
    <SettingsContainer>
      <SettingsHome>
        <BitPayIdSettingsLink
          onPress={() => {
            if (user) {
              navigation.navigate('BitpayId', {screen: 'Profile'});
            } else {
              navigation.navigate('Auth', {screen: 'Login'});
            }
          }}>
          <BitPayIdAvatarContainer>
            <Avatar size={50} />
          </BitPayIdAvatarContainer>
          {user ? (
            <BitPayIdUserContainer>
              {user.givenName || user.familyName ? (
                <BitPayIdUserText bold>
                  {user.givenName} {user.familyName}
                </BitPayIdUserText>
              ) : null}
              <BitPayIdUserText>{user.email}</BitPayIdUserText>
            </BitPayIdUserContainer>
          ) : (
            <BitPayIdSettingTitle>Log In or Sign Up</BitPayIdSettingTitle>
          )}
          <SettingIcon suffix>
            <AngleRight />
          </SettingIcon>
        </BitPayIdSettingsLink>

        <Hr />

        {SETTINGS.map(({title, onPress, show, subListComponent}) => {
          return (
            <View key={title}>
              <DropdownSetting activeOpacity={ActiveOpacity} onPress={onPress}>
                <SettingTitle style={textStyle}>{title}</SettingTitle>
                <SettingIcon suffix>
                  <AngleRight />
                </SettingIcon>
              </DropdownSetting>
              {show ? <>{subListComponent}</> : null}
            </View>
          );
        })}
      </SettingsHome>
    </SettingsContainer>
  );
};

export default SettingsHomeScreen;
