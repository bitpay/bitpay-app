import React, { useState } from 'react';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { LogEntry, LogLevel } from '../../../store/log/log.models';

const LogDisplay = ({ log }: { log: LogEntry }) => {
  const formattedLevel = LogLevel[log.level].toLowerCase();

  return <Text>
    [{log.timestamp}] [{formattedLevel}] {log.message}
  </Text>;
};

const SessionLogs: React.FC = () => {
  const logs = useSelector(({ LOG }: RootState) => LOG.logs);
  const [filterLevel] = useState(LogLevel.None);

  const filteredLogs = logs
    .filter((log) => (log.level <= filterLevel))
    .map((log) => <LogDisplay log={log} key={log.timestamp} />);

  return <>
    {filteredLogs}
  </>;
};

export default SessionLogs;
