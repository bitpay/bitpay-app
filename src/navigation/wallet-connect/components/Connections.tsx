import React, {memo} from 'react';
import {Key, Wallet} from '../../../store/wallet/wallet.models';
import {EIP155_CHAINS} from '../../../constants/WalletConnectV2';
import WCV2WalletRow from './WCV2WalletRow';
import haptic from '../../../components/haptic-feedback/haptic';
import {useNavigation} from '@react-navigation/native';
import {
  WCV2SessionType,
  WCV2Wallet,
} from '../../../store/wallet-connect-v2/wallet-connect-v2.models';
import styled from 'styled-components/native';
import {
  findWalletByAddress,
  getKeyIdByAddress,
} from '../../../store/wallet/utils/wallet';
import {CurrencyListIcons} from '../../../constants/SupportedCurrencyOptions';

const NoGutter = styled.View`
  margin: 0 -10px;
`;

const Connections = ({
  account,
  session,
  keys,
  wallet: _wallet,
}: {
  account?: string;
  session?: WCV2SessionType;
  keys?: {[key in string]: Key};
  wallet?: Partial<Wallet>;
}) => {
  const navigation = useNavigation();
  let address, chain: string;
  let wallet: Partial<Wallet> | undefined;

  if (account && keys) {
    // version 2
    const index = account.indexOf(':', account.indexOf(':') + 1);
    const protocolChainName = account.substring(0, index);
    address = account.substring(index + 1);
    chain = EIP155_CHAINS[protocolChainName]?.chain;
    const network = EIP155_CHAINS[protocolChainName]?.network;
    wallet = findWalletByAddress(address, chain, network, keys);
    if (!wallet && chain && network) {
      const keyId = getKeyIdByAddress(address, keys);
      wallet = {
        id: Math.random().toString(),
        network,
        receiveAddress: address,
        keyId,
        chain,
        img: CurrencyListIcons[chain],
        walletName: EIP155_CHAINS[protocolChainName]?.name,
        currencyName: EIP155_CHAINS[protocolChainName]?.name,
        currencyAbbreviation:
          EIP155_CHAINS[protocolChainName]?.currencyAbbreviation,
      };
    }
  }

  const {keyId} = wallet || {};

  return wallet ? (
    <NoGutter key={wallet.id}>
      <WCV2WalletRow
        walletObj={{wallet}}
        topic={session?.topic}
        keyId={keyId!}
        isLast={false}
        onPress={(_keyId: string, walletObj: WCV2Wallet) => {
          haptic('impactLight');
          navigation.navigate('WalletConnect', {
            screen: 'WalletConnectHome',
            params: {
              topic: session?.topic,
              wallet: walletObj.wallet,
            },
          });
        }}
        showCheckbox={false}
      />
    </NoGutter>
  ) : null;
};
export default memo(Connections);
