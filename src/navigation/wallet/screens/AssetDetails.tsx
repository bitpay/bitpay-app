import React from 'react';
import AssetBalanceHistoryScreen from './exchange-rate/AssetBalanceHistoryScreen';
import ExchangeRateScreen from './exchange-rate/ExchangeRateScreen';
import useExchangeRateSharedModel from './exchange-rate/useExchangeRateSharedModel';

const AssetDetails = () => {
  const shared = useExchangeRateSharedModel();

  if (shared.isAssetBalanceHistoryMode) {
    return <AssetBalanceHistoryScreen shared={shared} />;
  }

  return <ExchangeRateScreen shared={shared} />;
};

export default AssetDetails;
