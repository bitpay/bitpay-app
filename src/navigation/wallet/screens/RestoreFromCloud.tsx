import React, {useLayoutEffect, useMemo, useState} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import moment from 'moment';
import {BaseText, HeaderTitle} from '../../../components/styled/Text';
import Button from '../../../components/button/Button';
import {BusyOverlay} from '../../../components/backup/BrandLoader';
import {
  ResultIcon,
  ResultTone,
  ResultView,
} from '../../../components/backup/ResultView';
import {
  SelectableCard,
  StatusTag,
} from '../../../components/backup/BackupCards';
import {useBackupColors} from '../../../components/backup/colors';
import {
  useAppDispatch,
  useAppSelector,
  useLogger,
  useMount,
} from '../../../utils/hooks';
import {Analytics} from '../../../store/analytics/analytics.effects';
import {
  CloudBackupError,
  CloudBackupGroup,
  connectToCloud,
  getCloudAccountEmail,
  getCloudBackupGroupId,
  listCloudBackups,
} from '../../../utils/cloud-backup/storage';
import {WalletGroupParamList, WalletScreens} from '../WalletGroup';

type RestoreFromCloudProps = NativeStackScreenProps<
  WalletGroupParamList,
  WalletScreens.RESTORE_FROM_CLOUD
>;

type SearchResult = 'noBackups' | 'icloudOff' | 'signIn' | 'offline' | 'other';

type SearchState =
  | {status: 'searching'}
  | {status: 'found'; groups: CloudBackupGroup[]}
  | {status: 'result'; result: SearchResult};

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {gap: 12, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 20},
  paragraph: {fontSize: 16, lineHeight: 25},
  rowTitle: {fontSize: 16, lineHeight: 21, fontWeight: '500'},
  rowMeta: {fontSize: 14, lineHeight: 20},
  footer: {paddingHorizontal: 12, paddingTop: 12},
});

const IS_IOS = Platform.OS === 'ios';

const RestoreFromCloud = ({navigation, route}: RestoreFromCloudProps) => {
  const {t} = useTranslation();
  const logger = useLogger();
  const dispatch = useAppDispatch();
  const colors = useBackupColors();
  const context = route.params?.context;
  const keys = useAppSelector(({WALLET}) => WALLET.keys);
  const cloudName = IS_IOS ? 'iCloud' : 'Google Drive';
  const [busy, setBusy] = useState(IS_IOS);
  const [search, setSearch] = useState<SearchState>({status: 'searching'});
  const [email, setEmail] = useState<string>();
  const [picked, setPicked] = useState<string>();

  const groupIdsOnPhone = useMemo(
    () =>
      new Set(
        Object.values(keys)
          .filter(key => !key.id.includes('readonly'))
          .map(key =>
            getCloudBackupGroupId(key.properties?.fingerPrint || key.id),
          ),
      ),
    [keys],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <HeaderTitle>
          {search.status === 'found'
            ? t('Restore From {{cloudName}}', {cloudName})
            : ''}
        </HeaderTitle>
      ),
    });
  }, [navigation, search.status, t, cloudName]);

  const searchCloud = async (chooseAccount = false) => {
    dispatch(Analytics.track('Cloud Restore Started', {source: 'cloud'}));
    setBusy(IS_IOS);
    try {
      await connectToCloud({chooseAccount});
      setBusy(true);
      const groups = await listCloudBackups();
      dispatch(
        Analytics.track('Cloud Restore Backups Found', {count: groups.length}),
      );
      setEmail(getCloudAccountEmail());
      setSearch(
        groups.length
          ? {status: 'found', groups}
          : {status: 'result', result: 'noBackups'},
      );
    } catch (err) {
      const reason = err instanceof CloudBackupError ? err.reason : 'unknown';
      dispatch(
        Analytics.track('Cloud Restore Failed', {source: 'cloud', reason}),
      );
      logger.error(`[CloudRestore] search failed: ${reason}`);
      if (reason === 'cancelled') {
        if (chooseAccount) {
          setBusy(false);
          setSearch({status: 'result', result: 'signIn'});
          return;
        }
        navigation.goBack();
      } else {
        setSearch({
          status: 'result',
          result:
            reason === 'network'
              ? 'offline'
              : reason === 'unavailable'
              ? IS_IOS
                ? 'icloudOff'
                : 'signIn'
              : 'other',
        });
      }
    }
    setBusy(false);
  };

  useMount(() => {
    searchCloud();
  });

  const usePhraseOrFile = () =>
    navigation.replace('Import', {context, importTab: 'file'});

  const busyOverlay = (
    <BusyOverlay
      visible={busy}
      text={t('Looking for backups in {{cloudName}}…', {cloudName})}
    />
  );

  if (search.status === 'result') {
    const retry = {primary: t('Try Again'), onPrimary: () => searchCloud()};
    const results: Record<
      SearchResult,
      {
        tone: ResultTone;
        icon: ResultIcon;
        title: string;
        message: string;
        primary: string;
        onPrimary: () => void;
      }
    > = {
      noBackups: IS_IOS
        ? {
            tone: 'warn',
            icon: 'bang',
            title: t('No backups found'),
            message: t(
              'We couldn’t find a BitPay backup in the iCloud account on this phone. To check a different Apple ID, sign in to it in Settings, then try again.',
            ),
            ...retry,
          }
        : {
            tone: 'warn',
            icon: 'bang',
            title: t('No backups found'),
            message: t(
              'We couldn’t find a BitPay backup in {{email}}. Try another Google account, or import your recovery phrase or backup file.',
              {email: email || cloudName},
            ),
            primary: t('Try Another Account'),
            onPrimary: () => searchCloud(true),
          },
      icloudOff: {
        tone: 'neutral',
        icon: 'cloud',
        title: t('Turn on iCloud Drive'),
        message: t(
          'Open the Settings app, tap your name, then iCloud, and turn on iCloud Drive. Make sure BitPay is allowed to use it, then come back and try again.',
        ),
        ...retry,
      },
      signIn: {
        tone: 'neutral',
        icon: 'cloud',
        title: t('Sign in to {{cloudName}}', {cloudName}),
        message: t(
          'Sign in to {{cloudName}} on this device and allow BitPay to use it, then try again.',
          {cloudName},
        ),
        ...retry,
      },
      offline: {
        tone: 'neutral',
        icon: 'cloud',
        title: t('You’re offline'),
        message: t('Connect to the internet and try again.'),
        ...retry,
      },
      other: {
        tone: 'warn',
        icon: 'bang',
        title: t('Something went wrong'),
        message: t(
          "We couldn't reach {{cloudName}}. Check your internet connection and try again.",
          {cloudName},
        ),
        ...retry,
      },
    };
    return (
      <>
        <ResultView
          {...results[search.result]}
          link={t('Import Phrase or File')}
          onLink={usePhraseOrFile}
        />
        {busyOverlay}
      </>
    );
  }

  if (search.status === 'searching') {
    return busyOverlay;
  }

  const {groups} = search;
  const groupKey = (group: CloudBackupGroup) =>
    `${group.kind}:${group.groupId}`;
  const selected =
    groups.find(group => groupKey(group) === picked) || groups[0];
  const description =
    groups.length === 1
      ? t(
          'We found 1 backup in {{cloudName}}. Confirm the key you want to restore to this phone.',
          {cloudName},
        )
      : groups.length === 2
      ? t(
          'We found 2 keys backed up to {{cloudName}}. Choose one to restore. You can restore the other one later.',
          {cloudName},
        )
      : t(
          'We found {{number}} keys backed up to {{cloudName}}. Choose one to restore. You can restore the others later.',
          {number: groups.length, cloudName},
        );
  const backedUp = (group: CloudBackupGroup) =>
    t('Backed up {{date}}', {
      date: moment(group.files[0].createdAt).format('lll'),
    });

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <ScrollView
        testID="restore-from-cloud-view"
        accessibilityRole="radiogroup"
        accessibilityLabel={t('Key to restore')}
        contentContainerStyle={styles.content}>
        <BaseText style={[styles.paragraph, {color: colors.textDescription}]}>
          {description}
        </BaseText>
        {groups.map(group => {
          const onPhone = groupIdsOnPhone.has(group.groupId);
          const title =
            group.kind === 'keyshare'
              ? t('BitPay Keyshare')
              : t('BitPay Backup');
          return (
            <SelectableCard
              key={groupKey(group)}
              selected={group === selected}
              accessibilityLabel={[
                title,
                backedUp(group),
                ...(onPhone ? [t('Already on this phone')] : []),
              ].join(', ')}
              onPress={() => setPicked(groupKey(group))}>
              <BaseText style={styles.rowTitle}>{title}</BaseText>
              <BaseText
                style={[styles.rowMeta, {color: colors.textDescription}]}>
                {backedUp(group)}
              </BaseText>
              {onPhone ? (
                <StatusTag>{t('Already on this phone')}</StatusTag>
              ) : null}
            </SelectableCard>
          );
        })}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          testID="restore-key-button"
          disabled={!selected}
          onPress={() => {
            if (!selected) {
              return;
            }
            dispatch(Analytics.track('Clicked Restore Selected Backup'));
            navigation.navigate('RestoreFromCloudPassword', {
              context,
              files: selected.files,
              kind: selected.kind,
            });
          }}>
          {t('Restore Key')}
        </Button>
      </View>
      {busyOverlay}
    </SafeAreaView>
  );
};

export default RestoreFromCloud;
