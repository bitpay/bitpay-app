import {GqlQueryParams} from '../graphql/graphql.types';

type NameCardInputType = {
  value: string;
};

type LockCardInputType = {
  value: boolean;
};

export const NAME_CARD = (
  token: string,
  id: string,
  name: string,
): GqlQueryParams<NameCardInputType> => {
  return {
    query: `
      mutation NAME_CARD($token:String!, $csrf:String, $cardId:String!, $input:NameCardInputType!) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            nickname:nameCard(input:$input)
          }
        }
      }
    `,
    variables: {
      token,
      cardId: id,
      input: {
        value: name,
      },
    },
  };
};

export const LOCK_CARD = (
  token: string,
  id: string,
  locked: boolean,
): GqlQueryParams<LockCardInputType> => {
  return {
    query: `
      mutation LOCK_CARD($token:String!, $csrf:String, $cardId:String!, $input:LockCardInputType!) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            locked:lockCard(input:$input)
          }
        }
      }
    `,
    variables: {
      token,
      cardId: id,
      input: {
        value: locked,
      },
    },
  };
};

const CardMutations = {
  NAME_CARD,
  LOCK_CARD,
};

export default CardMutations;
