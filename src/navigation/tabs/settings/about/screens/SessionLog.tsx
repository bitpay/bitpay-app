import Slider from '@react-native-community/slider';
import {useNavigation} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {memo, useEffect, useLayoutEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Alert, SectionList} from 'react-native';
import Mailer from 'react-native-mail';
import styled, {useTheme} from 'styled-components/native';
import {
  WIDTH,
  SheetContainer,
  SheetParams,
} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {IS_ANDROID, IS_IOS} from '../../../../../constants';
import {APP_VERSION} from '../../../../../constants/config';
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
import {ListHeader} from '../../general/screens/customize-home/Shared';
import {storage} from '../../../../../store';

type SessionLogsScreenProps = NativeStackScreenProps<
  AboutGroupParamList,
  AboutScreens.SESSION_LOGS
>;

const LogsContainer = styled.SafeAreaView`
  flex: 1;
`;

const Logs = styled(BaseText)<{color?: string | null}>`
  font-size: 14px;
  line-height: 22px;
  font-weight: 600;
  color: ${({theme: {dark}, color}) =>
    color ? color : dark ? White : SlateDark};
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

const OptionContainer = styled.TouchableOpacity<SheetParams>`
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

const FilterLabels: React.VFC<{onPress?: (level: LogLevel) => any}> = memo(
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

const keyExtractor = (item: LogEntry, index: number) => item.message + index;

const SessionLogs = ({}: SessionLogsScreenProps) => {
  const {t} = useTranslation();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [showOptions, setShowOptions] = useState(false);
  const logs = useAppSelector(({LOG}) => LOG.logs);
  const [filterLevel, setFilterLevel] = useState(LogLevel.Info);

  const filteredLogs = logs.filter(log => log.level <= filterLevel);
  const currentSessionStartTime = new Date(logs[0].timestamp);
  const [filteredPersistedLogs, setFilteredPersistedLogs] = useState(
    [] as LogEntry[],
  );

  const onFilterLevelChange = (level: LogLevel) => {
    if (level !== filterLevel) {
      setFilterLevel(level);
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

  const showDisclaimer = () => {
    setShowOptions(false);
    let logStr =
      'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
    const printLogs = (logsToPrint: LogEntry[]) =>
      logsToPrint
        .map(log => {
          const formattedLevel = LogLevel[log.level].toLowerCase();

          return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
        })
        .join('');
    const persistedLogString = filteredPersistedLogs.length
      ? 'Previous Sessions\n\n' +
        printLogs(filteredPersistedLogs) +
        '\n\nCurrent Session\n\n'
      : '';
    logStr += persistedLogString + printLogs(filteredLogs);

    Alert.alert(
      t('Warning'),
      t('Be careful, this could contain sensitive private data'),
      [
        {text: t('Continue'), onPress: () => handleEmail(logStr)},
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
      setFilteredPersistedLogs(_filteredPersistedLogs);
    }
  }, []);

  return (
    <LogsContainer>
      <SectionList
        contentContainerStyle={{
          paddingBottom: 150,
          marginTop: 5,
          marginLeft: 5,
        }}
        sections={[
          {title: t('Previous Sessions'), data: filteredPersistedLogs},
          {title: t('Current Session'), data: filteredLogs},
        ]}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({section: {title}}) =>
          filteredPersistedLogs.length > 0 ? (
            <ListHeader>{title}</ListHeader>
          ) : null
        }
      />

      <FilterLabels onPress={onFilterLevelChange} />

      <Slider
        step={1}
        value={filterLevel}
        minimumValue={MIN_LOG_LEVEL}
        maximumValue={MAX_LOG_LEVEL}
        onValueChange={onFilterLevelChange}
        style={{
          alignSelf: 'center',
          width: SLIDER_WIDTH,
        }}
        // iOS
        tapToSeek={true}
      />

      <SheetModal
        placement={'top'}
        isVisible={showOptions}
        onBackdropPress={() => setShowOptions(false)}>
        <SheetContainer placement={'top'}>
          <OptionContainer placement={'top'} onPress={() => showDisclaimer()}>
            <OptionIconContainer>
              {theme.dark ? <SendIconWhite /> : <SendIcon />}
            </OptionIconContainer>
            <OptionTextContainer>
              <OptionTitleText>{t('Send Logs By Email')}</OptionTitleText>
              <OptionDescriptionText>
                {t('Be careful, this could contain sensitive private data')}
              </OptionDescriptionText>
            </OptionTextContainer>
          </OptionContainer>
        </SheetContainer>
      </SheetModal>
    </LogsContainer>
  );
};

export default SessionLogs;
