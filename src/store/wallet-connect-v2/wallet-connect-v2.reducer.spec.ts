import {
  walletConnectV2Reducer,
  WalletConnectV2State,
} from './wallet-connect-v2.reducer';
import {WalletConnectV2ActionTypes} from './wallet-connect-v2.types';

const freshState = (): WalletConnectV2State =>
  walletConnectV2Reducer(undefined, {type: '@@INIT'} as any);

const makeSession = (topic: string, accounts: string[] = []) =>
  ({accounts, topic} as any);

describe('walletConnectV2Reducer', () => {
  it('starts with no sessions, requests or proposal', () => {
    expect(freshState()).toEqual({
      contractAbi: {},
      proposal: undefined,
      requests: [],
      sessions: [],
    });
  });

  it('appends an approved session without dropping the existing ones', () => {
    const state = walletConnectV2Reducer(
      {...freshState(), sessions: [makeSession('topic-1')]},
      {
        payload: {session: makeSession('topic-2')},
        type: WalletConnectV2ActionTypes.SESSION_APPROVAL,
      } as any,
    );

    expect(state.sessions.map(({topic}) => topic)).toEqual([
      'topic-1',
      'topic-2',
    ]);
  });

  it('replaces the session list wholesale on update', () => {
    const state = walletConnectV2Reducer(
      {...freshState(), sessions: [makeSession('topic-1')]},
      {
        payload: {sessions: [makeSession('topic-2')]},
        type: WalletConnectV2ActionTypes.UPDATE_SESSIONS,
      } as any,
    );

    expect(state.sessions.map(({topic}) => topic)).toEqual(['topic-2']);
  });

  it('keeps only the latest request', () => {
    const state = walletConnectV2Reducer(
      {...freshState(), requests: [{id: 1} as any]},
      {
        payload: {request: {id: 2}},
        type: WalletConnectV2ActionTypes.SESSION_REQUEST,
      } as any,
    );

    expect(state.requests).toEqual([{id: 2}]);
  });

  it('replaces the request list on update', () => {
    const state = walletConnectV2Reducer(
      {...freshState(), requests: [{id: 1} as any]},
      {
        payload: {requests: []},
        type: WalletConnectV2ActionTypes.UPDATE_REQUESTS,
      } as any,
    );

    expect(state.requests).toEqual([]);
  });

  it('merges a contract abi without discarding the cached ones', () => {
    const state = walletConnectV2Reducer(
      {...freshState(), contractAbi: {'0xaaa': 'abi-a'}},
      {
        payload: {contractAbi: 'abi-b', contractAddress: '0xbbb'},
        type: WalletConnectV2ActionTypes.CONTRACT_ABI,
      } as any,
    );

    expect(state.contractAbi).toEqual({'0xaaa': 'abi-a', '0xbbb': 'abi-b'});
  });

  it('leaves state untouched for an unknown action', () => {
    const state = freshState();

    expect(walletConnectV2Reducer(state, {type: 'NOPE'} as any)).toBe(state);
  });

  it('never persists pending proposals or requests', () => {
    const {
      walletConnectV2ReduxPersistBlackList,
    } = require('./wallet-connect-v2.reducer');

    expect(walletConnectV2ReduxPersistBlackList).toEqual([
      'proposal',
      'requests',
    ]);
  });
});
