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
import cloneDeep from 'lodash.clonedeep';
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

export const bindWalletKeys = createTransform(
  // transform state on its way to being serialized and persisted.
  (inboundState, k) => {
    // @ts-ignore
    const keys = inboundState.keys || {};
    if (Object.keys(keys).length > 0) {
      for (const [id, key] of Object.entries(keys as {[key in string]: Key})) {
        key.wallets.forEach(wallet => delete wallet.transactionHistory);
        // @ts-ignore
        inboundState.keys[id] = {
          ...key,
        };
      }
    }
    return inboundState;
  },
  // transform state being rehydrated
  (outboundState, k) => {
    // @ts-ignore
    const keys = outboundState.keys || {};
    if (Object.keys(keys).length > 0) {
      for (const [id, key] of Object.entries(keys as {[key in string]: Key})) {
        const bootstrapedKey = bootstrapKey(key, id, log => initLogs.push(log));
        const wallets = bootstrapWallets(key.wallets, log =>
          initLogs.push(log),
        );
        if (bootstrapedKey) {
          // @ts-ignore
          outboundState.keys[id] = {...bootstrapedKey, wallets};
        }
      }
      // @ts-ignore
      outboundState.initLogs = initLogs;
    }
    return outboundState;
  },
  {whitelist: ['WALLET']},
);

export const transformContacts = createTransform(
  inboundState => inboundState,
  (outboundState, k) => {
    // @ts-ignore
    const contactList = outboundState.list || [];
    if (contactList.length > 0) {
      const contacts = outboundState as ContactRowProps[];
      const migratedContacts = contacts.map(contact => ({
        ...contact,
        chain:
          contact.chain ||
          (OtherBitpaySupportedCoins[contact.coin] ||
          BitpaySupportedUtxoCoins[contact.coin]
            ? contact.coin
            : 'eth'),
      }));
      // @ts-ignore
      outboundState.list = migratedContacts;
    }
    return outboundState;
  },
  {whitelist: ['CONTACTS']},
);
