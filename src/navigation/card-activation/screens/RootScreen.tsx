import {StackScreenProps} from '@react-navigation/stack';
import React, {useLayoutEffect, useRef} from 'react';
import {Card} from '../../../store/card/card.models';
import {isActivationRequired} from '../../../utils/card';
import {useAppSelector} from '../../../utils/hooks';
import {CardActivationStackParamList} from '../CardActivationStack';

export type RootScreenParamList = {
  card: Card;
};

const RootScreen: React.FC<
  StackScreenProps<CardActivationStackParamList, 'Root'>
> = ({navigation, route}) => {
  const {card} = route.params;
  const session = useAppSelector(({BITPAY_ID}) => BITPAY_ID.session);

  const redirectRef = useRef(() => {
    if (!isActivationRequired(card)) {
      return navigation.replace('Complete');
    }

    if (!session.isAuthenticated) {
      return navigation.replace('Authentication', {
        card,
      });
    }

    return navigation.replace('Activate', {
      card,
    });
  });

  useLayoutEffect(() => {
    redirectRef.current();
  }, [navigation]);

  return null;
};

export default RootScreen;
