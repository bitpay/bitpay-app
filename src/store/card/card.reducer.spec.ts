/**
 * Tests for card.reducer.ts
 *
 * Each action handled by cardReducer is exercised as a pure function:
 *   cardReducer(state, action) → newState
 *
 * No Redux store or middleware is needed — reducers are pure functions.
 */

import {cardReducer, CardState} from './card.reducer';
import {CardActionTypes} from './card.types';
import {BitPayIdActionTypes} from '../bitpay-id/bitpay-id.types';
import {Network} from '../../constants';
import {Card} from './card.models';
import {CardBrand, CardProvider} from '../../constants/card';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const freshState = (): CardState =>
  cardReducer(undefined, {type: '@@INIT'} as any);

const makeCard = (overrides: Partial<Card> = {}): Card => ({
  activationDate: '2024-01-01',
  brand: CardBrand.Visa,
  cardType: 'virtual',
  currency: {
    code: 'USD',
    decimals: 2,
    name: 'US Dollar',
    precision: 2,
    symbol: '$',
  },
  disabled: false,
  id: 'card-1',
  lastFourDigits: '1234',
  lockedByUser: false,
  nickname: 'My Card',
  pagingSupport: true,
  provider: CardProvider.galileo,
  status: 'active',
  token: 'tok-1',
  ...overrides,
});

const makePagedTxData = (overrides: Partial<any> = {}) => ({
  totalPageCount: 1,
  currentPageNumber: 1,
  totalRecordCount: 1,
  transactionList: [{id: 'tx-1', amount: 10} as any],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

describe('cardReducer — default state', () => {
  it('returns expected defaults on unknown action', () => {
    const state = freshState();
    expect(state.fetchCardsStatus).toBeNull();
    expect(state.fetchVirtualCardImageUrlsStatus).toBeNull();
    expect(state.cards[Network.mainnet]).toEqual([]);
    expect(state.cards[Network.testnet]).toEqual([]);
    expect(state.balances).toEqual({});
    expect(state.virtualCardImages).toEqual({});
    expect(state.virtualDesignCurrency).toBe('bitpay-b');
    expect(state.overview).toBeNull();
    expect(state.activateCardStatus).toBeNull();
    expect(state.activateCardError).toBeNull();
    expect(state.isJoinedWaitlist).toBe(false);
  });

  it('returns same state reference on unknown action', () => {
    const state = freshState();
    const next = cardReducer(state, {type: 'UNKNOWN'} as any);
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// BITPAY_ID_DISCONNECTED
// ---------------------------------------------------------------------------

describe('BITPAY_ID_DISCONNECTED', () => {
  it('clears cards for the specified network and resets balances', () => {
    const card = makeCard({id: 'card-1'});
    const base: CardState = {
      ...freshState(),
      cards: {
        [Network.mainnet]: [card],
        [Network.testnet]: [],
        [Network.regtest]: [],
      },
      balances: {'card-1': 100},
    };
    const state = cardReducer(base, {
      type: BitPayIdActionTypes.BITPAY_ID_DISCONNECTED,
      payload: {network: Network.mainnet},
    });
    expect(state.cards[Network.mainnet]).toEqual([]);
    expect(state.balances).toEqual({});
  });

  it('does not clear cards for other networks', () => {
    const card = makeCard({id: 'card-testnet'});
    const base: CardState = {
      ...freshState(),
      cards: {
        [Network.mainnet]: [],
        [Network.testnet]: [card],
        [Network.regtest]: [],
      },
    };
    const state = cardReducer(base, {
      type: BitPayIdActionTypes.BITPAY_ID_DISCONNECTED,
      payload: {network: Network.mainnet},
    });
    expect(state.cards[Network.testnet]).toEqual([card]);
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_FETCH_CARDS
// ---------------------------------------------------------------------------

describe('SUCCESS_FETCH_CARDS', () => {
  it('sets fetchCardsStatus to success and stores cards for the network', () => {
    const card = makeCard({
      id: 'card-fetched',
      provider: CardProvider.galileo,
      status: 'active',
      disabled: false,
    });
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_CARDS,
      payload: {network: Network.mainnet, cards: [card]},
    });
    expect(state.fetchCardsStatus).toBe('success');
    expect(state.cards[Network.mainnet]).toHaveLength(1);
    expect(state.cards[Network.mainnet][0].id).toBe('card-fetched');
  });

  it('handles empty cards array', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_CARDS,
      payload: {network: Network.mainnet, cards: []},
    });
    expect(state.fetchCardsStatus).toBe('success');
    expect(state.cards[Network.mainnet]).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// FAILED_FETCH_CARDS
// ---------------------------------------------------------------------------

describe('FAILED_FETCH_CARDS', () => {
  it('sets fetchCardsStatus to failed', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_FETCH_CARDS,
    });
    expect(state.fetchCardsStatus).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// UPDATE_FETCH_CARDS_STATUS
// ---------------------------------------------------------------------------

describe('UPDATE_FETCH_CARDS_STATUS', () => {
  it('sets fetchCardsStatus to the given value', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_FETCH_CARDS_STATUS,
      payload: 'success',
    });
    expect(state.fetchCardsStatus).toBe('success');
  });

  it('can reset fetchCardsStatus to null', () => {
    const base: CardState = {...freshState(), fetchCardsStatus: 'failed'};
    const state = cardReducer(base, {
      type: CardActionTypes.UPDATE_FETCH_CARDS_STATUS,
      payload: null,
    });
    expect(state.fetchCardsStatus).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// VIRTUAL_DESIGN_CURRENCY_UPDATED
// ---------------------------------------------------------------------------

describe('VIRTUAL_DESIGN_CURRENCY_UPDATED', () => {
  it('updates virtualDesignCurrency', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.VIRTUAL_DESIGN_CURRENCY_UPDATED,
      payload: 'BTC',
    });
    expect(state.virtualDesignCurrency).toBe('BTC');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_FETCH_OVERVIEW
// ---------------------------------------------------------------------------

describe('SUCCESS_FETCH_OVERVIEW', () => {
  it('sets status to success and updates balance, settled/pending transactions', () => {
    const before = Date.now();
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_OVERVIEW,
      payload: {
        id: 'card-1',
        balance: 500,
        settledTransactions: makePagedTxData(),
        pendingTransactions: [{id: 'ptx-1'} as any],
        topUpHistory: [{id: 'tup-1'} as any],
      },
    });
    expect(state.fetchOverviewStatus['card-1']).toBe('success');
    expect(state.balances['card-1']).toBe(500);
    expect(state.settledTransactions['card-1']).toBeDefined();
    expect(state.pendingTransactions['card-1']).toHaveLength(1);
    expect(state.topUpHistory['card-1']).toHaveLength(1);
    expect(state.lastUpdates.fetchOverview).toBeGreaterThanOrEqual(before);
  });
});

// ---------------------------------------------------------------------------
// FAILED_FETCH_OVERVIEW / UPDATE_FETCH_OVERVIEW_STATUS
// ---------------------------------------------------------------------------

describe('FAILED_FETCH_OVERVIEW', () => {
  it('sets fetchOverviewStatus to failed for the given id', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_FETCH_OVERVIEW,
      payload: {id: 'card-1'},
    });
    expect(state.fetchOverviewStatus['card-1']).toBe('failed');
  });
});

describe('UPDATE_FETCH_OVERVIEW_STATUS', () => {
  it('sets the overview status for the given id', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_FETCH_OVERVIEW_STATUS,
      payload: {id: 'card-1', status: 'loading'},
    });
    expect(state.fetchOverviewStatus['card-1']).toBe('loading');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_FETCH_SETTLED_TRANSACTIONS
// ---------------------------------------------------------------------------

describe('SUCCESS_FETCH_SETTLED_TRANSACTIONS', () => {
  it('stores transactions for a new card', () => {
    const txData = makePagedTxData({currentPageNumber: 1, totalPageCount: 2});
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS,
      payload: {id: 'card-1', transactions: txData},
    });
    expect(state.fetchSettledTransactionsStatus['card-1']).toBe('success');
    expect(state.settledTransactions['card-1']).toEqual(txData);
  });

  it('appends transactions when new page number is greater than current', () => {
    const existingTx = makePagedTxData({
      currentPageNumber: 1,
      transactionList: [{id: 'tx-old'} as any],
    });
    const base: CardState = {
      ...freshState(),
      settledTransactions: {'card-1': existingTx},
    };
    const newTx = makePagedTxData({
      currentPageNumber: 2,
      transactionList: [{id: 'tx-new'} as any],
    });
    const state = cardReducer(base, {
      type: CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS,
      payload: {id: 'card-1', transactions: newTx},
    });
    // should have both old and new transactions
    expect(state.settledTransactions['card-1']?.transactionList).toHaveLength(
      2,
    );
  });

  it('replaces transactions when page number is not greater', () => {
    const existingTx = makePagedTxData({
      currentPageNumber: 2,
      transactionList: [{id: 'tx-old'} as any],
    });
    const base: CardState = {
      ...freshState(),
      settledTransactions: {'card-1': existingTx},
    };
    const newTx = makePagedTxData({
      currentPageNumber: 1,
      transactionList: [{id: 'tx-replace'} as any],
    });
    const state = cardReducer(base, {
      type: CardActionTypes.SUCCESS_FETCH_SETTLED_TRANSACTIONS,
      payload: {id: 'card-1', transactions: newTx},
    });
    expect(state.settledTransactions['card-1']?.transactionList).toHaveLength(
      1,
    );
    expect(state.settledTransactions['card-1']?.transactionList[0].id).toBe(
      'tx-replace',
    );
  });
});

// ---------------------------------------------------------------------------
// FAILED_FETCH_SETTLED_TRANSACTIONS / UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS
// ---------------------------------------------------------------------------

describe('FAILED_FETCH_SETTLED_TRANSACTIONS', () => {
  it('sets status to failed for the given card', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_FETCH_SETTLED_TRANSACTIONS,
      payload: {id: 'card-1'},
    });
    expect(state.fetchSettledTransactionsStatus['card-1']).toBe('failed');
  });
});

describe('UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS', () => {
  it('sets the status for the given card', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_FETCH_SETTLED_TRANSACTIONS_STATUS,
      payload: {id: 'card-1', status: 'success'},
    });
    expect(state.fetchSettledTransactionsStatus['card-1']).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_FETCH_VIRTUAL_IMAGE_URLS
// ---------------------------------------------------------------------------

describe('SUCCESS_FETCH_VIRTUAL_IMAGE_URLS', () => {
  it('sets fetchVirtualCardImageUrlsStatus to success and stores images', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_VIRTUAL_IMAGE_URLS,
      payload: [
        {id: 'card-1', virtualCardImage: 'https://img.example.com/card-1.png'},
      ],
    });
    expect(state.fetchVirtualCardImageUrlsStatus).toBe('success');
    expect(state.virtualCardImages['card-1']).toBe(
      'https://img.example.com/card-1.png',
    );
  });

  it('merges multiple images', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_VIRTUAL_IMAGE_URLS,
      payload: [
        {id: 'card-1', virtualCardImage: 'https://img.example.com/1.png'},
        {id: 'card-2', virtualCardImage: 'https://img.example.com/2.png'},
      ],
    });
    expect(Object.keys(state.virtualCardImages)).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// FAILED_FETCH_VIRTUAL_IMAGE_URLS / UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS
// ---------------------------------------------------------------------------

describe('FAILED_FETCH_VIRTUAL_IMAGE_URLS', () => {
  it('sets fetchVirtualCardImageUrlsStatus to failed', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_FETCH_VIRTUAL_IMAGE_URLS,
    });
    expect(state.fetchVirtualCardImageUrlsStatus).toBe('failed');
  });
});

describe('UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS', () => {
  it('sets the status', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_FETCH_VIRTUAL_IMAGE_URLS_STATUS,
      payload: 'success',
    });
    expect(state.fetchVirtualCardImageUrlsStatus).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_UPDATE_CARD_LOCK
// ---------------------------------------------------------------------------

describe('SUCCESS_UPDATE_CARD_LOCK', () => {
  it('sets updateCardLockStatus to success and updates lockedByUser on the card', () => {
    const card = makeCard({id: 'card-1', lockedByUser: false});
    const base: CardState = {
      ...freshState(),
      cards: {
        [Network.mainnet]: [card],
        [Network.testnet]: [],
        [Network.regtest]: [],
      },
    };
    const state = cardReducer(base, {
      type: CardActionTypes.SUCCESS_UPDATE_CARD_LOCK,
      payload: {network: Network.mainnet, id: 'card-1', locked: true},
    });
    expect(state.updateCardLockStatus['card-1']).toBe('success');
    expect(state.cards[Network.mainnet][0].lockedByUser).toBe(true);
  });

  it('does not modify cards that do not match the id', () => {
    const card1 = makeCard({id: 'card-1', lockedByUser: false});
    const card2 = makeCard({id: 'card-2', lockedByUser: false});
    const base: CardState = {
      ...freshState(),
      cards: {
        [Network.mainnet]: [card1, card2],
        [Network.testnet]: [],
        [Network.regtest]: [],
      },
    };
    const state = cardReducer(base, {
      type: CardActionTypes.SUCCESS_UPDATE_CARD_LOCK,
      payload: {network: Network.mainnet, id: 'card-1', locked: true},
    });
    expect(state.cards[Network.mainnet][1].lockedByUser).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FAILED_UPDATE_CARD_LOCK / UPDATE_UPDATE_CARD_LOCK_STATUS
// ---------------------------------------------------------------------------

describe('FAILED_UPDATE_CARD_LOCK', () => {
  it('sets updateCardLockStatus to failed', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_UPDATE_CARD_LOCK,
      payload: {id: 'card-1'},
    });
    expect(state.updateCardLockStatus['card-1']).toBe('failed');
  });
});

describe('UPDATE_UPDATE_CARD_LOCK_STATUS', () => {
  it('sets the lock status for the given card id', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_UPDATE_CARD_LOCK_STATUS,
      payload: {id: 'card-1', status: null},
    });
    expect(state.updateCardLockStatus['card-1']).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_UPDATE_CARD_NAME
// ---------------------------------------------------------------------------

describe('SUCCESS_UPDATE_CARD_NAME', () => {
  it('sets updateCardNameStatus to success and updates nickname on the card', () => {
    const card = makeCard({id: 'card-1', nickname: 'Old Name'});
    const base: CardState = {
      ...freshState(),
      cards: {
        [Network.mainnet]: [card],
        [Network.testnet]: [],
        [Network.regtest]: [],
      },
    };
    const state = cardReducer(base, {
      type: CardActionTypes.SUCCESS_UPDATE_CARD_NAME,
      payload: {network: Network.mainnet, id: 'card-1', nickname: 'New Name'},
    });
    expect(state.updateCardNameStatus['card-1']).toBe('success');
    expect(state.cards[Network.mainnet][0].nickname).toBe('New Name');
  });
});

// ---------------------------------------------------------------------------
// FAILED_UPDATE_CARD_NAME / UPDATE_UPDATE_CARD_NAME_STATUS
// ---------------------------------------------------------------------------

describe('FAILED_UPDATE_CARD_NAME', () => {
  it('sets updateCardNameStatus to failed', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_UPDATE_CARD_NAME,
      payload: {id: 'card-1'},
    });
    expect(state.updateCardNameStatus['card-1']).toBe('failed');
  });
});

describe('UPDATE_UPDATE_CARD_NAME_STATUS', () => {
  it('sets updateCardNameStatus for the given card', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_UPDATE_CARD_NAME_STATUS,
      payload: {id: 'card-1', status: 'success'},
    });
    expect(state.updateCardNameStatus['card-1']).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_FETCH_REFERRAL_CODE / UPDATE_FETCH_REFERRAL_CODE_STATUS
// ---------------------------------------------------------------------------

describe('referral code actions', () => {
  it('SUCCESS_FETCH_REFERRAL_CODE stores the code', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_REFERRAL_CODE,
      payload: {id: 'card-1', code: 'REF123'},
    });
    expect(state.referralCode['card-1']).toBe('REF123');
  });

  it('UPDATE_FETCH_REFERRAL_CODE_STATUS stores the status', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_FETCH_REFERRAL_CODE_STATUS,
      payload: {id: 'card-1', status: 'loading' as any},
    });
    expect(state.referralCode['card-1']).toBe('loading');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_FETCH_REFERRED_USERS / UPDATE_FETCH_REFERRED_USERS_STATUS
// ---------------------------------------------------------------------------

describe('referred users actions', () => {
  it('SUCCESS_FETCH_REFERRED_USERS stores the users list', () => {
    const users = [{userId: 'u-1'} as any];
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_REFERRED_USERS,
      payload: {id: 'card-1', referredUsers: users},
    });
    expect(state.referredUsers['card-1']).toEqual(users);
  });

  it('UPDATE_FETCH_REFERRED_USERS_STATUS stores the status', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_FETCH_REFERRED_USERS_STATUS,
      payload: {id: 'card-1', status: 'loading'},
    });
    expect(state.referredUsers['card-1']).toBe('loading');
  });
});

// ---------------------------------------------------------------------------
// SUCCESS_ACTIVATE_CARD / FAILED_ACTIVATE_CARD / UPDATE_ACTIVATE_CARD_STATUS
// ---------------------------------------------------------------------------

describe('activate card actions', () => {
  it('SUCCESS_ACTIVATE_CARD sets status to success and clears error', () => {
    const base: CardState = {...freshState(), activateCardError: 'old error'};
    const state = cardReducer(base, {
      type: CardActionTypes.SUCCESS_ACTIVATE_CARD,
      payload: undefined,
    });
    expect(state.activateCardStatus).toBe('success');
    expect(state.activateCardError).toBeNull();
  });

  it('FAILED_ACTIVATE_CARD sets status to failed and stores error', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_ACTIVATE_CARD,
      payload: 'Card not found',
    });
    expect(state.activateCardStatus).toBe('failed');
    expect(state.activateCardError).toBe('Card not found');
  });

  it('FAILED_ACTIVATE_CARD with undefined payload stores null error', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_ACTIVATE_CARD,
      payload: undefined,
    });
    expect(state.activateCardError).toBeNull();
  });

  it('UPDATE_ACTIVATE_CARD_STATUS sets the status', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_ACTIVATE_CARD_STATUS,
      payload: null,
    });
    expect(state.activateCardStatus).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PIN CHANGE REQUEST actions
// ---------------------------------------------------------------------------

describe('pin change request actions', () => {
  it('SUCCESS_FETCH_PIN_CHANGE_REQUEST_INFO stores info and sets status to success', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.SUCCESS_FETCH_PIN_CHANGE_REQUEST_INFO,
      payload: {id: 'card-1', pinChangeRequestInfo: 'token-abc'},
    });
    expect(state.pinChangeRequestInfoStatus['card-1']).toBe('success');
    expect(state.pinChangeRequestInfoError['card-1']).toBeNull();
    expect(state.pinChangeRequestInfo['card-1']).toBe('token-abc');
  });

  it('FAILED_FETCH_PIN_CHANGE_REQUEST_INFO sets status to failed and stores error', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.FAILED_FETCH_PIN_CHANGE_REQUEST_INFO,
      payload: {id: 'card-1', error: 'Network error'},
    });
    expect(state.pinChangeRequestInfoStatus['card-1']).toBe('failed');
    expect(state.pinChangeRequestInfoError['card-1']).toBe('Network error');
  });

  it('UPDATE_FETCH_PIN_CHANGE_REQUEST_INFO_STATUS sets the status', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.UPDATE_FETCH_PIN_CHANGE_REQUEST_INFO_STATUS,
      payload: {id: 'card-1', status: null},
    });
    expect(state.pinChangeRequestInfoStatus['card-1']).toBeNull();
  });

  it('RESET_PIN_CHANGE_REQUEST_INFO clears info, status, and error', () => {
    const base: CardState = {
      ...freshState(),
      pinChangeRequestInfo: {'card-1': 'token-abc'},
      pinChangeRequestInfoStatus: {'card-1': 'success'},
      pinChangeRequestInfoError: {'card-1': null},
    };
    const state = cardReducer(base, {
      type: CardActionTypes.RESET_PIN_CHANGE_REQUEST_INFO,
      payload: {id: 'card-1'},
    });
    expect(state.pinChangeRequestInfo['card-1']).toBeNull();
    expect(state.pinChangeRequestInfoStatus['card-1']).toBeNull();
    expect(state.pinChangeRequestInfoError['card-1']).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CONFIRM PIN CHANGE actions
// ---------------------------------------------------------------------------

describe('confirm pin change actions', () => {
  it('CONFIRM_PIN_CHANGE_SUCCESS sets status to success and clears error', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.CONFIRM_PIN_CHANGE_SUCCESS,
      payload: {id: 'card-1'},
    });
    expect(state.confirmPinChangeStatus['card-1']).toBe('success');
    expect(state.confirmPinChangeError['card-1']).toBeNull();
  });

  it('CONFIRM_PIN_CHANGE_FAILED sets status to failed and stores error', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.CONFIRM_PIN_CHANGE_FAILED,
      payload: {id: 'card-1', error: 'PIN mismatch'},
    });
    expect(state.confirmPinChangeStatus['card-1']).toBe('failed');
    expect(state.confirmPinChangeError['card-1']).toBe('PIN mismatch');
  });

  it('CONFIRM_PIN_CHANGE_STATUS_UPDATED sets the status', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.CONFIRM_PIN_CHANGE_STATUS_UPDATED,
      payload: {id: 'card-1', status: null},
    });
    expect(state.confirmPinChangeStatus['card-1']).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// IS_JOINED_WAITLIST
// ---------------------------------------------------------------------------

describe('IS_JOINED_WAITLIST', () => {
  it('sets isJoinedWaitlist to true', () => {
    const state = cardReducer(freshState(), {
      type: CardActionTypes.IS_JOINED_WAITLIST,
      payload: {isJoinedWaitlist: true},
    });
    expect(state.isJoinedWaitlist).toBe(true);
  });

  it('sets isJoinedWaitlist to false', () => {
    const base: CardState = {...freshState(), isJoinedWaitlist: true};
    const state = cardReducer(base, {
      type: CardActionTypes.IS_JOINED_WAITLIST,
      payload: {isJoinedWaitlist: false},
    });
    expect(state.isJoinedWaitlist).toBe(false);
  });
});
