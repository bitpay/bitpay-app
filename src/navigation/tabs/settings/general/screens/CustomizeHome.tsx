import React, {ReactNode, useState} from 'react';
import CustomizeHomeCard from '../../../../../components/customize-home-card/CustomizeHomeCard';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../store';
import styled from 'styled-components/native';
import {CurrencyList} from '../../../../../constants/CurrencySelectionListOptions';

const HeaderImg = styled.View`
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
  flex: 1;
  flex-wrap: wrap;
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

const Img = styled.View<{isFirst: boolean}>`
  width: 20px;
  height: 20px;
  margin-left: ${({isFirst}: {isFirst: boolean}) => (isFirst ? 0 : '-3px')};
`;

const CurrencyCardComponent = (
  currencyList: string[],
  price: string,
  show: boolean,
) => {
  /** TODO: Assign stored value */
  const [checked, setChecked] = useState(show);
  const _onCTAPress = () => {
    /** TODO: Store the value and Redirect me */
    setChecked(!checked);
  };

  const currencyInfo = currencyList.map(currency =>
    CurrencyList.find(({id}: {id: string | number}) => id === currency),
  );

  const HeaderComponent = (
    <HeaderImg>
      {currencyInfo &&
        currencyInfo.map(
          (currency, index) =>
            currency && (
              <Img key={index} isFirst={index === 0 || index % 7 === 0}>
                {currency.roundIcon(20)}
              </Img>
            ),
        )}
    </HeaderImg>
  );

  return (
    <CustomizeHomeCardContainer>
      <CustomizeHomeCard
        header={HeaderComponent}
        body={{
          header: 'My Everything Wallet',
          price: `$ ${price}`,
        }}
        footer={{
          onCTAPress: _onCTAPress,
          checked: checked,
        }}
      />
    </CustomizeHomeCardContainer>
  );
};

const CustomizeHome = () => {
  const wallets = useSelector(({WALLET}: RootState) => WALLET.wallets);
  const cardsList: Array<ReactNode | null> = [];
  const network = useSelector(({APP}: RootState) => APP.network);

  if (wallets) {
    if (Object.keys(wallets).length) {
      Object.values(wallets).forEach((wallet: any) => {
        const {assets, totalBalance, show} = wallet;
        if (assets) {
          const currencyList: string[] = [];
          assets.forEach(
            (asset: any) =>
              asset.network === network && currencyList.push(asset.coin),
          );
          if (currencyList.length) {
            cardsList.push(
              CurrencyCardComponent(currencyList, totalBalance, show),
            );
          }
        }
      });
    }
  }

  return (
    <CustomizeHomeContainer>
      <ScrollViewContainer>
        <CardListContainer>{cardsList.map(card => card)}</CardListContainer>
      </ScrollViewContainer>
    </CustomizeHomeContainer>
  );
};

export default CustomizeHome;
