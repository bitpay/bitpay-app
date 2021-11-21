import {useNavigation} from '@react-navigation/core';
import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import AngleRight from '../../../../assets/img/angle-right.svg';
import {View} from 'react-native';
import {useDispatch} from 'react-redux';
import {openUrlWithInAppBrowser} from '../../../store/app/app.effects';

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
  height: 60px;
`;

export const Hr = styled.View`
  border-bottom-color: #ebecee;
  border-bottom-width: 1px;
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
        <Hr />
        {SETTINGS.map(({title, onPress}) => {
          return (
            <View key={title}>
              <Setting onPress={onPress}>
                <SettingTitle>{title}</SettingTitle>
                <AngleRight />
              </Setting>
              <Hr />
            </View>
          );
        })}
        {LINKS.map(({title, link}) => {
          return (
            <View key={title}>
              <Setting
                activeOpacity={1}
                onPress={() => dispatch(openUrlWithInAppBrowser(link))}>
                <SettingTitle>{title}</SettingTitle>
              </Setting>
              <Hr />
            </View>
          );
        })}
      </Settings>
    </SettingsContainer>
  );
};

export default SettingsHomeScreen;
