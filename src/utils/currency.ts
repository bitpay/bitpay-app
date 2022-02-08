import 'intl';
import 'intl/locale-data/jsonp/en-US';

const formatterCache: {[k: string]: Intl.NumberFormat} = {};

export const format = (amount: number, currency: string) => {
  if (!amount) {
    amount = 0;
  }

  if (!formatterCache[currency]) {
    formatterCache[currency] = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    });
  }

  return formatterCache[currency].format(amount);
};
