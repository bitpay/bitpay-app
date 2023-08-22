import {BillPayAccount} from '../../../../store/shop/shop.models';

export const getBillAccountEventParams = (account: BillPayAccount) => {
  return {
    merchantBrand: account[account.type].merchantName,
    merchantType: account[account.type].type,
  };
};

export const formatUSPhone = (unformattedPhone: string) => {
  if (!unformattedPhone.startsWith('+1') || unformattedPhone.length !== 12) {
    return unformattedPhone;
  }
  const areaCode = unformattedPhone.substring(2, 5);
  const nextThree = unformattedPhone.substring(5, 8);
  const lastFour = unformattedPhone.substring(8, 12);
  return `(${areaCode}) ${nextThree}-${lastFour}`;
};
