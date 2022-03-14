import {GqlQueryParams} from '../graphql/graphql.types';

type NameCardInputType = {
  value: string;
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

const CardMutations = {
  NAME_CARD,
};

export default CardMutations;
