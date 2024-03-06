import {BillPayAccount, BillPayment} from '../../../../store/shop/shop.models';

export const getBillAccountEventParamsForMultipleBills = (
  accounts: BillPayAccount[] = [],
  payments?: BillPayment[],
) => {
  const eventParams: {[x: string]: (string | boolean | number)[]} = {
    merchantName:
      payments?.map(({merchantName}) => merchantName) ||
      accounts.map(account => account[account.type].merchantName),
    merchantType:
      payments?.map(({accountType}) => accountType) ||
      accounts.map(account => account[account.type].type),
    customBill: accounts.map(account => account.isManuallyAdded),
    ...(payments && {amount: payments?.map(({amount}) => amount)}),
  };
  const finalParams = Object.keys(eventParams).reduce(
    (newParams, param) => ({
      ...newParams,
      ...{
        [param]:
          eventParams[param].length === 1
            ? eventParams[param][0]
            : eventParams[param],
      },
    }),
    {},
  );
  return finalParams;
};

export const getBillAccountEventParams = (
  account?: BillPayAccount,
  payment?: BillPayment,
) => {
  return getBillAccountEventParamsForMultipleBills(
    account && [account],
    payment && [payment],
  );
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
