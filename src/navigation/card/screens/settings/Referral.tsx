import React from 'react';
import {Card} from '../../../../store/card/card.models';
import {useAppDispatch} from '../../../../utils/hooks';
import {CardEffects} from '../../../../store/card';
import {useRoute} from '@react-navigation/native';
import {RouteProp} from '@react-navigation/core';
import {CardStackParamList} from '../../CardStack';
export interface ReferralParamList {
  card: Card;
}

const Referral = ({}) => {
  const {
    params: {
      card: {id},
    },
  } = useRoute<RouteProp<CardStackParamList, 'Referral'>>();

  const dispatch = useAppDispatch();
  dispatch(CardEffects.START_FETCH_REFERRAL_CODE(id));
  dispatch(CardEffects.START_FETCH_REFERRED_USERS(id));

  return <></>;
};

export default Referral;
