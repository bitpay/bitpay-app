import Slider from '@react-native-community/slider';
import {StackNavigationProp} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import React, {useState, memo} from 'react';
import Mailer from 'react-native-mail';
import {Alert, FlatList} from 'react-native';
import styled from 'styled-components/native';
// @ts-ignore
import {version} from '../../../../../../package.json'; // TODO: better way to get version
import Button from '../../../../../components/button/Button';
import {WIDTH} from '../../../../../components/styled/Containers';
import {BaseText} from '../../../../../components/styled/Text';
import {IS_ANDROID, IS_IOS} from '../../../../../constants';
import {LogEntry, LogLevel} from '../../../../../store/log/log.models';
import {LogActions} from '../../../../../store/log';
import {
  SlateDark,
  Caution,
  Warning,
  LinkBlue,
  White,
} from '../../../../../styles/colors';
import {useAppDispatch, useAppSelector} from '../../../../../utils/hooks';
import {AboutStackParamList} from '../AboutStack';

export interface SessionLogsParamList {}

type SessionLogsScreenProps = StackNavigationProp<
  AboutStackParamList,
  'SessionLogs'
>;

const LogsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ButtonContainer = styled.View`
  padding: 20px 15px;
`;

const Logs = styled(BaseText)<{color?: string | null}>`
  font-size: 14px;
  line-height: 21px;
  color: ${({theme: {dark}, color}) =>
    color ? color : dark ? White : SlateDark};
`;

const FilterLabelsContainer = styled.View`
  flex-direction: row;
  margin-top: 16px;
`;

const FilterLabel = styled(BaseText)`
  flex: 1 1 100%;
  text-align: center;
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

const FilterLabels = memo(() => {
  const labels = [];

  for (let i = MIN_LOG_LEVEL; i <= MAX_LOG_LEVEL; ++i) {
    labels.push(LogLevel[i]);
  }

  return (
    <FilterLabelsContainer>
      {labels.map(label => (
        <FilterLabel key={label}>{label}</FilterLabel>
      ))}
    </FilterLabelsContainer>
  );
});

const renderItem = ({item}: {item: LogEntry}) => (
  <Logs color={LogColorMap[item.level]}>
    [{LogLevel[item.level]}] {item.message}
  </Logs>
);

const SessionLogs: React.VFC<SessionLogsScreenProps> = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logs = useAppSelector(({LOG}) => LOG.logs);
  const [filterLevel, setFilterLevel] = useState(LogLevel.Info);

  const filteredLogs = logs.filter(log => log.level <= filterLevel);

  const handleEmail = (data: string) => {
    Mailer.mail(
      {
        subject: `BitPay v${version} Logs`,
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
    let logStr =
      'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
    logStr += filteredLogs.map(log => {
      const formattedLevel = LogLevel[log.level].toLowerCase();

      return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
    });

    Alert.alert(
      'Warning',
      'Be careful, this could contain sensitive private data.',
      [
        {text: 'Continue', onPress: () => handleEmail(logStr)},
        {text: 'Cancel'},
      ],
      {cancelable: true},
    );
  };

  return (
    <LogsContainer>
      <FlatList
        contentContainerStyle={{
          paddingVertical: 15,
          paddingHorizontal: 15,
        }}
        data={filteredLogs}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.message + index}
      />

      <FilterLabels />

      <Slider
        step={1}
        value={filterLevel}
        minimumValue={MIN_LOG_LEVEL}
        maximumValue={MAX_LOG_LEVEL}
        onValueChange={setFilterLevel}
        style={{
          alignSelf: 'center',
          width: SLIDER_WIDTH,
        }}
        // iOS
        tapToSeek={true}
      />

      <ButtonContainer>
        <Button onPress={() => showDisclaimer()}>
          {t('Send Logs By Email')}
        </Button>
      </ButtonContainer>
    </LogsContainer>
  );
};

export default SessionLogs;
