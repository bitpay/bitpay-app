import type {AssetRowItem} from '../../../../utils/portfolio/assets';

export function getAssetRowPopulateLoading(args: {
  populateInProgress?: boolean;
  showPnlPlaceholder?: boolean;
  rowLoadingByKey?: Record<string, boolean>;
  rowKey: string;
}): boolean {
  return args.rowLoadingByKey?.[args.rowKey] ?? !!args.populateInProgress;
}

export function getAssetRowFiatLoading(args: {
  populateInProgress?: boolean;
  isFiatLoading?: boolean;
  isRowPopulateLoading?: boolean;
  showScopedPnlLoading?: boolean;
}): boolean {
  return (
    (!!args.isFiatLoading && !!args.isRowPopulateLoading) ||
    !!args.showScopedPnlLoading
  );
}

export function shouldForceAssetListSkeleton(args: {
  items: AssetRowItem[];
  forceSkeleton?: boolean;
  isFiatLoading?: boolean;
}): boolean {
  if (args.forceSkeleton) {
    return true;
  }

  if (!args.isFiatLoading || !args.items.length) {
    return false;
  }

  return args.items.every(item => !!item.showPnlPlaceholder);
}

export function resolveAssetRowDisplayPresentation(args: {
  item: AssetRowItem;
  preservedItem?: AssetRowItem;
  isLoading: boolean;
  loadingDelayElapsed: boolean;
}): {
  displayItem: AssetRowItem;
  shouldShowSkeleton: boolean;
  usingPreservedItem: boolean;
} {
  const hasPreservedItem = !!args.preservedItem;
  const hasPnlScopeKeys =
    typeof args.item.pnlScopeKey === 'string' ||
    typeof args.preservedItem?.pnlScopeKey === 'string';
  const canUsePreservedItem =
    hasPreservedItem &&
    (!hasPnlScopeKeys ||
      args.item.pnlScopeKey === args.preservedItem?.pnlScopeKey);
  const usingPreservedItem =
    args.isLoading && canUsePreservedItem && !args.loadingDelayElapsed;

  return {
    displayItem: usingPreservedItem
      ? (args.preservedItem as AssetRowItem)
      : args.item,
    shouldShowSkeleton:
      args.isLoading && (!canUsePreservedItem || args.loadingDelayElapsed),
    usingPreservedItem,
  };
}
