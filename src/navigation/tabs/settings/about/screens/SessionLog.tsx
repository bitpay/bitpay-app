import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import Mailer from 'react-native-mail';
import {Alert} from 'react-native';
import {useSelector} from 'react-redux';
import styled from 'styled-components/native';
import {RootState} from '../../../../../store';
import {LogLevel} from '../../../../../store/log/log.models';
import {AboutStackParamList} from '../AboutStack';
import Button from '../../../../../components/button/Button';
import {SlateDark} from '../../../../../styles/colors';
import {BaseText} from '../../../../../components/styled/Text';

export interface SessionLogsParamList {}

type SessionLogsScreenProps = StackNavigationProp<
  AboutStackParamList,
  'SessionLogs'
>;

const LogsContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin: 20px 15px;
`;

const ButtonContainer = styled.View`
  padding: 10px 15px;
`;

const Logs = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? '#E1E4E7' : SlateDark)};
`;

const SessionLogs: React.FC<SessionLogsScreenProps> = () => {
  const logs = useSelector(({LOG}: RootState) => LOG.logs);
  const [filterLevel] = useState(LogLevel.None);

  let logStr: string =
    'Session Logs.\nBe careful, this could contain sensitive private data\n\n';
  logStr += '\n\n';

  const filteredLogs = logs
    .filter(log => log.level <= filterLevel)
    .map(log => {
      const formattedLevel = LogLevel[log.level].toLowerCase();

      const output = `[${formattedLevel}] ${log.message}\n`;
      logStr += output;
      return `[${log.timestamp}] ${output}`;
    });

  const handleEmail = (data: string) => {
    Mailer.mail(
      {
        subject: 'BitPay Log',
        body: data,
        isHTML: false,
      },
      (error, event) => {
        Alert.alert(
          error,
          event,
          [
            {
              text: 'Ok',
              onPress: () => console.log('OK: Email Error Response'),
            },
            {
              text: 'Cancel',
              onPress: () => console.log('CANCEL: Email Error Response'),
            },
          ],
          {cancelable: true},
        );
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

  return (
    <LogsContainer>
      <ScrollView>
        <Logs>{filteredLogs}</Logs>
      </ScrollView>
      <ButtonContainer>
        <Button onPress={() => showDisclaimer(logStr)}>
          Send Logs By Email
        </Button>
      </ButtonContainer>
    </LogsContainer>
  );
};

export default SessionLogs;
