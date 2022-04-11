import React from 'react';
import {Settings} from '../SettingsRoot';
import {
  ActiveOpacity,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
// @ts-ignore
import {version} from '../../../../../package.json'; // TODO: better way to get version
import {useNavigation} from '@react-navigation/native';
import {URL} from '../../../../constants';
import {useTranslation} from 'react-i18next';
import {View} from 'react-native';
import {useDispatch} from 'react-redux';
import {openUrlWithInAppBrowser} from '../../../../store/app/app.effects';

interface LinkSetting {
  title: string;
  link: string;
}

const About = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const dispatch = useDispatch();

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
    <Settings>
      <Setting>
        <SettingTitle>Version</SettingTitle>

        <Button buttonType="pill">{version}</Button>
      </Setting>

      <Hr />

      <Setting
        onPress={() => navigation.navigate('About', {screen: 'SessionLogs'})}>
        <SettingTitle>Session Log</SettingTitle>
      </Setting>

      <Hr />

      <Setting
        onPress={() => navigation.navigate('About', {screen: 'SendFeedback'})}>
        <SettingTitle>Send Feedback</SettingTitle>
      </Setting>

      <Hr />
      {LINKS.map(({title, link}, index) => {
        return (
          <View key={title}>
            <Setting
              activeOpacity={ActiveOpacity}
              onPress={() => dispatch(openUrlWithInAppBrowser(link))}>
              <SettingTitle>{title}</SettingTitle>
            </Setting>
            {LINKS.length - 1 !== index && <Hr />}
          </View>
        );
      })}
    </Settings>
  );
};
export default About;
