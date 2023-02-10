import {createTransform} from 'redux-persist';
import {Key, Wallet} from '../wallet/wallet.models';
import merge from 'lodash.merge';
import {BwcProvider} from '../../lib/bwc';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../constants/currencies';
import Flatted from 'flatted';
import {buildWalletObj} from '../wallet/utils/wallet';
import {ContactRowProps} from '../../components/list/ContactRow';
import {AddLog} from '../log/log.types';
import {LogActions} from '../log';
const BWCProvider = BwcProvider.getInstance();
const initLogs: AddLog[] = [];

export const bootstrapWallets = (
  wallets: Wallet[],
  logHandler: (addLog: AddLog) => {},
) => {
  return wallets
    .map(wallet => {
      try {
        // reset transaction history
        wallet.transactionHistory = {
          transactions: [],
          loadMore: true,
          hasConfirmingTxs: false,
        };
        const walletClient = BWCProvider.getClient(
          JSON.stringify(wallet.credentials),
        );
        const successLog = `bindWalletClient - ${wallet.id}`;
        logHandler(LogActions.info(successLog));
        // build wallet obj with bwc client credentials
        return merge(
          walletClient,
          wallet,
          buildWalletObj({
            ...walletClient.credentials,
            ...wallet,
          }),
        );
      } catch (err: unknown) {
        const errStr = err instanceof Error ? err.message : JSON.stringify(err);
        const errorLog = `Failed to bindWalletClient - ${wallet.id} - ${errStr}`;
        logHandler(LogActions.persistLog(LogActions.error(errorLog)));
      }
    })
    .filter(w => w !== undefined);
};

export const bootstrapKey = (
  key: Key,
  id: string,
  logHandler: (addLog: AddLog) => {},
) => {
  if (id === 'readonly') {
    return key;
  } else {
    try {
      const _key = merge(key, {
        methods: BWCProvider.createKey({
          seedType: 'object',
          seedData: key.properties,
        }),
      });
      const successLog = `bindKey - ${id}`;
      logHandler(LogActions.info(successLog));
      return _key;
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : JSON.stringify(err);
      const errorLog = `Failed to bindWalletKeys - ${id} - ${errStr}`;
      logHandler(LogActions.persistLog(LogActions.error(errorLog)));
    }
  }
};

export const bindWalletClient = createTransform(
  // transform state on its way to being serialized and persisted.
  (inboundState, k) => {
    if (k === 'keys') {
      const newInboundState: {[key in string]: any} = {};
      for (const [id, key] of Object.entries(
        inboundState as {[key in string]: Key},
      )) {
        const wallets = key.wallets.map(wallet => ({
          ...wallet,
          transactionHistory: undefined,
        }));
        newInboundState[id] = {
          ...key,
          wallets,
        };
      }
      return newInboundState;
    }
    return inboundState;
  },
  // transform state being rehydrated
  (_outboundState, k) => {
    const outboundState: {[key in string]: Key} = {};
    if (k === 'keys') {
      for (const [id, key] of Object.entries(
        _outboundState as {[key in string]: Key},
      )) {
        const wallets = bootstrapWallets(key.wallets, log =>
          initLogs.push(log),
        );
        outboundState[id] = {
          ...key,
          // @ts-ignore
          wallets,
        };
      }
      return outboundState;
    } else if (k === 'initLogs') {
      return initLogs;
    }
  },
  {whitelist: ['keys', 'initLogs']},
);

export const bindWalletKeys = createTransform(
  inboundState => inboundState,
  (_outboundState, k) => {
    let outboundState: {[key in string]: Key} = {};
    if (k === 'keys') {
      for (const [id, key] of Object.entries(
        _outboundState as {[key in string]: Key},
      )) {
        const bootstrapedKey = bootstrapKey(key, id, log => initLogs.push(log));
        if (bootstrapedKey) {
          outboundState[id] = bootstrapedKey;
        }
      }
      return outboundState;
    } else if (k === 'initLogs') {
      return initLogs;
    }
  },
  {whitelist: ['keys', 'initLogs']},
);

export const transformCircular = createTransform(
  inboundState => Flatted.stringify(inboundState),
  outboundState => Flatted.parse(outboundState),
);

export const transformContacts = createTransform(
  inboundState => inboundState,
  (_outboundState, k) => {
    if (k === 'list') {
      const contacts = _outboundState as ContactRowProps[];
      const migratedContacts = contacts.map(contact => ({
        ...contact,
        chain:
          contact.chain ||
          (OtherBitpaySupportedCoins[contact.coin] ||
          BitpaySupportedUtxoCoins[contact.coin]
            ? contact.coin
            : 'eth'),
      }));
      return migratedContacts;
    }
    return _outboundState;
  },
);
