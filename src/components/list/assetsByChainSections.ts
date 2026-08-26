import type {
  AssetsByChainData,
  AssetsByChainListProps,
} from '../../navigation/wallet/screens/AccountDetails';
import type {WalletRowProps} from './WalletRow';

export interface VirtualizedAssetsByChainSection {
  key: string;
  title: string;
  chains: string[];
  accountItem: AssetsByChainData;
  expanded: boolean;
  data: WalletRowProps[];
}

export const buildVirtualizedAssetsByChainSections = (
  sections: ReadonlyArray<Partial<AssetsByChainListProps>>,
  expandedChains: Readonly<Record<string, boolean>> | undefined,
  expandSingleChain: boolean,
): VirtualizedAssetsByChainSection[] => {
  const virtualizedSections: VirtualizedAssetsByChainSection[] = [];

  sections.forEach(section => {
    const accountItem = section.data?.[0];
    if (!accountItem) {
      return;
    }

    const expanded =
      expandSingleChain || expandedChains?.[accountItem.chain] === true;

    virtualizedSections.push({
      key: accountItem.id,
      title: section.title ?? accountItem.chain,
      chains: section.chains ?? [accountItem.chain],
      accountItem,
      expanded,
      data: expanded ? accountItem.chainAssetsList : [],
    });
  });

  return virtualizedSections;
};
