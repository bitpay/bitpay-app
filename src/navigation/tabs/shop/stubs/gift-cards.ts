import {BASE_BITPAY_URLS, APP_NETWORK} from '../../../../constants/config';

export const purchasedBrands = [
  {amount: 200, name: 'Amazon.com'},
  ...(!BASE_BITPAY_URLS[APP_NETWORK].includes('test')
    ? [
        // {amount: 150, name: 'Airbnb'},
        {amount: 25, name: 'Uber'},
        {amount: 25, name: 'Walmart'},
        // {amount: 25, name: 'SUBWAY'},
      ]
    : []),
];
