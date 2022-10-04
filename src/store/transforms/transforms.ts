import {createTransform} from 'redux-persist';
import {Key} from '../wallet/wallet.models';
import merge from 'lodash.merge';
import {BwcProvider} from '../../lib/bwc';
import {SUPPORTED_CURRENCIES} from '../../constants/currencies';
import {CurrencyListIcons} from '../../constants/SupportedCurrencyOptions';
import Flatted from 'flatted';
import {buildWalletObj} from '../wallet/utils/wallet';
const BWCProvider = BwcProvider.getInstance();

export const bindWalletClient = createTransform(
  // transform state on its way to being serialized and persisted.
  inboundState => {
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
  },
  // transform state being rehydrated
  _outboundState => {
    const outboundState: {[key in string]: Key} = {};
    for (const [id, key] of Object.entries(
      _outboundState as {[key in string]: Key},
    )) {
      const wallets = key.wallets.map(wallet => {
        const {img, currencyAbbreviation, currencyName} = wallet;
        if (!img && SUPPORTED_CURRENCIES.includes(currencyAbbreviation)) {
          wallet.img = CurrencyListIcons[currencyAbbreviation];
        }
        // reset transaction history
        wallet.transactionHistory = {
          transactions: [],
          loadMore: true,
          hasConfirmingTxs: false,
        };
        console.log(`bindWalletClient - ${wallet.id}`);
        const _wallet = merge(
          buildWalletObj({
            ...wallet.credentials,
            currencyAbbreviation,
            currencyName,
          }),
          wallet,
        );
        return merge(
          BWCProvider.getClient(JSON.stringify(_wallet.credentials)),
          _wallet,
        );
      });

      outboundState[id] = {
        ...key,
        wallets,
      };
    }
    return outboundState;
  },
  {whitelist: ['keys']},
);

export const bindWalletKeys = createTransform(
  inboundState => inboundState,
  (_outboundState, k) => {
    if (k === 'keys') {
      const outboundState: {[key in string]: Key} = {};
      for (const [id, key] of Object.entries(
        _outboundState as {[key in string]: Key},
      )) {
        if (id === 'readonly') {
          // read only wallet
          outboundState[id] = key;
        } else {
          outboundState[id] = merge(key, {
            methods: BWCProvider.createKey({
              seedType: 'object',
              seedData: key.properties,
            }),
          });
        }
        console.log(`bindKey - ${id}`);
      }
      return outboundState;
    }
    return _outboundState;
  },
);

export const transformCircular = createTransform(
  inboundState => Flatted.stringify(inboundState),
  outboundState => Flatted.parse(outboundState),
);
