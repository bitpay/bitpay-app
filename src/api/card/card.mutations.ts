import {IS_ANDROID, IS_IOS} from '../../constants';
import {StartActivateCardParams} from '../../store/card/card.effects';
import {GqlQueryParams} from '../graphql/graphql.types';

type ActivateCardInputType = {
  cardNumber: string | undefined;
  cvv: string;
  expirationDate: string;
  lastFourDigits: string | undefined;
};

type AnalyticsContextInputType =
  | {
      device?: {
        type?: 'ios' | 'android';
      };
    }
  | undefined;

type AnalyticsIntegrationsInputType =
  | {
      AppsFlyer?: {
        appsFlyerId?: string;
      };
    }
  | undefined;

export const ACTIVATE_CARD = (
  token: string,
  id: string,
  {
    cvv,
    expirationDate,
    cardNumber,
    lastFourDigits,
    appsFlyerId,
  }: StartActivateCardParams,
): GqlQueryParams<
  | ActivateCardInputType
  | AnalyticsContextInputType
  | AnalyticsIntegrationsInputType
> => {
  let context: AnalyticsContextInputType;
  let integrations: AnalyticsIntegrationsInputType;

  if (IS_ANDROID) {
    context = {
      device: {
        type: 'android',
      },
    };
  } else if (IS_IOS) {
    context = {
      device: {
        type: 'ios',
      },
    };
  }

  if (appsFlyerId) {
    integrations = {
      AppsFlyer: {
        appsFlyerId,
      },
    };
  }

  return {
    query: `
      mutation ACTIVATE_CARD($token:String!, $csrf:String, $cardId:String!, $input:ActivateCardInputType!, $context:AnalyticsContextInputType, $integrations:AnalyticsIntegrationsInputType) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            activationDate:activateCard(input:$input, context:$context, integrations:$integrations)
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
      context,
      integrations,
    },
  };
};

const CardMutations = {
  ACTIVATE_CARD,
};

export default CardMutations;
