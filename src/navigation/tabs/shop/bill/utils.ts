import {BillPayAccount, BillPayment} from '../../../../store/shop/shop.models';

export const getBillAccountEventParams = (
  account: BillPayAccount,
  payment?: BillPayment,
) => {
  return {
    merchantBrand: payment?.merchantName || account[account.type].merchantName,
    merchantType: payment?.accountType || account[account.type].type,
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

export const getBillPayAccountDescription = (
  accountType: string,
  mask: string,
) => {
  return `${accountType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(' ')} ****${mask}`;
};
