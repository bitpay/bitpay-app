import {StackNavigationProp} from '@react-navigation/stack';
import {useTranslation} from 'react-i18next';
import React, {useState, useCallback} from 'react';
import Mailer from 'react-native-mail';
import {Alert, FlatList} from 'react-native';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {RootState} from '../../../../../store';
import {LogLevel} from '../../../../../store/log/log.models';
import {LogActions} from '../../../../../store/log';
import {AboutStackParamList} from '../AboutStack';
import Button from '../../../../../components/button/Button';
import {
  SlateDark,
  Caution,
  Warning,
  LinkBlue,
  White,
} from '../../../../../styles/colors';
import {BaseText} from '../../../../../components/styled/Text';
// @ts-ignore
import {version} from '../../../../../../package.json'; // TODO: better way to get version
import {useAppDispatch} from '../../../../../utils/hooks';

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

const SessionLogs: React.FC<SessionLogsScreenProps> = () => {
  const {t} = useTranslation();
  const dispatch = useAppDispatch();
  const logs = useSelector(({LOG}: RootState) => LOG.logs);
  const [filterLevel] = useState(LogLevel.None);

  const filteredLogs = logs.filter(log => log.level <= filterLevel);

  let logStr: string =
    'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
  logStr += filteredLogs.map(log => {
    const formattedLevel = LogLevel[log.level].toLowerCase();
    return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
  });

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

  const showDisclaimer = (data: string) => {
    Alert.alert(
      'Warning',
      'Be careful, this could contain sensitive private data.',
      [{text: 'Continue', onPress: () => handleEmail(data)}, {text: 'Cancel'}],
      {cancelable: true},
    );
  };

  const renderItem = useCallback(
    ({item}) => (
      <Logs
        color={
          LogLevel[item.level].toLowerCase() === 'error'
            ? Caution
            : LogLevel[item.level].toLowerCase() === 'warn'
            ? Warning
            : LogLevel[item.level].toLowerCase() === 'debug'
            ? LinkBlue
            : null
        }>
        [{LogLevel[item.level]}] {item.message}
      </Logs>
    ),
    [],
  );

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
      <ButtonContainer>
        <Button onPress={() => showDisclaimer(logStr)}>
          {t('Send Logs By Email')}
        </Button>
      </ButtonContainer>
    </LogsContainer>
  );
};

export default SessionLogs;
