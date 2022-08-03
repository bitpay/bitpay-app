import {createTransform} from 'redux-persist';
import {Key} from '../wallet/wallet.models';
import merge from 'lodash.merge';
import {BwcProvider} from '../../lib/bwc';
import {SUPPORTED_CURRENCIES} from '../../constants/currencies';
import {CurrencyListIcons} from '../../constants/SupportedCurrencyOptions';
import Flatted from 'flatted';
import {useLogger} from '../../utils/hooks';
const BWCProvider = BwcProvider.getInstance();

export const bindWalletClient = createTransform(
  // transform state on its way to being serialized and persisted.
  inboundState => inboundState,
  // transform state being rehydrated
  (_outboundState, key) => {
    const logger = useLogger();
    if (key === 'keys') {
      const outboundState: {[key in string]: Key} = {};
      // eslint-disable-next-line no-shadow
      for (const [id, key] of Object.entries(
        _outboundState as {[key in string]: Key},
      )) {
        const wallets = key.wallets.map(wallet => {
          const {img, currencyAbbreviation} = wallet;
          if (!img && SUPPORTED_CURRENCIES.includes(currencyAbbreviation)) {
            wallet.img = CurrencyListIcons[currencyAbbreviation];
          }
          // reset transaction history
          wallet.transactionHistory = {
            transactions: [],
            loadMore: true,
            hasConfirmingTxs: false,
          };
          logger.debug(`bindWalletClient: ${wallet.id}`);
          return merge(
            BWCProvider.getClient(JSON.stringify(wallet.credentials)),
            wallet,
          );
        });

        outboundState[id] = {
          ...key,
          wallets,
        };
      }

      return outboundState;
    }
    return _outboundState;
  },
);

export const bindWalletKeys = createTransform(
  inboundState => inboundState,
  (_outboundState, k) => {
    const logger = useLogger();
    if (k === 'keys') {
      const outboundState: {[key in string]: Key} = {};
      for (const [id, key] of Object.entries(
        _outboundState as {[key in string]: Key},
      )) {
        outboundState[id] = merge(key, {
          methods: BWCProvider.createKey({
            seedType: 'object',
            seedData: key.properties,
          }),
        });
        logger.debug(`bindWalletKey: ${id}`);
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
