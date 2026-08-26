import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Slider from '@react-native-community/slider';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FlashList} from '@shopify/flash-list';
import {useTranslation} from 'react-i18next';
import {
  Alert,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Mailer from 'react-native-mail';
import {useTheme} from '../../../../../contexts';
import {
  WIDTH,
  SheetContainer,
  SheetParams,
} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {IS_ANDROID, IS_DESKTOP, IS_IOS} from '../../../../../constants';
import {APP_NAME_UPPERCASE, APP_VERSION} from '../../../../../constants/config';
import {LogEntry, LogLevel} from '../../../../../store/log/log.models';
import {
  Action,
  Caution,
  LinkBlue,
  SlateDark,
  Warning,
  White,
} from '../../../../../styles/colors';
import {useAppDispatch} from '../../../../../utils/hooks';
import {AboutGroupParamList, AboutScreens} from '../AboutGroup';
import Settings from '../../../../../components/settings/Settings';
import SheetModal from '../../../../../components/modal/base/sheet/SheetModal';
import SendIcon from '../../../../../../assets/img/send-icon.svg';
import SendIconWhite from '../../../../../../assets/img/send-icon-white.svg';
import ShareIcon from '../../../../../../assets/img/share-icon.svg';
import ShareIconWhite from '../../../../../../assets/img/share-icon-white.svg';
import {ListHeader} from '../../general/screens/customize-home/Shared';
import {storage} from '../../../../../store';
import {TouchableOpacity} from '@components/base/TouchableOpacity';
import {isAndroidStoragePermissionGranted} from '../../../../../utils/helper-methods';
import {ShareOptions} from 'react-native-share';
import {shareFile as shareFileUtil} from '../../../../../utils/share';
import RNFS from 'react-native-fs';
import {logManager} from '../../../../../managers/LogManager';
import {useLogContext} from '../../../../../contexts/LogContext';

type SessionLogsScreenProps = NativeStackScreenProps<
  AboutGroupParamList,
  AboutScreens.SESSION_LOGS
>;

const MIN_LOG_LEVEL = LogLevel.Error;
const MAX_LOG_LEVEL = LogLevel.Debug;
const TOTAL_LOG_LEVELS = MAX_LOG_LEVEL - MIN_LOG_LEVEL + 1;

const THUMB_WIDTH = IS_IOS || IS_ANDROID ? 30 : 0;
const SLIDER_WIDTH =
  ((TOTAL_LOG_LEVELS - 1) / TOTAL_LOG_LEVELS) * WIDTH + THUMB_WIDTH;
const CONTENT_READY_FALLBACK_MS = 2000;

const styles = StyleSheet.create({
  logsContainer: {
    flex: 1,
    paddingBottom: IS_ANDROID ? 55 : 0,
  },
  listContent: {
    paddingBottom: 150,
  },
  logs: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    paddingLeft: 16,
  },
  logsMessage: {
    fontWeight: '400',
  },
  filterLabelsContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  filterLabel: {
    flex: 1,
    textAlign: 'center',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  optionTextContainer: {
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    flexDirection: 'column',
    marginHorizontal: 20,
  },
  optionTitleText: {
    fontStyle: 'normal',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 19,
  },
  optionIconContainer: {
    justifyContent: 'center',
    width: 20,
  },
  slider: {
    alignSelf: 'center',
    width: SLIDER_WIDTH,
    height: 40,
  },
});

const Logs = ({
  color,
  style,
  ...rest
}: {color?: string | null} & React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.logs,
        {color: color ? color : theme.dark ? White : SlateDark},
        style,
      ]}
      {...rest}
    />
  );
};

const LogsMessage = ({style, ...rest}: React.ComponentProps<typeof Text>) => (
  <Text style={[styles.logsMessage, style]} {...rest} />
);

const FilterLabelsContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.filterLabelsContainer, style]} {...rest} />
);

const FilterLabel = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => (
  <BaseText style={[styles.filterLabel, style]} {...rest} />
);

const OptionContainer = ({
  placement,
  style,
  ...rest
}: SheetParams & React.ComponentProps<typeof TouchableOpacity>) => (
  <TouchableOpacity
    style={[
      styles.optionContainer,
      placement === 'top' ? {paddingTop: 31} : {paddingBottom: 31},
      style,
    ]}
    {...rest}
  />
);

const OptionTextContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.optionTextContainer, style]} {...rest} />
);

const OptionTitleText = ({
  style,
  ...rest
}: React.ComponentProps<typeof BaseText>) => {
  const theme = useTheme();
  return (
    <BaseText
      style={[
        styles.optionTitleText,
        {color: theme.dark ? White : Action},
        style,
      ]}
      {...rest}
    />
  );
};

const OptionIconContainer = ({
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={[styles.optionIconContainer, style]} {...rest} />
);

const LogColorMap: Partial<{[key in LogLevel]: string | null}> = {
  [LogLevel.Error]: Caution,
  [LogLevel.Warn]: Warning,
  [LogLevel.Debug]: LinkBlue,
};

type SessionLogListItem = string | LogEntry;

const FilterLabels: React.FC<{onPress?: (level: LogLevel) => any}> = memo(
  props => {
    const levels = [];

    for (let i = MIN_LOG_LEVEL; i <= MAX_LOG_LEVEL; ++i) {
      levels.push(i);
    }

    return (
      <FilterLabelsContainer>
        {levels.map(level => (
          <FilterLabel onPress={() => props.onPress?.(level)} key={level}>
            {LogLevel[level]}
          </FilterLabel>
        ))}
      </FilterLabelsContainer>
    );
  },
);

const renderLogEntry = ({item}: {item: LogEntry}) => (
  <Logs color={LogColorMap[item.level]}>
    [{LogLevel[item.level]}] <LogsMessage>{item.message}</LogsMessage>
  </Logs>
);

const renderListItem = ({item}: {item: SessionLogListItem}) => {
  if (typeof item === 'string') {
    return <ListHeader>{item}</ListHeader>;
  }

  return renderLogEntry({item});
};

const keyExtractor = (_item: SessionLogListItem, index: number) =>
  index.toString();

const getItemType = (item: SessionLogListItem) =>
  typeof item === 'string' ? 'sectionHeader' : 'row';

const printLogs = (logsToPrint: LogEntry[]) =>
  logsToPrint
    .map(log => {
      const formattedLevel = LogLevel[log.level].toLowerCase();

      return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
    })
    .join('');

const SessionLogs = ({}: SessionLogsScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [showOptions, setShowOptions] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const sessionFallbackStartTime = useRef(Date.now());

  const logData = useLogContext(contentReady);
  const {logs} = logData;

  const [filterLevel, setFilterLevel] = useState(LogLevel.Debug);
  const [persistedLogs, setPersistedLogs] = useState<LogEntry[]>([]);
  const hasLoadedPersistedLogs = useRef(false);

  const currentSessionStartTime = useMemo(
    () =>
      logData.logs.length
        ? new Date(logData.logs[0].timestamp).getTime()
        : sessionFallbackStartTime.current,
    [logData],
  );

  const filteredLogs = useMemo(
    () => logData.logs.filter(log => log.level <= filterLevel),
    [filterLevel, logData],
  );

  const filteredPersistedLogs = useMemo(
    () =>
      persistedLogs.filter(
        log =>
          log.level <= filterLevel &&
          new Date(log.timestamp).getTime() < currentSessionStartTime,
      ),
    [currentSessionStartTime, filterLevel, persistedLogs],
  );

  const combinedLogs = useMemo<SessionLogListItem[]>(
    () => [
      t('Previous Sessions'),
      ...filteredPersistedLogs,
      t('Current Session'),
      ...filteredLogs,
    ],
    [filteredLogs, filteredPersistedLogs, t],
  );

  const onFilterLevelChange = useCallback((level: LogLevel) => {
    setFilterLevel(currentLevel =>
      level === currentLevel ? currentLevel : level,
    );
  }, []);

  const openOptions = useCallback(() => setShowOptions(true), []);
  const closeOptions = useCallback(() => setShowOptions(false), []);

  const shareFile = useCallback(
    async (data: string) => {
      try {
        if (Platform.OS === 'android' && Platform.Version < 30) {
          await isAndroidStoragePermissionGranted(dispatch);
        }

        const rootPath =
          Platform.OS === 'ios'
            ? RNFS.LibraryDirectoryPath
            : RNFS.TemporaryDirectoryPath;
        const txtFilename = `${APP_NAME_UPPERCASE}-logs`;
        let filePath = `${rootPath}/${txtFilename}`;

        await RNFS.mkdir(filePath);

        filePath += '.txt';
        const opts: ShareOptions = {
          title: txtFilename,
          url: `file://${filePath}`,
          subject: `${APP_NAME_UPPERCASE} Logs`,
        };

        await RNFS.writeFile(filePath, data, 'utf8');
        await dispatch(shareFileUtil(opts));
      } catch (err: any) {
        logManager.debug(`[shareFile]: ${err.message}`);
        if (err && err.message === 'User did not share') {
          return;
        } else {
          throw err;
        }
      }
    },
    [dispatch],
  );

  const handleEmail = useCallback((data: string) => {
    Mailer.mail(
      {
        subject: `BitPay v${APP_VERSION} Logs`,
        body: data,
        isHTML: false,
      },
      (error, event) => {
        if (error) {
          logManager.error('Error sending email: ' + error);
        }
        if (event) {
          logManager.debug('Email Logs: ' + event);
        }
      },
    );
  }, []);

  const showDisclaimer = useCallback(
    (option: 'email' | 'share') => {
      closeOptions();
      let logStr =
        'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
      const persistedLogString = persistedLogs.length
        ? 'Previous Sessions\n\n' +
          printLogs(persistedLogs) +
          '\n\nCurrent Session\n\n'
        : '';
      logStr += persistedLogString + printLogs(logs);

      Alert.alert(
        t('Warning'),
        t('Be careful, this could contain sensitive private data'),
        [
          {
            text: t('Continue'),
            onPress: () => {
              switch (option) {
                case 'email':
                  handleEmail(logStr);
                  break;
                case 'share':
                  shareFile(logStr);
                  break;
              }
            },
          },
          {text: t('Cancel')},
        ],
        {cancelable: true},
      );
    },
    [closeOptions, handleEmail, logs, persistedLogs, shareFile, t],
  );

  const showShareDisclaimer = useCallback(
    () => showDisclaimer('share'),
    [showDisclaimer],
  );
  const showEmailDisclaimer = useCallback(
    () => showDisclaimer('email'),
    [showDisclaimer],
  );
  const renderHeaderRight = useCallback(
    () => (contentReady ? <Settings onPress={openOptions} /> : null),
    [contentReady, openOptions],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  useEffect(() => {
    let didFinish = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const finishOpeningTransition = () => {
      if (didFinish) {
        return;
      }

      didFinish = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      setContentReady(true);
    };

    const unsubscribe = (navigation as any).addListener(
      'transitionEnd',
      (event: {data?: {closing?: boolean}}) => {
        if (!event.data?.closing) {
          finishOpeningTransition();
        }
      },
    );

    fallbackTimer = setTimeout(
      finishOpeningTransition,
      CONTENT_READY_FALLBACK_MS,
    );

    return () => {
      didFinish = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    if (!contentReady || hasLoadedPersistedLogs.current) {
      return;
    }

    hasLoadedPersistedLogs.current = true;
    const value = storage.getString('persist:logs');
    if (!value) {
      return;
    }

    try {
      const parsedLogs = JSON.parse(value);
      if (Array.isArray(parsedLogs)) {
        setPersistedLogs(parsedLogs);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : JSON.stringify(err);
      logManager.warn(
        `[SessionLogs] Unable to parse persisted logs: ${errorMessage}`,
      );
    }
  }, [contentReady]);

  return (
    <SafeAreaView style={styles.logsContainer}>
      {contentReady && (
        <>
          <FlashList<SessionLogListItem>
            contentContainerStyle={styles.listContent}
            data={combinedLogs}
            renderItem={renderListItem}
            getItemType={getItemType}
            keyExtractor={keyExtractor}
          />

          <FilterLabels onPress={onFilterLevelChange} />

          <Slider
            step={1}
            value={filterLevel}
            minimumValue={MIN_LOG_LEVEL}
            maximumValue={MAX_LOG_LEVEL}
            onSlidingComplete={onFilterLevelChange}
            style={styles.slider}
            tapToSeek={true}
          />
        </>
      )}

      <SheetModal
        placement={'bottom'}
        isVisible={showOptions}
        onBackdropPress={closeOptions}>
        <SheetContainer placement={'bottom'}>
          <OptionContainer placement={'bottom'} onPress={showShareDisclaimer}>
            <OptionIconContainer>
              {theme.dark ? <ShareIconWhite /> : <ShareIcon />}
            </OptionIconContainer>
            <OptionTextContainer>
              <OptionTitleText>{t('Share File')}</OptionTitleText>
            </OptionTextContainer>
          </OptionContainer>
          {!IS_DESKTOP && (
            <OptionContainer placement={'bottom'} onPress={showEmailDisclaimer}>
              <OptionIconContainer>
                {theme.dark ? <SendIconWhite /> : <SendIcon />}
              </OptionIconContainer>
              <OptionTextContainer>
                <OptionTitleText>{t('Send Logs By Email')}</OptionTitleText>
              </OptionTextContainer>
            </OptionContainer>
          )}
        </SheetContainer>
      </SheetModal>
    </SafeAreaView>
  );
};

export default SessionLogs;
