import React from 'react';
import {BillPayAccount} from '../../../../../store/shop/shop.models';
import SendToPill from '../../../../wallet/components/SendToPill';
import {Image} from 'react-native';

export const BillAccountPill = ({account}: {account: BillPayAccount}) => (
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
          uri: account[account.type].merchantIcon,
        }}
      />
    }
    description={`${account[account.type].merchantName.slice(0, 11)} ****${
      account[account.type].mask
    }`}
    dropDown={false}
  />
);
