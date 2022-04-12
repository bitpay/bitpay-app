import {useNavigation} from '@react-navigation/native';
import React from 'react';
import LinkCard from './LinkCard';

export const GetMastercard: React.FC = () => {
  const navigation = useNavigation();

  return (
    <LinkCard
      description={'Get the BitPay prepaid Mastercard®'}
      onPress={() => navigation.navigate('Card', {screen: 'Home'})}
    />
  );
};
