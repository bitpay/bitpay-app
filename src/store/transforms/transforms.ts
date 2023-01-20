import {createTransform} from 'redux-persist';
import {Key} from '../wallet/wallet.models';
import merge from 'lodash.merge';
import {BwcProvider} from '../../lib/bwc';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../constants/currencies';
import Flatted from 'flatted';
import {buildWalletObj} from '../wallet/utils/wallet';
import {ContactRowProps} from '../../components/list/ContactRow';
const BWCProvider = BwcProvider.getInstance();
const initLogs: string[] = [];

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
        const wallets = key.wallets
          .map(wallet => {
            // reset transaction history
            wallet.transactionHistory = {
              transactions: [],
              loadMore: true,
              hasConfirmingTxs: false,
            };
            let walletClient;
            try {
              walletClient = BWCProvider.getClient(
                JSON.stringify(wallet.credentials),
              );
            } catch (err: unknown) {
              const errStr =
                err instanceof Error ? err.message : JSON.stringify(err);
              const errorLog = `Failed to bindWalletClient - ${wallet.id} - ${errStr}`;
              initLogs.push(errorLog);
              console.error(errorLog);
              return undefined;
            }
            const successLog = `bindWalletClient - ${wallet.id}`;
            initLogs.push(successLog);
            console.log(successLog);
            // build wallet obj with bwc client credentials
            return merge(
              walletClient,
              wallet,
              buildWalletObj({
                ...walletClient.credentials,
                ...wallet,
              }),
            );
          })
          .filter(w => w !== undefined);

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
        if (id === 'readonly') {
          // read only wallet
          outboundState[id] = key;
        } else {
          try {
            outboundState[id] = merge(key, {
              methods: BWCProvider.createKey({
                seedType: 'object',
                seedData: key.properties,
              }),
            });
          } catch (err: unknown) {
            const errStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            const errorLog = `Failed to bindWalletKeys - ${id} - ${errStr}`;
            initLogs.push(errorLog);
            console.error(errorLog);
          }
        }
        const successLog = `bindKey - ${id}`;
        initLogs.push(successLog);
        console.log(successLog);
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
