import {useNavigation} from '@react-navigation/core';
import React from 'react';
import styled from 'styled-components/native';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {StyleProp, TextStyle, View} from 'react-native';
import {useDispatch} from 'react-redux';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {Hr, Setting, SettingTitle} from '../../../components/styled/Containers';
import {useTheme} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

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

const SettingsHomeScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
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
      title: t('Contacts'),
      onPress: () => navigation.navigate('ContactSettings', {screen: 'Root'}),
    },
    {
      title: t('Notifications'),
      onPress: () =>
        navigation.navigate('NotificationSettings', {screen: 'Root'}),
    },
    {
      title: t('About BitPay'),
      onPress: () => navigation.navigate('About', {screen: 'Root'}),
    },
  ];

  const LINKS: LinkSetting[] = [
    {
      title: t('Help & Support'),
      link: 'https://support.bitpay.com/hc/en-us',
    },
    {
      title: t('Terms of Use'),
      link: 'https://bitpay.com/legal/terms-of-use/#wallet-terms-of-use',
    },
    {
      title: t('Privacy'),
      link: 'https://bitpay.com/about/privacy',
    },
    {
      title: t('Accessibility Statement'),
      link: 'https://bitpay.com/legal/accessibility/',
    },
  ];

  return (
    <SettingsContainer>
      <Settings>
        <Setting
          onPress={() => navigation.navigate('BitpayId', {screen: 'Profile'})}>
          <SettingTitle style={textStyle}>
            TODO: BITPAY ID PLACEHOLDER
          </SettingTitle>
        </Setting>

        <Hr />
        {SETTINGS.map(({title, onPress}) => {
          return (
            <View key={title}>
              <Setting onPress={onPress}>
                <SettingTitle style={textStyle}>{title}</SettingTitle>
                <AngleRight />
              </Setting>
              <Hr />
            </View>
          );
        })}
        {LINKS.map(({title, link}, index) => {
          return (
            <View key={title}>
              <Setting
                activeOpacity={1}
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
