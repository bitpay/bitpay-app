import {useTheme} from '@react-navigation/native';
import React, {useState} from 'react';
import {StyleProp, Text, TextStyle} from 'react-native';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {LogLevel} from '../../../../../store/log/log.models';

const SessionLogs: React.FC = () => {
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
