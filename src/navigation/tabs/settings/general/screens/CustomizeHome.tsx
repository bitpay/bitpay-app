import React, {ReactNode} from 'react';
import {Text, View} from 'react-native';
import CustomizeHomeCard from '../../../../../components/customize-home-card/CustomizeHomeCard';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';

const CurrencyCardComponet = (currency: string, price: string) => {
  const _onCTAPress = () => {
    /** TODO: Redirect me */
  };

  const currencyInfo = null;
  // const currencyInfo = CurrencyInfoList.find(
  //   ({id}: {id: string}) => id === currency,
  // );
  //
  // const HeaderComponent = (
  //   <HeaderImg>{currencyInfo && currencyInfo.img()}</HeaderImg>
  // );

  return (
    <>
      {currencyInfo && (
        <CustomizeHomeCard
          // header={HeaderComponent}
          body={{header: 'currencyInfo.mainLabel', price: `${price}$`}}
          footer={{
            onCTAPress: _onCTAPress,
            checked: false,
          }}
        />
      )}
    </>
  );
};

const CustomizeHome = () => {
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);
  const cardsList: Array<ReactNode | null> = [];

  Object.values(wallets).map((wallet: any) => {
    const {assets, totalBalance} = wallet;
    if (!assets.length) {
      return;
    }

    assets &&
      assets.map((asset: any) => {
        cardsList.push(() => CurrencyCardComponet(asset.coin, totalBalance));
      });
  });

  return (
    <View>
     <Text>Here</Text>
    </View>
  );
};

export default CustomizeHome;
