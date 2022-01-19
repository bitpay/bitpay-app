import {createTransform} from 'redux-persist';
import {Key} from '../wallet/wallet.models';
import merge from 'lodash.merge';
import {BwcProvider} from '../../lib/bwc';
const BWCProvider = BwcProvider.getInstance();

export const bindWalletClient = createTransform(
  // transform state on its way to being serialized and persisted.
  inboundState => inboundState,
  // transform state being rehydrated
  (_outboundState, key) => {
    if (key === 'keys') {
      const outboundState: {[key in string]: Key} = {};
      for (const [id, key] of Object.entries(
        _outboundState as {[key in string]: Key},
      )) {
        const wallets = key.wallets.map(wallet => {
          console.log(`bindWalletClient - ${wallet.id}`);
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
        console.log(`bindWalletKey - ${id}`);
      }

      return outboundState;
    }
    return _outboundState;
  },
);
