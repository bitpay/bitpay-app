import React, {useState} from 'react';
import styled from 'styled-components/native';
import {CtaContainerAbsolute} from '../../../components/styled/Containers';
import CurrencySelectorList from '../../../components/list/CurrencySelectorList';
import {CurrencyList} from '../../../constants/CurrencySelectionListOptions';
import Button from '../../../components/button/Button';
import {SUPPORTED_TOKENS, SupportedAssets} from '../../../constants/assets';
import {useDispatch} from 'react-redux';
import {showBottomNotificationModal} from '../../../store/app/app.actions';
import {startCreateWallet} from '../../../store/wallet/effects';

const AssetSelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const CurrencySelectorListContainer = styled.View`
  margin-top: 20px;
  flex: 1;
`;

const SelectAssets = () => {
  const dispatch = useDispatch();

  const [currencyList, setCurrencyList] = useState(CurrencyList);
  const [selectedAssets, setSelectedAssets] = useState<Array<string>>([]);

  const checkAndNotifyEthRequired = (asset: string) => {
    if (
      asset === 'ETH' &&
      selectedAssets.filter(selected =>
        SUPPORTED_TOKENS.includes(selected.toLowerCase()),
      ).length
    ) {
      dispatch(
        showBottomNotificationModal({
          type: 'info',
          title: 'Asset required',
          message:
            'To remove this asset you must first remove your selected token assets.',
          enableBackdropDismiss: false,
          actions: [
            {
              text: 'OK',
              action: () => {},
              primary: true,
            },
          ],
        }),
      );
    }
  };

  const checkAndToggleEthIfTokenSelected = (
    assets: Array<string>,
  ): Array<string> => {
    // if selecting token force eth wallet
    for (const selected of assets) {
      if (SUPPORTED_TOKENS.includes(selected.toLowerCase())) {
        if (!assets.includes('ETH')) {
          setCurrencyList(
            CurrencyList.map(coin => {
              if (coin.id === 'eth') {
                return {
                  ...coin,
                  // to force rerender
                  id: Math.random(),
                  checked: true,
                };
              }
              return coin;
            }),
          );
          assets = [...assets, 'ETH'];
        }
        break;
      }
    }
    return assets;
  };

  const assetToggled = ({
    asset,
    checked,
  }: {
    asset: string;
    checked: boolean;
  }) => {
    // if token selected show warning
    checkAndNotifyEthRequired(asset);
    // reset asset in list
    let assets = selectedAssets.filter(selected => selected !== asset);
    // add if checked
    if (checked) {
      assets = [...assets, asset];
    }
    // if token selected set eth asset selected
    setSelectedAssets(checkAndToggleEthIfTokenSelected(assets));
  };

  const createWallet = async () => {
    const assets = selectedAssets.map(selected =>
      selected.toLowerCase(),
    ) as Array<SupportedAssets>;
    dispatch(startCreateWallet(assets));
  };

  return (
    <AssetSelectionContainer>
      <CurrencySelectorListContainer>
        <CurrencySelectorList emit={assetToggled} itemList={currencyList} />
      </CurrencySelectorListContainer>

      <CtaContainerAbsolute
        background={true}
        style={{
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        }}>
        <Button
          onPress={createWallet}
          buttonStyle={'primary'}
          disabled={!selectedAssets.length}>
          Create a Wallet
        </Button>
      </CtaContainerAbsolute>
    </AssetSelectionContainer>
  );
};

export default SelectAssets;
