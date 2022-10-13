import React from 'react';
import EthIcon from '../../../../assets/img/currencies/eth.svg';
import MaticIcon from '../../../../assets/img/currencies/matic.svg';
import {titleCasing} from '../../../utils/helper-methods';
import {Badge, H5} from '../../../components/styled/Text';
import styled from 'styled-components/native';
import {IWCConnector} from '../../../store/wallet-connect/wallet-connect.models';
import ConnectionItem from './ConnectionItem';
import {Wallet} from '../../../store/wallet/wallet.models';

const ConnectionsContainer = styled.View`
  padding-bottom: 32px;
`;

const ChainContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
`;

const ChainDetailsContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
`;

const ChainIconContainer = styled.View`
  border-radius: 100px;
  height: auto;
  width: auto;
  overflow: hidden;
  align-items: center;
  justify-content: center;
`;

const ChainTextContainer = styled.View`
  margin-left: 8px;
  align-items: flex-start;
  flex-direction: row;
`;

export default ({
  wallet,
  connectors,
}: {
  wallet: Wallet;
  connectors: IWCConnector[];
}) => {
  const {walletName, network, chain} = wallet.credentials;
  const networkName =
    network === ('livenet' || 'mainnet')
      ? 'mainnet'
      : chain === 'eth'
      ? 'kovan'
      : 'mumbai';

  return (
    <ConnectionsContainer>
      <ChainContainer>
        <ChainDetailsContainer>
          <ChainIconContainer>
            {chain === 'eth' ? (
              <EthIcon width={37} height={37} />
            ) : (
              <MaticIcon width={37} height={37} />
            )}
          </ChainIconContainer>
          <ChainTextContainer>
            <H5>{walletName}</H5>
            {networkName ? (
              <Badge style={{marginLeft: 5}}>{titleCasing(networkName)}</Badge>
            ) : null}
          </ChainTextContainer>
        </ChainDetailsContainer>
      </ChainContainer>
      {Object.entries(connectors as any).map(([key, c]) => {
        return (
          <ConnectionItem
            key={key}
            session={(c as IWCConnector).connector.session}
            wallet={wallet}
          />
        );
      })}
    </ConnectionsContainer>
  );
};
