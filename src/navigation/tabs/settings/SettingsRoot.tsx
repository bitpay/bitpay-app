import {useNavigation} from '@react-navigation/core';
import React from 'react';
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
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {User} from '../../../store/bitpay-id/bitpay-id.models';
import {URL} from '../../../constants';

interface HomeSetting {
  title: string;
  onPress: () => void;
}

interface LinkSetting {
  title: string;
  link: string;
}

export const SettingsContainer = styled.SafeAreaView`
  flex: 1;
`;

export const Settings = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
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

const SettingsHomeScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const user = useSelector<RootState, User | null>(
    ({APP, BITPAY_ID}) => BITPAY_ID.user[APP.network],
  );
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const SETTINGS: HomeSetting[] = [
    {
      title: t('General'),
      onPress: () => navigation.navigate('GeneralSettings', {screen: 'Root'}),
    },
    {
      title: t('Security'),
      onPress: () => navigation.navigate('SecuritySettings', {screen: 'Root'}),
    },
    {
      title: t('Notifications'),
      onPress: () =>
        navigation.navigate('NotificationSettings', {screen: 'Root'}),
    },
    {
      title: t('Connections'),
      onPress: () =>
        navigation.navigate('ConnectionSettings', {screen: 'Root'}),
    },
    {
      title: t('About BitPay'),
      onPress: () => navigation.navigate('About', {screen: 'Root'}),
    },
  ];

  const LINKS: LinkSetting[] = [
    {
      title: t('Help & Support'),
      link: URL.HELP_AND_SUPPORT,
    },
    {
      title: t('Terms of Use'),
      link: URL.TOU_WALLET,
    },
    {
      title: t('Privacy'),
      link: URL.PRIVACY_POLICY,
    },
    {
      title: t('Accessibility Statement'),
      link: URL.ACCESSIBILITY_STATEMENT,
    },
  ];

  return (
    <SettingsContainer>
      <Settings>
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
              <BitPayIdUserText bold>
                {user.givenName} {user.familyName}
              </BitPayIdUserText>
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

        {SETTINGS.map(({title, onPress}) => {
          return (
            <View key={title}>
              <Setting activeOpacity={ActiveOpacity} onPress={onPress}>
                <SettingTitle style={textStyle}>{title}</SettingTitle>
                <SettingIcon suffix>
                  <AngleRight />
                </SettingIcon>
              </Setting>
              <Hr />
            </View>
          );
        })}
        {LINKS.map(({title, link}, index) => {
          return (
            <View key={title}>
              <Setting
                activeOpacity={ActiveOpacity}
                onPress={() => dispatch(openUrlWithInAppBrowser(link))}>
                <SettingTitle style={textStyle}>{title}</SettingTitle>
              </Setting>
              {LINKS.length - 1 !== index && <Hr />}
            </View>
          );
        })}
      </Settings>
    </SettingsContainer>
  );
};

export default SettingsHomeScreen;
