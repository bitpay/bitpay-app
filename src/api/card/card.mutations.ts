import {StartActivateCardParams} from '../../store/card/card.effects';
import {GqlQueryParams} from '../graphql/graphql.types';

type NameCardInputType = {
  value: string;
};

type LockCardInputType = {
  value: boolean;
};

type ActivateCardInputType = {
  cardNumber: string | undefined;
  cvv: string;
  expirationDate: string;
  lastFourDigits: string | undefined;
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

export const ACTIVATE_CARD = (
  token: string,
  id: string,
  {cvv, expirationDate, cardNumber, lastFourDigits}: StartActivateCardParams,
): GqlQueryParams<ActivateCardInputType> => {
  return {
    query: `
      mutation ACTIVATE_CARD($token:String!, $csrf:String, $cardId:String!, $input:ActivateCardInputType!) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            activationDate:activateCard(input:$input)
          }
        }
      }
    `,
    variables: {
      token,
      cardId: id,
      input: {
        cardNumber,
        cvv,
        expirationDate,
        lastFourDigits,
      },
    },
  };
};

const CardMutations = {
  NAME_CARD,
  LOCK_CARD,
  ACTIVATE_CARD,
};

export default CardMutations;
