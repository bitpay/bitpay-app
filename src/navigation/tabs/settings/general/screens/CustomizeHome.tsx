import React, {ReactNode, useState} from 'react';
import CustomizeHomeCard from '../../../../../components/customize-home-card/CustomizeHomeCard';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import styled from 'styled-components/native';
import {CurrencyList} from '../../../../../constants/CurrencySelectionListOptions';

const HeaderImg = styled.View`
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
`;

const CardListContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const CustomizeHomeContainer = styled.SafeAreaView`
  flex: 1;
`;

const CustomizeHomeCardContainer = styled.View`
  margin: 10px 0;
`;

const ScrollViewContainer = styled.ScrollView`
  margin-top: 20px;
  padding: 0 15px;
`;

const CurrencyCardComponet = (currency: string, price: string) => {
  /** TODO: Assign stored value */
  const [checked, setChecked] = useState(false);
  const _onCTAPress = () => {
    /** TODO: Store the value and Redirect me */
    setChecked(!checked);
  };

  const currencyInfo = CurrencyList.find(
    ({id}: {id: string | number}) => id === currency,
  );

  const HeaderComponent = (
    <HeaderImg>{currencyInfo && currencyInfo.roundIcon()}</HeaderImg>
  );

  return (
    <>
      {currencyInfo && (
        <CustomizeHomeCardContainer>
          <CustomizeHomeCard
            header={HeaderComponent}
            body={{
              header: currencyInfo.mainLabel,
              price: `${price} ${currencyInfo.secondaryLabel}`,
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
      <ScrollViewContainer>
        <CardListContainer>{cardsList.map(card => card())}</CardListContainer>
      </ScrollViewContainer>
    </CustomizeHomeContainer>
  );
};

export default CustomizeHome;
