import React, {memo, useEffect, useLayoutEffect, useState} from 'react';
import Slider from '@react-native-community/slider';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {FlashList} from '@shopify/flash-list';
import {useTranslation} from 'react-i18next';
import {Alert, Platform} from 'react-native';
import Mailer from 'react-native-mail';
import styled, {useTheme} from 'styled-components/native';
import {
  WIDTH,
  SheetContainer,
  SheetParams,
} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {IS_ANDROID, IS_DESKTOP, IS_IOS} from '../../../../../constants';
import {APP_NAME_UPPERCASE, APP_VERSION} from '../../../../../constants/config';
import {LogActions} from '../../../../../store/log';
import {LogEntry, LogLevel} from '../../../../../store/log/log.models';
import {
  Action,
  Caution,
  LinkBlue,
  SlateDark,
  Warning,
  White,
  Slate,
  Black,
} from '../../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
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
import Share, {ShareOptions} from 'react-native-share';
import RNFS from 'react-native-fs';

type SessionLogsScreenProps = NativeStackScreenProps<
  AboutGroupParamList,
  AboutScreens.SESSION_LOGS
>;

const LogsContainer = styled.SafeAreaView`
  flex: 1;
  padding-bottom: ${IS_ANDROID ? '55px' : 0};
`;

const Logs = styled(BaseText)<{color?: string | null}>`
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
  color: ${({theme: {dark}, color}) =>
    color ? color : dark ? White : SlateDark};
  padding-left: 16px;
`;

const LogsMessage = styled.Text`
  font-weight: 400;
`;

const FilterLabelsContainer = styled.View`
  flex-direction: row;
  margin-top: 16px;
`;

const FilterLabel = styled(BaseText)`
  flex: 1 1 100%;
  text-align: center;
`;

const OptionContainer = styled(TouchableOpacity)<SheetParams>`
  flex-direction: row;
  align-items: stretch;
  padding-${({placement}) => placement}: 31px;
`;

const OptionTextContainer = styled.View`
  align-items: flex-start;
  justify-content: space-around;
  flex-direction: column;
  margin: 0 20px;
`;

const OptionTitleText = styled(BaseText)`
  font-style: normal;
  font-weight: 500;
  font-size: 14px;
  line-height: 19px;
  color: ${({theme: {dark}}) => (dark ? White : Action)};
`;

const OptionDescriptionText = styled(BaseText)`
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  line-height: 19px;
  color: ${({theme: {dark}}) => (dark ? Slate : Black)};
`;

const OptionIconContainer = styled.View`
  justify-content: center;
  width: 20px;
`;

const MIN_LOG_LEVEL = LogLevel.Error;
const MAX_LOG_LEVEL = LogLevel.Debug;
const TOTAL_LOG_LEVELS = MAX_LOG_LEVEL - MIN_LOG_LEVEL + 1;

const THUMB_WIDTH = IS_IOS || IS_ANDROID ? 30 : 0;
const SLIDER_WIDTH =
  ((TOTAL_LOG_LEVELS - 1) / TOTAL_LOG_LEVELS) * WIDTH + THUMB_WIDTH;

const LogColorMap: Partial<{[key in LogLevel]: string | null}> = {
  [LogLevel.Error]: Caution,
  [LogLevel.Warn]: Warning,
  [LogLevel.Debug]: LinkBlue,
};

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

const renderItem = ({item}: {item: LogEntry}) => (
  <Logs color={LogColorMap[item.level]}>
    [{LogLevel[item.level]}] <LogsMessage>{item.message}</LogsMessage>
  </Logs>
);

const keyExtractor = (item: LogEntry, index: number) => index.toString();

const SessionLogs = ({}: SessionLogsScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [showOptions, setShowOptions] = useState(false);
  const logs = useAppSelector(({LOG}) => LOG.logs);
  const [filterLevel, setFilterLevel] = useState(LogLevel.Debug);

  const filteredLogs = logs.filter(log => log.level <= filterLevel);
  const currentSessionStartTime = logs.length
    ? new Date(logs[0].timestamp)
    : new Date();
  const [filteredPersistedLogs, setFilteredPersistedLogs] = useState(
    [] as LogEntry[],
  );
  const [persistedLogs, setPersistedLogs] = useState([] as LogEntry[]);

  const printLogs = (logsToPrint: LogEntry[]) =>
    logsToPrint
      .map(log => {
        const formattedLevel = LogLevel[log.level].toLowerCase();

        return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
      })
      .join('');

  const onFilterLevelChange = (level: LogLevel) => {
    if (level !== filterLevel) {
      setFilterLevel(level);
    }
  };

  const shareFile = async (data: string) => {
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
      await Share.open(opts);
    } catch (err: any) {
      dispatch(LogActions.debug(`[shareFile]: ${err.message}`));
      if (err && err.message === 'User did not share') {
        return;
      } else {
        throw err;
      }
    }
  };

  const handleEmail = (data: string) => {
    Mailer.mail(
      {
        subject: `BitPay v${APP_VERSION} Logs`,
        body: data,
        isHTML: false,
      },
      (error, event) => {
        if (error) {
          dispatch(LogActions.error('Error sending email: ' + error));
        }
        if (event) {
          dispatch(LogActions.debug('Email Logs: ' + event));
        }
      },
    );
  };

  const showDisclaimer = (option: 'email' | 'share') => {
    setShowOptions(false);
    let logStr =
      'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
    const persistedLogString = persistedLogs.length
      ? 'Previous Sessions\n\n' +
        printLogs(persistedLogs) +
        '\n\nCurrent Session\n\n'
      : '';
    logStr += persistedLogString + printLogs(logs); // Add current session logs and persisted logs including all levels

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
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <Settings onPress={() => setShowOptions(true)} />,
    });
  }, [navigation]);

  useEffect(() => {
    const value = storage.getString('persist:logs');
    if (value) {
      const _filteredPersistedLogs = JSON.parse(value).filter(
        (log: LogEntry) =>
          log.level <= filterLevel &&
          new Date(log.timestamp) < currentSessionStartTime,
      );
      setPersistedLogs(JSON.parse(value));
      setFilteredPersistedLogs(_filteredPersistedLogs);
    }
  }, []);

  return (
    <LogsContainer>
      <FlashList
        contentContainerStyle={{
          paddingBottom: 150,
        }}
        data={[
          t('Previous Sessions'),
          ...filteredPersistedLogs,
          t('Current Session'),
          ...filteredLogs,
        ]}
        renderItem={({item}) => {
          if (typeof item === 'string') {
            return <ListHeader>{item}</ListHeader>;
          } else {
            return renderItem({item});
          }
        }}
        estimatedItemSize={23}
        getItemType={item =>
          typeof item === 'string' ? 'sectionHeader' : 'row'
        }
        keyExtractor={keyExtractor}
      />

      <FilterLabels onPress={onFilterLevelChange} />

      <Slider
        step={1}
        value={filterLevel}
        minimumValue={MIN_LOG_LEVEL}
        maximumValue={MAX_LOG_LEVEL}
        onSlidingComplete={onFilterLevelChange}
        style={{
          alignSelf: 'center',
          width: SLIDER_WIDTH,
          height: 40,
        }}
        // iOS
        tapToSeek={true}
      />

      <SheetModal
        modalLibrary={'bottom-sheet'}
        placement={'bottom'}
        isVisible={showOptions}
        onBackdropPress={() => setShowOptions(false)}>
        <SheetContainer placement={'bottom'}>
          <OptionContainer
            placement={'bottom'}
            onPress={() => showDisclaimer('share')}>
            <OptionIconContainer>
              {theme.dark ? <ShareIconWhite /> : <ShareIcon />}
            </OptionIconContainer>
            <OptionTextContainer>
              <OptionTitleText>{t('Share File')}</OptionTitleText>
            </OptionTextContainer>
          </OptionContainer>
          {!IS_DESKTOP && (
            <OptionContainer
              placement={'bottom'}
              onPress={() => showDisclaimer('email')}>
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
    </LogsContainer>
  );
};

export default SessionLogs;
