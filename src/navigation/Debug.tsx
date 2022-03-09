import React from 'react';
import {StackScreenProps} from '@react-navigation/stack';
import {RootStackParamList} from '../Root';
import {BaseText} from '../components/styled/Text';

export type DebugScreenParamList =
  | {
      name: string | undefined | null;
    }
  | undefined;

const DebugScreen: React.FC<StackScreenProps<RootStackParamList, 'Debug'>> = ({
  route,
}) => {
  const {name} = route.params || {};

  const paramString = JSON.stringify(route.params || {});

  return (
    <>
      <BaseText>
        Hello {name || 'World'}! {'\n'}
      </BaseText>
      <BaseText>
        Params: {'\n'}
        {paramString}
      </BaseText>
    </>
  );
};

export default DebugScreen;
