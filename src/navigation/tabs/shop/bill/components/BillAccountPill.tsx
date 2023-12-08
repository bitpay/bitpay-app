import React from 'react';
import {
  BillPayAccount,
  BillPayment,
} from '../../../../../store/shop/shop.models';
import SendToPill from '../../../../wallet/components/SendToPill';
import {Image} from 'react-native';

export const BillAccountPill = ({
  account,
  payment,
}: {
  account: BillPayAccount;
  payment?: BillPayment;
}) => (
  <SendToPill
    height={'37px'}
    icon={
      <Image
        style={{
          height: 18,
          width: 18,
          marginTop: -2,
          borderRadius: 10,
        }}
        resizeMode={'contain'}
        source={{
          uri: payment?.icon || account[account.type].merchantIcon,
        }}
      />
    }
    description={
      payment?.accountDescription || account[account.type].description
    }
    dropDown={false}
  />
);
