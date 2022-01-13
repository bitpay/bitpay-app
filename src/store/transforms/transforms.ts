import {createTransform} from 'redux-persist';
import {ExtendedKeyValues, WalletObj} from '../wallet/wallet.models';
import merge from 'lodash.merge';
import {BwcProvider} from '../../lib/bwc';
const BWCProvider = BwcProvider.getInstance();

export const bindWalletClient = createTransform(
  // transform state on its way to being serialized and persisted.
  inboundState => inboundState,
  // transform state being rehydrated
  (_outboundState, key) => {
    if (key === 'wallets') {
      const outboundState: {[key in string]: WalletObj} = {};
      for (const [id, wallet] of Object.entries(
        _outboundState as {[key in string]: WalletObj},
      )) {
        const assets = wallet.assets.map(asset => {
          console.log(`bindWalletClient - ${asset.id}`);
          return merge(
            BWCProvider.getClient(JSON.stringify(asset.credentials)),
            asset,
          );
        });

        outboundState[id] = {
          ...wallet,
          assets,
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
      const outboundState: ExtendedKeyValues[] = [];
      for (const key of _outboundState as ExtendedKeyValues[]) {
        console.log(`bindWalletKey - ${key.id}`);
        const km = BWCProvider.createKey({seedType: 'object', seedData: key});
        outboundState.push(merge(key, km));
      }
      return outboundState;
    }
    return _outboundState;
  },
);
