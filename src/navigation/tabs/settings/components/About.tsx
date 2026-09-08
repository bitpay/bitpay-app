import React, {useCallback, useState} from 'react';
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
import {Alert, View} from 'react-native';
import {
  openUrlWithInAppBrowser,
  shareApp,
} from '../../../../store/app/app.effects';
import AngleRight from '../../../../../assets/img/angle-right.svg';
import {GIT_COMMIT_HASH} from '@env';
import {Analytics} from '../../../../store/analytics/analytics.effects';
import {useAppDispatch} from '../../../../utils/hooks';
import {triggerJsCrash, triggerNativeCrash} from '../../../../lib/crash-test';
import * as LogActions from '../../../../store/log/log.actions';
import {logManager} from '../../../../managers/LogManager';
import {
  clearStoredSessionLogs,
  getSessionLogsProdEnabled,
  SESSION_LOGS_EASTER_EGG_TAP_COUNT,
  setSessionLogsProdEnabled as setSessionLogsProdEnabledStorage,
} from '../../../../utils/sessionLogs';

interface LinkSetting {
  key: string;
  title: string;
  link: string;
}

const About = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const [sessionLogsProdEnabled, setSessionLogsProdEnabled] = useState(() =>
    getSessionLogsProdEnabled(),
  );
  const [versionTapCount, setVersionTapCount] = useState(0);

  const showSessionLogs = __DEV__ || sessionLogsProdEnabled;

  const onVersionPress = useCallback(() => {
    if (__DEV__) {
      return;
    }

    setVersionTapCount(currentCount => {
      const nextCount = currentCount + 1;

      if (nextCount < SESSION_LOGS_EASTER_EGG_TAP_COUNT) {
        return nextCount;
      }

      const nextSessionLogsProdEnabled = !sessionLogsProdEnabled;
      setSessionLogsProdEnabledStorage(nextSessionLogsProdEnabled);
      setSessionLogsProdEnabled(nextSessionLogsProdEnabled);

      if (!nextSessionLogsProdEnabled) {
        logManager.clearLogs();
        dispatch(LogActions.clear());
        void clearStoredSessionLogs();
      }

      Alert.alert(
        t(
          nextSessionLogsProdEnabled
            ? 'Session logs activated'
            : 'Session logs disabled',
        ),
      );

      return 0;
    });
  }, [dispatch, sessionLogsProdEnabled, t]);

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
      <Setting onPress={onVersionPress}>
        <SettingTitle>{t('Version')}</SettingTitle>

        <View pointerEvents="none">
          <Button buttonType="pill">{APP_VERSION}</Button>
        </View>
      </Setting>

      <Hr />

      {GIT_COMMIT_HASH ? (
        <>
          <Setting>
            <SettingTitle>{t('Commit Hash')}</SettingTitle>

            <Button buttonType="pill">{GIT_COMMIT_HASH}</Button>
          </Setting>
          <Hr />
        </>
      ) : null}

      <Setting onPress={() => navigation.navigate('StorageUsage')}>
        <SettingTitle>{t('Storage Usage')}</SettingTitle>
        <AngleRight />
      </Setting>

      <Hr />

      {showSessionLogs ? (
        <>
          <Setting onPress={() => navigation.navigate('SessionLogs')}>
            <SettingTitle>{t('Session Log')}</SettingTitle>
            <AngleRight />
          </Setting>

          <Hr />
        </>
      ) : null}

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
