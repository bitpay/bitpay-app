import {GqlQueryParams} from '../graphql.types';

export const cardFields = `
  id,
  token,
  currency {
    name
    code
    symbol
    precision
    decimals
  },
  lastFourDigits,
  provider,
  brand,
  status,
  disabled,
  activationDate,
  cardType,
  pagingSupport
`;

export const FETCH_CARDS = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_CARDS($token:String!, $csrf:String) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          cards:debitCards {
            ${cardFields}
          }
        }
      }`,
    variables: {
      token,
    },
  };
};

export const FETCH_CARD = (token: string, id: string): GqlQueryParams => {
  return {
    query: `
      query START_GET_CARD($token:String!, $csrf:String, $id:String!) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$id) {
            ${cardFields}
          }
        }
      }
    `,
    variables: {
      token,
      id,
    },
  };
};

const CardQueries = {
  FETCH_CARDS,
  FETCH_CARD,
};

export default CardQueries;
