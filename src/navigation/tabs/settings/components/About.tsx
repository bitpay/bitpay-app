import React from 'react';
import {SettingsComponent} from '../SettingsRoot';
import {
  ActiveOpacity,
  Hr,
  Setting,
  SettingTitle,
} from '../../../../components/styled/Containers';
import Button from '../../../../components/button/Button';
import {useNavigation} from '@react-navigation/native';
import {URL} from '../../../../constants';
import {APP_VERSION} from '../../../../constants/config';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';
import {
  openUrlWithInAppBrowser,
  shareApp,
} from '../../../../store/app/app.effects';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {GIT_COMMIT_HASH} from '@env';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {useAppDispatch} from '../../../../utils/hooks';
import {triggerJsCrash, triggerNativeCrash} from '../../../../lib/crash-test';
import {useTheme} from '../../../../contexts';
import {BaseText} from '../../../../components/styled/Text';
import {Action, Air, Midnight, White} from '../../../../styles/colors';

interface LinkSetting {
  key: string;
  title: string;
  link: string;
}

const styles = StyleSheet.create({
  infoPill: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  infoPillText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22.03,
    textAlign: 'center',
  },
});

const InfoPill = ({children}: React.PropsWithChildren) => {
  const theme = useTheme();
  const backgroundColor = theme.dark ? Midnight : Air;

  return (
    <View
      style={[
        styles.infoPill,
        {backgroundColor, borderColor: backgroundColor},
      ]}>
      <BaseText
        style={[styles.infoPillText, {color: theme.dark ? White : Action}]}>
        {children}
      </BaseText>
    </View>
  );
};

const About = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const dispatch = useAppDispatch();

  const LINKS: LinkSetting[] = [
    {
      key: 'HelpAndSupport',
      title: t('Help & Support'),
      link: URL.HELP_AND_SUPPORT,
    },
    {
      key: 'TermsOfUse',
      title: t('Terms of Use'),
      link: URL.TOU_WALLET,
    },
    {
      key: 'Privacy',
      title: t('Privacy'),
      link: URL.PRIVACY_POLICY,
    },
    {
      key: 'AccessibilityStatement',
      title: t('Accessibility Statement'),
      link: URL.ACCESSIBILITY_STATEMENT,
    },
  ];
  return (
    <SettingsComponent style={{marginBottom: 10}}>
      <Setting>
        <SettingTitle>{t('Version')}</SettingTitle>

        <InfoPill>{APP_VERSION}</InfoPill>
      </Setting>

      <Hr />

      {GIT_COMMIT_HASH ? (
        <>
          <Setting>
            <SettingTitle>{t('Commit Hash')}</SettingTitle>

            <InfoPill>{GIT_COMMIT_HASH}</InfoPill>
          </Setting>
          <Hr />
        </>
      ) : null}

      <Setting onPress={() => navigation.navigate('StorageUsage')}>
        <SettingTitle>{t('Storage Usage')}</SettingTitle>
        <AngleRight />
      </Setting>

      <Hr />

      <Setting onPress={() => navigation.navigate('SessionLogs')}>
        <SettingTitle>{t('Session Log')}</SettingTitle>
        <AngleRight />
      </Setting>

      <Hr />

      <Setting onPress={() => navigation.navigate('SendFeedback')}>
        <SettingTitle>{t('Send Feedback')}</SettingTitle>
        <AngleRight />
      </Setting>

      <Hr />

      <Setting onPress={() => dispatch(shareApp())}>
        <SettingTitle>{t('Share with Friends')}</SettingTitle>
      </Setting>

      <Hr />
      {LINKS.map(({key, title, link}, index) => {
        return (
          <View key={key}>
            <Setting
              activeOpacity={ActiveOpacity}
              onPress={() => {
                const eventName =
                  key === 'HelpAndSupport'
                    ? 'Clicked Support'
                    : 'Clicked About BitPay Link';
                dispatch(
                  Analytics.track(eventName, {
                    key,
                  }),
                );
                dispatch(openUrlWithInAppBrowser(link));
              }}>
              <SettingTitle>{title}</SettingTitle>
            </Setting>
            {LINKS.length - 1 !== index && <Hr />}
          </View>
        );
      })}

      {__DEV__ ? (
        <>
          <Hr />
          <Setting>
            <SettingTitle>{t('Crash Test (DEV)')}</SettingTitle>
          </Setting>
          <View style={{paddingHorizontal: 15, paddingBottom: 15}}>
            <Button
              buttonStyle="danger"
              style={{marginBottom: 10}}
              onPress={() => triggerNativeCrash()}>
              {t('Trigger Native Crash')}
            </Button>
            <Button buttonStyle="danger" onPress={() => triggerJsCrash()}>
              {t('Trigger JS Crash')}
            </Button>
          </View>
        </>
      ) : null}
    </SettingsComponent>
  );
};
export default About;
