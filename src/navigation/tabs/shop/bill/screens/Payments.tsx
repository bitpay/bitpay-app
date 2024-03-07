import React, {useLayoutEffect} from 'react';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useTranslation} from 'react-i18next';
import {BillScreens, BillGroupParamList} from '../BillGroup';
import {HeaderTitle} from '../../../../../components/styled/Text';
import styled from 'styled-components/native';
import {useAppSelector} from '../../../../../utils/hooks';
import {BillPayAccount} from '../../../../../store/shop/shop.models';
import {PaymentList} from '../components/PaymentList';
import {SendToPillContainer} from '../../../../wallet/screens/send/confirm/Shared';
import {BillAccountPill} from '../components/BillAccountPill';
import {ScreenContainer} from '../../components/styled/ShopTabComponents';

const BillListContainer = styled.View`
  padding: 15px 16px 0;
`;

const Payments = ({
  navigation,
  route,
}: NativeStackScreenProps<BillGroupParamList, BillScreens.PAYMENTS>) => {
  const {t} = useTranslation();
  const {account} = route.params;
  const accounts = useAppSelector(
    ({APP, SHOP}) => SHOP.billPayAccounts[APP.network],
  ) as BillPayAccount[];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
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
    <ScreenContainer>
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
    </ScreenContainer>
  );
};

export default Payments;
