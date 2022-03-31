import axios from 'axios';

/**
 * Gets the country from which the user connects
 * @param
 * @returns Alpha-2 code of a country
 */

export const getCountry = async () => {
  try {
    const {data: countryData} = await axios.get(
      'https://bitpay.com/wallet-card/location',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      },
    );

    return countryData.country as string;
  } catch (err) {
    console.log(err);
    return 'US';
  }
};
