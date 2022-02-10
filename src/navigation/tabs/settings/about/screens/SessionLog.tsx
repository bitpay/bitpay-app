import {StackNavigationProp} from '@react-navigation/stack';
import React, {useState} from 'react';
import {StyleProp, Text, TextStyle} from 'react-native';
import {useSelector} from 'react-redux';
import {useTheme} from 'styled-components/native';
import {RootState} from '../../../../../store';
import {LogLevel} from '../../../../../store/log/log.models';
import {AboutStackParamList} from '../AboutStack';

export interface SessionLogsParamList {}

type SessionLogsScreenProps = StackNavigationProp<
  AboutStackParamList,
  'SessionLogs'
>;

const SessionLogs: React.FC<SessionLogsScreenProps> = () => {
  const theme = useTheme();
  const textStyle: StyleProp<TextStyle> = {color: theme.colors.text};
  const logs = useSelector(({LOG}: RootState) => LOG.logs);
  const [filterLevel] = useState(LogLevel.None);

  const filteredLogs = logs
    .filter(log => log.level <= filterLevel)
    .map(log => {
      const formattedLevel = LogLevel[log.level].toLowerCase();

      return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
    });

  return <Text style={textStyle}>{filteredLogs}</Text>;
};

export default SessionLogs;
