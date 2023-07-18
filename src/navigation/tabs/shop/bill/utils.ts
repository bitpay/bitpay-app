import {BillPayAccount} from '../../../../store/shop/shop.models';

export const getBillAccountEventParams = (account: BillPayAccount) => {
  return {
    merchantBrand: account[account.type].merchantName,
    merchantType: account[account.type].type,
  };
};
