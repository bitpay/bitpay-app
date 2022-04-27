import {StackScreenProps} from '@react-navigation/stack';
import React from 'react';
import {BaseText} from '../../../components/styled/Text';
import {CardActivationStackParamList} from '../CardActivationStack';

export type CompleteScreenParamList = undefined;

const CompleteScreen: React.FC<
  StackScreenProps<CardActivationStackParamList, 'Complete'>
> = () => {
  return (
    <>
      <BaseText>Complete</BaseText>
    </>
  );
};

export default CompleteScreen;
