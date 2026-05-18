import type {AssetRowItem} from '../../../../utils/portfolio/assets';

export function getAssetRowPopulateLoading(args: {
  populateInProgress?: boolean;
  showPnlPlaceholder?: boolean;
  rowLoadingByKey?: Record<string, boolean>;
  rowKey: string;
}): boolean {
  return args.rowLoadingByKey?.[args.rowKey] ?? !!args.populateInProgress;
}

export function getAssetRowPnlLoading(args: {
  isPnlLoading?: boolean;
  isRowPopulateLoading?: boolean;
  showScopedPnlLoading?: boolean;
}): boolean {
  return (
    (!!args.isPnlLoading && !!args.isRowPopulateLoading) ||
    !!args.showScopedPnlLoading
  );
}

export function shouldForceAssetListSkeleton(args: {
  forceSkeleton?: boolean;
}): boolean {
  return !!args.forceSkeleton;
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
