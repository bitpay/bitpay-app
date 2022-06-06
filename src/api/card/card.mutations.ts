import {
  AppleWalletProvisioningRequestParams,
  StartActivateCardParams,
} from '../../store/card/card.effects';
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

export const START_CREATE_APPLE_WALLET_PROVISIONING_REQUEST = (
  token: string,
  id: string,
  {
    cert1,
    cert2,
    nonce,
    nonceSignature,
    walletProvider,
  }: AppleWalletProvisioningRequestParams,
): GqlQueryParams<AppleWalletProvisioningRequestParams> => {
  return {
    query: `
            mutation START_CREATE_PROVISIONING_REQUEST($token:String!, $csrf:String, $cardId:String!, $input:ProvisionInputType!) {
              user:bitpayUser(token:$token, csrf:$csrf) {
                card:debitCard(cardId:$cardId) {
                  provisioningData:createProvisioningRequest(input:$input) {
                    activationData,
                    encryptedPassData,
                    wrappedKey
                  }
                }
              }
            }
          `,
    variables: {
      token,
      cardId: id,
      input: {
        walletProvider,
        cert1,
        cert2,
        nonce,
        nonceSignature,
      },
    },
  };
};

export const START_CREATE_GOOGLE_PAY_PROVISIONING_REQUEST = (
  token: string,
  id: string,
) => {
  return {
    query: `
      mutation START_CREATE_PROVISIONING_REQUEST($token:String!, $csrf:String, $cardId:String!, $input:ProvisionInputType!) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            provisioningData:createProvisioningRequest(input:$input) {
              opaquePaymentCard
            }
          }
        }
      }
    `,
    variables: {
      cardId: id,
      input: {
        walletProvider: 'google',
      },
    },
  };
};

const CardMutations = {
  NAME_CARD,
  LOCK_CARD,
  ACTIVATE_CARD,
  START_CREATE_APPLE_WALLET_PROVISIONING_REQUEST,
  START_CREATE_GOOGLE_PAY_PROVISIONING_REQUEST,
};

export default CardMutations;
