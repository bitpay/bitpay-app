import merge from 'lodash.merge';
import {createTransform} from 'redux-persist';
import {Key, Wallet} from '../wallet/wallet.models';
import {BwcProvider} from '../../lib/bwc';
import {
  BitpaySupportedUtxoCoins,
  OtherBitpaySupportedCoins,
} from '../../constants/currencies';
import {ContactState} from '../contact/contact.reducer';
import {WalletState} from '../wallet/wallet.reducer';
import {buildWalletObj} from '../wallet/utils/wallet';
import {ContactRowProps} from '../../components/list/ContactRow';
import {getErrorString} from '../../utils/helper-methods';
import {LogActions} from '../log';
import * as initLogs from '../log/initLogs';
import {
  encryptAppStore,
  decryptAppStore,
  encryptShopStore,
  decryptShopStore,
  encryptWalletStore,
  decryptWalletStore,
} from './encrypt';

const BWCProvider = BwcProvider.getInstance();

// Helper for logging transform failures before the store exists
const logTransformFailure = (
  phase: 'encrypt' | 'decrypt',
  store: 'Wallet' | 'App' | 'Shop',
  error: unknown,
) => {
  try {
    initLogs.add(
      LogActions.persistLog(
        LogActions.error(
          `${phase}${store}Store failed - ${getErrorString(error)}`,
        ),
      ),
    );
  } catch (_) {}
};

export const bootstrapWallets = (wallets: Wallet[]) => {
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
        initLogs.add(LogActions.info(successLog));
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
        const errorLog = `Failed to bindWalletClient - ${
          wallet.id
        } - ${getErrorString(err)}`;
        initLogs.add(LogActions.persistLog(LogActions.error(errorLog)));
      }
    })
    .filter((w): w is NonNullable<typeof w> => w !== undefined);
};

export const bootstrapKey = (key: Key, id: string) => {
  if (id === 'readonly') {
    return key;
  } else if (key.hardwareSource) {
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
      initLogs.add(LogActions.info(successLog));
      return _key;
    } catch (err: unknown) {
      const errorLog = `Failed to bindWalletKeys - ${id} - ${getErrorString(
        err,
      )}`;
      initLogs.add(LogActions.persistLog(LogActions.error(errorLog)));
    }
  }
};

export const bindWalletKeys = createTransform<WalletState, WalletState>(
  // transform state on its way to being serialized and persisted.
  inboundState => {
    const keys = inboundState.keys || {};
    if (Object.keys(keys).length > 0) {
      for (const [id, key] of Object.entries(keys)) {
        key.wallets.forEach(wallet => delete wallet.transactionHistory);

        inboundState.keys[id] = {
          ...key,
        };
      }
    }
    return inboundState;
  },
  // transform state being rehydrated
  outboundState => {
    const keys = outboundState.keys || {};
    if (Object.keys(keys).length > 0) {
      for (const [id, key] of Object.entries(keys)) {
        const bootstrappedKey = bootstrapKey(key, id);
        const wallets = bootstrapWallets(key.wallets);

        if (bootstrappedKey) {
          outboundState.keys[id] = {...bootstrappedKey, wallets};
        }
      }
    }
    return outboundState;
  },
  {whitelist: ['WALLET']},
);

export const transformContacts = createTransform<ContactState, ContactState>(
  inboundState => inboundState,
  outboundState => {
    try {
      const contactList = outboundState.list || [];
      if (contactList.length > 0) {
        const migratedContacts = contactList.map(contact => ({
          ...contact,
          chain:
            contact.chain ||
            (OtherBitpaySupportedCoins[contact.coin] ||
            BitpaySupportedUtxoCoins[contact.coin]
              ? contact.coin
              : 'eth'),
        })) as ContactRowProps[];
        outboundState.list = migratedContacts;
      }
      return outboundState;
    } catch (_) {
      return outboundState;
    }
  },
  {whitelist: ['CONTACT']},
);

export const encryptSpecificFields = (secretKey: string) => {
  return createTransform(
    // Encrypt specified fields on inbound (saving to storage)
    (inboundState, key) => {
      if (key === 'WALLET') {
        try {
          return encryptWalletStore(inboundState, secretKey);
        } catch (error) {
          logTransformFailure('encrypt', 'Wallet', error);
        }
      }
      if (key === 'APP') {
        try {
          return encryptAppStore(inboundState, secretKey);
        } catch (error) {
          logTransformFailure('encrypt', 'App', error);
        }
      }
      if (key === 'SHOP') {
        try {
          return encryptShopStore(inboundState, secretKey);
        } catch (error) {
          logTransformFailure('encrypt', 'Shop', error);
        }
      }
      return inboundState;
    },
    // Decrypt specified fields on outbound (loading from storage)
    (outboundState, key) => {
      if (key === 'WALLET') {
        try {
          return decryptWalletStore(outboundState, secretKey);
        } catch (error) {
          logTransformFailure('decrypt', 'Wallet', error);
        }
      }
      if (key === 'APP') {
        try {
          return decryptAppStore(outboundState, secretKey);
        } catch (error) {
          logTransformFailure('decrypt', 'App', error);
        }
      }
      if (key === 'SHOP') {
        try {
          return decryptShopStore(outboundState, secretKey);
        } catch (error) {
          logTransformFailure('decrypt', 'Shop', error);
        }
      }
      return outboundState;
    },
  );
};
