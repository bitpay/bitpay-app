import React from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {useAppSelector} from '../utils/hooks';
import {LogLevel} from '../store/log/log.models';
import {RootStackParamList} from '../Root';
import {RootState} from '../store';
import {BaseText} from '../components/styled/Text';
import styled from 'styled-components/native';
import {Caution, SlateDark, White} from '../styles/colors';

export type DebugScreenParamList =
  | {
      name: string | undefined | null;
    }
  | undefined;

const DebugContainer = styled.SafeAreaView`
  flex: 1;
`;

const ScrollView = styled.ScrollView`
  margin: 20px 0;
`;

const TitleError = styled(BaseText)`
  font-size: 18px;
  font-weight: bold;
  color: ${({theme: {dark}}) => (dark ? White : SlateDark)};
  margin: 30px 0 8px 0;
`;

const DescriptionError = styled(BaseText)`
  font-size: 14px;
  color: ${Caution};
`;

const LogError = styled(BaseText)`
  font-size: 14px;
  color: ${({theme: {dark}}) => (dark ? '#E1E4E7' : SlateDark)};
`;

const DebugScreen: React.FC<StackScreenProps<RootStackParamList, 'Debug'>> = ({
  route,
}) => {
  const logs = useAppSelector(({LOG}: RootState) => LOG.logs);
  const {name} = route.params || {};

  const filteredLogs = logs
    .filter(log => log.level <= LogLevel.Debug)
    .map(log => {
      const formattedLevel = LogLevel[log.level].toLowerCase();

      return `[${log.timestamp}] [${formattedLevel}] ${log.message}\n`;
    });

  return (
    <DebugContainer>
      <TitleError>Oops, something went wrong.</TitleError>
      <DescriptionError>{name}</DescriptionError>
      <ScrollView>
        <LogError>{filteredLogs}</LogError>
      </ScrollView>
    </DebugContainer>
  );
};

export default DebugScreen;
