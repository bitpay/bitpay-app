import {useNavigation} from '@react-navigation/core';
import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {StyleProp, TextStyle, View} from 'react-native';
import {useDispatch} from 'react-redux';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';
import {Hr} from '../../../components/styled/Containers';
import {useTheme} from '@react-navigation/native';

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

export const Setting = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 58px;
`;

export const SettingTitle = styled(BaseText)`
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  text-align: left;
`;

const SettingsHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const SETTINGS: HomeSetting[] = [
    {
      title: 'General',
      onPress: () => navigation.navigate('GeneralSettings', {screen: 'Root'}),
    },
    {
      title: 'Security',
      onPress: () => navigation.navigate('SecuritySettings', {screen: 'Root'}),
    },
    {
      title: 'Contacts',
      onPress: () => navigation.navigate('ContactSettings', {screen: 'Root'}),
    },
    {
      title: 'Notifications',
      onPress: () =>
        navigation.navigate('NotificationSettings', {screen: 'Root'}),
    },
    {
      title: 'About BitPay',
      onPress: () => navigation.navigate('About', {screen: 'Root'}),
    },
  ];

  const LINKS: LinkSetting[] = [
    {
      title: 'Help & Support',
      link: 'https://support.bitpay.com/hc/en-us',
    },
    {
      title: 'Terms of Use',
      link: 'https://bitpay.com/legal/terms-of-use/#wallet-terms-of-use',
    },
    {
      title: 'Privacy',
      link: 'https://bitpay.com/about/privacy',
    },
    {
      title: 'Accessibility Statement',
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
