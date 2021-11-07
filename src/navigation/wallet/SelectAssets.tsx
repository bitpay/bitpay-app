import React, {useState} from 'react';
import styled from 'styled-components/native';
import {BaseText, H3, TextAlign} from '../../components/styled/Text';
import {
  CtaContainerAbsolute,
  TextContainer,
} from '../../components/styled/Containers';
import {Air, NotificationPrimary} from '../../styles/colors';
import CurrencySelectorList from '../../components/list/CurrencySelectorList';
import {Dimensions} from 'react-native';
import {TabBar, TabView, TabBarIndicator} from 'react-native-tab-view';
import {CurrencyList} from '../../constants/CurrencySelectionListOptions';
import Button from '../../components/button/Button';
import {SUPPORTED_TOKENS, SupportedCoins} from '../../constants/coin';
import {useDispatch} from 'react-redux';
import {AppActions} from '../../store/app';
import {BottomNotifications} from '../../constants/bottom-notifications';
import {startOnboardingCreateWallet} from '../../store/wallet/wallet.effects';
const WIDTH = Dimensions.get('window').width;

const AssetSelectionContainer = styled.SafeAreaView`
  flex: 1;
`;

const Choice = styled(BaseText)`
  font-size: 15px;
  font-style: normal;
  font-weight: 400;
  position: relative;
  color: ${NotificationPrimary};
`;

const SelectAssets = () => {
  const dispatch = useDispatch();

  const [routes] = useState([
    //{wallet: 'popular', name: 'Popular'},
    {key: 'coins', name: 'Coins'},
    {key: 'tokens', name: 'Tokens'},
  ]);
  const [currencyList, setCurrencyList] = useState(CurrencyList);
  const [selectedAssets, setSelectedAssets] = useState<Array<string>>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const checkAndNotifyEthRequired = (asset: string) => {
    if (
      asset === 'ETH' &&
      selectedAssets.filter(selected =>
        SUPPORTED_TOKENS.includes(selected.toLowerCase()),
      ).length
    ) {
      dispatch(
        AppActions.showBottomNotificationModal(
          BottomNotifications.ASSET_REQUIRED,
        ),
      );
    }
  };

  const checkAndToggleEthIfTokenSelected = (assets: Array<string>) => {
    // if selecting token force eth wallet
    for (const selected of assets) {
      if (SUPPORTED_TOKENS.includes(selected.toLowerCase())) {
        if (!assets.includes('ETH')) {
          setCurrencyList({
            ...CurrencyList,
            coins: [
              ...CurrencyList.coins.map(coin => {
                if (coin.id === 'c/eth') {
                  return {
                    ...coin,
                    // to force rerender
                    id: Math.random(),
                    checked: true,
                  };
                }
                return coin;
              }),
            ],
          });
          assets = [...assets, 'ETH'];
        }
        break;
      }
    }
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
    checkAndToggleEthIfTokenSelected(assets);
    setSelectedAssets(assets);
  };

  const createWallet = async () => {
    const coins = selectedAssets.map(selected => selected.toLowerCase()) as [
      SupportedCoins,
    ];
    dispatch(startOnboardingCreateWallet(coins));
  };

  return (
    <AssetSelectionContainer>
      <TextContainer>
        <TextAlign align={'left'}>
          <H3>Select Assets</H3>
        </TextAlign>
      </TextContainer>
      <TabView
        navigationState={{index: activeSlideIndex, routes}}
        renderScene={({route}) => {
          return (
            <CurrencySelectorList
              emit={assetToggled}
              itemList={currencyList[route.key]}
            />
          );
        }}
        renderTabBar={props => {
          return (
            <TabBar
              {...props}
              style={{
                width: '50%',
                backgroundColor: 'white',
                justifyContent: 'center',
                shadowColor: 'transparent',
                marginBottom: 10,
                marginLeft: 10,
                marginRight: 10,
              }}
              renderIndicator={indicatorProps => {
                return (
                  <TabBarIndicator
                    {...indicatorProps}
                    style={{
                      height: '100%',
                      borderRadius: 20,
                      backgroundColor: Air,
                    }}
                  />
                );
              }}
              renderLabel={({route}) => <Choice>{route.name}</Choice>}
            />
          );
        }}
        onIndexChange={setActiveSlideIndex}
        initialLayout={{width: WIDTH}}
      />
      <CtaContainerAbsolute>
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
