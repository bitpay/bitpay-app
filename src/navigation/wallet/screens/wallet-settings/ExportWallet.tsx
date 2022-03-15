import React, {useLayoutEffect} from 'react';
import {BaseText, HeaderTitle} from '../../../../components/styled/Text';
import {useNavigation} from '@react-navigation/native';

const ExportWallet = () => {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <HeaderTitle>Export Wallet</HeaderTitle>,
    });
  }, [navigation]);
  return <BaseText>Export wallet</BaseText>;
};

export default ExportWallet;
