import React, {useLayoutEffect} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BillScreens, BillStackParamList} from '../BillStack';
import {HeaderTitle} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import {View} from 'react-native';
import {useAppSelector} from '../../../../../utils/hooks';
import {BillPayAccount} from '../../../../../store/shop/shop.models';
import {PaymentList} from '../components/PaymentList';
import {APP_NETWORK} from '../../../../../constants/config';
import {SendToPillContainer} from '../../../../wallet/screens/send/confirm/Shared';
import {BillAccountPill} from '../components/BillAccountPill';

const BillListContainer = styled.View`
  padding: 5px 16px 0;
`;

const Payments = ({
  navigation,
  route,
}: NativeStackScreenProps<BillStackParamList, 'Payments'>) => {
  const {t} = useTranslation();
  const {account} = route.params;
  const accounts = useAppSelector(
    ({SHOP}) => SHOP.billPayAccounts[APP_NETWORK],
  ) as BillPayAccount[];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => {
        return (
          <HeaderTitle>
            {account
              ? t(`${account[account.type].merchantName} Payments`)
              : t('All Payments')}
          </HeaderTitle>
        );
      },
    });
  });

  return (
    <View style={{paddingTop: 10}}>
      <BillListContainer>
        {account ? (
          <SendToPillContainer style={{alignItems: 'center', marginBottom: 24}}>
            <BillAccountPill account={account} />
          </SendToPillContainer>
        ) : null}
        <PaymentList
          accounts={accounts}
          account={account}
          variation={'small'}
          onPress={(accountObj, payment) => {
            navigation.navigate(BillScreens.PAYMENT, {
              account: accountObj,
              payment,
            });
          }}
        />
      </BillListContainer>
    </View>
  );
};

export default Payments;
