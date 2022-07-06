import {GqlQueryParams} from '../graphql/graphql.types';

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
  pagingSupport,
  nickname,
  lockedByUser,
`;

const transactionFields = `
  id
  dates {
    auth
    post
  }
  provider
  amount
  currency
  fees {
    amount
    currency
    type
  }
  feesTotal
  status
  type
  description
  merchant {
    merchantName
    merchantCity
    merchantState
  }
  displayMerchant
  displayPrice
`;

const topUpFields = `
  id
  invoice {
    id
    status
    merchantStatus
    exceptionStatus
    active
    buyerEmailAddress
    currency {
      name
      code
      symbol
      precision
      decimals
    }
    price
    confirmed
    orderId
    itemDesc
    itemCode
    invoiceTime
    paymentDisplayAmountPaid
    paymentDisplayTotals
    paymentDisplaySubTotals
    paymentDisplayUnderpaidAmount
    paymentDisplayOverpaidAmount
    paymentDisplayDeclinedAmount
    exchangeRate
    transactionCurrency {
      name
      code
      symbol
      precision
      decimals
    }
    txId
    merchant {
      numericId
      merchantName
    }
    isRefunded
    refundType
    networkCost
  }
  amount
  appliedDate
  debitCard
  user
  provider
  pending
  displayMerchant {
    merchantName
    merchantCity
    merchantState
  }
  referralId
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
      query FETCH_CARD($token:String!, $csrf:String, $id:String!) {
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

/**
 * Warning! This is a heavy operation so call it only when necessary. Particularly
 * the balance and transaction data since we need to reach out to the provider.
 * Topups are fetched locally so they are relatively light.
 * @returns Overview data for the given card ID including balance and
 * pending/settled transaction and topup activity.
 */
const FETCH_OVERVIEW = (
  token: string,
  id: string,
  options: any = {},
): GqlQueryParams => {
  const {pageSize, pageNumber, startDate, endDate} = options;

  return {
    query: `
      query FETCH_OVERVIEW($token:String!, $csrf:String, $cardId:String!, $pageSize:Int, $pageNumber:Int, $startDate:String, $endDate:String, $credited:Boolean!) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            id
            balance:cardBalance
            overview:activityOverview(pageSize:$pageSize, pageNumber:$pageNumber,startDate: $startDate, endDate:$endDate) {
              dateAccountOpened
              pendingTransactions {
                ${transactionFields}
              },
              settledTransactions {
                currentPageNumber
                totalPageCount
                totalRecordCount
                transactionList {
                  ${transactionFields}
                }
              }
            }
            topUpHistory(startDate:$startDate, endDate:$endDate, credited:$credited) {
              ${topUpFields}
            }
          }
        }
      }
    `,
    variables: {
      token,
      cardId: id,
      pageSize,
      pageNumber,
      startDate,
      endDate,

      /**
       * Filter topup records based on whether the topup has only been
       * submitted or successfully credited. There will be an unavoidable
       * network delay between when a topup has been credited in our records
       * vs when it has been applied and will appear in the provider transactions.
       */
      credited: false,
    },
  };
};

const FETCH_SETTLED_TRANSACTIONS = (
  token: string,
  id: string,
  options?: {
    pageSize?: number;
    pageNumber?: number;
    startDate?: string;
    endDate?: string;
  },
): GqlQueryParams => {
  const {pageSize, pageNumber, startDate, endDate} = options || {};

  return {
    query: `
      query FETCH_SETTLED_TRANSACTIONS($token:String!, $csrf:String, $cardId:String!, $pageSize:Int, $pageNumber:Int, $startDate:String, $endDate:String) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            id
            overview:activityOverview(pageSize:$pageSize, pageNumber:$pageNumber,startDate: $startDate, endDate:$endDate) {
              dateAccountOpened
              settledTransactions {
                currentPageNumber
                totalPageCount
                totalRecordCount
                transactionList {
                  ${transactionFields}
                }
              }
            }
          }
        }
      }
    `,
    variables: {
      token,
      cardId: id,
      pageSize,
      pageNumber,
      startDate,
      endDate,
    },
  };
};

const FETCH_VIRTUAL_CARD_IMAGE_URLS = (
  token: string,
  ids: string[],
): GqlQueryParams => {
  const queryFragments = ids.map((id, idx) => {
    return `
      card${idx}:debitCard(cardId:"${id}") {
        id
        virtualCardImage
      }
    `;
  });

  return {
    query: `
      query FETCH_VIRTUAL_CARD_IMAGE_URL($token:String!) {
        user:bitpayUser(token:$token) {
          ${queryFragments.join('\n')}
        }
      }
    `,
    variables: {
      token,
    },
  };
};

const FETCH_REFERRAL_CODE = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_REFERRAL_CODE($token:String!, $csrf:String) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          referralCode: getOrGenerateReferralCode
        }
      }`,
    variables: {
      token,
    },
  };
};

const FETCH_REFERRED_USERS = (token: string): GqlQueryParams => {
  return {
    query: `
      query FETCH_REFERRED_USERS($token:String!, $csrf:String) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          referredUsers: getReferredUsers{
            givenName
            familyName
            status
            expiration
          }
        }
      }
    `,
    variables: {
      token,
    },
  };
};

const FETCH_PIN_CHANGE_REQUEST_INFO = (
  token: string,
  id: string,
): GqlQueryParams => {
  return {
    query: `
      query FETCH_PIN_CHANGE_REQUEST_INFO($token:String!, $csrf:String, $cardId:String!) {
        user:bitpayUser(token:$token, csrf:$csrf) {
          card:debitCard(cardId:$cardId) {
            pinChangeRequestInfo
          }
        }
      }
    `,
    variables: {
      token,
      cardId: id,
    },
  };
};

const CardQueries = {
  FETCH_CARDS,
  FETCH_CARD,
  FETCH_OVERVIEW,
  FETCH_PIN_CHANGE_REQUEST_INFO,
  FETCH_REFERRAL_CODE,
  FETCH_REFERRED_USERS,
  FETCH_SETTLED_TRANSACTIONS,
  FETCH_VIRTUAL_CARD_IMAGE_URLS,
};

export default CardQueries;
