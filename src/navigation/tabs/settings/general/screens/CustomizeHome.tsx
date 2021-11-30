import React, {ReactNode, useState} from 'react';
import {ScrollView} from 'react-native';
import CustomizeHomeCard from '../../../../../components/customize-home-card/CustomizeHomeCard';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import {CurrencyInfoList} from '../../../home/components/CurrencyList';
import styled from 'styled-components/native';

const HeaderImg = styled.View`
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
`;

const CardListContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin: 10px;
  flex-wrap: wrap;
`;

const CustomizeHomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const CustomizeHomeCardContainer = styled.View`
  margin: 10px 0;
`;

const CurrencyCardComponet = (currency: string, price: string) => {
  /** TODO: Assign stored value */
  const [checked, setChecked] = useState(false);
  const _onCTAPress = () => {
    /** TODO: Store the value and Redirect me */
    setChecked(!checked);
  };

  const currencyInfo = CurrencyInfoList.find(
    ({id}: {id: string}) => id === currency,
  );

  const HeaderComponent = (
    <HeaderImg>{currencyInfo && currencyInfo.img()}</HeaderImg>
  );

  return (
    <>
      {currencyInfo && (
        <CustomizeHomeCardContainer>
          <CustomizeHomeCard
            header={HeaderComponent}
            body={{
              header: currencyInfo.mainLabel,
              price: `${price} ${currency.toUpperCase()}`,
            }}
            footer={{
              onCTAPress: _onCTAPress,
              checked: checked,
            }}
          />
        </CustomizeHomeCardContainer>
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
    <CustomizeHomeContainer>
      <ScrollView>
        <CardListContainer>{cardsList.map(card => card())}</CardListContainer>
      </ScrollView>
    </CustomizeHomeContainer>
  );
};

export default CustomizeHome;
